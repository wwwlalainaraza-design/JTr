/* Test temporaire de démarrage JTr */

try {
  console.log("JTr : test de démarrage");

  go('home');

  window.__JTR_OK = true;
  window.__JTR_P5 = true;

} catch (e) {
  console.error("Erreur de démarrage JTr :", e);

  document.body.innerHTML =
    '<div style="padding:20px;color:red;background:white">' +
    '<h2>Erreur de démarrage</h2><pre>' +
    String(e.stack || e.message || e) +
    '</pre></div>';
}
