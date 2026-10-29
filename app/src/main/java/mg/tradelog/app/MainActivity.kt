package mg.tradelog.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** Stockage durable : le journal et les captures sont écrits dans de vrais fichiers de l'application. */
class JtrStore(private val context: Context) {
    // Les écritures se font en arrière-plan : la page n'attend jamais le disque (sinon l'application peut se figer).
    private val io: ExecutorService = Executors.newSingleThreadExecutor()

    // Dernières valeurs demandées, pas encore écrites : une lecture les retrouve tout de suite.
    private val pending = ConcurrentHashMap<String, String>()

    private fun file(key: String) =
        File(context.filesDir, key.replace(Regex("[^A-Za-z0-9_-]"), "_") + ".json")

    private fun readFile(f: File): String =
        try { if (f.exists()) f.readText(Charsets.UTF_8) else "" } catch (e: Exception) { "" }

    @JavascriptInterface
    fun load(key: String): String = pending[key] ?: readFile(file(key))

    @JavascriptInterface
    fun loadBackup(key: String): String = readFile(File(file(key).path + ".bak"))

    @JavascriptInterface
    fun save(key: String, json: String): Boolean {
        pending[key] = json
        return try {
            io.execute { write(key, json) }
            true
        } catch (e: Exception) {
            pending.remove(key, json)
            false
        }
    }

    @JavascriptInterface
    fun remove(key: String) {
        pending.remove(key)
        try {
            io.execute {
                try {
                    val f = file(key)
                    f.delete()
                    File(f.path + ".bak").delete()
                } catch (e: Exception) {
                }
            }
        } catch (e: Exception) {
        }
    }

    /** Attend (au plus 1,5 seconde) la fin des écritures en cours, quand l'application passe en arrière-plan. */
    fun awaitIdle() {
        if (pending.isEmpty()) return
        try {
            io.submit(Runnable { }).get(1500, TimeUnit.MILLISECONDS)
        } catch (e: Exception) {
        }
    }

    private fun write(key: String, json: String) {
        try {
            val target = file(key)
            val tmp = File(target.path + ".tmp")
            FileOutputStream(tmp).use { out -> out.write(json.toByteArray(Charsets.UTF_8)) }
            // Copie de secours de l'ancienne version (sauf pour les captures, qui sont lourdes)
            if (!key.startsWith("shots-") && target.exists()) {
                target.copyTo(File(target.path + ".bak"), overwrite = true)
            }
            if (!tmp.renameTo(target)) {
                target.delete()
                tmp.renameTo(target)
            }
        } catch (e: Exception) {
        } finally {
            pending.remove(key, json)
        }
    }
}

class MainActivity : Activity() {

