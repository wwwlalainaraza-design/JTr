plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    // Reste identique : c'est le nom du code Kotlin, pas l'identité de l'application.
    namespace = "mg.tradelog.app"
    compileSdk = 35

    defaultConfig {
        // Identité de l'application pour Android. Ne plus la changer après la première installation.
        applicationId = "mg.jtr.journal"
        minSdk = 23
        targetSdk = 35
        // Augmente tout seul à chaque construction sur GitHub : nécessaire pour les mises à jour.
        versionCode = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1
        versionName = "1.0"
    }

    signingConfigs {
        create("release") {
            // La clé est fournie par GitHub (secrets). Rien de secret n'est écrit dans ce fichier.
            val path = System.getenv("KEYSTORE_PATH")
            if (path != null) {
                storeFile = file(path)
                storeType = "pkcs12"
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = "jtr"
                keyPassword = System.getenv("KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
        }
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}
