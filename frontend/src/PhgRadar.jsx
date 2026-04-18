import { useState, useRef, useCallback, useEffect } from "react";

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
import { ETAPES_I18N } from "./i18n.js";

// ── Couleurs par étape (non-traduisibles) ─────────────────────────────────────
const ETAPE_COLORS = {
  fondations: "#C9A84C", gros_oeuvre: "#E8A94C", toiture: "#7AABC9",
  second_oeuvre: "#9C7AC9", finitions: "#C97A4C", livraison: "#4CAF6E",
};

// ── Données démo ───────────────────────────────────────────────────────────────
const INIT_CHANTIERS = [
  {
    id: 1, name: "Villa Cocody", pays: "CI", cur: "FCFA", type: "Villa", surface: 180,
    address: "Cocody, Abidjan, Côte d'Ivoire", lat: 5.3706, lng: -4.0148,
    budget_total: 48200000, budget_consomme: 31300000,
    date_debut: "2024-01-15", date_fin_prevue: "2026-08-30",
    etapes: [
      { id: "fondations",    pct: 100, validated: true,  date_fin: "2024-02-20" },
      { id: "gros_oeuvre",   pct: 100, validated: true,  date_fin: "2024-04-10" },
      { id: "toiture",       pct: 100, validated: false, date_fin: "2025-05-30" },
      { id: "second_oeuvre", pct: 45,  validated: false, date_fin: null },
      { id: "finitions",     pct: 0,   validated: false, date_fin: null },
      { id: "livraison",     pct: 0,   validated: false, date_fin: null },
    ],
    alertes: [
      { id: 1, type: "warn", msg: "Toiture terminée mais non validée — paiement en attente", date: "2025-05-31" },
      { id: 2, type: "warn", msg: "Second œuvre à 45% — objectif 70% au 15/06", date: "2025-06-01" },
      { id: 3, type: "info", msg: "3 photos ajoutées sur la toiture ce mois", date: "2025-06-01" },
    ],
  },
  {
    id: 2, name: "Maison Lyon", pays: "FR", cur: "€", type: "Maison", surface: 120,
    address: "Lyon, France", lat: 45.7640, lng: 4.8357,
    budget_total: 185000, budget_consomme: 42000,
    date_debut: "2025-03-01", date_fin_prevue: "2025-12-15",
    etapes: [
      { id: "fondations",    pct: 100, validated: true,  date_fin: "2025-04-15" },
      { id: "gros_oeuvre",   pct: 30,  validated: false, date_fin: null },
      { id: "toiture",       pct: 0,   validated: false, date_fin: null },
      { id: "second_oeuvre", pct: 0,   validated: false, date_fin: null },
      { id: "finitions",     pct: 0,   validated: false, date_fin: null },
      { id: "livraison",     pct: 0,   validated: false, date_fin: null },
    ],
    alertes: [
      { id: 1, type: "err",  msg: "Retard — Gros œuvre prévu à 80% le 01/05, actuellement 30%", date: "2025-06-01" },
      { id: 2, type: "warn", msg: "Risque dépassement délai : +6 semaines estimées", date: "2025-06-02" },
    ],
  },
];

const ALERT_COLOR = { err: "#C94C4C", warn: "#E8A94C", info: "#7AABC9", ok: "#4CAF6E" };
const ALERT_ICON  = { err: "🔴", warn: "⚠️", info: "ℹ️", ok: "✅" };

