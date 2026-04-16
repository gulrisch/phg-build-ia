import { useState } from "react";

// ── Lookups ───────────────────────────────────────────────────────────────────
const COUNTRY_MAP = {
  FR: { name: "France",        flag: "🇫🇷" },
  CH: { name: "Suisse",        flag: "🇨🇭" },
  CI: { name: "Côte d'Ivoire", flag: "🇨🇮" },
  SN: { name: "Sénégal",       flag: "🇸🇳" },
  MA: { name: "Maroc",         flag: "🇲🇦" },
  CA: { name: "Canada",        flag: "🇨🇦" },
};
const QUAL_LABELS = { eco: "Économique", std: "Standard", pre: "Premium" };
const PLAN_LABELS = { free: "Gratuit", pro: "Pro", elite: "Élite", "elite-africa": "Élite Afrique" };
const PHG_RECS = [
  "Obtenez un rapport géotechnique G2 avant tout démarrage des fondations.",
  "Souscrivez une assurance Dommages-Ouvrage avant l'ouverture du chantier.",
  "Prévoyez une réserve de 10–15% sur le budget total pour les imprévus.",
  "Exigez des fiches techniques et certificats CE pour tous les matériaux structurels.",
  "Planifiez les raccordements réseaux (eau, électricité, assainissement) dès la phase Préparation.",
  "Réalisez des points de contrôle qualité à chaque étape clé (fondations, dalle, charpente, réception).",
];

const fmt  = (n) => Number(n || 0).toLocaleString("fr-FR");
const pct  = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const todayStr = () => new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

