import { useState, useRef, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split("T")[0];

const PHASES_INIT = [
  { id: "prep",   label: "Préparation",  seq: 1, status: "done",        pct: 100, notes: "Site installé, permis de construire obtenu.",            planned: "2025-01-15", actual: "2025-01-14", photos: [] },
  { id: "fond",   label: "Fondations",   seq: 2, status: "done",        pct: 100, notes: "Semelles filantes coulées, réception béton effectuée.",    planned: "2025-02-10", actual: "2025-02-13", photos: [] },
  { id: "gros",   label: "Gros œuvre",   seq: 3, status: "in_progress", pct: 65,  notes: "Murs R+1 en cours — voile béton côté nord à compléter.", planned: "2025-04-30", actual: "",           photos: [] },
  { id: "second", label: "Second œuvre", seq: 4, status: "todo",        pct: 0,   notes: "",                                                         planned: "2025-06-15", actual: "",           photos: [] },
  { id: "fini",   label: "Finitions",    seq: 5, status: "todo",        pct: 0,   notes: "",                                                         planned: "2025-08-15", actual: "",           photos: [] },
  { id: "recep",  label: "Réception",    seq: 6, status: "todo",        pct: 0,   notes: "",                                                         planned: "2025-09-30", actual: "",           photos: [] },
];

const STATUS_META = {
  todo:        { label: "À faire",   color: "var(--dim,#808078)",    bg: "rgba(128,128,120,.12)" },
  in_progress: { label: "En cours",  color: "var(--gold,#C9A84C)",   bg: "rgba(201,168,76,.12)"  },
  done:        { label: "Terminé",   color: "var(--ok,#4CAF6E)",     bg: "rgba(76,175,110,.12)"  },
  late:        { label: "En retard", color: "var(--err,#C94C4C)",    bg: "rgba(201,76,76,.12)"   },
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
.sc{font-family:'Montserrat',sans-serif;color:var(--text)}
/* header */
.sc-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:20px;flex-wrap:wrap}
.sc-title-row{display:flex;align-items:center;gap:10px}
.sc-proj-input{background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--gold);font-family:'Cinzel',serif;font-size:17px;font-weight:600;width:280px;padding:2px 4px;outline:none;letter-spacing:.04em}
.sc-proj-input:focus{border-bottom-color:var(--gold)}
.sc-sub{font-size:11px;color:var(--dim);margin-top:3px}
/* global bar */
.sc-gbar{background:var(--panel);border:1px solid var(--border);border-radius:var(--r2,12px);padding:16px 20px;margin-bottom:18px;display:flex;align-items:center;gap:20px}
.sc-gpct{font-family:'Cinzel',serif;font-size:32px;color:var(--gold);min-width:60px}
.sc-ginfo{flex:1}
.sc-glbl{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px}
.sc-gtrack{height:8px;background:var(--border);border-radius:4px;overflow:hidden}
.sc-gfill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--gold3,#7A6330),var(--gold,#C9A84C));transition:width .6s ease}
.sc-gstats{display:flex;gap:16px;margin-top:8px;flex-wrap:wrap}
.sc-gstat{font-size:10px;color:var(--dim);display:flex;align-items:center;gap:4px}
.sc-gstat span{font-weight:700}
/* timeline */
.sc-tl{display:flex;align-items:center;margin-bottom:20px;overflow-x:auto;padding:4px 0}
.sc-tl-node{display:flex;flex-direction:column;align-items:center;flex:1;min-width:80px;position:relative;cursor:pointer}
.sc-tl-circle{width:34px;height:34px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;transition:all .2s;z-index:1;background:var(--bg,#0A0A0A)}
.sc-tl-circle.active{width:38px;height:38px;box-shadow:0 0 0 3px rgba(201,168,76,.25)}
.sc-tl-line{flex:1;height:2px;background:var(--border);margin:0 -2px;margin-top:-19px;z-index:0;min-width:20px;transition:background .3s}
.sc-tl-label{font-size:9px;margin-top:6px;text-align:center;color:var(--dim);letter-spacing:.5px;white-space:nowrap;max-width:72px;overflow:hidden;text-overflow:ellipsis}
.sc-tl-pct{font-size:9px;font-weight:700;margin-top:1px}
/* phase grid */
.sc-pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.sc-card{border:1px solid var(--border);border-radius:var(--r2,12px);background:var(--panel);overflow:hidden;transition:border-color .2s}
.sc-card.active-card{border-color:var(--gold)}
.sc-card.late-card{border-color:var(--err,#C94C4C)}
.sc-card-hd{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--border)}
.sc-seq{width:24px;height:24px;border-radius:50%;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--dim);flex-shrink:0}
.sc-phase-name{font-size:13px;font-weight:600;flex:1}
.sc-stag{font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;cursor:pointer;border:none;outline:none}
.sc-late-alert{display:flex;align-items:center;gap:6px;padding:7px 14px;background:rgba(201,76,76,.09);border-bottom:1px solid rgba(201,76,76,.25);font-size:11px;color:var(--err,#C94C4C)}
.sc-body{padding:14px 16px;display:flex;flex-direction:column;gap:10px}
/* progress */
.sc-pct-row{display:flex;align-items:center;gap:10px}
.sc-pct-lbl{font-size:10px;color:var(--dim);min-width:70px}
.sc-pct-track{flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden;cursor:pointer;position:relative}
.sc-pct-fill{height:100%;border-radius:3px;transition:width .3s}
.sc-pct-in{width:50px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:3px 6px;font-size:11px;text-align:right;outline:none}
.sc-pct-in:focus{border-color:var(--gold)}
/* dates */
.sc-dates{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sc-date-group{display:flex;flex-direction:column;gap:3px}
.sc-date-lbl{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1.5px}
.sc-date-in{background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 8px;font-size:11px;outline:none;width:100%;font-family:inherit}
.sc-date-in:focus{border-color:var(--gold)}
.sc-date-ok{color:var(--ok,#4CAF6E);font-size:10px;margin-top:2px}
.sc-date-late{color:var(--err,#C94C4C);font-size:10px;margin-top:2px}
/* notes */
.sc-notes{background:var(--bg);border:1px solid var(--border);border-radius:var(--r,7px);color:var(--text);padding:8px 10px;font-size:11px;resize:none;outline:none;font-family:inherit;line-height:1.5;width:100%}
.sc-notes:focus{border-color:var(--gold)}
/* photos */
.sc-photo-area{border:1px dashed var(--border);border-radius:var(--r,7px);padding:10px;cursor:pointer;transition:border-color .15s,background .15s}
.sc-photo-area:hover{border-color:var(--gold);background:rgba(201,168,76,.04)}
.sc-photo-drop-lbl{font-size:10px;color:var(--dim);text-align:center;padding:4px 0}
.sc-thumbs{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.sc-thumb{position:relative;width:50px;height:50px;border-radius:4px;overflow:hidden;border:1px solid var(--border)}
.sc-thumb img{width:100%;height:100%;object-fit:cover}
.sc-tdel{position:absolute;top:1px;right:1px;width:14px;height:14px;border-radius:50%;background:rgba(0,0,0,.8);border:none;color:#fff;font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
/* status selector */
.sc-status-sel{display:flex;gap:4px;flex-wrap:wrap}
.sc-ss-btn{font-size:9px;font-weight:700;padding:3px 9px;border-radius:10px;cursor:pointer;border:1px solid;transition:all .15s}
/* summary footer */
.sc-summary{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-top:20px}
.sc-scard{background:var(--panel);border:1px solid var(--border);border-radius:var(--r,7px);padding:12px;text-align:center}
.sc-slbl{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.sc-sval{font-family:'Cinzel',serif;font-size:20px;color:var(--gold)}
.sc-ssub{font-size:10px;color:var(--dim);margin-top:2px}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const isLate = (ph) => {
  if (ph.status === "done") return false;
  if (!ph.planned) return false;
  return ph.planned < TODAY;
};

const effectiveStatus = (ph) => (isLate(ph) ? "late" : ph.status);

const statusColor = (s) => STATUS_META[s]?.color || STATUS_META.todo.color;
const statusBg    = (s) => STATUS_META[s]?.bg    || STATUS_META.todo.bg;

// ── Component ─────────────────────────────────────────────────────────────────
export default function SuiviChantier({ plan = "free", lang = "fr" }) {
  const [projName, setProjName]   = useState("Villa Cocody — Chantier R+1");
  const [phases, setPhases]       = useState(PHASES_INIT);
  const [activeId, setActiveId]   = useState("gros");
  const [dragOver, setDragOver]   = useState(null);
  const fileRefs = useRef({});

  // ── Derived ────────────────────────────────────────────────────────────────
  const globalPct  = Math.round(phases.reduce((s, p) => s + p.pct, 0) / phases.length);
  const countDone  = phases.filter((p) => p.status === "done").length;
  const countWIP   = phases.filter((p) => p.status === "in_progress").length;
  const countLate  = phases.filter(isLate).length;

  // ── Mutators ───────────────────────────────────────────────────────────────
  const updatePhase = useCallback((id, patch) => {
    setPhases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const addPhotos = useCallback((id, files) => {
    const items = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    setPhases((prev) =>
      prev.map((p) => p.id === id ? { ...p, photos: [...p.photos, ...items].slice(0, 8) } : p)
    );
  }, []);

  const removePhoto = useCallback((phId, idx) => {
    setPhases((prev) =>
      prev.map((p) => {
        if (p.id !== phId) return p;
        const arr = [...p.photos];
        URL.revokeObjectURL(arr[idx].url);
        arr.splice(idx, 1);
        return { ...p, photos: arr };
      })
    );
  }, []);

  const handlePctSlider = useCallback((id, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const val  = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const pct  = Math.max(0, Math.min(100, val));
    const st   = pct === 100 ? "done" : pct > 0 ? "in_progress" : "todo";
    updatePhase(id, { pct, status: st });
  }, [updatePhase]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="sc">
      <style>{CSS}</style>

      {/* Header */}
      <div className="sc-hd">
        <div>
          <div className="sc-title-row">
            <input
              className="sc-proj-input"
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="Nom du projet"
            />
          </div>
          <div className="sc-sub">
            PHG BUILD IA — Suivi de chantier &nbsp;·&nbsp; Mis à jour le {new Date().toLocaleDateString("fr-FR")}
          </div>
        </div>
      </div>

      {/* Global progress bar */}
      <div className="sc-gbar">
        <div className="sc-gpct">{globalPct}%</div>
        <div className="sc-ginfo">
          <div className="sc-glbl">Avancement global du chantier</div>
          <div className="sc-gtrack">
            <div
              className="sc-gfill"
              style={{ width: `${globalPct}%` }}
            />
          </div>
          <div className="sc-gstats">
            <div className="sc-gstat" style={{ color: "var(--ok)" }}>
              ● <span>{countDone}</span> phase{countDone > 1 ? "s" : ""} terminée{countDone > 1 ? "s" : ""}
            </div>
            <div className="sc-gstat" style={{ color: "var(--gold)" }}>
              ● <span>{countWIP}</span> en cours
            </div>
            <div className="sc-gstat" style={{ color: countLate > 0 ? "var(--err)" : "var(--dim)" }}>
              ● <span>{countLate}</span> en retard
            </div>
            <div className="sc-gstat">
              <span>{phases.length - countDone - countWIP}</span> à démarrer
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal timeline */}
      <div className="sc-tl">
        {phases.map((ph, i) => {
          const eff   = effectiveStatus(ph);
          const col   = statusColor(eff);
          const isAct = activeId === ph.id;
          return (
            <div key={ph.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div className="sc-tl-node" onClick={() => setActiveId(ph.id)}>
                <div
                  className={`sc-tl-circle${isAct ? " active" : ""}`}
                  style={{ borderColor: col, color: col, background: isAct ? statusBg(eff) : "var(--bg, #0A0A0A)" }}
                >
                  {ph.status === "done" ? "✓" : ph.seq}
                </div>
                <div className="sc-tl-label" style={{ color: isAct ? "var(--text)" : "var(--dim)" }}>
                  {ph.label}
                </div>
                <div className="sc-tl-pct" style={{ color: col }}>{ph.pct}%</div>
              </div>
              {i < phases.length - 1 && (
                <div
                  className="sc-tl-line"
                  style={{ background: ph.status === "done" ? "var(--ok, #4CAF6E)" : "var(--border)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Phase cards */}
      <div className="sc-pgrid">
        {phases.map((ph) => {
          const eff    = effectiveStatus(ph);
          const col    = statusColor(eff);
          const late   = isLate(ph);
          const isAct  = activeId === ph.id;

          return (
            <div
              key={ph.id}
              className={`sc-card${isAct ? " active-card" : ""}${late ? " late-card" : ""}`}
              onClick={() => setActiveId(ph.id)}
            >
              {/* Card header */}
              <div className="sc-card-hd">
                <div className="sc-seq" style={{ borderColor: col, color: col }}>{ph.seq}</div>
                <div className="sc-phase-name">{ph.label}</div>
                <span
                  className="sc-stag"
                  style={{ background: statusBg(eff), color: col, borderColor: col }}
                >
                  {STATUS_META[eff]?.label}
                </span>
              </div>

              {/* Delay alert */}
              {late && (
                <div className="sc-late-alert">
                  ⚠ Retard détecté — échéance dépassée
                </div>
              )}

              <div className="sc-body" onClick={(e) => e.stopPropagation()}>
                {/* Progress */}
                <div className="sc-pct-row">
                  <span className="sc-pct-lbl">Avancement</span>
                  <div
                    className="sc-pct-track"
                    onClick={(e) => handlePctSlider(ph.id, e)}
                  >
                    <div
                      className="sc-pct-fill"
                      style={{
                        width: `${ph.pct}%`,
                        background: eff === "done" ? "var(--ok)" : eff === "late" ? "var(--err)" : "var(--gold)",
                      }}
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="sc-pct-in"
                    value={ph.pct}
                    onChange={(e) => {
                      const v  = Math.max(0, Math.min(100, Number(e.target.value)));
                      const st = v === 100 ? "done" : v > 0 ? "in_progress" : "todo";
                      updatePhase(ph.id, { pct: v, status: st });
                    }}
                  />
                  <span style={{ fontSize: 10, color: "var(--dim)" }}>%</span>
                </div>

                {/* Status quick-select */}
                <div className="sc-status-sel">
                  {["todo", "in_progress", "done"].map((s) => (
                    <button
                      key={s}
                      className="sc-ss-btn"
                      style={{
                        borderColor: ph.status === s ? statusColor(s) : "var(--border)",
                        background:  ph.status === s ? statusBg(s) : "transparent",
                        color:       ph.status === s ? statusColor(s) : "var(--dim)",
                      }}
                      onClick={() => {
                        const pct = s === "done" ? 100 : s === "todo" ? 0 : ph.pct;
                        updatePhase(ph.id, { status: s, pct });
                      }}
                    >
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>

                {/* Dates */}
                <div className="sc-dates">
                  <div className="sc-date-group">
                    <div className="sc-date-lbl">Date prévue</div>
                    <input
                      type="date"
                      className="sc-date-in"
                      value={ph.planned}
                      onChange={(e) => updatePhase(ph.id, { planned: e.target.value })}
                    />
                    {late && (
                      <div className="sc-date-late">⚠ Dépassée</div>
                    )}
                  </div>
                  <div className="sc-date-group">
                    <div className="sc-date-lbl">Date réelle</div>
                    <input
                      type="date"
                      className="sc-date-in"
                      value={ph.actual}
                      onChange={(e) => updatePhase(ph.id, { actual: e.target.value })}
                    />
                    {ph.actual && ph.planned && ph.actual <= ph.planned && (
                      <div className="sc-date-ok">✓ Dans les délais</div>
                    )}
                    {ph.actual && ph.planned && ph.actual > ph.planned && (
                      <div className="sc-date-late">+{Math.round((new Date(ph.actual) - new Date(ph.planned)) / 86400000)} j de retard</div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <textarea
                  className="sc-notes"
                  rows={2}
                  value={ph.notes}
                  placeholder={`Notes sur la phase ${ph.label}…`}
                  onChange={(e) => updatePhase(ph.id, { notes: e.target.value })}
                />

                {/* Photos */}
                <div
                  className="sc-photo-area"
                  onDragOver={(e) => { e.preventDefault(); setDragOver(ph.id); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(null); addPhotos(ph.id, e.dataTransfer.files); }}
                  onClick={() => fileRefs.current[ph.id]?.click()}
                  style={{ borderColor: dragOver === ph.id ? "var(--gold)" : undefined }}
                >
                  <div className="sc-photo-drop-lbl">
                    + Photos de la phase ({ph.photos.length}/8)
                  </div>
                  {ph.photos.length > 0 && (
                    <div className="sc-thumbs" onClick={(e) => e.stopPropagation()}>
                      {ph.photos.map((p, i) => (
                        <div key={i} className="sc-thumb">
                          <img src={p.url} alt={p.name} />
                          <button className="sc-tdel" onClick={() => removePhoto(ph.id, i)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    ref={(el) => (fileRefs.current[ph.id] = el)}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => { addPhotos(ph.id, e.target.files); e.target.value = ""; }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="sc-summary">
        <div className="sc-scard">
          <div className="sc-slbl">Avancement</div>
          <div className="sc-sval">{globalPct}%</div>
          <div className="sc-ssub">global</div>
        </div>
        <div className="sc-scard">
          <div className="sc-slbl">Phases</div>
          <div className="sc-sval" style={{ color: "var(--ok)" }}>{countDone}</div>
          <div className="sc-ssub">terminées / {phases.length}</div>
        </div>
        <div className="sc-scard">
          <div className="sc-slbl">En cours</div>
          <div className="sc-sval" style={{ color: "var(--gold)" }}>{countWIP}</div>
          <div className="sc-ssub">phase{countWIP > 1 ? "s" : ""}</div>
        </div>
        <div className="sc-scard">
          <div className="sc-slbl">Retards</div>
          <div className="sc-sval" style={{ color: countLate > 0 ? "var(--err)" : "var(--ok)" }}>
            {countLate}
          </div>
          <div className="sc-ssub">{countLate > 0 ? "alerte active" : "aucun retard"}</div>
        </div>
        <div className="sc-scard">
          <div className="sc-slbl">Photos</div>
          <div className="sc-sval">{phases.reduce((s, p) => s + p.photos.length, 0)}</div>
          <div className="sc-ssub">uploadées</div>
        </div>
        <div className="sc-scard">
          <div className="sc-slbl">Prochaine étape</div>
          <div className="sc-sval" style={{ fontSize: 14, paddingTop: 4 }}>
            {phases.find((p) => p.status !== "done")?.label || "—"}
          </div>
          <div className="sc-ssub">à traiter</div>
        </div>
      </div>
    </div>
  );
}