// ── Composant principal ────────────────────────────────────────────────────────
export default function PhgRadar({ setPage, t = (k) => k, lang = "fr" }) {
  const ETAPES = (ETAPES_I18N[lang] || ETAPES_I18N.fr).map(e => ({ ...e, color: ETAPE_COLORS[e.id] }));
  const [chantiers, setChantiers] = useState(INIT_CHANTIERS);
  const [chantierId, setChantierId]   = useState(1);
  const [photos, setPhotos]           = useState([]);
  const [filterEtape, setFilterEtape] = useState("all");
  const [lightbox, setLightbox]       = useState(null);
  const [validModal, setValidModal]   = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const [uploadEtape, setUploadEtape] = useState("fondations");
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  // ── Google Maps JS state ─────────────────────────────────────────────────────
  const mapDivRef   = useRef(null);
  const gMapRef     = useRef(null);
  const gMarkerRef  = useRef(null);
  const [mapsReady, setMapsReady] = useState(() => !!window.google?.maps?.Map);
  const [mapError,  setMapError]  = useState(null);

  // Charger le script Google Maps une seule fois
  useEffect(() => {
    if (!GMAPS_KEY || window.google?.maps?.Map) { if (window.google?.maps?.Map) setMapsReady(true); return; }
    const SCRIPT_ID = "phg-gmaps";
    if (document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}`;
    s.async = true; s.defer = true;
    s.onload  = () => setMapsReady(true);
    s.onerror = () => setMapError("Impossible de charger Google Maps. Vérifiez la clé API.");
    document.head.appendChild(s);
  }, []);

  // Initialiser / mettre à jour la carte quand prête ou chantier change
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current) return;
    const found = chantiers.find(c => c.id === chantierId);
    if (!found?.lat || !found?.lng) return;
    const center = { lat: found.lat, lng: found.lng };
    if (!gMapRef.current) {
      gMapRef.current = new window.google.maps.Map(mapDivRef.current, {
        center, zoom: 18, mapTypeId: "satellite",
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
      });
    } else {
      gMapRef.current.panTo(center);
      gMapRef.current.setZoom(18);
    }
    if (gMarkerRef.current) gMarkerRef.current.setMap(null);
    gMarkerRef.current = new window.google.maps.Marker({
      position: center, map: gMapRef.current, title: found.name,
      animation: window.google.maps.Animation.DROP,
    });
  }, [mapsReady, chantierId, chantiers]);

  const ch = chantiers.find(c => c.id === chantierId);

  // Calculs dérivés
  const overallPct   = Math.round(ch.etapes.reduce((s, e) => s + e.pct, 0) / ch.etapes.length);
  const budgetRestant = ch.budget_total - ch.budget_consomme;
  const budgetPct    = Math.round((ch.budget_consomme / ch.budget_total) * 100);
  const today        = new Date();
  const dateFin      = new Date(ch.date_fin_prevue);
  const daysLeft     = Math.round((dateFin - today) / 86400000);
  const timeElapsedPct = Math.min(100, Math.max(0, Math.round(
    ((today - new Date(ch.date_debut)) / (dateFin - new Date(ch.date_debut))) * 100
  )));

  // Étape active : priorité à celle finie mais non validée, sinon première en cours
  const firstPendingVal = ch.etapes.findIndex(e => e.pct === 100 && !e.validated);
  const firstInProgress = ch.etapes.findIndex(e => e.pct < 100);
  const activeIdx = firstPendingVal >= 0 ? firstPendingVal : firstInProgress;
  const activeEtapeId  = activeIdx >= 0 ? ch.etapes[activeIdx].id : null;
  const activeEtapeInfo = ETAPES.find(e => e.id === activeEtapeId);
  const activeStatus   = activeIdx >= 0 ? ch.etapes[activeIdx] : null;

  const fmtNum  = (n, cur) => cur === "FCFA"
    ? n.toLocaleString("fr-FR") + " FCFA"
    : n.toLocaleString("fr-FR") + " " + cur;

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Photos filtrées
  const chantierPhotos  = photos.filter(p => p.chantierId === chantierId);
  const filteredPhotos  = filterEtape === "all"
    ? chantierPhotos
    : chantierPhotos.filter(p => p.etapeId === filterEtape);

  // Upload photos
  const handleFiles = useCallback((files) => {
    Array.from(files).filter(f => f.type.startsWith("image/")).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setPhotos(prev => [...prev, {
          id: Date.now() + Math.random(),
          chantierId,
          etapeId: uploadEtape,
          url: ev.target.result,
          name: file.name,
          datetime: new Date().toLocaleString("fr-FR"),
          size: (file.size / 1024).toFixed(0) + " Ko",
        }]);
      };
      reader.readAsDataURL(file);
    });
  }, [chantierId, uploadEtape]);

  const removePhoto = (id) => setPhotos(prev => prev.filter(p => p.id !== id));

  // Validation étape
  const validateEtape = (etapeId) => {
    setChantiers(prev => prev.map(c => {
      if (c.id !== chantierId) return c;
      return {
        ...c,
        etapes: c.etapes.map(e => e.id === etapeId
          ? { ...e, validated: true, date_fin: new Date().toISOString().split("T")[0] }
          : e),
        alertes: [...c.alertes, {
          id: Date.now(),
          type: "ok",
          msg: `"${ETAPES.find(e => e.id === etapeId)?.label}" ${t("radar_val_done_msg")}`,
          date: new Date().toISOString().split("T")[0],
        }],
      };
    }));
    setValidModal(null);
  };

  // Mise à jour progression étape
  const updatePct = (etapeId, pct) => {
    setChantiers(prev => prev.map(c => {
      if (c.id !== chantierId) return c;
      return { ...c, etapes: c.etapes.map(e => e.id === etapeId ? { ...e, pct } : e) };
    }));
  };

  const dismissAlert = (alertId) => {
    setChantiers(prev => prev.map(c =>
      c.id !== chantierId ? c : { ...c, alertes: c.alertes.filter(a => a.id !== alertId) }
    ));
  };

  // ── Timeline step class ────────────────────────────────────────────────────
  const stepClass = (i) => {
    const s = ch.etapes[i];
    if (s.validated) return "tl-step validated";
    if (s.pct === 100) return "tl-step done";
    if (i === firstInProgress) return "tl-step active";
    return "tl-step";
  };

  return (
    <>
      <style>{`
        /* ── Chantier selector ── */
        .radar-bar { display:flex; gap:8px; margin-bottom:18px; align-items:center; flex-wrap:wrap; }
        .radar-ch { padding:8px 16px; border-radius:8px; border:1px solid var(--border); background:var(--panel); cursor:pointer; font-size:11px; font-family:'Montserrat',sans-serif; color:var(--dim); transition:all .2s; }
        .radar-ch:hover { border-color:var(--gold3); color:var(--text); }
        .radar-ch.active { border-color:var(--gold); color:var(--gold); background:rgba(201,168,76,.08); }

        /* ── KPI row ── */
        .radar-kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:18px; }
        .radar-kpi { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:16px 14px; position:relative; overflow:hidden; }
        .radar-kpi-lbl { font-size:9px; color:var(--dim); text-transform:uppercase; letter-spacing:2px; margin-bottom:6px; }
        .radar-kpi-val { font-family:'Cinzel',serif; font-size:20px; line-height:1.1; }
        .radar-kpi-sub { font-size:10px; color:var(--dim); margin-top:4px; }
        .radar-kpi-foot { height:3px; position:absolute; bottom:0; left:0; right:0; background:rgba(255,255,255,.04); }
        .radar-kpi-foot-fill { height:100%; transition:width .8s; }

        /* ── Timeline ── */
        .tl-wrap { display:flex; align-items:flex-start; padding:0 8px; }
        .tl-step { flex:1; display:flex; flex-direction:column; align-items:center; position:relative; cursor:pointer; }
        .tl-step::before { content:''; position:absolute; top:18px; left:-50%; width:100%; height:2px; background:var(--border2); z-index:0; }
        .tl-step:first-child::before { display:none; }
        .tl-dot { width:36px; height:36px; border-radius:50%; border:2px solid var(--border2); background:var(--panel); display:flex; align-items:center; justify-content:center; font-size:15px; position:relative; z-index:1; transition:all .3s; user-select:none; }
        .tl-step.done .tl-dot { border-color:var(--gold); background:rgba(201,168,76,.1); }
        .tl-step.validated .tl-dot { border-color:var(--ok); background:rgba(76,175,110,.12); }
        .tl-step.active .tl-dot { border-color:var(--gold); animation:tl-pulse 1.8s infinite; }
        .tl-step.done::before,.tl-step.validated::before,.tl-step.active::before { background:var(--gold3); }
        @keyframes tl-pulse { 0%,100%{box-shadow:0 0 0 3px rgba(201,168,76,.15)} 50%{box-shadow:0 0 0 7px rgba(201,168,76,.05)} }
        .tl-lbl { font-size:9px; color:var(--dim); text-align:center; margin-top:6px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
        .tl-step.done .tl-lbl,.tl-step.active .tl-lbl { color:var(--gold); }
        .tl-step.validated .tl-lbl { color:var(--ok); }
        .tl-pct { font-size:9px; color:var(--dim2); margin-top:2px; }

        /* ── Global progress bar ── */
        .gpb { height:6px; background:rgba(255,255,255,.06); border-radius:3px; margin:0 0 6px; overflow:hidden; }
        .gpb-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,var(--gold3),var(--gold),var(--gold2)); transition:width 1s cubic-bezier(.4,0,.2,1); }
        .gpb-label { font-size:10px; color:var(--dim); text-align:right; margin-bottom:18px; }

        /* ── Main layout ── */
        .radar-main { display:grid; grid-template-columns:1fr 276px; gap:14px; }

        /* ── Photo section ── */
        .etape-tabs { display:flex; gap:5px; margin-bottom:12px; flex-wrap:wrap; }
        .etape-tab { padding:4px 11px; border-radius:20px; border:1px solid var(--border); background:transparent; cursor:pointer; font-size:10px; font-family:'Montserrat',sans-serif; color:var(--dim); transition:all .2s; }
        .etape-tab:hover { border-color:var(--border2); color:var(--text); }
        .etape-tab.active { border-color:var(--gold); color:var(--gold); background:rgba(201,168,76,.07); }

        .upload-zone { border:2px dashed var(--border2); border-radius:10px; padding:22px; text-align:center; cursor:pointer; transition:all .2s; margin-bottom:14px; }
        .upload-zone:hover,.upload-zone.drag { border-color:var(--gold3); background:rgba(201,168,76,.04); }
        .upload-zone.drag { border-color:var(--gold); background:rgba(201,168,76,.08); }

        .photo-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:8px; }
        .photo-card { position:relative; border-radius:8px; overflow:hidden; background:var(--panel2); cursor:pointer; aspect-ratio:4/3; border:1px solid var(--border); group:true; }
        .photo-card img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .3s; }
        .photo-card:hover img { transform:scale(1.05); }
        .photo-ov { position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent,rgba(0,0,0,.82)); padding:18px 6px 6px; }
        .photo-etag { font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
        .photo-dt { font-size:9px; color:rgba(255,255,255,.65); }
        .photo-del { position:absolute; top:4px; right:4px; width:20px; height:20px; border-radius:50%; background:rgba(0,0,0,.6); border:none; color:#fff; font-size:11px; cursor:pointer; display:none; align-items:center; justify-content:center; }
        .photo-card:hover .photo-del { display:flex; }
        .photo-empty { text-align:center; padding:36px 0; color:var(--dim); }

        /* ── Sidebar ── */
        .radar-side { display:flex; flex-direction:column; gap:12px; }
        .side-card { background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:14px 16px; }
        .side-title { font-family:'Cinzel',serif; font-size:9px; color:var(--gold); text-transform:uppercase; letter-spacing:2px; margin-bottom:12px; }

        .val-btn { width:100%; padding:11px; border-radius:8px; border:none; cursor:pointer; font-size:11px; font-family:'Montserrat',sans-serif; font-weight:700; letter-spacing:.4px; transition:all .2s; }
        .val-btn.ready { background:var(--ok); color:#0A0A0A; }
        .val-btn.ready:hover { filter:brightness(1.1); }
        .val-btn.pending { background:rgba(232,169,76,.12); color:var(--warn); border:1px solid rgba(232,169,76,.3); cursor:default; }
        .val-btn.disabled { background:var(--panel2); color:var(--dim2); border:1px solid var(--border); cursor:not-allowed; }

        .pct-slider { width:100%; -webkit-appearance:none; appearance:none; height:4px; border-radius:2px; background:var(--border2); outline:none; margin:6px 0; }
        .pct-slider::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:var(--gold); cursor:pointer; }
        .pct-slider::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:var(--gold); cursor:pointer; border:none; }

        .status-row { display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,.04); }
        .status-row:last-child { border:none; }
        .status-dot { width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:8px; flex-shrink:0; }

        .alert-item { display:flex; gap:8px; padding:8px 10px; border-radius:6px; font-size:10px; line-height:1.5; margin-bottom:6px; }
        .alert-item:last-child { margin-bottom:0; }
        .alert-item.err  { background:rgba(201,76,76,.07);  border-left:2px solid #C94C4C; }
        .alert-item.warn { background:rgba(232,169,76,.07); border-left:2px solid #E8A94C; }
        .alert-item.info { background:rgba(122,171,201,.07);border-left:2px solid #7AABC9; }
        .alert-item.ok   { background:rgba(76,175,110,.07); border-left:2px solid #4CAF6E; }
        .dismiss { margin-left:auto; background:none; border:none; color:var(--dim2); cursor:pointer; font-size:14px; flex-shrink:0; line-height:1; }

        /* ── Lightbox ── */
        .lb-overlay { position:fixed; inset:0; background:rgba(0,0,0,.93); z-index:1000; display:flex; align-items:center; justify-content:center; }
        .lb-inner { position:relative; }
        .lb-inner img { max-width:88vw; max-height:82vh; border-radius:8px; border:1px solid var(--border2); display:block; }
        .lb-close { position:absolute; top:-13px; right:-13px; width:26px; height:26px; background:var(--gold); border:none; border-radius:50%; cursor:pointer; font-size:13px; color:#0A0A0A; display:flex; align-items:center; justify-content:center; }
        .lb-meta { margin-top:10px; text-align:center; font-size:10px; color:var(--dim); }

        /* ── Modal ── */
        .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.72); z-index:999; display:flex; align-items:center; justify-content:center; }
        .modal-box { background:var(--panel); border:1px solid var(--border2); border-radius:12px; padding:28px 24px; max-width:380px; width:90%; text-align:center; }
        .modal-icon { font-size:38px; margin-bottom:10px; }
        .modal-title { font-family:'Cinzel',serif; font-size:15px; color:var(--gold); margin-bottom:8px; }
        .modal-desc { font-size:11px; color:var(--dim); line-height:1.75; margin-bottom:20px; }
        .modal-btns { display:flex; gap:10px; justify-content:center; }

        /* ── Satellite view ── */
        .sat-card { margin-top:14px; }
        .sat-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .sat-badge { display:inline-flex; align-items:center; gap:5px; background:rgba(76,175,110,.12); border:1px solid rgba(76,175,110,.3); border-radius:20px; padding:3px 10px; font-size:9px; font-weight:700; color:var(--ok); letter-spacing:1.5px; }
        .sat-badge::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--ok); animation:blink 1.4s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }
        .sat-search-row { display:grid; grid-template-columns:1fr auto; gap:8px; margin-bottom:10px; }
        .sat-input { background:var(--panel2); border:1px solid var(--border2); border-radius:var(--r); padding:9px 13px; color:var(--text); font-family:'Montserrat',sans-serif; font-size:12px; outline:none; transition:border .2s; }
        .sat-input:focus { border-color:var(--gold3); }
        .sat-input::placeholder { color:var(--dim2); }
        .sat-key-toggle { display:flex; align-items:center; gap:6px; font-size:10px; color:var(--dim); cursor:pointer; margin-bottom:8px; user-select:none; }
        .sat-key-toggle:hover { color:var(--gold); }
        .sat-key-row { display:grid; grid-template-columns:1fr; gap:6px; margin-bottom:10px; background:rgba(201,168,76,.04); border:1px solid var(--gold3); border-radius:8px; padding:10px 12px; }
        .sat-frame-wrap { position:relative; border-radius:10px; overflow:hidden; border:1px solid var(--border2); background:var(--panel2); }
        .sat-frame { width:100%; height:440px; display:block; border:none; }
        .sat-frame-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:var(--panel2); flex-direction:column; gap:10px; }
        .sat-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; height:220px; border:1px dashed var(--border2); border-radius:10px; color:var(--dim); }
        .sat-coords { display:flex; gap:20px; margin-top:10px; padding:10px 14px; background:rgba(0,0,0,.3); border-radius:6px; border:1px solid var(--border); }
        .sat-coord-item { font-size:10px; color:var(--dim); }
        .sat-coord-val { font-family:'Cinzel',serif; font-size:12px; color:var(--gold); }
      `}</style>

      {/* ── Sélecteur chantier ── */}
      <div className="radar-bar">
        <span style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 2, marginRight: 4 }}>{t("radar_chantier_label")}</span>
        {chantiers.map(c => (
          <button key={c.id} className={`radar-ch${chantierId === c.id ? " active" : ""}`} onClick={() => setChantierId(c.id)}>
            {c.name}
            <span style={{ fontSize: 9, opacity: .65, marginLeft: 6 }}>{c.type} · {c.surface}m²</span>
          </button>
        ))}
        <button className="btn btn-out btn-sm" style={{ marginLeft: "auto", fontSize: 10 }}
          onClick={() => setPage && setPage("chantier")}>
          ＋ {t("radar_manage")}
        </button>
      </div>

      {/* ── KPI row ── */}
      <div className="radar-kpi-row">
        {/* Avancement */}
        <div className="radar-kpi" style={{ borderTop: "2px solid var(--gold)" }}>
          <div className="radar-kpi-lbl">{t("radar_kpi_progress")}</div>
          <div className="radar-kpi-val" style={{ color: "var(--gold)" }}>{overallPct}%</div>
          <div className="radar-kpi-sub">{ch.etapes.filter(e => e.pct === 100).length} / 6 {t("radar_stages_done")}</div>
          <div className="radar-kpi-foot"><div className="radar-kpi-foot-fill" style={{ width: `${overallPct}%`, background: "var(--gold)" }} /></div>
        </div>

        {/* Budget consommé */}
        <div className="radar-kpi" style={{ borderTop: `2px solid ${budgetPct > 85 ? "var(--err)" : budgetPct > 70 ? "var(--warn)" : "var(--ok)"}` }}>
          <div className="radar-kpi-lbl">{t("radar_kpi_consumed")}</div>
          <div className="radar-kpi-val" style={{ color: budgetPct > 85 ? "var(--err)" : "var(--warn)", fontSize: 14 }}>
            {fmtNum(ch.budget_consomme, ch.cur)}
          </div>
          <div className="radar-kpi-sub">{budgetPct}%</div>
          <div className="radar-kpi-foot"><div className="radar-kpi-foot-fill" style={{ width: `${budgetPct}%`, background: budgetPct > 85 ? "var(--err)" : budgetPct > 70 ? "var(--warn)" : "var(--ok)" }} /></div>
        </div>

        {/* Budget restant */}
        <div className="radar-kpi" style={{ borderTop: "2px solid var(--ok)" }}>
          <div className="radar-kpi-lbl">{t("radar_kpi_remaining")}</div>
          <div className="radar-kpi-val" style={{ color: "var(--ok)", fontSize: 14 }}>
            {fmtNum(budgetRestant, ch.cur)}
          </div>
          <div className="radar-kpi-sub">{100 - budgetPct}%</div>
          <div className="radar-kpi-foot"><div className="radar-kpi-foot-fill" style={{ width: `${100 - budgetPct}%`, background: "var(--ok)" }} /></div>
        </div>

        {/* Délai */}
        <div className="radar-kpi" style={{ borderTop: `2px solid ${daysLeft < 0 ? "var(--err)" : daysLeft < 30 ? "var(--warn)" : "var(--gold)"}` }}>
          <div className="radar-kpi-lbl">{t("radar_kpi_delay")}</div>
          <div className="radar-kpi-val" style={{ color: daysLeft < 0 ? "var(--err)" : daysLeft < 30 ? "var(--warn)" : "var(--gold)" }}>
            {daysLeft < 0 ? `+${Math.abs(daysLeft)}j` : `${daysLeft}j`}
          </div>
          <div className="radar-kpi-sub">
            {daysLeft < 0 ? t("radar_overdue") : daysLeft < 30 ? t("radar_urgent") : t("radar_on_time")}
            {" · "}{fmtDate(ch.date_fin_prevue)}
          </div>
          <div className="radar-kpi-foot"><div className="radar-kpi-foot-fill" style={{ width: `${timeElapsedPct}%`, background: daysLeft < 0 ? "var(--err)" : daysLeft < 30 ? "var(--warn)" : "var(--gold)" }} /></div>
        </div>
      </div>

      {/* ── Timeline des étapes ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">{t("radar_stages_title")}</div>
        <div className="gpb"><div className="gpb-fill" style={{ width: `${overallPct}%` }} /></div>
        <div className="gpb-label">{overallPct}% {t("radar_global_pct")} — {ch.name}</div>

        <div className="tl-wrap">
          {ETAPES.map((etape, i) => {
            const s = ch.etapes.find(e => e.id === etape.id);
            const pct = s?.pct || 0;
            return (
              <div key={etape.id} className={stepClass(i)} onClick={() => setFilterEtape(etape.id)}>
                <div className="tl-dot" style={s?.validated ? { borderColor: "var(--ok)" } : {}}>
                  {s?.validated ? "✓" : etape.icon}
                </div>
                <div className="tl-lbl">{etape.label}</div>
                <div className="tl-pct">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Layout principal ── */}
      <div className="radar-main">

        {/* ── GAUCHE : Photos ── */}
        <div>
          <div className="card">
            <div className="card-title">{t("radar_photos_title")}</div>

            {/* Filtres étapes */}
            <div className="etape-tabs">
              <button className={`etape-tab${filterEtape === "all" ? " active" : ""}`} onClick={() => setFilterEtape("all")}>
                {t("radar_all_photos")} ({chantierPhotos.length})
              </button>
              {ETAPES.map(e => {
                const n = chantierPhotos.filter(p => p.etapeId === e.id).length;
                return (
                  <button key={e.id} className={`etape-tab${filterEtape === e.id ? " active" : ""}`} onClick={() => setFilterEtape(e.id)}>
                    {e.icon} {e.label}{n > 0 ? ` (${n})` : ""}
                  </button>
                );
              })}
            </div>

            {/* Zone d'upload */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "var(--dim)", flexShrink: 0 }}>{t("radar_etape_label")}</span>
              <select value={uploadEtape} onChange={e => setUploadEtape(e.target.value)} style={{ fontSize: 11, flex: 1 }}>
                {ETAPES.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
              </select>
            </div>
            <div
              className={`upload-zone${dragOver ? " drag" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={ev => { ev.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={ev => { ev.preventDefault(); setDragOver(false); handleFiles(ev.dataTransfer.files); }}
            >
              <div style={{ fontSize: 26, marginBottom: 6 }}>📷</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)" }}>{t("radar_drop")}</div>
              <div style={{ fontSize: 10, color: "var(--dim2)", marginTop: 3 }}>{t("radar_drop_sub")}</div>
              <div style={{ fontSize: 9, color: "var(--gold3)", marginTop: 5 }}>{t("radar_drop_ts")}</div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={ev => { handleFiles(ev.target.files); ev.target.value = ""; }} />
            </div>

            {/* Bouton caméra mobile */}
            <button
              type="button"
              className="btn btn-out btn-sm"
              style={{ width: "100%", justifyContent: "center", marginBottom: 14, fontSize: 12 }}
              onClick={() => cameraRef.current?.click()}
            >
              📸 Prendre une photo
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={ev => { handleFiles(ev.target.files); ev.target.value = ""; }}
            />

            {/* Grille photos */}
            {filteredPhotos.length === 0 ? (
              <div className="photo-empty">
                <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
                <div style={{ fontSize: 12 }}>{t("radar_no_photos")} {filterEtape !== "all" ? `— ${ETAPES.find(e => e.id === filterEtape)?.label}` : ""}</div>
                <div style={{ fontSize: 10, marginTop: 4, color: "var(--dim2)" }}>{t("radar_no_photos_sub")}</div>
              </div>
            ) : (
              <div className="photo-grid">
                {filteredPhotos.map(p => {
                  const ei = ETAPES.find(e => e.id === p.etapeId);
                  return (
                    <div key={p.id} className="photo-card" onClick={() => setLightbox(p)}>
                      <img src={p.url} alt={p.name} loading="lazy" />
                      <div className="photo-ov">
                        <div className="photo-etag" style={{ color: ei?.color }}>{ei?.label}</div>
                        <div className="photo-dt">{p.datetime}</div>
                      </div>
                      <button className="photo-del" onClick={ev => { ev.stopPropagation(); removePhoto(p.id); }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Vue Satellitaire Google Maps ── */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="sat-header">
            <div>
              <div className="card-title" style={{ marginBottom: 2 }}>{t("sat_title")}</div>
              <div style={{ fontSize: 10, color: "var(--dim)" }}>
                {ch.address} · {ch.lat?.toFixed(4)}, {ch.lng?.toFixed(4)}
              </div>
            </div>
            <div className="sat-badge">{t("sat_badge")}</div>
          </div>

          {!GMAPS_KEY ? (
            <div className="sat-placeholder">
              <div style={{ fontSize: 38, opacity: .4 }}>🛰️</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dim)", marginBottom: 6 }}>
                  Clé API Google Maps manquante
                </div>
                <div style={{ fontSize: 10, color: "var(--dim2)", lineHeight: 1.8, maxWidth: 240 }}>
                  Ajoutez <code style={{ background: "rgba(201,168,76,.1)", padding: "1px 5px", borderRadius: 3, color: "var(--gold)" }}>VITE_GOOGLE_MAPS_API_KEY</code> dans votre fichier <code style={{ color: "var(--dim)" }}>.env.local</code> pour activer la vue satellite.
                </div>
              </div>
            </div>
          ) : mapError ? (
            <div className="sat-placeholder">
              <div style={{ fontSize: 32, opacity: .5 }}>⚠️</div>
              <div style={{ fontSize: 11, color: "var(--err)", textAlign: "center" }}>{mapError}</div>
            </div>
          ) : (
            <>
              <div
                ref={mapDivRef}
                style={{ width: "100%", height: 420, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border2)", background: "var(--panel2)" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(0,0,0,.4)", borderRadius: "0 0 8px 8px", marginTop: -4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13 }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 600 }}>{ch.name}</div>
                  <div style={{ fontSize: 9, color: "var(--dim)" }}>{ch.address} · {ch.lat}, {ch.lng}</div>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${ch.lat},${ch.lng}&t=k&z=18`}
                  target="_blank" rel="noreferrer"
                  className="btn btn-out btn-sm"
                  style={{ fontSize: 10, textDecoration: "none" }}
                >
                  {t("sat_open")}
                </a>
              </div>
            </>
          )}
        </div>

        {/* ── DROITE : Sidebar ── */}
        <div className="radar-side">

          {/* Étape active + validation */}
          <div className="side-card">
            <div className="side-title">{t("radar_active_stage")}</div>

            {activeIdx >= 0 ? (
              <>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 26 }}>{activeEtapeInfo?.icon}</div>
                  <div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "var(--gold)" }}>{activeEtapeInfo?.label}</div>
                    <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>{activeEtapeInfo?.desc}</div>
                  </div>
                </div>

                {/* Barre progression */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: "var(--dim)" }}>{t("radar_progress_lbl")}</span>
                  <span style={{ color: "var(--gold)", fontWeight: 700 }}>{activeStatus?.pct || 0}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${activeStatus?.pct || 0}%`, background: "var(--gold)", borderRadius: 3, transition: "width .5s" }} />
                </div>

                {/* Slider de mise à jour */}
                {!activeStatus?.validated && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: "var(--dim2)", marginBottom: 4 }}>{t("radar_update_lbl")}</div>
                    <input type="range" className="pct-slider"
                      min={0} max={100} step={5}
                      value={activeStatus?.pct || 0}
                      onChange={e => updatePct(activeEtapeId, +e.target.value)}
                    />
                  </div>
                )}

                {/* Bouton valider */}
                {activeStatus?.pct === 100 && !activeStatus?.validated ? (
                  <button className="val-btn ready"
                    onClick={() => setValidModal({ etapeId: activeEtapeId, etapeLabel: activeEtapeInfo?.label })}>
                    {t("radar_validate")}
                  </button>
                ) : activeStatus?.validated ? (
                  <button className="val-btn pending">{t("radar_validated")}</button>
                ) : (
                  <button className="val-btn disabled" disabled>
                    ⏳ {activeStatus?.pct || 0}% — {t("radar_not_ready").replace("⏳ — ", "")}
                  </button>
                )}

                <div style={{ marginTop: 8, fontSize: 9, color: "var(--dim2)" }}>
                  {t("radar_step")} {activeIdx + 1} {t("radar_of_steps")}
                  {activeStatus?.date_fin && ` · ${t("radar_finished")} ${fmtDate(activeStatus.date_fin)}`}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "var(--ok)" }}>{t("radar_delivered")}</div>
                <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 4 }}>{t("radar_all_done")}</div>
              </div>
            )}
          </div>

          {/* État des validations */}
          <div className="side-card">
            <div className="side-title">{t("radar_val_title")}</div>
            {ETAPES.map((etape, i) => {
              const s = ch.etapes.find(e => e.id === etape.id);
              const isVal = s?.validated;
              const is100 = s?.pct === 100;
              const pct = s?.pct || 0;
              return (
                <div key={etape.id} className="status-row">
                  <span style={{ fontSize: 13 }}>{etape.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: isVal ? "var(--ok)" : pct > 0 ? "var(--gold)" : "var(--dim2)", fontWeight: 600 }}>
                      {etape.label}
                    </div>
                    <div style={{ fontSize: 8, color: "var(--dim2)" }}>
                      {pct}%{isVal ? ` · ${t("radar_validated_short")}` : is100 ? ` · ${t("radar_pending_val")}` : ""}
                    </div>
                  </div>
                  <div className="status-dot" style={{
                    background: isVal ? "rgba(76,175,110,.2)" : is100 ? "rgba(232,169,76,.2)" : pct > 0 ? "rgba(201,168,76,.1)" : "var(--border2)",
                    color: isVal ? "var(--ok)" : is100 ? "var(--warn)" : "transparent",
                    border: `1px solid ${isVal ? "rgba(76,175,110,.4)" : is100 ? "rgba(232,169,76,.4)" : "var(--border)"}`,
                  }}>
                    {isVal ? "✓" : is100 ? "!" : ""}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alertes */}
          <div className="side-card">
            <div className="side-title">{t("radar_alerts_title")}</div>
            {ch.alertes.length === 0 ? (
              <div style={{ fontSize: 10, color: "var(--dim)", textAlign: "center", padding: "10px 0" }}>
                {t("radar_no_alerts")}
              </div>
            ) : ch.alertes.map(a => (
              <div key={a.id} className={`alert-item ${a.type}`}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>{ALERT_ICON[a.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: ALERT_COLOR[a.type], fontWeight: 600, marginBottom: 2 }}>{a.msg}</div>
                  <div style={{ fontSize: 9, color: "var(--dim2)" }}>{fmtDate(a.date)}</div>
                </div>
                <button className="dismiss" onClick={() => dismissAlert(a.id)}>×</button>
              </div>
            ))}

            {/* Ajouter une alerte manuelle */}
            <button className="btn btn-out btn-sm" style={{ marginTop: 10, width: "100%", fontSize: 10 }}
              onClick={() => setChantiers(prev => prev.map(c => c.id !== chantierId ? c : {
                ...c, alertes: [...c.alertes, {
                  id: Date.now(), type: "warn",
                  msg: t("radar_anomaly"),
                  date: new Date().toISOString().split("T")[0],
                }]
              }))}>
              {t("radar_report")}
            </button>
          </div>

        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="lb-overlay" onClick={() => setLightbox(null)}>
          <div className="lb-inner" onClick={e => e.stopPropagation()}>
            <button className="lb-close" onClick={() => setLightbox(null)}>✕</button>
            <img src={lightbox.url} alt={lightbox.name} />
            <div className="lb-meta">
              <span style={{ color: "var(--gold)" }}>{ETAPES.find(e => e.id === lightbox.etapeId)?.label}</span>
              {" · "}{lightbox.datetime}{" · "}{lightbox.name}{" · "}{lightbox.size}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de validation ── */}
      {validModal && (
        <div className="modal-bg">
          <div className="modal-box">
            <div className="modal-icon">🔓</div>
            <div className="modal-title">{t("radar_val_modal_title")}</div>
            <div className="modal-desc">
              {t("radar_val_modal_desc1")}{" "}
              <strong style={{ color: "var(--gold)" }}>"{validModal.etapeLabel}"</strong> {t("radar_val_modal_desc2")}<br /><br />
              {t("radar_val_action1")}<br />
              {t("radar_val_action2")}<br />
              {t("radar_val_action3")}
            </div>
            <div className="modal-btns">
              <button className="btn btn-out btn-sm" onClick={() => setValidModal(null)}>{t("radar_val_cancel")}</button>
              <button className="btn btn-gold btn-sm" onClick={() => validateEtape(validModal.etapeId)}>
                {t("radar_val_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
