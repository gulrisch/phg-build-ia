import { useState, useMemo } from "react";

// ── Reference PHG breakdown (% of total per poste) ────────────────────────────
const POSTES = [
  { id: "maconnerie",  label: "Maçonnerie",  pct: 35 },
  { id: "electricite", label: "Électricité", pct: 12 },
  { id: "plomberie",   label: "Plomberie",   pct: 10 },
  { id: "finitions",   label: "Finitions",   pct: 20 },
  { id: "toiture",     label: "Toiture",     pct: 13 },
  { id: "autres",      label: "Autres",      pct: 10 },
];

const COLORS = ["#C9A84C", "#7AABC9", "#9A7AC9"];
const DEVIS_LABELS = ["Devis A", "Devis B", "Devis C"];

const empty = () => ({
  nom: "",
  total: "",
  postes: { maconnerie: "", electricite: "", plomberie: "", finitions: "", toiture: "", autres: "" },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("fr-FR");
const pctFmt = (n) => (n > 0 ? "+" : "") + n.toFixed(1) + "%";
const pctColor = (v) => (Math.abs(v) <= 10 ? "var(--ok)" : Math.abs(v) <= 25 ? "var(--warn)" : "var(--err)");

function computeScore(devis, refTotal) {
  const total = Number(devis.total);
  if (!total || !refTotal) return null;
  let score = 100;
  const ecartTotal = Math.abs(total - refTotal) / refTotal;
  if (ecartTotal > 0.35) score -= 35;
  else if (ecartTotal > 0.20) score -= 20;
  else if (ecartTotal > 0.10) score -= 10;

  POSTES.forEach((p) => {
    const ref = refTotal * (p.pct / 100);
    const val = Number(devis.postes[p.id]);
    if (!val) return;
    const e = Math.abs(val - ref) / ref;
    if (e > 0.45) score -= 10;
    else if (e > 0.30) score -= 6;
    else if (e > 0.15) score -= 3;
  });
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLabel(s) {
  if (s === null) return { t: "—",        c: "var(--dim)"  };
  if (s >= 80)   return { t: "Fiable",    c: "var(--ok)"   };
  if (s >= 60)   return { t: "Acceptable",c: "var(--warn)"  };
  return               { t: "Suspect",   c: "var(--err)"  };
}

function buildRecommendation(devisArr, refTotal, scores) {
  const valid = devisArr
    .map((d, i) => ({ d, i, s: scores[i] }))
    .filter((x) => x.d.nom && Number(x.d.total) && x.s !== null);
  if (!valid.length || !refTotal) return null;
  valid.sort((a, b) => b.s - a.s);
  const best = valid[0];
  const label = best.d.nom || DEVIS_LABELS[best.i];
  const total = Number(best.d.total);
  const ecart = ((total - refTotal) / refTotal) * 100;
  const cheaper = valid.filter((x) => Number(x.d.total) < total);
  let note = "";
  if (cheaper.length) {
    const c = cheaper[0];
    note = ` ${c.d.nom || DEVIS_LABELS[c.i]} est moins cher (${fmt(Number(c.d.total))} €) mais son score de fiabilité est plus faible (${c.s}/100).`;
  }
  return { label, score: best.s, ecart, note };
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
.cd{font-family:'Montserrat',sans-serif;color:var(--text)}
.cd-intro{font-size:12px;color:var(--dim);margin-bottom:18px;line-height:1.6;padding:10px 14px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:0 var(--r,7px) var(--r,7px) 0}
/* ref row */
.cd-ref-row{display:flex;align-items:flex-end;gap:14px;margin-bottom:20px;flex-wrap:wrap}
.cd-fg{display:flex;flex-direction:column;gap:4px}
.cd-lbl{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px}
.cd-in{background:var(--panel);border:1px solid var(--border);border-radius:var(--r,7px);color:var(--text);padding:7px 10px;font-size:12px;outline:none;font-family:inherit;transition:border .15s}
.cd-in:focus{border-color:var(--gold)}
.cd-in-gold{border-color:var(--gold);color:var(--gold);font-weight:600}
/* devis grid */
.cd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:22px}
.cd-dcard{background:var(--panel);border:1px solid var(--border);border-radius:var(--r2,12px);overflow:hidden}
.cd-dhd{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.cd-dcol{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.cd-dname-in{background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--text);font-size:13px;font-weight:600;outline:none;font-family:inherit;padding:2px 4px;flex:1}
.cd-dname-in:focus{border-bottom-color:var(--gold)}
.cd-dbody{padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.cd-dtotal{font-family:'Cinzel',serif;font-size:18px;color:var(--gold);text-align:center;padding:8px 0;border-bottom:1px solid var(--border)}
.cd-postes{display:flex;flex-direction:column;gap:6px}
.cd-poste-row{display:flex;align-items:center;gap:8px}
.cd-plbl{font-size:10px;color:var(--dim);min-width:80px}
.cd-pin{width:90px;text-align:right;padding:4px 7px;font-size:11px}
.cd-punit{font-size:10px;color:var(--dim)}
/* comparison table */
.cd-tbl-wrap{overflow-x:auto;margin-bottom:22px}
.cd-tbl{width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap}
.cd-tbl th{background:var(--panel);color:var(--dim);font-size:9px;text-transform:uppercase;letter-spacing:.08em;padding:8px 10px;border-bottom:1px solid var(--border);text-align:left;position:sticky;top:0}
.cd-tbl th.num{text-align:right}
.cd-tbl td{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.04)}
.cd-tbl td.num{text-align:right;font-variant-numeric:tabular-nums}
.cd-tbl tr:hover td{background:rgba(255,255,255,.015)}
.cd-tbl .subtotal td{font-weight:700;color:var(--gold);background:rgba(201,168,76,.05)}
.cd-ecart{font-size:10px;font-weight:700}
/* bar chart */
.cd-chart{margin-bottom:22px}
.cd-chart-title{font-family:'Cinzel',serif;font-size:11px;color:var(--gold);letter-spacing:.06em;margin-bottom:12px;text-transform:uppercase}
.cd-chart-row{margin-bottom:12px}
.cd-chart-label{font-size:11px;color:var(--dim);margin-bottom:4px}
.cd-bars{display:flex;flex-direction:column;gap:3px}
.cd-bar-row{display:flex;align-items:center;gap:8px}
.cd-bar-name{font-size:10px;color:var(--dim);width:56px;flex-shrink:0;text-align:right}
.cd-bar-track{flex:1;height:14px;background:var(--border);border-radius:4px;overflow:hidden;position:relative}
.cd-bar-fill{height:100%;border-radius:4px;transition:width .4s ease;min-width:2px}
.cd-bar-val{font-size:9px;font-weight:600;margin-left:6px;min-width:60px}
/* ref line */
.cd-ref-line{position:absolute;top:0;bottom:0;width:2px;background:rgba(255,255,255,.25)}
/* scores */
.cd-scores{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:22px}
.cd-scard{background:var(--panel);border:1px solid var(--border);border-radius:var(--r2,12px);padding:16px;text-align:center;position:relative}
.cd-sdot{width:10px;height:10px;border-radius:50%;position:absolute;top:12px;right:12px}
.cd-sname{font-size:11px;color:var(--dim);margin-bottom:8px;font-weight:600}
.cd-snum{font-family:'Cinzel',serif;font-size:34px;margin-bottom:4px}
.cd-slbl{font-size:10px;font-weight:700}
.cd-secart{font-size:10px;color:var(--dim);margin-top:3px}
/* recommendation */
.cd-rec{background:rgba(201,168,76,.07);border:1.5px solid var(--gold);border-radius:var(--r2,12px);padding:18px;margin-bottom:14px}
.cd-rec-ttl{font-family:'Cinzel',serif;font-size:12px;color:var(--gold);letter-spacing:.06em;margin-bottom:8px}
.cd-rec-body{font-size:12px;line-height:1.7}
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function ComparateurDevis({ plan = "free", lang = "fr" }) {
  const [refTotal, setRefTotal]   = useState("");
  const [currency, setCurrency]   = useState("€");
  const [devis, setDevis]         = useState([empty(), empty(), empty()]);
  const [showChart, setShowChart] = useState(true);

  const ref = Number(refTotal) || 0;

  // ── Per-poste reference amounts ──────────────────────────────────────────
  const refPostes = useMemo(
    () => Object.fromEntries(POSTES.map((p) => [p.id, ref * (p.pct / 100)])),
    [ref]
  );

  // ── Scores ───────────────────────────────────────────────────────────────
  const scores = useMemo(
    () => devis.map((d) => computeScore(d, ref)),
    [devis, ref]
  );

  // ── Recommendation ────────────────────────────────────────────────────────
  const rec = useMemo(
    () => buildRecommendation(devis, ref, scores),
    [devis, ref, scores]
  );

  // ── Mutation helpers ──────────────────────────────────────────────────────
  const setField = (i, key, val) =>
    setDevis((prev) => prev.map((d, idx) => idx !== i ? d : { ...d, [key]: val }));
  const setPoste = (i, posteId, val) =>
    setDevis((prev) => prev.map((d, idx) => idx !== i ? d : { ...d, postes: { ...d.postes, [posteId]: val } }));

  // ── Bar chart max per poste ───────────────────────────────────────────────
  const maxByPoste = useMemo(
    () =>
      Object.fromEntries(
        POSTES.map((p) => {
          const vals = [refPostes[p.id], ...devis.map((d) => Number(d.postes[p.id]) || 0)];
          return [p.id, Math.max(...vals, 1)];
        })
      ),
    [devis, refPostes]
  );

  const activeDevis = devis.filter((d) => d.nom || Number(d.total));

  return (
    <div className="cd">
      <style>{CSS}</style>

      <div className="cd-intro">
        Saisissez jusqu'à 3 devis d'entrepreneurs et renseignez l'estimation PHG de référence. L'IA analyse chaque devis poste par poste, détecte les sur/sous-estimations et recommande le devis le plus cohérent.
      </div>

      {/* Référence PHG */}
      <div className="cd-ref-row">
        <div className="cd-fg" style={{ flex: 1, maxWidth: 280 }}>
          <span className="cd-lbl">Estimation PHG de référence</span>
          <input
            className="cd-in cd-in-gold"
            type="number"
            min="0"
            placeholder="Ex. 85 000"
            value={refTotal}
            onChange={(e) => setRefTotal(e.target.value)}
          />
        </div>
        <div className="cd-fg">
          <span className="cd-lbl">Devise</span>
          <select
            className="cd-in"
            style={{ width: 90 }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option>€</option>
            <option>FCFA</option>
            <option>CHF</option>
            <option>MAD</option>
            <option>CAD</option>
          </select>
        </div>
        {ref > 0 && (
          <div style={{ fontSize: 11, color: "var(--dim)", paddingBottom: 8 }}>
            {POSTES.map((p) => (
              <span key={p.id} style={{ marginRight: 10 }}>
                <span style={{ color: "var(--gold)" }}>{p.label}</span>{" "}
                {fmt(Math.round(refPostes[p.id]))} {currency}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Devis forms */}
      <div className="cd-grid">
        {devis.map((d, i) => (
          <div key={i} className="cd-dcard">
            <div className="cd-dhd">
              <div className="cd-dcol" style={{ background: COLORS[i] }} />
              <input
                className="cd-dname-in"
                placeholder={`Entrepreneur ${i + 1}`}
                value={d.nom}
                onChange={(e) => setField(i, "nom", e.target.value)}
              />
            </div>
            <div className="cd-dbody">
              <div className="cd-fg">
                <span className="cd-lbl">Montant total ({currency})</span>
                <input
                  className="cd-in"
                  type="number"
                  min="0"
                  placeholder="Montant HT"
                  value={d.total}
                  onChange={(e) => setField(i, "total", e.target.value)}
                />
              </div>
              {Number(d.total) > 0 && (
                <div className="cd-dtotal">{fmt(Number(d.total))} {currency}</div>
              )}
              <div className="cd-postes">
                {POSTES.map((p) => {
                  const val = Number(d.postes[p.id]) || 0;
                  const refV = refPostes[p.id];
                  const ecart = refV > 0 && val > 0 ? ((val - refV) / refV) * 100 : null;
                  return (
                    <div key={p.id} className="cd-poste-row">
                      <span className="cd-plbl">{p.label}</span>
                      <input
                        className="cd-in cd-pin"
                        type="number"
                        min="0"
                        placeholder={ref > 0 ? fmt(Math.round(refPostes[p.id])) : "—"}
                        value={d.postes[p.id]}
                        onChange={(e) => setPoste(i, p.id, e.target.value)}
                      />
                      {ecart !== null && (
                        <span className="cd-ecart" style={{ color: pctColor(ecart) }}>
                          {pctFmt(ecart)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Only show analysis if reference + at least 1 devis with total */}
      {ref > 0 && activeDevis.length > 0 ? (
        <>
          {/* Comparison table */}
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "var(--gold)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>
            Tableau comparatif
          </div>
          <div className="cd-tbl-wrap">
            <table className="cd-tbl">
              <thead>
                <tr>
                  <th>Poste</th>
                  <th className="num">Réf. PHG</th>
                  {devis.map((d, i) => (
                    (d.nom || Number(d.total)) && (
                      <th key={i} className="num" style={{ color: COLORS[i] }}>
                        {d.nom || DEVIS_LABELS[i]}
                      </th>
                    )
                  ))}
                  {devis.map((d, i) => (
                    (d.nom || Number(d.total)) && (
                      <th key={`e${i}`} className="num" style={{ color: COLORS[i], opacity: .7 }}>
                        Écart {i === 0 ? "A" : i === 1 ? "B" : "C"}
                      </th>
                    )
                  ))}
                </tr>
              </thead>
              <tbody>
                {POSTES.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{p.label}</span>
                      <span style={{ fontSize: 9, color: "var(--dim)", marginLeft: 6 }}>{p.pct}%</span>
                    </td>
                    <td className="num" style={{ color: "var(--gold)", fontWeight: 600 }}>
                      {fmt(Math.round(refPostes[p.id]))} {currency}
                    </td>
                    {devis.map((d, i) => {
                      if (!d.nom && !Number(d.total)) return null;
                      const val = Number(d.postes[p.id]) || 0;
                      return (
                        <td key={i} className="num">
                          {val > 0 ? `${fmt(val)} ${currency}` : <span style={{ color: "var(--dim)" }}>—</span>}
                        </td>
                      );
                    })}
                    {devis.map((d, i) => {
                      if (!d.nom && !Number(d.total)) return null;
                      const val = Number(d.postes[p.id]);
                      const refV = refPostes[p.id];
                      if (!val || !refV) return <td key={`e${i}`} className="num"><span style={{ color: "var(--dim)" }}>—</span></td>;
                      const e = ((val - refV) / refV) * 100;
                      return (
                        <td key={`e${i}`} className="num">
                          <span className="cd-ecart" style={{ color: pctColor(e) }}>{pctFmt(e)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="subtotal">
                  <td>TOTAL</td>
                  <td className="num">{fmt(ref)} {currency}</td>
                  {devis.map((d, i) => {
                    if (!d.nom && !Number(d.total)) return null;
                    const t = Number(d.total);
                    return <td key={i} className="num">{t > 0 ? `${fmt(t)} ${currency}` : "—"}</td>;
                  })}
                  {devis.map((d, i) => {
                    if (!d.nom && !Number(d.total)) return null;
                    const t = Number(d.total);
                    if (!t) return <td key={`e${i}`} className="num">—</td>;
                    const e = ((t - ref) / ref) * 100;
                    return (
                      <td key={`e${i}`} className="num">
                        <span className="cd-ecart" style={{ color: pctColor(e) }}>{pctFmt(e)}</span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "var(--gold)", letterSpacing: ".06em", textTransform: "uppercase" }}>
              Graphique par poste
            </div>
            <button
              onClick={() => setShowChart((v) => !v)}
              style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--r,7px)", color: "var(--dim)", fontSize: 10, padding: "3px 10px", cursor: "pointer" }}
            >
              {showChart ? "Masquer" : "Afficher"}
            </button>
          </div>

          {showChart && (
            <div className="cd-chart">
              {POSTES.map((p) => {
                const refV = refPostes[p.id];
                const maxV = maxByPoste[p.id];
                return (
                  <div key={p.id} className="cd-chart-row">
                    <div className="cd-chart-label">{p.label}</div>
                    <div className="cd-bars">
                      {/* Reference bar */}
                      <div className="cd-bar-row">
                        <span className="cd-bar-name" style={{ color: "var(--dim)" }}>PHG Réf.</span>
                        <div className="cd-bar-track">
                          <div
                            className="cd-bar-fill"
                            style={{
                              width: `${(refV / maxV) * 100}%`,
                              background: "rgba(201,168,76,.4)",
                              border: "1px dashed var(--gold)",
                            }}
                          />
                        </div>
                        <span className="cd-bar-val" style={{ color: "var(--gold)" }}>
                          {fmt(Math.round(refV))} {currency}
                        </span>
                      </div>
                      {/* Devis bars */}
                      {devis.map((d, i) => {
                        if (!d.nom && !Number(d.total)) return null;
                        const val = Number(d.postes[p.id]) || 0;
                        const refPct = refV > 0 ? ((val - refV) / refV) * 100 : 0;
                        return (
                          <div key={i} className="cd-bar-row">
                            <span className="cd-bar-name" style={{ color: COLORS[i] }}>
                              {d.nom || DEVIS_LABELS[i]}
                            </span>
                            <div className="cd-bar-track">
                              {val > 0 ? (
                                <div
                                  className="cd-bar-fill"
                                  style={{
                                    width: `${(val / maxV) * 100}%`,
                                    background: COLORS[i] + "88",
                                    border: `1px solid ${COLORS[i]}`,
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: 9, color: "var(--dim)", paddingLeft: 6 }}>non renseigné</span>
                              )}
                            </div>
                            <span className="cd-bar-val" style={{ color: val > 0 ? pctColor(refPct) : "var(--dim)" }}>
                              {val > 0 ? `${fmt(val)} ${currency}` : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Scores */}
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "var(--gold)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>
            Scores de fiabilité
          </div>
          <div className="cd-scores">
            {devis.map((d, i) => {
              if (!d.nom && !Number(d.total)) return null;
              const s = scores[i];
              const { t: slbl, c: sc } = scoreLabel(s);
              const total = Number(d.total);
              const ecart = total && ref ? ((total - ref) / ref) * 100 : null;
              return (
                <div key={i} className="cd-scard">
                  <div className="cd-sdot" style={{ background: COLORS[i] }} />
                  <div className="cd-sname">{d.nom || DEVIS_LABELS[i]}</div>
                  <div className="cd-snum" style={{ color: s !== null ? sc : "var(--dim)" }}>
                    {s !== null ? s : "—"}
                  </div>
                  <div className="cd-slbl" style={{ color: sc }}>{slbl}</div>
                  {ecart !== null && (
                    <div className="cd-secart" style={{ color: pctColor(ecart) }}>
                      {pctFmt(ecart)} vs PHG
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recommendation */}
          {rec && (
            <div className="cd-rec">
              <div className="cd-rec-ttl">Recommandation PHG IA</div>
              <div className="cd-rec-body">
                <strong style={{ color: "var(--gold)" }}>{rec.label}</strong> est le devis le plus cohérent avec un score de fiabilité de{" "}
                <strong style={{ color: "var(--ok)" }}>{rec.score}/100</strong>.
                {Math.abs(rec.ecart) <= 10 ? (
                  <> Son montant total est dans la fourchette PHG ({pctFmt(rec.ecart)}). </>
                ) : rec.ecart < 0 ? (
                  <> Attention : il est <span style={{ color: "var(--warn)" }}>{pctFmt(rec.ecart)} en dessous</span> de la référence — vérifiez que tous les postes sont bien inclus dans son périmètre. </>
                ) : (
                  <> Il est <span style={{ color: "var(--warn)" }}>{pctFmt(rec.ecart)} au-dessus</span> de la référence PHG — demandez une justification détaillée poste par poste. </>
                )}
                {rec.note}
              </div>
            </div>
          )}
        </>
      ) : ref === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--dim)", fontSize: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: .3 }}>⬡</div>
          Renseignez d'abord l'estimation PHG de référence pour démarrer la comparaison.
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--dim)", fontSize: 12 }}>
          Ajoutez le montant d'au moins un devis pour voir l'analyse.
        </div>
      )}
    </div>
  );
}