// ── HTML report builder ───────────────────────────────────────────────────────
function buildHTML(projet, résultat, pays, plan) {
  const country = COUNTRY_MAP[pays] || { name: pays || "—", flag: "" };
  const qual    = QUAL_LABELS[projet?.qualite] || "Standard";
  const planLbl = PLAN_LABELS[plan] || plan;
  const nom     = projet?.nom || "Projet de construction";
  const surf    = résultat?.surf || projet?.surface || "—";
  const cur     = résultat?.cur || "€";

  const matRows = résultat?.materials?.map((m) => `
    <tr>
      <td>${m.n}</td>
      <td style="text-align:right">${fmt(m.q)}</td>
      <td>${m.u}</td>
      <td style="text-align:right">${fmt(Math.round(m.pu))}</td>
      <td style="text-align:right;font-weight:600;color:#C9A84C">${fmt(m.t)}</td>
    </tr>`).join("") ?? `<tr><td colspan="5" style="text-align:center;color:#808078">Aucune donnée matériaux disponible</td></tr>`;

  const total   = résultat?.total    || 0;
  const matC    = résultat?.matCost  || 0;
  const labC    = résultat?.labCost  || 0;
  const logC    = résultat?.logCost  || 0;
  const riskC   = résultat?.risk     || 0;
  const low     = Math.round(total * 0.85);
  const high    = Math.round(total * 1.20);
  const gs      = résultat?.gs ?? "—";
  const budget  = résultat?.budget   || 0;

  const footerTpl = (page, title) => `
    <div class="footer">
      <span class="fl">PHG ÉDITIONS</span>
      <span>${todayStr()} — ${title}</span>
      <span>Page ${page}</span>
    </div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>PHG BUILD IA — ${nom}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Montserrat:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0A0A0A;color:#EAE2D0;font-family:'Montserrat',sans-serif;font-size:13px;line-height:1.6}
h2{font-family:'Cinzel',serif;color:#C9A84C;font-size:15px;letter-spacing:.04em;border-bottom:1px solid #272727;padding-bottom:8px;margin:24px 0 14px}
h2:first-child{margin-top:0}
.page{width:210mm;min-height:297mm;padding:18mm 20mm;margin:0 auto 0;background:#0A0A0A;page-break-after:always;position:relative}
.page:last-child{page-break-after:auto}
/* cover */
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:255mm;text-align:center;gap:14px}
.glyph{font-size:80px;color:#C9A84C;line-height:1}
.brand{font-family:'Cinzel',serif;font-size:11px;letter-spacing:6px;color:#7A6330}
.divider{width:72px;height:2px;background:linear-gradient(90deg,#7A6330,#C9A84C,#7A6330);margin:10px auto}
.ctitle{font-family:'Cinzel',serif;font-size:30px;color:#C9A84C}
.csub{font-size:11px;color:#808078;letter-spacing:2.5px;text-transform:uppercase}
.cpname{font-family:'Cinzel',serif;font-size:19px;color:#EAE2D0;max-width:80%}
.cmeta{font-size:11px;color:#808078;line-height:2.2}
.cpbadge{display:inline-block;margin-top:10px;padding:3px 14px;border:1px solid #C9A84C;border-radius:20px;font-size:10px;color:#C9A84C;letter-spacing:2px}
/* kpis */
.krow{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}
.kbox{background:#141414;border:1px solid #272727;border-top:2px solid #C9A84C;border-radius:8px;padding:14px;text-align:center}
.klbl{font-size:9px;color:#808078;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.kval{font-family:'Cinzel',serif;font-size:21px;color:#C9A84C}
.ksub{font-size:10px;color:#808078;margin-top:2px}
/* cost lines */
.cl{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px}
.cl.total{font-weight:700;color:#C9A84C;border-top:1px solid #272727;border-bottom:none;padding-top:10px;margin-top:4px}
/* table */
table{width:100%;border-collapse:collapse;font-size:12px;margin:10px 0}
th{background:#141414;color:#C9A84C;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;padding:8px 10px;text-align:left;border-bottom:1px solid #272727}
td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.04)}
.tfoot-r td{font-weight:700;color:#C9A84C;background:rgba(201,168,76,.06)}
/* estimation grid */
.egrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}
.ecard{background:#141414;border:1px solid #272727;border-radius:8px;padding:14px;text-align:center}
.ecard.mid{border-color:#C9A84C;background:rgba(201,168,76,.06)}
.elbl{font-size:9px;color:#808078;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px}
.eval{font-family:'Cinzel',serif;font-size:17px;color:#C9A84C;font-weight:600}
.esub{font-size:10px;color:#808078;margin-top:3px}
/* recs */
.rec{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.rec:last-child{border:none}
.rn{width:22px;height:22px;border-radius:50%;background:rgba(201,168,76,.12);border:1px solid #C9A84C;color:#C9A84C;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.rt{font-size:12px;line-height:1.6}
/* note */
.note{background:#141414;border-left:3px solid #C9A84C;padding:10px 14px;margin:12px 0;font-size:11px;color:#808078;border-radius:0 6px 6px 0;line-height:1.6}
/* footer */
.footer{position:absolute;bottom:10mm;left:20mm;right:20mm;border-top:1px solid #272727;padding-top:7px;display:flex;justify-content:space-between;font-size:9px;color:#505048}
.fl{font-family:'Cinzel',serif;color:#7A6330;letter-spacing:2px}
@media print{body,html{background:#0A0A0A}.page{margin:0;padding:12mm 15mm;width:100%}}
</style>
</head>
<body>

<!-- PAGE 1 — COUVERTURE -->
<div class="page">
  <div class="cover">
    <div>
      <div class="glyph">𓂀</div>
      <div class="brand">PHG BUILD IA</div>
      <div class="divider"></div>
    </div>
    <div class="ctitle">Rapport d'Estimation</div>
    <div class="csub">Ingénierie · Coûts · Matériaux</div>
    <div class="cpname">${nom}</div>
    <div class="cmeta">
      ${country.flag} ${country.name} &nbsp;·&nbsp; ${todayStr()}<br/>
      Surface : ${fmt(surf)} m² &nbsp;·&nbsp; Qualité : ${qual}
    </div>
    <div class="cpbadge">PHG ${planLbl}</div>
  </div>
  ${footerTpl(1, nom)}
</div>

<!-- PAGE 2 — RÉSUMÉ EXÉCUTIF -->
<div class="page">
  <h2>Résumé Exécutif</h2>
  <div class="krow">
    <div class="kbox"><div class="klbl">Surface totale</div><div class="kval">${fmt(surf)}</div><div class="ksub">m²</div></div>
    <div class="kbox"><div class="klbl">Coût total HT</div><div class="kval">${fmt(total)}</div><div class="ksub">${cur}</div></div>
    <div class="kbox"><div class="klbl">Score PHG IA</div><div class="kval">${gs}</div><div class="ksub">/ 100</div></div>
  </div>
  <h2>Décomposition des Coûts</h2>
  <div class="cl"><span>Matériaux</span><span>${fmt(matC)} ${cur}</span></div>
  <div class="cl"><span>Main-d'œuvre</span><span>${fmt(labC)} ${cur}</span></div>
  <div class="cl"><span>Logistique & transport</span><span>${fmt(logC)} ${cur}</span></div>
  <div class="cl"><span>Provision pour risques (8%)</span><span>${fmt(riskC)} ${cur}</span></div>
  <div class="cl total"><span>TOTAL GÉNÉRAL HT</span><span>${fmt(total)} ${cur}</span></div>
  ${budget > 0 ? `
  <h2>Analyse Budgétaire</h2>
  <div class="cl"><span>Budget client</span><span>${fmt(budget)} ${cur}</span></div>
  <div class="cl total"><span style="color:${total <= budget ? '#4CAF6E' : '#C94C4C'}">Écart</span>
    <span style="color:${total <= budget ? '#4CAF6E' : '#C94C4C'}">${total <= budget ? "✓ " : "⚠ "}${fmt(Math.abs(total - budget))} ${cur} ${total <= budget ? "en dessous" : "au-dessus"}</span></div>` : ""}
  <div class="note">Ce rapport est généré par PHG BUILD IA. Les estimations sont indicatives et basées sur les prix de référence ${country.name} ${new Date().getFullYear()}. Prévoir une marge de ±15% selon les fournisseurs locaux et les conditions de chantier.</div>
  ${footerTpl(2, nom)}
</div>

<!-- PAGE 3 — LISTE MATÉRIAUX -->
<div class="page">
  <h2>Liste des Matériaux</h2>
  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th style="text-align:right">Quantité</th>
        <th>Unité</th>
        <th style="text-align:right">PU (${cur})</th>
        <th style="text-align:right">Total (${cur})</th>
      </tr>
    </thead>
    <tbody>${matRows}</tbody>
    <tfoot>
      <tr class="tfoot-r">
        <td colspan="4">TOTAL MATÉRIAUX HT</td>
        <td style="text-align:right">${fmt(matC)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="note">Quantités calculées avec abattement standard 5–8% (chute et pertes). Prix unitaires issus du référentiel PHG ${country.name} ${new Date().getFullYear()}.</div>
  ${footerTpl(3, nom)}
</div>

<!-- PAGE 4 — ESTIMATION FINANCIÈRE -->
<div class="page">
  <h2>Estimation Financière</h2>
  <div class="egrid">
    <div class="ecard"><div class="elbl">Fourchette Basse</div><div class="eval">${fmt(low)}</div><div class="esub">${cur} — Éco (−15%)</div></div>
    <div class="ecard mid"><div class="elbl">★ Estimation Standard</div><div class="eval">${fmt(total)}</div><div class="esub">${cur} — Recommandé</div></div>
    <div class="ecard"><div class="elbl">Fourchette Haute</div><div class="eval">${fmt(high)}</div><div class="esub">${cur} — Premium (+20%)</div></div>
  </div>
  <h2>Répartition par Poste</h2>
  <div class="cl"><span>Matériaux</span><span>${pct(matC, total)}% — ${fmt(matC)} ${cur}</span></div>
  <div class="cl"><span>Main-d'œuvre</span><span>${pct(labC, total)}% — ${fmt(labC)} ${cur}</span></div>
  <div class="cl"><span>Logistique</span><span>${pct(logC, total)}% — ${fmt(logC)} ${cur}</span></div>
  <div class="cl"><span>Provision risques</span><span>${pct(riskC, total)}% — ${fmt(riskC)} ${cur}</span></div>
  ${footerTpl(4, nom)}
</div>

<!-- PAGE 5 — RECOMMANDATIONS -->
<div class="page">
  <h2>Recommandations PHG</h2>
  <div style="margin-top:6px">
    ${PHG_RECS.map((r, i) => `<div class="rec"><div class="rn">${i + 1}</div><div class="rt">${r}</div></div>`).join("")}
  </div>
  <div style="margin-top:36px;text-align:center">
    <div style="font-family:'Cinzel',serif;font-size:40px;color:rgba(201,168,76,.2);margin-bottom:8px">𓂀</div>
    <div style="font-family:'Cinzel',serif;font-size:10px;color:#505048;letter-spacing:3px">PHG BUILD IA</div>
    <div style="font-size:10px;color:#505048;margin-top:4px">Intelligence Artificielle au service de l'ingénierie</div>
  </div>
  ${footerTpl(5, "Confidentiel")}
</div>

</body>
</html>`;
}

