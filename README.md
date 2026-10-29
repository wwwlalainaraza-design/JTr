# TradeLog Android — projet natif Kotlin

Ceci est le code source d'une application Android native (Kotlin + SQLite), pas un site web et pas encore un APK compilé.

## Fonctionnalités incluses
- Interface Android native
- Enregistrement rapide et analyse complète
- Champs fondamentaux, Price Action, SMC/ICT et discipline
- Historique et statistiques simples (trades terminés, win rate, résultat cumulé en R)
- Stockage local SQLite, utilisable hors ligne
- Export CSV depuis l'application

## Import MT5
L'importation CSV MT5 n'est pas encore implémentée dans cette première version native. L'export CSV est présent. L'import sera à ajouter et tester selon le format exact du CSV exporté par ton MT5.

## Compilation
Ouvre ce dossier avec Android Studio ou un environnement Android IDE qui supporte les projets Gradle Kotlin. Le projet utilise Android Gradle Plugin 8.7.3, Kotlin 2.0.21, compileSdk 35 et minSdk 23. La première compilation peut nécessiter Internet pour télécharger les dépendances. Une fois compilée, l'application fonctionne hors ligne pour la saisie et la consultation.
