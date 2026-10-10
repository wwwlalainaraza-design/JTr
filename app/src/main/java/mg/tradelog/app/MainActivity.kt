package mg.tradelog.app

import android.app.Activity
import android.app.AlertDialog
import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.graphics.Typeface
import android.os.Bundle
import android.widget.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class Trade(
    val id: Long = 0,
    val acct: String = "reel",
    val btPeriod: String = "",
    val date: String,
    val time: String = "",
    val tz: Int? = null,
    val asset: String,
    val session: String,
    val strat: String = "ICT",
    val dir: String,
    val result: String,
    val r: Double?,
    val risk: Double?,
    val setup: String,
    val concepts: List<String> = emptyList(),
    val plan: Boolean = true,
    val shots: List<String> = emptyList(),
    val full: Boolean = false,
    val tfEntry: String = "M15",
    val tfHigh: String = "H4",
    val macro: String = "Non déterminé",
    val dxy: String = "Non vérifié",
    val yields: String = "Non vérifiés",
    val news: String = "Aucune annonce identifiée",
    val newsRes: String = "Non vérifiées",
    val mistake: String = "Aucune",
    val note: String = ""
)

class TradeDb(ctx: android.content.Context) :
    SQLiteOpenHelper(ctx, "tradelog.db", null, 2) {
    
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""CREATE TABLE trades(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            acct TEXT DEFAULT 'reel',
            bt_period TEXT DEFAULT '',
            date TEXT,
            time TEXT DEFAULT '',
            tz INTEGER,
            asset TEXT,
            session TEXT,
            strat TEXT DEFAULT 'ICT',
            direction TEXT,
            result TEXT,
            r REAL,
            risk REAL,
            setup TEXT,
            concepts TEXT DEFAULT '',
            plan INTEGER DEFAULT 1,
            shots TEXT DEFAULT '',
            full INTEGER DEFAULT 0,
            tf_entry TEXT DEFAULT 'M15',
            tf_high TEXT DEFAULT 'H4',
            macro TEXT DEFAULT '',
            dxy TEXT DEFAULT '',
            yields TEXT DEFAULT '',
            news TEXT DEFAULT '',
            news_res TEXT DEFAULT '',
            mistake TEXT DEFAULT '',
            note TEXT DEFAULT ''
        )""")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            try { db.execSQL("ALTER TABLE trades ADD COLUMN acct TEXT DEFAULT 'reel'") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN bt_period TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN time TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN tz INTEGER") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN strat TEXT DEFAULT 'ICT'") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN concepts TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN plan INTEGER DEFAULT 1") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN shots TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN full INTEGER DEFAULT 0") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN tf_entry TEXT DEFAULT 'M15'") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN tf_high TEXT DEFAULT 'H4'") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN macro TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN dxy TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN yields TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN news TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN news_res TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN mistake TEXT DEFAULT ''") } catch (e: Exception) {}
            try { db.execSQL("ALTER TABLE trades ADD COLUMN note TEXT DEFAULT ''") } catch (e: Exception) {}
        }
    }

    fun add(t: Trade) {
        val v = ContentValues().apply {
            put("acct", t.acct)
            put("bt_period", t.btPeriod)
            put("date", t.date)
            put("time", t.time)
            if (t.tz == null) putNull("tz") else put("tz", t.tz)
            put("asset", t.asset)
            put("session", t.session)
            put("strat", t.strat)
            put("direction", t.dir)
            put("result", t.result)
            if (t.r == null) putNull("r") else put("r", t.r)
            if (t.risk == null) putNull("risk") else put("risk", t.risk)
            put("setup", t.setup)
            put("concepts", t.concepts.joinToString("|"))
            put("plan", if (t.plan) 1 else 0)
            put("shots", t.shots.joinToString("||"))
            put("full", if (t.full) 1 else 0)
            put("tf_entry", t.tfEntry)
            put("tf_high", t.tfHigh)
            put("macro", t.macro)
            put("dxy", t.dxy)
            put("yields", t.yields)
            put("news", t.news)
            put("news_res", t.newsRes)
            put("mistake", t.mistake)
            put("note", t.note)
        }
        writableDatabase.insert("trades", null, v)
    }

    fun all(): List<Trade> {
        val out = mutableListOf<Trade>()
        readableDatabase.rawQuery("SELECT * FROM trades ORDER BY id DESC", null).use { c ->
            while (c.moveToNext()) {
                val conceptsStr = c.getString(c.getColumnIndexOrThrow("concepts")) ?: ""
                val shotsStr = c.getString(c.getColumnIndexOrThrow("shots")) ?: ""
                out.add(Trade(
                    id = c.getLong(c.getColumnIndexOrThrow("id")),
                    acct = c.getString(c.getColumnIndexOrThrow("acct")) ?: "reel",
                    btPeriod = c.getString(c.getColumnIndexOrThrow("bt_period")) ?: "",
                    date = c.getString(c.getColumnIndexOrThrow("date")) ?: "",
                    time = c.getString(c.getColumnIndexOrThrow("time")) ?: "",
                    tz = if (c.isNull(c.getColumnIndexOrThrow("tz"))) null else c.getInt(c.getColumnIndexOrThrow("tz")),
                    asset = c.getString(c.getColumnIndexOrThrow("asset")) ?: "XAUUSD",
                    session = c.getString(c.getColumnIndexOrThrow("session")) ?: "",
                    strat = c.getString(c.getColumnIndexOrThrow("strat")) ?: "ICT",
                    dir = c.getString(c.getColumnIndexOrThrow("direction")) ?: "",
                    result = c.getString(c.getColumnIndexOrThrow("result")) ?: "",
                    r = if (c.isNull(c.getColumnIndexOrThrow("r"))) null else c.getDouble(c.getColumnIndexOrThrow("r")),
                    risk = if (c.isNull(c.getColumnIndexOrThrow("risk"))) null else c.getDouble(c.getColumnIndexOrThrow("risk")),
                    setup = c.getString(c.getColumnIndexOrThrow("setup")) ?: "",
                    concepts = if (conceptsStr.isEmpty()) emptyList() else conceptsStr.split("|"),
                    plan = c.getInt(c.getColumnIndexOrThrow("plan")) == 1,
                    shots = if (shotsStr.isEmpty()) emptyList() else shotsStr.split("||"),
                    full = c.getInt(c.getColumnIndexOrThrow("full")) == 1,
                    tfEntry = c.getString(c.getColumnIndexOrThrow("tf_entry")) ?: "M15",
                    tfHigh = c.getString(c.getColumnIndexOrThrow("tf_high")) ?: "H4",
                    macro = c.getString(c.getColumnIndexOrThrow("macro")) ?: "",
                    dxy = c.getString(c.getColumnIndexOrThrow("dxy")) ?: "",
                    yields = c.getString(c.getColumnIndexOrThrow("yields")) ?: "",
                    news = c.getString(c.getColumnIndexOrThrow("news")) ?: "",
                    newsRes = c.getString(c.getColumnIndexOrThrow("news_res")) ?: "",
                    mistake = c.getString(c.getColumnIndexOrThrow("mistake")) ?: "",
                    note = c.getString(c.getColumnIndexOrThrow("note")) ?: ""
                ))
            }
        }
        return out
    }

    fun delete(id: Long) { writableDatabase.delete("trades", "id=?", arrayOf(id.toString())) }
    fun clear(account: String) { writableDatabase.delete("trades", "acct=?", arrayOf(account)) }
}

class MainActivity : Activity() {
    private lateinit var db: TradeDb
    private lateinit var body: LinearLayout
    private val blue = 0xFF1D5BFF.toInt()
    private val ink = 0xFF0B1B3A.toInt()
    private val muted = 0xFF5B6B8C.toInt()
    private val pad = 16
    private var currentAcct = "reel"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        db = TradeDb(this)
        showHome()
    }

    private fun base(title: String, subtitle: String) {
        val scroll = ScrollView(this)
        body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, 28)
            setBackgroundColor(0xFFF2F5FB.toInt())
        }
        scroll.addView(body)
        setContentView(scroll)
        text(title, 26, ink, true)
        text(subtitle, 13, muted, false)
        val nav = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0, 14, 0, 12) }
        nav.addView(navButton("🏠 Accueil") { showHome() }, weight())
        nav.addView(navButton("📋 Historique") { showHistory() }, weight())
        nav.addView(navButton("＋ Nouveau") { showForm() }, weight())
        nav.addView(navButton("📊 Analyse") { showStats() }, weight())
        nav.addView(navButton("⚙ Réglages") { showSettings() }, weight())
        body.addView(nav)
    }

    private fun weight() = LinearLayout.LayoutParams(0, -2, 1f)
    private fun text(s: String, size: Int, color: Int, bold: Boolean) {
        body.addView(TextView(this).apply {
            text = s; textSize = size.toFloat(); setTextColor(color)
            if (bold) setTypeface(null, Typeface.BOLD)
            setPadding(0, 4, 0, 7)
        })
    }
    private fun navButton(s: String, action: () -> Unit) = Button(this).apply {
        text = s; textSize = 11.5f; setOnClickListener { action() }
    }
    private fun button(s: String, action: () -> Unit) {
        body.addView(Button(this).apply {
            text = s; setOnClickListener { action() }
        }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 8; bottomMargin = 8 })
    }
    private fun today() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun showHome() {
        base("JTr", "Journal de trading · Compte ${if (currentAcct == "reel") "Réel" else "Backtest"}")
        val mine = db.all().filter { it.acct == currentAcct }
        val done = mine.filter { it.result in listOf("Gain", "Perte", "Break-even") && it.r != null }
        val totalR = done.sumOf { it.r ?: 0.0 }
        val wins = done.count { it.result == "Gain" }
        val winRate = if (done.isEmpty()) "—" else "${"%.0f".format(Locale.FRANCE, wins * 100.0 / done.size)} %"
        
        text("Résultat cumulé en R", 13, muted, false)
        text("${if (totalR > 0) "+" else ""}${"%.1f".format(Locale.FRANCE, totalR)} R", 48, ink, true)
        text("${done.size} trades terminés · Réussite : $winRate", 14, muted, false)

        button("⚡ Enregistrer un trade") { showForm() }
        button("📊 Voir l'analyse détaillée") { showStats() }
        
        text("Derniers trades", 18, ink, true)
        if (mine.isEmpty()) {
            text("Aucun trade pour le moment.", 14, muted, false)
        } else {
            mine.take(3).forEach { t ->
                body.addView(TextView(this).apply {
                    text = "${t.date} · ${t.asset} (${t.dir}) → ${t.result} (${t.r?.let { "$it R" } ?: "—"})"
                    textSize = 14f; setTextColor(ink); setPadding(0, 6, 0, 6)
                })
            }
        }
    }

    private fun showHistory() {
        base("Historique", "Tous les trades du compte")
        val mine = db.all().filter { it.acct == currentAcct }
        if (mine.isEmpty()) {
            text("Aucun trade enregistré.", 15, muted, false)
            return
        }
        mine.forEach { t ->
            val box = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(12, 10, 12, 10)
                setBackgroundColor(0xFFFFFFFF.toInt())
            }
            box.addView(TextView(this).apply {
                text = "${t.date} · ${t.asset} · ${t.dir} · ${t.strat}"
                textSize = 15f; setTextColor(ink); setTypeface(null, Typeface.BOLD)
            })
            box.addView(TextView(this).apply {
                text = "Résultat : ${t.result} (${t.r?.let { "$it R" } ?: "—"}) · Setup : ${t.setup.ifEmpty { "—" }}"
                textSize = 13f; setTextColor(muted)
            })
            box.addView(Button(this).apply {
                text = "Supprimer"
                setOnClickListener {
                    AlertDialog.Builder(this@MainActivity).setMessage("Supprimer ce trade ?")
                        .setNegativeButton("Annuler", null)
                        .setPositiveButton("Supprimer") { _, _ -> db.delete(t.id); showHistory() }.show()
                }
            })
            body.addView(box, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 6; bottomMargin = 6 })
        }
    }

    private fun showForm() {
        base("Nouveau trade", "Sélection de la stratégie et des concepts")
        
        val dateInput = EditText(this).apply { hint = "Date (AAAA-MM-JJ)"; setText(today()); body.addView(this) }
        val assetInput = EditText(this).apply { hint = "Actif (ex. XAUUSD)"; setText("XAUUSD"); body.addView(this) }
        
        text("Stratégie principale", 14, ink, true)
        val stratSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("ICT", "SMC", "Price Action"))
            body.addView(this)
        }

        val conceptsList = listOf("BOS / CHOCH", "Order Block", "FVG (Fair Value Gap)", "Liquidity Sweep", "Breaker Block", "Discount / Premium")
        text("Concepts combinables", 14, ink, true)
        val conceptCheckBoxes = conceptsList.map { concept ->
            CheckBox(this).apply { text = concept; body.addView(this) }
        }

        val dirSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("BUY", "SELL"))
            body.addView(this)
        }
        val resSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("En attente", "Gain", "Perte", "Break-even", "Annulé"))
            body.addView(this)
        }

        val rInput = EditText(this).apply { hint = "Résultat en R (ex. 2.0 ou -1.0)"; body.addView(this) }
        val noteInput = EditText(this).apply { hint = "Note facultative (leçon, remarque...)"; body.addView(this) }

        button("💾 Enregistrer le trade") {
            val rVal = rInput.text.toString().trim().replace(',', '.').toDoubleOrNull()
            val selectedConcepts = conceptCheckBoxes.filter { it.isChecked }.map { it.text.toString() }
            
            db.add(Trade(
                acct = currentAcct,
                date = dateInput.text.toString().trim(),
                asset = assetInput.text.toString().trim().uppercase(),
                session = "Londres",
                strat = stratSpinner.selectedItem.toString(),
                dir = dirSpinner.selectedItem.toString(),
                result = resSpinner.selectedItem.toString(),
                r = rVal,
                risk = 1.0,
                setup = selectedConcepts.firstOrNull() ?: "Standard",
                concepts = selectedConcepts,
                note = noteInput.text.toString().trim()
            ))
            Toast.makeText(this, "Trade enregistré avec succès", Toast.LENGTH_SHORT).show()
            showHome()
        }
    }

    private fun showStats() {
        base("Analyse", "Statistiques du compte ${if (currentAcct == "reel") "Réel" else "Backtest"}")
        val mine = db.all().filter { it.acct == currentAcct }
        val done = mine.filter { it.result in listOf("Gain", "Perte", "Break-even") && it.r != null }
        val wins = done.count { it.result == "Gain" }
        val totalR = done.sumOf { it.r ?: 0.0 }
        
        text("Trades terminés : ${done.size}", 16, ink, true)
        text("Résultat net : ${if (totalR > 0) "+" else ""}${"%.2f".format(Locale.FRANCE, totalR)} R", 16, ink, true)
        button("⬇ Exporter en CSV") { exportCsv(mine) }
    }

    private fun showSettings() {
        base("Paramètres", "Configuration de l'application")
        text("Compte actif actuel : ${if (currentAcct == "reel") "Réel" else "Backtest"}", 15, ink, true)
        button(if (currentAcct == "reel") "Basculer vers Backtest (Violet)" else "Basculer vers Réel (Bleu)") {
            currentAcct = if (currentAcct == "reel") "backtest" else "reel"
            showHome()
        }
        button("🗑 Supprimer tous les trades de ce compte") {
            AlertDialog.Builder(this).setTitle("Tout supprimer ?")
                .setMessage("Tous les trades du compte ${if (currentAcct == "reel") "Réel" else "Backtest"} seront effacés.")
                .setNegativeButton("Annuler", null)
                .setPositiveButton("Supprimer") { _, _ -> db.clear(currentAcct); showHome() }.show()
        }
    }

    private fun exportCsv(all: List<Trade>) {
        val csv = buildString {
            appendLine("id,compte,date,asset,direction,result,r,strat,concepts,note")
            all.asReversed().forEach { t ->
                appendLine("${t.id},${t.acct},${t.date},${t.asset},${t.dir},${t.result},${t.r ?: ""},${t.strat},\"${t.concepts.joinToString(";")}\",\"${t.note}\"")
            }
        }
        val intent = android.content.Intent(android.content.Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(android.content.Intent.CATEGORY_OPENABLE)
            type = "text/csv"
            putExtra(android.content.Intent.EXTRA_TITLE, "jtr_export.csv")
        }
        pendingCsv = csv
        @Suppress("DEPRECATION")
        startActivityForResult(intent, 1001)
    }
    private var pendingCsv: String? = null
    @Deprecated("Use Activity Result APIs")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1001 && resultCode == RESULT_OK && data?.data != null) {
            try {
                contentResolver.openOutputStream(data.data!!)?.bufferedWriter()?.use { it.write(pendingCsv ?: "") }
                Toast.makeText(this, "CSV exporté", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) { Toast.makeText(this, "Erreur d'export", Toast.LENGTH_SHORT).show() }
        }
    }
}
📋 Historique") { showHistory() }, weight())
        nav.addView(navButton("＋ Nouveau") { showForm() }, weight())
        nav.addView(navButton("📊 Analyse") { showStats() }, weight())
        nav.addView(navButton("⚙ Réglages") { showSettings() }, weight())
        body.addView(nav)
    }

    private fun weight() = LinearLayout.LayoutParams(0, -2, 1f)
    private fun text(s: String, size: Int, color: Int, bold: Boolean) {
        body.addView(TextView(this).apply {
            text = s; textSize = size.toFloat(); setTextColor(color)
            if (bold) setTypeface(null, Typeface.BOLD)
            setPadding(0, 4, 0, 7)
        })
    }
    private fun navButton(s: String, action: () -> Unit) = Button(this).apply {
        text = s; textSize = 11.5f; setOnClickListener { action() }
    }
    private fun button(s: String, action: () -> Unit) {
        body.addView(Button(this).apply {
            text = s; setOnClickListener { action() }
        }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 8; bottomMargin = 8 })
    }
    private fun today() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun showHome() {
        base("JTr", "Journal de trading · Compte ${if (currentAcct == "reel") "Réel" else "Backtest"}")
        val mine = db.all().filter { it.acct == currentAcct }
        val done = mine.filter { it.result in listOf("Gain", "Perte", "Break-even") && it.r != null }
        val totalR = done.sumOf { it.r ?: 0.0 }
        val wins = done.count { it.result == "Gain" }
        val winRate = if (done.isEmpty()) "—" else "${"%.0f".format(Locale.FRANCE, wins * 100.0 / done.size)} %"
        
        text("Résultat cumulé en R", 13, muted, false)
        text("${if (totalR > 0) "+" else ""}${"%.1f".format(Locale.FRANCE, totalR)} R", 48, ink, true)
        text("${done.size} trades terminés · Réussite : $winRate", 14, muted, false)

        button("⚡ Enregistrer un trade") { showForm() }
        button("📊 Voir l'analyse détaillée") { showStats() }
        
        text("Derniers trades", 18, ink, true)
        if (mine.isEmpty()) {
            text("Aucun trade pour le moment.", 14, muted, false)
        } else {
            mine.take(3).forEach { t ->
                body.addView(TextView(this).apply {
                    text = "${t.date} · ${t.asset} (${t.dir}) → ${t.result} (${t.r?.let { "$it R" } ?: "—"})"
                    textSize = 14f; setTextColor(ink); setPadding(0, 6, 0, 6)
                })
            }
        }
    }

    private fun showHistory() {
        base("Historique", "Tous les trades du compte")
        val mine = db.all().filter { it.acct == currentAcct }
        if (mine.isEmpty()) {
            text("Aucun trade enregistré.", 15, muted, false)
            return
        }
        mine.forEach { t ->
            val box = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(12, 10, 12, 10)
                setBackgroundColor(0xFFFFFFFF.toInt())
            }
            box.addView(TextView(this).apply {
                text = "${t.date} · ${t.asset} · ${t.dir} · ${t.strat}"
                textSize = 15f; setTextColor(ink); setTypeface(null, Typeface.BOLD)
            })
            box.addView(TextView(this).apply {
                text = "Résultat : ${t.result} (${t.r?.let { "$it R" } ?: "—"}) · Setup : ${t.setup.ifEmpty { "—" }}"
                textSize = 13f; setTextColor(muted)
            })
            box.addView(Button(this).apply {
                text = "Supprimer"
                setOnClickListener {
                    AlertDialog.Builder(this@MainActivity).setMessage("Supprimer ce trade ?")
                        .setNegativeButton("Annuler", null)
                        .setPositiveButton("Supprimer") { _, _ -> db.delete(t.id); showHistory() }.show()
                }
            })
            body.addView(box, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 6; bottomMargin = 6 })
        }
    }

    private fun showForm() {
        base("Nouveau trade", "Enregistrement rapide")
        val dateInput = EditText(this).apply { hint = "Date (AAAA-MM-JJ)"; setText(today()); body.addView(this) }
        val assetInput = EditText(this).apply { hint = "Actif (ex. XAUUSD)"; setText("XAUUSD"); body.addView(this) }
        val rInput = EditText(this).apply { hint = "Résultat en R (ex. 2.0 ou -1.0)"; body.addView(this) }
        val setupInput = EditText(this).apply { hint = "Setup principal (ex. FVG, Order Block)"; body.addView(this) }
        
        val resSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("En attente", "Gain", "Perte", "Break-even", "Annulé"))
            body.addView(this)
        }
        val dirSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, listOf("BUY", "SELL"))
            body.addView(this)
        }

        button("💾 Enregistrer") {
            val rVal = rInput.text.toString().trim().replace(',', '.').toDoubleOrNull()
            db.add(Trade(
                acct = currentAcct,
                date = dateInput.text.toString().trim(),
                asset = assetInput.text.toString().trim().uppercase(),
                session = "Londres",
                dir = dirSpinner.selectedItem.toString(),
                result = resSpinner.selectedItem.toString(),
                r = rVal,
                risk = 1.0,
                setup = setupInput.text.toString().trim()
            ))
            Toast.makeText(this, "Trade enregistré avec succès", Toast.LENGTH_SHORT).show()
            showHome()
        }
    }

    private fun showStats() {
        base("Analyse", "Statistiques du compte ${if (currentAcct == "reel") "Réel" else "Backtest"}")
        val mine = db.all().filter { it.acct == currentAcct }
        val done = mine.filter { it.result in listOf("Gain", "Perte", "Break-even") && it.r != null }
        val wins = done.count { it.result == "Gain" }
        val totalR = done.sumOf { it.r ?: 0.0 }
        
        text("Trades terminés : ${done.size}", 16, ink, true)
        text("Résultat net : ${if (totalR > 0) "+" else ""}${"%.2f".format(Locale.FRANCE, totalR)} R", 16, ink, true)
        button("⬇ Exporter en CSV") { exportCsv(mine) }
    }

    private fun showSettings() {
        base("Paramètres", "Configuration de l'application")
        text("Compte actif actuel : ${if (currentAcct == "reel") "Réel" else "Backtest"}", 15, ink, true)
        button(if (currentAcct == "reel") "Basculer vers Backtest (Violet)" else "Basculer vers Réel (Bleu)") {
            currentAcct = if (currentAcct == "reel") "backtest" else "reel"
            showHome()
        }
        button("🗑 Supprimer tous les trades de ce compte") {
            AlertDialog.Builder(this).setTitle("Tout supprimer ?")
                .setMessage("Tous les trades du compte ${if (currentAcct == "reel") "Réel" else "Backtest"} seront effacés.")
                .setNegativeButton("Annuler", null)
                .setPositiveButton("Supprimer") { _, _ -> db.clear(currentAcct); showHome() }.show()
        }
    }

    private fun exportCsv(all: List<Trade>) {
        val csv = buildString {
            appendLine("id,compte,date,asset,direction,result,r,setup")
            all.asReversed().forEach { t ->
                appendLine("${t.id},${t.acct},${t.date},${t.asset},${t.dir},${t.result},${t.r ?: ""},\"${t.setup}\"")
            }
        }
        val intent = android.content.Intent(android.content.Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(android.content.Intent.CATEGORY_OPENABLE)
            type = "text/csv"
            putExtra(android.content.Intent.EXTRA_TITLE, "jtr_export.csv")
        }
        pendingCsv = csv
        @Suppress("DEPRECATION")
        startActivityForResult(intent, 1001)
    }
    private var pendingCsv: String? = null
    @Deprecated("Use Activity Result APIs")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1001 && resultCode == RESULT_OK && data?.data != null) {
            try {
                contentResolver.openOutputStream(data.data!!)?.bufferedWriter()?.use { it.write(pendingCsv ?: "") }
                Toast.makeText(this, "CSV exporté", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) { Toast.makeText(this, "Erreur d'export", Toast.LENGTH_SHORT).show() }
        }
    }
}
 
