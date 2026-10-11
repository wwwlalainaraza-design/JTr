package mg.tradelog.app

import android.app.Activity
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.WindowManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {

    // Sert à renvoyer à la page les images choisies par l'utilisateur
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserRequest = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Active le plein écran total (masque la barre d'état : heure, batterie...)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )

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

        setContentView(webView)
        webView.loadUrl("file:///android_asset/tradelog-maquette.html")
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