// ── In-app CSS ────────────────────────────────────────────────────────────────
const CSS = `
.rp-wrap{font-family:'Montserrat',sans-serif;color:var(--text)}
.rp-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.rp-title{font-family:'Cinzel',serif;font-size:16px;color:var(--gold)}
.rp-sub{font-size:11px;color:var(--dim);margin-top:2px}
.rp-print-btn{padding:10px 24px;background:var(--gold);border:none;border-radius:var(--r,7px);color:#000;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;letter-spacing:.04em;transition:opacity .15s}
.rp-print-btn:hover{opacity:.85}
.rp-preview{background:#141414;border:1px solid var(--border);border-radius:var(--r2,12px);overflow:hidden}
.rp-prev-hd{padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.rp-dot{width:10px;height:10px;border-radius:50%}
.rp-body{padding:24px;max-height:680px;overflow-y:auto}
/* cover preview */
.rp-cover-prev{text-align:center;padding:32px 20px;border:1px solid var(--border);border-radius:var(--r,7px);background:var(--bg);margin-bottom:20px}
.rp-glyph{font-size:52px;color:var(--gold);line-height:1;margin-bottom:6px}
.rp-cttl{font-family:'Cinzel',serif;font-size:18px;color:var(--gold);margin-bottom:4px}
.rp-cpn{font-family:'Cinzel',serif;font-size:13px;color:var(--text);margin-bottom:8px}
.rp-cmeta{font-size:11px;color:var(--dim);line-height:1.8}
/* sections */
.rp-section{margin-bottom:20px}
.rp-stitle{font-family:'Cinzel',serif;font-size:12px;color:var(--gold);letter-spacing:.06em;border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:12px;text-transform:uppercase}
.rp-krow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.rp-kbox{background:var(--bg);border:1px solid var(--border);border-top:2px solid var(--gold);border-radius:var(--r,7px);padding:12px;text-align:center}
.rp-klbl{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;margin-bottom:3px}
.rp-kval{font-family:'Cinzel',serif;font-size:18px;color:var(--gold)}
.rp-ksub{font-size:10px;color:var(--dim);margin-top:1px}
.rp-tbl{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px}
.rp-tbl th{color:var(--dim);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:6px 8px;border-bottom:1px solid var(--border);text-align:left}
.rp-tbl td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.04)}
.rp-tbl .tfr td{font-weight:700;color:var(--gold);background:rgba(201,168,76,.06)}
.rp-cl{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px}
.rp-cl.total{font-weight:700;color:var(--gold);border-top:1px solid var(--border);border-bottom:none;padding-top:8px;margin-top:4px}
.rp-egrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.rp-ecard{background:var(--bg);border:1px solid var(--border);border-radius:var(--r,7px);padding:12px;text-align:center}
.rp-ecard.mid{border-color:var(--gold);background:rgba(201,168,76,.06)}
.rp-elbl{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;margin-bottom:5px}
.rp-eval{font-family:'Cinzel',serif;font-size:15px;color:var(--gold)}
.rp-esub{font-size:10px;color:var(--dim);margin-top:2px}
.rp-rec{display:flex;gap:9px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px}
.rp-rec:last-child{border:none}
.rp-rn{width:20px;height:20px;border-radius:50%;background:rgba(201,168,76,.12);border:1px solid var(--gold);color:var(--gold);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.rp-empty{text-align:center;padding:48px 20px;color:var(--dim)}
.rp-empty-g{font-size:36px;opacity:.25;margin-bottom:10px}
.rp-note{background:var(--panel);border-left:3px solid var(--gold);padding:8px 12px;margin:10px 0;font-size:11px;color:var(--dim);border-radius:0 5px 5px 0;line-height:1.5}
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function RapportPDF({ projet, résultat, pays = "FR", plan = "free" }) {
  const [printing, setPrinting] = useState(false);

  const country = COUNTRY_MAP[pays] || { name: pays || "—", flag: "" };
  const qual    = QUAL_LABELS[projet?.qualite] || "Standard";
  const nom     = projet?.nom || "Projet de construction";
  const surf    = résultat?.surf || projet?.surface || "—";
  const cur     = résultat?.cur  || "€";
  const total   = résultat?.total   || 0;
  const matC    = résultat?.matCost || 0;
  const labC    = résultat?.labCost || 0;
  const riskC   = résultat?.risk    || 0;
  const gs      = résultat?.gs ?? "—";
  const low     = Math.round(total * 0.85);
  const high    = Math.round(total * 1.20);

  const handlePrint = () => {
    setPrinting(true);
    const html = buildHTML(projet, résultat, pays, plan);
    const win  = window.open("", "_blank", "width=900,height=760,scrollbars=yes");
    if (!win) { alert("Autorisez les pop-ups pour générer le rapport."); setPrinting(false); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); setPrinting(false); }, 600);
  };

  return (
    <div className="rp-wrap">
      <style>{CSS}</style>

      {/* Header */}
      <div className="rp-header">
        <div>
          <div className="rp-title">Rapport d'Estimation — {nom}</div>
          <div className="rp-sub">
            {country.flag} {country.name} &nbsp;·&nbsp; {qual} &nbsp;·&nbsp; {todayStr()}
          </div>
        </div>
        <button className="rp-print-btn" onClick={handlePrint} disabled={printing}>
          <span style={{ fontSize: 16 }}>𓂀</span>
          {printing ? "Génération…" : "Imprimer / Sauvegarder en PDF"}
        </button>
      </div>

      {/* Preview window */}
      <div className="rp-preview">
        {/* Fake window chrome */}
        <div className="rp-prev-hd">
          <div className="rp-dot" style={{ background: "#C94C4C" }} />
          <div className="rp-dot" style={{ background: "#E8A94C" }} />
          <div className="rp-dot" style={{ background: "#4CAF6E" }} />
          <span style={{ marginLeft: 10, fontSize: 11, color: "var(--dim)" }}>
            Aperçu du rapport — PHG BUILD IA
          </span>
        </div>

        <div className="rp-body">
          {!résultat ? (
            <div className="rp-empty">
              <div className="rp-empty-g">𓂀</div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Aucun projet calculé</div>
              <div style={{ fontSize: 11 }}>
                Lancez une estimation depuis l'onglet <strong>Maison</strong> ou <strong>Infrastructure</strong> pour générer le rapport.
              </div>
            </div>
          ) : (
            <>
              {/* Cover preview */}
              <div className="rp-cover-prev">
                <div className="rp-glyph">𓂀</div>
                <div className="rp-cttl">Rapport d'Estimation</div>
                <div className="rp-cpn">{nom}</div>
                <div className="rp-cmeta">
                  {country.flag} {country.name} &nbsp;·&nbsp; {todayStr()}<br />
                  Surface : {typeof surf === "number" ? fmt(surf) : surf} m² &nbsp;·&nbsp; Qualité : {qual}
                </div>
              </div>

              {/* Executive summary */}
              <div className="rp-section">
                <div className="rp-stitle">Résumé Exécutif</div>
                <div className="rp-krow">
                  <div className="rp-kbox">
                    <div className="rp-klbl">Surface</div>
                    <div className="rp-kval">{typeof surf === "number" ? fmt(surf) : surf}</div>
                    <div className="rp-ksub">m²</div>
                  </div>
                  <div className="rp-kbox">
                    <div className="rp-klbl">Total HT</div>
                    <div className="rp-kval">{fmt(total)}</div>
                    <div className="rp-ksub">{cur}</div>
                  </div>
                  <div className="rp-kbox">
                    <div className="rp-klbl">Score PHG IA</div>
                    <div className="rp-kval">{gs}</div>
                    <div className="rp-ksub">/ 100</div>
                  </div>
                </div>
                <div className="rp-cl"><span>Matériaux</span><span>{fmt(matC)} {cur}</span></div>
                <div className="rp-cl"><span>Main-d'œuvre</span><span>{fmt(labC)} {cur}</span></div>
                <div className="rp-cl"><span>Logistique</span><span>{fmt(résultat.logCost || 0)} {cur}</span></div>
                <div className="rp-cl"><span>Provision risques</span><span>{fmt(riskC)} {cur}</span></div>
                <div className="rp-cl total"><span>TOTAL HT</span><span>{fmt(total)} {cur}</span></div>
              </div>

              {/* Materials */}
              {résultat.materials?.length > 0 && (
                <div className="rp-section">
                  <div className="rp-stitle">Liste des Matériaux</div>
                  <table className="rp-tbl">
                    <thead>
                      <tr>
                        <th>Désignation</th>
                        <th style={{ textAlign: "right" }}>Qté</th>
                        <th>Unité</th>
                        <th style={{ textAlign: "right" }}>PU</th>
                        <th style={{ textAlign: "right" }}>Total {cur}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {résultat.materials.map((m, i) => (
                        <tr key={i}>
                          <td>{m.n}</td>
                          <td style={{ textAlign: "right" }}>{fmt(m.q)}</td>
                          <td style={{ color: "var(--dim)" }}>{m.u}</td>
                          <td style={{ textAlign: "right", color: "var(--dim)" }}>{fmt(Math.round(m.pu))}</td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "var(--gold)" }}>{fmt(m.t)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="tfr">
                        <td colSpan={4} style={{ fontWeight: 700, color: "var(--gold)" }}>TOTAL MATÉRIAUX</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--gold)" }}>{fmt(matC)} {cur}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Estimation */}
              <div className="rp-section">
                <div className="rp-stitle">Estimation Financière</div>
                <div className="rp-egrid">
                  <div className="rp-ecard">
                    <div className="rp-elbl">Fourchette Basse</div>
                    <div className="rp-eval">{fmt(low)}</div>
                    <div className="rp-esub">{cur} — −15%</div>
                  </div>
                  <div className="rp-ecard mid">
                    <div className="rp-elbl">★ Standard</div>
                    <div className="rp-eval">{fmt(total)}</div>
                    <div className="rp-esub">{cur} — Recommandé</div>
                  </div>
                  <div className="rp-ecard">
                    <div className="rp-elbl">Fourchette Haute</div>
                    <div className="rp-eval">{fmt(high)}</div>
                    <div className="rp-esub">{cur} — +20%</div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="rp-section">
                <div className="rp-stitle">Recommandations PHG</div>
                {PHG_RECS.slice(0, 4).map((r, i) => (
                  <div key={i} className="rp-rec">
                    <div className="rp-rn">{i + 1}</div>
                    <div style={{ fontSize: 11, lineHeight: 1.55 }}>{r}</div>
                  </div>
                ))}
                <div className="rp-note">+ {PHG_RECS.length - 4} recommandations supplémentaires dans le rapport complet imprimé.</div>
              </div>

              {/* Print hint */}
              <div style={{ textAlign: "center", padding: "16px 0 6px", fontSize: 11, color: "var(--dim)" }}>
                Cliquez sur <strong style={{ color: "var(--gold)" }}>Imprimer / Sauvegarder en PDF</strong> pour obtenir le rapport complet 5 pages.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
