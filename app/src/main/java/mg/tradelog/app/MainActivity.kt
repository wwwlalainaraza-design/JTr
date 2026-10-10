package mg.tradelog.app

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Initialisation de la WebView en plein écran
        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true      // Indispensable pour l'interactivité de la maquette
            settings.domStorageEnabled = true      // Permet de sauvegarder les données en local
            webViewClient = WebViewClient()        // Empêche de s'ouvrir dans un navigateur externe
        }

        // 2. Affichage de la WebView comme unique interface de l'application
        setContentView(webView)

        // 3. Chargement de votre maquette HTML depuis le dossier assets
        webView.loadUrl("file:///android_asset/tradelog-maquette.html")
    }
}
