package mg.tradelog.app

import android.app.Activity
import android.app.AlertDialog
import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class Trade(
    val id: Long = 0,
    val date: String,
    val asset: String,
    val session: String,
    val direction: String,
    val result: String,
    val r: Double?,
    val risk: Double?,
    val setup: String,
    val mode: String,
    val details: String
)

class TradeDb(ctx: android.content.Context) :
    SQLiteOpenHelper(ctx, "tradelog.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""CREATE TABLE trades(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT, asset TEXT, session TEXT, direction TEXT, result TEXT,
            r REAL, risk REAL, setup TEXT, mode TEXT, details TEXT)""")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {}
    fun add(t: Trade) {
        val v = ContentValues().apply {
            put("date",t.date); put("asset",t.asset); put("session",t.session)
            put("direction",t.direction); put("result",t.result)
            if(t.r == null) putNull("r") else put("r",t.r)
            if(t.risk == null) putNull("risk") else put("risk",t.risk)
            put("setup",t.setup); put("mode",t.mode); put("details",t.details)
        }
        writableDatabase.insert("trades", null, v)
    }
    fun all(): List<Trade> {
        val out = mutableListOf<Trade>()
        readableDatabase.rawQuery("SELECT * FROM trades ORDER BY id DESC", null).use { c ->
            while(c.moveToNext()) out.add(Trade(
                c.getLong(c.getColumnIndexOrThrow("id")),
                c.getString(c.getColumnIndexOrThrow("date")) ?: "",
                c.getString(c.getColumnIndexOrThrow("asset")) ?: "XAUUSD",
                c.getString(c.getColumnIndexOrThrow("session")) ?: "",
                c.getString(c.getColumnIndexOrThrow("direction")) ?: "",
                c.getString(c.getColumnIndexOrThrow("result")) ?: "",
                if(c.isNull(c.getColumnIndexOrThrow("r"))) null else c.getDouble(c.getColumnIndexOrThrow("r")),
                if(c.isNull(c.getColumnIndexOrThrow("risk"))) null else c.getDouble(c.getColumnIndexOrThrow("risk")),
                c.getString(c.getColumnIndexOrThrow("setup")) ?: "",
                c.getString(c.getColumnIndexOrThrow("mode")) ?: "",
                c.getString(c.getColumnIndexOrThrow("details")) ?: ""
            ))
        }
        return out
    }
    fun delete(id: Long) { writableDatabase.delete("trades", "id=?", arrayOf(id.toString())) }
    fun clear() { writableDatabase.delete("trades", null, null) }
}

class MainActivity : Activity() {
    private lateinit var db: TradeDb
    private lateinit var body: LinearLayout
    private val blue = 0xFF1769E0.toInt()
    private val ink = 0xFF172033.toInt()
    private val muted = 0xFF68758A.toInt()
    private val pad = 16

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
            setBackgroundColor(0xFFF4F6FA.toInt())
        }
        scroll.addView(body)
        setContentView(scroll)
        text(title, 27, ink, true)
        text(subtitle, 13, muted, false)
        val nav = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(0,14,0,12) }
        nav.addView(navButton("＋ Rapide") { showForm(false) }, weight())
        nav.addView(navButton("🔎 Analyse") { showForm(true) }, weight())
        nav.addView(navButton("📊 Stats") { showStats() }, weight())
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
        text = s; textSize = 11f; setOnClickListener { action() }
    }
    private fun label(s: String) = text(s, 14, ink, true)
    private fun input(hint: String, value: String = ""): EditText {
        return EditText(this).apply {
            this.hint = hint; setText(value); textSize = 15f; singleLine = true
            setPadding(12, 8, 12, 8)
            body.addView(this, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 8 })
        }
    }
    private fun spinner(labelText: String, options: List<String>): Spinner {
        label(labelText)
        val sp = Spinner(this)
        sp.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, options)
        body.addView(sp, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 8 })
        return sp
    }
    private fun checkGroup(title: String, options: List<String>): List<CheckBox> {
        label(title)
        return options.map { option ->
            CheckBox(this).apply {
                text = option; textSize = 14f
                body.addView(this)
            }
        }
    }
    private fun button(s: String, action: () -> Unit) {
        body.addView(Button(this).apply {
            text = s; setOnClickListener { action() }
        }, LinearLayout.LayoutParams(-1, -2).apply { topMargin = 8; bottomMargin = 8 })
    }
    private fun today() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    private fun showHome() {
        base("TradeLog", "Journal de trading hors ligne · XAUUSD")
        text("Tes trades, tes règles, tes statistiques.", 18, ink, true)
        text("Les données sont enregistrées dans la base locale du téléphone.", 14, muted, false)
        button("⚡ Enregistrer un trade rapide") { showForm(false) }
        button("🔎 Ajouter une analyse complète") { showForm(true) }
        button("📊 Consulter l'historique et les statistiques") { showStats() }
        text("Fonctionnalités : fondamentaux, Price Action, SMC/ICT, risque, discipline et historique.", 14, muted, false)
        text("Importation MT5 : cette version native n'a pas encore le module CSV. Il sera ajouté dans une version suivante.", 12, muted, false)
    }

    private fun showForm(full: Boolean) {
        base(if(full) "Analyse complète" else "Trade rapide",
            if(full) "Fondamentaux + Price Action + SMC/ICT" else "Enregistre l'essentiel en quelques secondes")
        label("Date (AAAA-MM-JJ)")
        val date = input("2026-10-09", today())
        val asset = spinner("Actif", listOf("XAUUSD","XAGUSD","EURUSD","GBPUSD","USDJPY","BTCUSD","Autre"))
        val session = spinner("Session", listOf("Londres","New York","Londres–New York","Asie","Autre"))
        val direction = spinner("Direction", listOf("BUY","SELL","Pas de trade"))
        val result = spinner("Résultat", listOf("En attente","Gain","Perte","Break-even","Annulé"))
        val r = input("Résultat en R (ex. 2 ou -1)")
        val risk = input("Risque en % (ex. 1)")
        val setup = spinner("Setup principal", listOf("Price action","BOS / CHOCH","Sweep de liquidité","Order block","FVG","Breakout","Pullback","Support / résistance","Autre"))
        val detailParts = mutableListOf<String>()
        if (full) {
            val news = spinner("Annonce économique", listOf("Aucune annonce identifiée","CPI / Core CPI","PCE / Core PCE","NFP / chômage / salaires","FOMC / discours Fed","ISM / PMI","PIB","JOLTS","Plusieurs annonces"))
            val actual = spinner("Données vs prévisions", listOf("Non vérifiées","Plus fortes que prévu","Plus faibles que prévu","Conformes","Contradictoires"))
            val macro = spinner("Biais macro pour l'or", listOf("Non déterminé","Haussier","Baissier","Neutre","Signaux mixtes"))
            val dxy = spinner("Biais DXY", listOf("Non vérifié","Haussier","Baissier","Neutre"))
            val yields = spinner("Rendements US", listOf("Non vérifiés","En hausse","En baisse","Mixtes"))
            val trend = spinner("Tendance supérieure", listOf("Non déterminée","Haussière","Baissière","Range"))
            val setups = checkGroup("Price Action / SMC / ICT", listOf("BOS confirmé","CHOCH confirmé","Sweep de liquidité","Order block","FVG","Premium / discount","Support / résistance","Breakout / pullback","Biais macro aligné","Session active","Ratio R/R acceptable","Confirmation multi-timeframe"))
            val discipline = checkGroup("Discipline", listOf("Stop-loss défini","Risque calculé avant entrée","Entrée confirmée","Pas de FOMO / revenge","Actualités vérifiées","Plan respecté"))
            val error = spinner("Erreur éventuelle", listOf("Aucune identifiée","FOMO","Revenge trading","Entrée anticipée","Stop-loss mal placé","Risque trop élevé","Contre-tendance","Trading pendant annonce","Sortie prématurée","Plan non respecté"))
            detailParts.add("Annonce: ${selected(news)}")
            detailParts.add("Lecture: ${selected(actual)}")
            detailParts.add("Biais or: ${selected(macro)}")
            detailParts.add("DXY: ${selected(dxy)}")
            detailParts.add("Rendements US: ${selected(yields)}")
            detailParts.add("Tendance: ${selected(trend)}")
            detailParts.add("Confluences: ${setups.filter{it.isChecked}.joinToString { it.text }}")
            detailParts.add("Discipline: ${discipline.filter{it.isChecked}.joinToString { it.text }}")
            detailParts.add("Erreur: ${selected(error)}")
        }
        val note = input("Note / raison / leçon (facultatif)")
        button("💾 Enregistrer le trade") {
            if(date.text.toString().trim().isEmpty()) { date.error = "Entre une date"; return@button }
            db.add(Trade(
                date=date.text.toString().trim(), asset=selected(asset), session=selected(session),
                direction=selected(direction), result=selected(result),
                r=r.text.toString().trim().toDoubleOrNull(),
                risk=risk.text.toString().trim().replace(',','.').toDoubleOrNull(),
                setup=selected(setup), mode=if(full) "Complet" else "Rapide",
                details=(detailParts + listOf("Note: ${note.text}")).joinToString("\n")
            ))
            Toast.makeText(this, "Trade enregistré", Toast.LENGTH_SHORT).show()
            showStats()
        }
    }

    private fun selected(s: Spinner) = s.selectedItem?.toString() ?: ""
    private fun showStats() {
        base("Historique & statistiques", "Résumé de tes trades enregistrés")
        val all = db.all()
        val done = all.filter { it.result in listOf("Gain","Perte","Break-even") }
        val wins = done.count { it.result == "Gain" }
        val totalR = done.sumOf { it.r ?: 0.0 }
        val winRate = if(done.isEmpty()) "—" else "${"%.1f".format(Locale.FRANCE, wins * 100.0 / done.size)} %"
        text("Trades terminés : ${done.size}", 19, ink, true)
        text("Taux de réussite : $winRate", 17, blue, true)
        text("Résultat cumulé : ${if(totalR>0) "+" else ""}${"%.2f".format(Locale.FRANCE,totalR)} R", 17, if(totalR>=0) 0xFF12805C.toInt() else 0xFFC33E4C.toInt(), true)
        text("Nombre total de lignes : ${all.size}", 14, muted, false)
        button("⬇ Exporter l'historique CSV") { exportCsv(all) }
        button("🗑 Effacer tout l'historique") {
            AlertDialog.Builder(this).setTitle("Effacer l'historique ?")
                .setMessage("Cette action est définitive.")
                .setNegativeButton("Annuler", null)
                .setPositiveButton("Effacer") { _, _ -> db.clear(); showStats() }.show()
        }
        if (all.isEmpty()) text("Aucun trade pour le moment.", 15, muted, false)
        all.forEach { t ->
            val box = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(12,10,12,10); setBackgroundColor(0xFFFFFFFF.toInt())
            }
            box.addView(TextView(this).apply {
                text = "${t.date} · ${t.asset} · ${t.direction}"
                textSize = 16f; setTextColor(ink); setTypeface(null,Typeface.BOLD)
            })
            box.addView(TextView(this).apply {
                text = "${t.result} · ${t.r?.let { "$it R" } ?: "R non renseigné"} · Risque ${t.risk?.let { "$it%" } ?: "—"}\n${t.setup} · ${t.mode}\n${t.details}"
                textSize = 13f; setTextColor(muted); setPadding(0,5,0,5)
            })
            box.addView(Button(this).apply {
                text = "Supprimer ce trade"
                setOnClickListener {
                    AlertDialog.Builder(this@MainActivity).setMessage("Supprimer ce trade ?")
                        .setNegativeButton("Annuler",null)
                        .setPositiveButton("Supprimer") { _, _ -> db.delete(t.id); showStats() }.show()
                }
            })
            body.addView(box, LinearLayout.LayoutParams(-1,-2).apply { topMargin=6; bottomMargin=6 })
        }
    }

    private fun exportCsv(all: List<Trade>) {
        val csv = buildString {
            appendLine("date,asset,session,direction,result,r,risk,setup,mode,details")
            all.asReversed().forEach { t ->
                val fields = listOf(t.date,t.asset,t.session,t.direction,t.result,t.r?.toString() ?: "",t.risk?.toString() ?: "",t.setup,t.mode,t.details)
                appendLine(fields.joinToString(",") { "\"${it.replace("\"","\"\"")}\"" })
            }
        }
        val intent = android.content.Intent(android.content.Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(android.content.Intent.CATEGORY_OPENABLE)
            type = "text/csv"
            putExtra(android.content.Intent.EXTRA_TITLE, "tradelog_export.csv")
        }
        pendingCsv = csv
        @Suppress("DEPRECATION")
        startActivityForResult(intent, 1001)
    }
    private var pendingCsv: String? = null
    @Deprecated("Use Activity Result APIs")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if(requestCode==1001 && resultCode==RESULT_OK && data?.data!=null) {
            try {
                contentResolver.openOutputStream(data.data!!)?.bufferedWriter()?.use { it.write(pendingCsv ?: "") }
                Toast.makeText(this,"CSV exporté",Toast.LENGTH_SHORT).show()
            } catch(e: Exception) { Toast.makeText(this,"Erreur d'export",Toast.LENGTH_SHORT).show() }
        }
    }
}
