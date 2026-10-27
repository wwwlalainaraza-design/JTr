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
import java.io.File
import java.io.FileOutputStream
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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
        web = webView

        // Le clavier réduit la page au lieu de cacher les champs
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        setContentView(webView)
        hideSystemBars()
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

    // Plein écran : cache la barre d'état (heure, batterie) et les boutons de navigation.
    // Un glissement depuis le haut ou le bas de l'écran les fait réapparaître un instant.
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    @Suppress("DEPRECATION")
    private fun hideSystemBars() {
        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
    }

    // Reçoit les images choisies et les transmet à la page
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
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }
}