    // Sert à renvoyer à la page les images choisies par l'utilisateur
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserRequest = 1001
    private var web: WebView? = null
    private val store by lazy { JtrStore(applicationContext) }
    private val exportRequestCode = 1002
    private val importRequestCode = 1003
    private var pendingExportKind: String? = null
    private var pendingExportContent: String? = null
    private var lightStatusIcons = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Edge-to-edge : le fond de la WebView se dessine derrière la barre d’état transparente.
        window.statusBarColor = Color.TRANSPARENT
        lightStatusIcons = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) != Configuration.UI_MODE_NIGHT_YES

        // Le téléphone est-il en mode sombre ?
        val night = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
            Configuration.UI_MODE_NIGHT_YES

        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

            // Évite un flash blanc au démarrage
            setBackgroundColor(if (night) Color.parseColor("#060D1E") else Color.parseColor("#F2F5FB"))

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    // Indique à la page si le téléphone est en mode sombre (réglage « Auto »)
                    view?.evaluateJavascript(
                        "window.jtrSystemDark = $night; if (window.jtrApplyTheme) window.jtrApplyTheme();",
                        null
                    )
                }
            }

            // Ouvre le sélecteur d'images quand la page demande « Ajouter une capture »
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView?,
                    callback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    // Annule une demande précédente restée sans réponse
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = callback

                    val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "image/*"
                        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                    }
                    return try {
                        this@MainActivity.startActivityForResult(
                            Intent.createChooser(intent, "Choisir une capture"),
                            fileChooserRequest
                        )
                        true
                    } catch (e: Exception) {
                        this@MainActivity.filePathCallback?.onReceiveValue(null)
                        this@MainActivity.filePathCallback = null
                        false
                    }
                }
            }
        }

        // Pont de sauvegarde : la page enregistre ses données dans des fichiers de l'application
        webView.addJavascriptInterface(store, "JtrNative")
        webView.addJavascriptInterface(JtrFilesBridge(this), "JtrFiles")
        webView.addJavascriptInterface(JtrUiBridge(this), "JtrUi")
        web = webView

        // Le clavier réduit la page au lieu de cacher les champs
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        setContentView(webView)
        applySystemBarFlags()
        webView.loadUrl("file:///android_asset/tradelog-maquette.html")
    }

    // Quand l'application passe en arrière-plan, la page enregistre tout tout de suite
    override fun onPause() {
        web?.evaluateJavascript("if (window.saveAll) window.saveAll();", null)
        super.onPause()
    }

    // En arrière-plan, on laisse finir les écritures en cours avant que le système puisse arrêter l'application
    override fun onStop() {
        store.awaitIdle()
        super.onStop()
    }

    // On garde la barre d’état visible et transparente, tout en masquant la barre de navigation.
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) applySystemBarFlags()
    }

    @Suppress("DEPRECATION")
    private fun applySystemBarFlags() {
        var flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        if (lightStatusIcons) flags = flags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        window.statusBarColor = Color.TRANSPARENT
        window.decorView.systemUiVisibility = flags
    }

    internal fun setStatusBarLightIcons(light: Boolean) {
        runOnUiThread { lightStatusIcons = light; applySystemBarFlags() }
    }

    /** Ouvre le sélecteur Android pour enregistrer un CSV ou une sauvegarde JSON. */
    internal fun requestExport(kind: String, content: String, filename: String): Boolean {
        runOnUiThread {
            pendingExportKind = when (kind) { "csv" -> "csv"; "backup" -> "backup"; else -> "json" }
            pendingExportContent = content
            val mime = if (pendingExportKind == "csv") "text/csv" else "application/json"
            val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = mime
                putExtra(Intent.EXTRA_TITLE, filename)
            }
            try {
                startActivityForResult(intent, exportRequestCode)
            } catch (e: Exception) {
                pendingExportKind = null
                pendingExportContent = null
                showMessage("Sélecteur de fichiers indisponible")
            }
        }
        return true
    }

    /** Demande à Android de choisir un fichier JSON de sauvegarde à restaurer. */
    internal fun requestBackupExport(filename: String, dataJson: String): Boolean =
        requestExport("backup", dataJson, filename)

    internal fun requestImport(): Boolean {
        runOnUiThread {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "application/json"
                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("application/json", "text/json", "text/plain"))
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            try {
                startActivityForResult(intent, importRequestCode)
            } catch (e: Exception) {
                showMessage("Sélecteur de fichiers indisponible")
            }
        }
        return true
    }

    private fun showMessage(message: String) {
        runOnUiThread { Toast.makeText(this, message, Toast.LENGTH_LONG).show() }
    }

    /** Construit le JSON avec les captures côté natif pour ne pas charger toutes les images dans la WebView. */
    private fun buildNativeBackupContent(dataJson: String): String {
        val data = JSONObject(dataJson)
        val trades = data.optJSONArray("trades") ?: throw IllegalArgumentException("Liste des trades absente")
        val shots = JSONObject()
        for (i in 0 until trades.length()) {
            val trade = trades.optJSONObject(i) ?: throw IllegalArgumentException("Trade invalide à la ligne ${i + 1}")
            val id = trade.opt("id")?.toString() ?: throw IllegalArgumentException("Identifiant de trade absent")
            val expected = trade.optInt("nshots", 0)
            if (expected < 0) throw IllegalArgumentException("Nombre de captures invalide pour le trade $id")
            if (expected == 0) continue
            val raw = store.load("shots-$id")
            if (raw.isBlank()) throw IllegalStateException("Captures introuvables pour le trade $id : sauvegarde annulée")
            val arr = JSONArray(raw)
            if (arr.length() != expected) throw IllegalStateException("Captures incomplètes pour le trade $id : sauvegarde annulée")
            for (j in 0 until arr.length()) {
                if (arr.opt(j) !is String) throw IllegalStateException("Capture invalide pour le trade $id")
            }
            shots.put(id, arr)
        }
        return JSONObject()
            .put("format", "jtr-backup")
            .put("version", 1)
            .put("exportedAt", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date()))
            .put("data", data)
            .put("shots", shots)
            .toString()
    }

    private fun writeExport(uri: Uri) {
        val kind = pendingExportKind
        val content = pendingExportContent
        pendingExportContent = null
        pendingExportKind = null
        try {
            val finalContent = when (kind) {
                "backup" -> buildNativeBackupContent(content ?: throw IllegalStateException("Données absentes pour la sauvegarde"))
                else -> content ?: throw IllegalStateException("Aucun contenu à exporter")
            }
            contentResolver.openOutputStream(uri, "w")?.use { out -> out.write(finalContent.toByteArray(Charsets.UTF_8)) }
                ?: throw IllegalStateException("Impossible d’ouvrir le fichier choisi")
            showMessage("Fichier exporté avec succès")
        } catch (e: Exception) {
            showMessage("Échec de l’export : " + (e.message ?: "erreur d’écriture"))
        }
    }

    private fun restoreBackup(uri: Uri) {
        try {
            val json = contentResolver.openInputStream(uri)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }
                ?: throw IllegalArgumentException("Impossible de lire le fichier")
            val root = JSONObject(json)
            if (root.optString("format") != "jtr-backup" || root.optInt("version", -1) != 1) {
                throw IllegalArgumentException("Ce fichier n’est pas une sauvegarde JTr reconnue")
            }
            val data = root.optJSONObject("data") ?: throw IllegalArgumentException("Données du journal absentes")
            val trades = data.optJSONArray("trades") ?: throw IllegalArgumentException("Liste des trades absente")
            val accounts = data.optJSONArray("accounts") ?: throw IllegalArgumentException("Liste des comptes absente")
            if (accounts.length() == 0) throw IllegalArgumentException("La sauvegarde doit contenir au moins un compte")
            val accountIds = LinkedHashSet<String>()
            for (i in 0 until accounts.length()) {
                val account = accounts.optJSONObject(i) ?: throw IllegalArgumentException("Compte invalide à la ligne ${i + 1}")
                val accountId = account.opt("id")?.toString() ?: throw IllegalArgumentException("Identifiant de compte absent")
                if (accountId == "null" || account.optString("name").isBlank() || !accountIds.add(accountId)) {
                    throw IllegalArgumentException("Compte invalide ou répété : $accountId")
                }
            }
            val shots = root.optJSONObject("shots") ?: throw IllegalArgumentException("Liste des captures absente")
            val ids = LinkedHashSet<String>()
            val shotArrays = LinkedHashMap<String, JSONArray>()
            for (i in 0 until trades.length()) {
                val trade = trades.optJSONObject(i) ?: throw IllegalArgumentException("Trade invalide à la ligne ${i + 1}")
                val rawId = trade.opt("id")
                if (rawId == null || rawId == JSONObject.NULL) throw IllegalArgumentException("Identifiant de trade absent")
                val id = rawId.toString()
                if (!ids.add(id)) throw IllegalArgumentException("Identifiant de trade répété : $id")
                val accountId = trade.opt("acct")?.toString()
                if (accountId == null || !accountIds.contains(accountId)) throw IllegalArgumentException("Compte inconnu pour le trade $id")
                val arr = shots.optJSONArray(id) ?: JSONArray()
                for (j in 0 until arr.length()) {
                    if (arr.opt(j) !is String) throw IllegalArgumentException("Capture invalide pour le trade $id")
                }
                trade.put("nshots", arr.length())
                trade.remove("shots")
                trade.remove("_lazy")
                shotArrays[id] = arr
            }
            val shotKeys = shots.keys()
            while (shotKeys.hasNext()) {
                val key = shotKeys.next()
                if (!ids.contains(key)) throw IllegalArgumentException("Captures liées à un trade absent : $key")
                if (shots.optJSONArray(key) == null) throw IllegalArgumentException("Liste de captures invalide pour le trade $key")
            }

            // Supprime uniquement les anciens fichiers de captures qui ne figurent plus dans la sauvegarde.
            try {
                val oldData = JSONObject(store.load("jtr-data"))
                val oldTrades = oldData.optJSONArray("trades")
                if (oldTrades != null) for (i in 0 until oldTrades.length()) {
                    val oldTrade = oldTrades.optJSONObject(i) ?: continue
                    val oldId = oldTrade.opt("id")?.toString() ?: continue
                    if (!ids.contains(oldId)) store.remove("shots-$oldId")
                }
            } catch (_: Exception) { }

            // La file d’écriture native conserve les données en attente lisibles pendant le rechargement.
            shotArrays.forEach { (id, arr) ->
                if (arr.length() > 0) store.save("shots-$id", arr.toString()) else store.remove("shots-$id")
            }
            if (!store.save("jtr-data", data.toString())) throw IllegalStateException("Impossible d’enregistrer les données restaurées")
            showMessage("Sauvegarde restaurée")
            web?.postDelayed({ web?.evaluateJavascript("window.location.reload()", null) }, 150)
        } catch (e: Exception) {
            showMessage("Restauration impossible : " + (e.message ?: "fichier invalide"))
        }
    }

    // Reçoit les images choisies, l’export demandé ou le fichier de sauvegarde.
    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == fileChooserRequest) {
            var result: Array<Uri>? = null
            if (resultCode == RESULT_OK && data != null) {
                val clip = data.clipData
                val single = data.data
                if (clip != null) {
                    result = Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                } else if (single != null) {
                    result = arrayOf(single)
                }
            }
            filePathCallback?.onReceiveValue(result)
            filePathCallback = null
        } else if (requestCode == exportRequestCode) {
            if (resultCode == RESULT_OK && data?.data != null) {
                val uri = data.data!!
                Thread { writeExport(uri) }.start()
            } else { pendingExportContent = null; pendingExportKind = null }
        } else if (requestCode == importRequestCode) {
            if (resultCode == RESULT_OK && data?.data != null) {
                val uri = data.data!!
                Thread { restoreBackup(uri) }.start()
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }
}

/** Pont pour adapter la couleur des icônes de la barre d’état au thème de JTr. */
class JtrUiBridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun setStatusBarLightIcons(light: Boolean) { activity.setStatusBarLightIcons(light) }
}

/** Pont séparé pour les sélecteurs Android : le pont JtrNative reste dédié au stockage. */
class JtrFilesBridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun exportFile(kind: String, content: String, filename: String): Boolean =
        activity.requestExport(kind, content, filename)

    @JavascriptInterface
    fun exportBackup(filename: String, dataJson: String): Boolean =
        activity.requestBackupExport(filename, dataJson)

    @JavascriptInterface
    fun importBackup(): Boolean = activity.requestImport()
}
