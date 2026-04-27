import { useState, useEffect, useRef } from "react";
import { CHANTIERS_I18N } from "./i18n.js";

// ── Données de base ───────────────────────────────────────────────────────────
const CHANTIERS_BASE = [
  {
    id: "maison",
    label: "Maison individuelle",
    icon: "🏠",
    surface_default: 120,
    surface_min: 40,
    surface_max: 300,
    surface_step: 10,
    unit: "m²",
    cout_sans_m2: 1400,
    cout_avec_m2: 1050,
    heures_sans: 280,
    heures_avec: 40,
    archi_pct_typical: 10,
    erreurs_typiques: [
      "Mauvaise estimation béton (+12%)",
      "Surfacturation maçon non détectée",
      "Matériaux commandés en double",
      "Retard chantier 3 semaines",
    ],
    gains_phg: [
      "Quantités matériaux exactes à 2% près",
      "Devis comparés automatiquement",
      "Planning semaine optimisé",
      "Alertes retard en temps réel",
    ],
    color: "#C9A84C",
  },
  {
    id: "villa",
    label: "Villa",
    icon: "🌴",
    surface_default: 200,
    surface_min: 100,
    surface_max: 600,
    surface_step: 20,
    unit: "m²",
    cout_sans_m2: 1800,
    cout_avec_m2: 1310,
    heures_sans: 420,
    heures_avec: 55,
    archi_pct_typical: 12,
    erreurs_typiques: [
      "Erreur plan architecte non détectée",
      "Sous-estimation finitions haut de gamme",
      "Coordination lots corps d'état défaillante",
      "Pénalités retard livraison",
    ],
    gains_phg: [
      "Vérification plan DXF automatique",
      "Budget finitions premium calculé",
      "Planning multi-corps d'état",
      "Suivi fournisseurs centralisé",
    ],
    color: "#E8CC7A",
  },
  {
    id: "renovation",
    label: "Rénovation",
    icon: "🔨",
    surface_default: 80,
    surface_min: 20,
    surface_max: 400,
    surface_step: 10,
    unit: "m²",
    cout_sans_m2: 950,
    cout_avec_m2: 680,
    heures_sans: 190,
    heures_avec: 28,
    archi_pct_typical: 11,
    erreurs_typiques: [
      "Imprévus découverte (humidité, amiante)",
      "Devis artisans sous-estimés de 25%",
      "Commandes matériaux insuffisantes",
      "Mauvais phasage des travaux",
    ],
    gains_phg: [
      "Diagnostic pré-travaux intégré",
      "Comparateur devis artisans local",
      "Quantitatif précis avant commande",
      "Phasage automatique des lots",
    ],
    color: "#7AABC9",
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    icon: "🌉",
    surface_default: 50,
    surface_min: 10,
    surface_max: 500,
    surface_step: 10,
    unit: "ml (mètres linéaires)",
    cout_sans_m2: 8500,
    cout_avec_m2: 6200,
    heures_sans: 650,
    heures_avec: 90,
    archi_pct_typical: 8,
    erreurs_typiques: [
      "Calcul ferraillage incorrect (+18%)",
      "Sous-estimation terrassement",
      "Pieux non prévus en terrain meuble",
      "Non-conformité normes parasismiques",
    ],
    gains_phg: [
      "Calcul béton armé certifié",
      "Analyse géotechnique intégrée",
      "Vérification normes automatique",
      "Export plans DXF pour ingénieurs",
    ],
    color: "#4CAF6E",
  },
  {
    id: "immeuble",
    label: "Immeuble",
    icon: "🏢",
    surface_default: 600,
    surface_min: 200,
    surface_max: 3000,
    surface_step: 50,
    unit: "m²",
    cout_sans_m2: 1600,
    cout_avec_m2: 1150,
    heures_sans: 1200,
    heures_avec: 150,
    archi_pct_typical: 9,
    erreurs_typiques: [
      "Erreur dimensionnement structure R+2/R+3",
      "Lots électricité/plomberie mal coordonnés",
      "Surcoût matériaux achats non groupés",
      "Dépassement budget 30% en moyenne",
    ],
    gains_phg: [
      "Dimensionnement structure validé IA",
      "Plans par étage exportables DXF",
      "Achats groupés fournisseurs négociés",
      "Tableau de bord multi-chantiers",
    ],
    color: "#C94C7A",
  },
];

// ── Liste des pays ────────────────────────────────────────────────────────────
const PAYS_LIST = [
  // Europe
  { code: "FR", flag: "🇫🇷", name: "France",        cur: "€" },
  { code: "BE", flag: "🇧🇪", name: "Belgique",      cur: "€" },
  { code: "PT", flag: "🇵🇹", name: "Portugal",      cur: "€" },
  { code: "CH", flag: "🇨🇭", name: "Suisse",        cur: "CHF" },
  { code: "GB", flag: "🇬🇧", name: "R.-Uni",        cur: "GBP" },
  // Amérique
  { code: "CA", flag: "🇨🇦", name: "Canada",        cur: "CAD" },
  { code: "US", flag: "🇺🇸", name: "États-Unis",    cur: "USD" },
  { code: "BR", flag: "🇧🇷", name: "Brésil",        cur: "BRL" },
  // Afrique du Nord
  { code: "MA", flag: "🇲🇦", name: "Maroc",         cur: "MAD" },
  { code: "TN", flag: "🇹🇳", name: "Tunisie",       cur: "TND" },
  { code: "DZ", flag: "🇩🇿", name: "Algérie",       cur: "DZD" },
  // Afrique de l'Ouest
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire", cur: "FCFA" },
  { code: "SN", flag: "🇸🇳", name: "Sénégal",       cur: "FCFA" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria",       cur: "NGN" },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso",  cur: "FCFA" },
  { code: "ML", flag: "🇲🇱", name: "Mali",          cur: "FCFA" },
  { code: "TG", flag: "🇹🇬", name: "Togo",          cur: "FCFA" },
  { code: "BJ", flag: "🇧🇯", name: "Bénin",         cur: "FCFA" },
  { code: "GN", flag: "🇬🇳", name: "Guinée",        cur: "GNF" },
  // Afrique Centrale
  { code: "CM", flag: "🇨🇲", name: "Cameroun",      cur: "FCFA" },
  { code: "CG", flag: "🇨🇬", name: "Congo",         cur: "FCFA" },
  { code: "GA", flag: "🇬🇦", name: "Gabon",         cur: "FCFA" },
];

// ── Compteur animé ────────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  const start = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    from.current = display;
    start.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    const animate = (ts) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(from.current + (value - from.current) * ease);
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  const fmt = (n) =>
    decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString("fr-FR");

  return <span>{prefix}{fmt(display)}{suffix}</span>;
}

// ── Barre de progression ──────────────────────────────────────────────────────
function CompareBar({ label, value, max, color, suffix = "" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: "var(--dim)" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{Math.round(value).toLocaleString("fr-FR")}{suffix}</span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,.06)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .8s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

// ── Jauge demi-cercle ─────────────────────────────────────────────────────────
function SemiGauge({ pct, color, size = 120 }) {
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const circ = Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
      <path d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={size * 0.07} strokeLinecap="round" />
      <path d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke={color} strokeWidth={size * 0.07} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} style={{ transition: "stroke-dasharray .9s cubic-bezier(.4,0,.2,1)" }} />
    </svg>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function SimulateurEconomies({ setPage, t = (k) => k, lang = "fr" }) {
  const [selectedId, setSelectedId]   = useState("maison");
  const [surface, setSurface]         = useState(120);
  const [pays, setPays]               = useState("CI");
  const [mode, setMode]               = useState("surcoûts");   // "surcoûts" | "architecte"
  const [archiPct, setArchiPct]       = useState(10);

  const i18nData = CHANTIERS_I18N[lang] || CHANTIERS_I18N.fr;
  const CHANTIERS = CHANTIERS_BASE.map(base => {
    const tr = i18nData.find(d => d.id === base.id);
    return tr ? { ...base, label: tr.label, unit: tr.unit, erreurs_typiques: tr.erreurs, gains_phg: tr.gains } : base;
  });

  const ch = CHANTIERS.find(c => c.id === selectedId);

  const PAYS_MULT = {
    // Europe
    FR: 1.00, BE: 0.92, PT: 0.78, CH: 1.40, GB: 1.30,
    // Amérique
    CA: 1.15, US: 1.25, BR: 0.62,
    // Afrique du Nord
    MA: 0.72, TN: 0.58, DZ: 0.52,
    // Afrique de l'Ouest (XOF)
    CI: 0.65, SN: 0.60, BF: 0.45, ML: 0.47, TG: 0.50, BJ: 0.52, GN: 0.42,
    // Afrique de l'Ouest (NGN)
    NG: 0.55,
    // Afrique Centrale (XAF)
    CM: 0.58, CG: 0.60, GA: 0.68,
  };
  const PAYS_CUR  = {
    FR: "€",    BE: "€",    PT: "€",    CH: "CHF",  GB: "GBP",
    CA: "CAD",  US: "USD",  BR: "BRL",
    MA: "MAD",  TN: "TND",  DZ: "DZD",
    CI: "FCFA", SN: "FCFA", BF: "FCFA", ML: "FCFA", TG: "FCFA", BJ: "FCFA", GN: "GNF",
    NG: "NGN",
    CM: "FCFA", CG: "FCFA", GA: "FCFA",
  };
  // Unités de devise locale pour 1 EUR (utilisé pour convertir l'abonnement PHG 77€/an)
  const PAYS_EUR  = {
    FR: 1,       BE: 1,       PT: 1,       CH: 1,       GB: 0.85,
    CA: 1.45,    US: 1.08,    BR: 5.50,
    MA: 10.6,    TN: 3.35,    DZ: 145,
    CI: 655.957, SN: 655.957, BF: 655.957, ML: 655.957, TG: 655.957, BJ: 655.957, GN: 9600,
    NG: 1700,
    CM: 655.957, CG: 655.957, GA: 655.957,
  };
  const mult = PAYS_MULT[pays] || 1;
  const cur  = PAYS_CUR[pays]  || "€";
  const rate = PAYS_EUR[pays]  || 1;

  const fmt = (n) => Math.round(n).toLocaleString("fr-FR");

  // ── Mode 1 : surcoûts classiques ──
  const coutSans   = Math.round(ch.cout_sans_m2 * surface * mult * rate);
  const coutAvec   = Math.round(ch.cout_avec_m2 * surface * mult * rate);
  const economie   = coutSans - coutAvec;
  const pctEco     = Math.round((economie / coutSans) * 100);
  const heuresSans = ch.heures_sans;
  const heuresAvec = ch.heures_avec;
  const heuresGain = heuresSans - heuresAvec;

  // ── Mode 2 : vs architecte traditionnel ──
  const coutBase      = Math.round(ch.cout_avec_m2 * surface * mult * rate);  // coût de construction optimisé
  const archiHonoraires = Math.round(coutBase * (archiPct / 100));
  const totalAvecArchi  = coutBase + archiHonoraires;
  const phgAnnuel       = Math.round(77 * rate);           // abonnement PRO annuel converti
  const totalAvecPHG    = coutBase + phgAnnuel;
  const economieSurArchi = archiHonoraires - phgAnnuel;
  const ratioArchi      = Math.max(1, Math.round(archiHonoraires / phgAnnuel));
  const pctEconomiArchi = Math.round((economieSurArchi / totalAvecArchi) * 100);

  // ROI
  const roiSurcoût = Math.round((economie / (12.90 * rate)) / 12);
  const roiArchi   = Math.round((economieSurArchi / phgAnnuel) * 12); // mois pour rentabiliser

  useEffect(() => {
    setSurface(ch.surface_default);
    setArchiPct(ch.archi_pct_typical);
  }, [selectedId]);

  const CSS = `
    .sim-types{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px}
    .sim-type{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px 10px;text-align:center;cursor:pointer;transition:all .2s}
    .sim-type:hover{border-color:var(--gold3);background:rgba(201,168,76,.05)}
    .sim-type.active{border-color:var(--gold);background:rgba(201,168,76,.09);box-shadow:0 0 0 1px var(--gold3)}
    .sim-type-icon{font-size:26px;margin-bottom:6px}
    .sim-type-label{font-size:11px;font-weight:600;color:var(--dim);line-height:1.3}
    .sim-type.active .sim-type-label{color:var(--gold)}
    .sim-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
    .sim-kpi{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px 14px;position:relative;overflow:hidden}
    .sim-kpi-lbl{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px}
    .sim-kpi-val{font-family:'Cinzel',serif;font-size:20px;line-height:1.1}
    .sim-kpi-sub{font-size:10px;color:var(--dim);margin-top:4px}
    .sim-kpi-eco{border-color:rgba(76,175,110,.3)!important;background:rgba(76,175,110,.04)!important}
    .sim-kpi-time{border-color:rgba(201,168,76,.3)!important}
    .sim-slider-wrap{display:flex;align-items:center;gap:14px}
    .sim-slider{flex:1;-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:var(--border2);outline:none}
    .sim-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--gold);cursor:pointer;box-shadow:0 0 0 3px rgba(201,168,76,.2)}
    .sim-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--gold);cursor:pointer;border:none}
    .gain-item{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px}
    .gain-item:last-child{border:none}
    .erreur-item{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px;color:var(--dim)}
    .erreur-item:last-child{border:none}
    .cta-strip{background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04));border:1px solid var(--gold3);border-radius:12px;padding:24px;text-align:center;margin-top:4px}
    .mode-tabs{display:flex;gap:0;background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:16px}
    .mode-tab{flex:1;padding:10px 16px;font-size:11px;font-weight:600;cursor:pointer;text-align:center;transition:all .2s;border:none;background:transparent;color:var(--dim);font-family:'Montserrat',sans-serif;letter-spacing:.3px}
    .mode-tab.active{background:var(--gold);color:#0A0A0A}
    .archi-vs{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin-bottom:16px}
    .archi-col{background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center}
    .archi-col.winner{border-color:var(--gold);background:rgba(201,168,76,.06)}
    .archi-col-title{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px}
    .archi-col-icon{font-size:28px;margin-bottom:6px}
    .archi-col-price{font-family:'Cinzel',serif;font-size:22px;color:var(--gold)}
    .archi-col-sub{font-size:10px;color:var(--dim);margin-top:4px;line-height:1.5}
    .archi-vs-sep{font-size:18px;color:var(--dim2);text-align:center;font-weight:700}
    .archi-breakdown{background:var(--panel2);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:14px}
    .archi-row{display:grid;grid-template-columns:1fr auto;gap:16px;padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px}
    .archi-row:last-child{border:none}
    .archi-row.total{background:rgba(201,168,76,.06);font-weight:700;font-size:12px}
    .archi-row.savings{background:rgba(76,175,110,.06);color:var(--ok)}
    .ratio-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(201,168,76,.1);border:1px solid var(--gold3);border-radius:8px;padding:12px 16px;margin:10px 0}
    .pays-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:7px;margin-top:10px;overflow:visible!important;max-height:none!important;height:auto!important}
    .pays-card{background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:8px 5px;text-align:center;cursor:pointer;transition:all .2s}
    .pays-card:hover{border-color:var(--gold3);background:rgba(201,168,76,.05)}
    .pays-card.active{border-color:var(--gold);background:rgba(201,168,76,.09);box-shadow:0 0 0 1px var(--gold3)}
    .pays-card-flag{font-size:18px;margin-bottom:2px}
    .pays-card-name{font-size:9px;font-weight:600;color:var(--dim);line-height:1.2;word-break:break-word}
    .pays-card.active .pays-card-name{color:var(--gold)}
    .pays-card-cur{font-size:8px;color:var(--dim2);margin-top:1px}
    .sim-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
    .sim-3col{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px}

    @media(max-width:640px){
      .sim-types{grid-template-columns:repeat(3,1fr);gap:7px}
      .sim-type{padding:10px 6px}
      .sim-type-icon{font-size:20px;margin-bottom:4px}
      .sim-kpi-row{grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
      .sim-kpi{padding:12px 10px}
      .sim-kpi-val{font-size:15px}
      .sim-2col{grid-template-columns:1fr!important;gap:10px}
      .sim-3col{grid-template-columns:1fr 1fr!important;gap:8px}
      .archi-vs{grid-template-columns:1fr!important;gap:8px}
      .archi-vs-sep{display:none}
      .archi-col-price{font-size:17px}
      .mode-tab{padding:8px 6px;font-size:10px}
      .cta-strip{padding:16px 12px}
      .ratio-badge{flex-direction:column;gap:4px;padding:10px 12px}
    }
    @media(max-width:380px){
      .sim-types{grid-template-columns:repeat(2,1fr)}
      .sim-kpi-row{grid-template-columns:1fr 1fr}
      .sim-3col{grid-template-columns:1fr!important}
    }
  `;

  console.log("PAYS_LIST count:", PAYS_LIST.length, PAYS_LIST.map(p => p.code));

  return (
    <>
      <style>{CSS}</style>

      {/* ── Sélecteur de type ── */}
      <div className="card" style={{ overflow: "visible" }}>
        <div className="card-title">{t("sim_select")}</div>
        <div className="sim-types">
          {CHANTIERS.map(c => (
            <div key={c.id} className={`sim-type${selectedId === c.id ? " active" : ""}`} onClick={() => setSelectedId(c.id)}>
              <div className="sim-type-icon">{c.icon}</div>
              <div className="sim-type-label">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Paramètres */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1.5 }}>
            {t("sim_surface")} ({ch.surface_min}–{ch.surface_max} {ch.unit.split(" ")[0]})
          </label>
          <div className="sim-slider-wrap" style={{ marginTop: 10 }}>
            <input type="range" className="sim-slider"
              min={ch.surface_min} max={ch.surface_max} step={ch.surface_step}
              value={surface} onChange={e => setSurface(+e.target.value)}
            />
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "var(--gold)", minWidth: 80, textAlign: "right" }}>
              {surface} <span style={{ fontSize: 11 }}>{ch.unit.split(" ")[0]}</span>
            </div>
          </div>
        </div>
        <div style={{ overflow: "visible", height: "auto", maxHeight: "none" }}>
          <label style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1.5 }}>{t("sim_country")}</label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "7px",
            marginTop: "10px",
            overflow: "visible",
            height: "auto",
            maxHeight: "none",
          }}>
            {PAYS_LIST.map(p => (
              <div key={p.code}
                onClick={() => setPays(p.code)}
                style={{
                  background: pays === p.code ? "rgba(201,168,76,.09)" : "var(--panel)",
                  border: pays === p.code ? "1px solid var(--gold)" : "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "8px 5px",
                  textAlign: "center",
                  cursor: "pointer",
                  boxShadow: pays === p.code ? "0 0 0 1px var(--gold3)" : "none",
                }}>
                <div style={{ fontSize: "18px", marginBottom: "2px" }}>{p.flag}</div>
                <div style={{ fontSize: "9px", fontWeight: 600, color: pays === p.code ? "var(--gold)" : "var(--dim)", lineHeight: 1.2 }}>{p.name}</div>
                <div style={{ fontSize: "8px", color: "var(--dim2)", marginTop: "1px" }}>{p.cur}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mode tabs ── */}
      <div className="mode-tabs">
        <button className={`mode-tab${mode === "surcoûts" ? " active" : ""}`} onClick={() => setMode("surcoûts")}>
          📊 {t("sim_mode_overruns") || "Surcoûts évités"}
        </button>
        <button className={`mode-tab${mode === "architecte" ? " active" : ""}`} onClick={() => setMode("architecte")}>
          👷 {t("sim_mode_architect") || "vs Architecte traditionnel"}
        </button>
      </div>

      {/* ════════════════════════════════════════ */}
      {/* MODE 1 : SURCOÛTS CLASSIQUES            */}
      {/* ════════════════════════════════════════ */}
      {mode === "surcoûts" && (<>

        {/* KPIs animés */}
        <div className="sim-kpi-row">
          <div className="sim-kpi" style={{ borderTop: "2px solid var(--err)" }}>
            <div className="sim-kpi-lbl">{t("sim_without")}</div>
            <div className="sim-kpi-val" style={{ color: "var(--err)", fontSize: 17 }}>
              <AnimatedNumber value={coutSans} suffix={` ${cur}`} />
            </div>
            <div className="sim-kpi-sub">{t("sim_cost_sub")}</div>
          </div>
          <div className="sim-kpi" style={{ borderTop: "2px solid var(--gold)" }}>
            <div className="sim-kpi-lbl">{t("sim_with")}</div>
            <div className="sim-kpi-val" style={{ color: "var(--gold)", fontSize: 17 }}>
              <AnimatedNumber value={coutAvec} suffix={` ${cur}`} />
            </div>
            <div className="sim-kpi-sub">{t("sim_opt_sub")}</div>
          </div>
          <div className="sim-kpi sim-kpi-eco">
            <div className="sim-kpi-lbl">{t("sim_savings")}</div>
            <div className="sim-kpi-val" style={{ color: "var(--ok)" }}>
              <AnimatedNumber value={economie} suffix={` ${cur}`} />
            </div>
            <div className="sim-kpi-sub">
              <span style={{ color: "var(--ok)", fontWeight: 700, fontSize: 13 }}>
                <AnimatedNumber value={pctEco} suffix="%" />
              </span>
              {" "}{t("sim_cheaper")}
            </div>
          </div>
          <div className="sim-kpi sim-kpi-time">
            <div className="sim-kpi-lbl">{t("sim_time")}</div>
            <div className="sim-kpi-val" style={{ color: "var(--gold)" }}>
              <AnimatedNumber value={heuresGain} suffix=" h" />
            </div>
            <div className="sim-kpi-sub">
              {heuresSans}h → {heuresAvec}h {t("sim_with")}
            </div>
          </div>
        </div>

        {/* Comparaisons visuelles */}
        <div className="sim-2col">
          <div className="card">
            <div className="card-title">{t("sim_compare_costs")}</div>
            <CompareBar label={t("sim_without")} value={coutSans} max={coutSans} color="var(--err)" suffix={` ${cur}`} />
            <CompareBar label={t("sim_with")} value={coutAvec} max={coutSans} color="var(--gold)" suffix={` ${cur}`} />
            <div style={{ height: 40, borderRadius: 6, overflow: "hidden", display: "flex", marginTop: 12, marginBottom: 8 }}>
              <div style={{ width: `${100 - pctEco}%`, background: "var(--gold)", display: "flex", alignItems: "center", paddingLeft: 10, fontSize: 10, fontWeight: 700, color: "#0A0A0A", transition: "width .8s" }}>
                PHG
              </div>
              <div style={{ flex: 1, background: "rgba(201,76,76,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--err)", fontWeight: 700 }}>
                -{pctEco}% économisé
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">{t("sim_compare_time")}</div>
            <CompareBar label={t("sim_classic")} value={heuresSans} max={heuresSans} color="var(--err)" suffix=" h" />
            <CompareBar label={t("sim_with")} value={heuresAvec} max={heuresSans} color="var(--gold)" suffix=" h" />
            <div style={{ background: "rgba(201,168,76,.06)", borderRadius: 8, padding: "10px 12px", marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 26 }}>⏱️</span>
                <div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "var(--gold)" }}>
                    <AnimatedNumber value={heuresGain} suffix=" h" />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>{t("sim_freed")}</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--dim)" }}>
              {heuresSans}h = {Math.round(heuresSans / 8)} {t("sim_days")} → PHG : <strong style={{ color: "var(--gold)" }}>{heuresAvec}h</strong>
            </div>
          </div>
        </div>

        {/* Erreurs vs gains */}
        <div className="sim-2col">
          <div className="card">
            <div className="card-title" style={{ color: "var(--err)" }}>{t("sim_errors")}</div>
            {ch.erreurs_typiques.map((e, i) => (
              <div key={i} className="erreur-item">
                <span style={{ color: "var(--err)", fontSize: 13, flexShrink: 0 }}>✗</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title" style={{ color: "var(--ok)" }}>{t("sim_gains")}</div>
            {ch.gains_phg.map((g, i) => (
              <div key={i} className="gain-item">
                <span style={{ color: "var(--ok)", fontSize: 13, flexShrink: 0 }}>✓</span>
                <span style={{ color: "var(--text)" }}>{g}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ROI surcoûts */}
        <div className="card">
          <div className="card-title">{t("sim_roi")}</div>
          <div className="sim-3col">
              { label: t("sim_roi_savings"), value: `${fmt(economie)} ${cur}`, color: "var(--ok)" },
              { label: t("sim_roi_label"), value: `×${Math.max(1, Math.round(economie / (12.90 * 12 * rate)))}`, color: "var(--gold)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", background: "rgba(201,168,76,.05)", border: "1px solid var(--gold3)", borderRadius: 8, padding: "12px 16px", marginBottom: 14 }}>
            <span style={{ fontSize: 30 }}>💡</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 3 }}>
                {t("sim_rentabilise")} {roiSurcoût <= 1 ? t("sim_month_1") : `${roiSurcoût}${t("sim_month_n")}`} {t("sim_month_label")}
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.6 }}>
                {t("sim_economy")} <strong style={{ color: "var(--ok)" }}>{fmt(economie)} {cur}</strong> {t("sim_represents")}{" "}
                <strong style={{ color: "var(--gold)" }}>{Math.max(1, Math.round(economie / (12.90 * 12 * rate)))} {t("sim_x_price")}</strong>.
              </div>
            </div>
          </div>
          <CTAStrip setPage={setPage} pctEco={pctEco} t={t} />
        </div>
      </>)}


      {/* ════════════════════════════════════════ */}
      {/* MODE 2 : VS ARCHITECTE TRADITIONNEL     */}
      {/* ════════════════════════════════════════ */}
      {mode === "architecte" && (<>

        {/* Slider honoraires */}
        <div className="card">
          <div className="card-title">Honoraires architecte traditionnel</div>
          <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--dim)" }}>
            <span>Fourchette marché : 6% – 18% du coût de construction</span>
            <span style={{ color: "var(--gold)", fontWeight: 700, fontFamily: "'Cinzel',serif", fontSize: 14 }}>{archiPct}%</span>
          </div>
          <div className="sim-slider-wrap">
            <span style={{ fontSize: 10, color: "var(--dim2)" }}>6%</span>
            <input type="range" className="sim-slider"
              min={6} max={18} step={1}
              value={archiPct} onChange={e => setArchiPct(+e.target.value)}
            />
            <span style={{ fontSize: 10, color: "var(--dim2)" }}>18%</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {[[6,"Budget"], [10,"Typique"], [14,"Premium"], [18,"Luxe"]].map(([v, l]) => (
              <button key={v} onClick={() => setArchiPct(v)}
                style={{ padding: "4px 10px", fontSize: 10, borderRadius: 6, border: `1px solid ${archiPct === v ? "var(--gold)" : "var(--border2)"}`, background: archiPct === v ? "rgba(201,168,76,.12)" : "transparent", color: archiPct === v ? "var(--gold)" : "var(--dim)", cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
                {v}% — {l}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs vs architecte */}
        <div className="sim-kpi-row">
          <div className="sim-kpi" style={{ borderTop: "2px solid var(--err)" }}>
            <div className="sim-kpi-lbl">Coût construction</div>
            <div className="sim-kpi-val" style={{ color: "var(--text)", fontSize: 17 }}>
              <AnimatedNumber value={coutBase} suffix={` ${cur}`} />
            </div>
            <div className="sim-kpi-sub">Base identique pour les 2</div>
          </div>
          <div className="sim-kpi" style={{ borderTop: "2px solid var(--err)" }}>
            <div className="sim-kpi-lbl">Honoraires architecte</div>
            <div className="sim-kpi-val" style={{ color: "var(--err)", fontSize: 17 }}>
              <AnimatedNumber value={archiHonoraires} suffix={` ${cur}`} />
            </div>
            <div className="sim-kpi-sub">{archiPct}% du coût de construction</div>
          </div>
          <div className="sim-kpi" style={{ borderTop: "2px solid var(--gold)" }}>
            <div className="sim-kpi-lbl">Abonnement PHG / an</div>
            <div className="sim-kpi-val" style={{ color: "var(--gold)", fontSize: 17 }}>
              <AnimatedNumber value={phgAnnuel} suffix={` ${cur}`} />
            </div>
            <div className="sim-kpi-sub">Plan PRO · accès toutes fonctionnalités</div>
          </div>
          <div className="sim-kpi sim-kpi-eco">
            <div className="sim-kpi-lbl">Économie nette</div>
            <div className="sim-kpi-val" style={{ color: "var(--ok)" }}>
              <AnimatedNumber value={economieSurArchi} suffix={` ${cur}`} />
            </div>
            <div className="sim-kpi-sub">
              <span style={{ color: "var(--ok)", fontWeight: 700 }}>{ratioArchi}× </span>
              le prix de PHG PRO
            </div>
          </div>
        </div>

        {/* Comparaison côte à côte */}
        <div className="archi-vs">
          <div className="archi-col">
            <div className="archi-col-title">Architecte traditionnel</div>
            <div className="archi-col-icon">🏛️</div>
            <div className="archi-col-price" style={{ color: "var(--err)" }}>
              {fmt(totalAvecArchi)} {cur}
            </div>
            <div className="archi-col-sub">
              Construction : {fmt(coutBase)} {cur}<br />
              + Honoraires ({archiPct}%) : {fmt(archiHonoraires)} {cur}<br />
              <span style={{ color: "var(--dim2)", fontSize: 9, display: "block", marginTop: 4 }}>Délais : 4–8 semaines avant démarrage</span>
            </div>
          </div>
          <div className="archi-vs-sep">VS</div>
          <div className="archi-col winner">
            <div className="archi-col-title" style={{ color: "var(--gold)" }}>PHG BUILD IA PRO</div>
            <div className="archi-col-icon">𓂀</div>
            <div className="archi-col-price" style={{ color: "var(--ok)" }}>
              {fmt(totalAvecPHG)} {cur}
            </div>
            <div className="archi-col-sub">
              Construction : {fmt(coutBase)} {cur}<br />
              + Abonnement PHG/an : {fmt(phgAnnuel)} {cur}<br />
              <span style={{ color: "var(--ok)", fontSize: 9, display: "block", marginTop: 4, fontWeight: 700 }}>Démarrage immédiat · Projets illimités</span>
            </div>
          </div>
        </div>

        {/* Jauge économies */}
        <div className="card" style={{ textAlign: "center", padding: "20px 24px" }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 11, color: "var(--gold)", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>
            Vous économisez
          </div>
          <SemiGauge pct={Math.min(98, pctEconomiArchi)} color="var(--ok)" size={160} />
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 42, color: "var(--ok)", lineHeight: 1, marginTop: -20 }}>
            {pctEconomiArchi}%
          </div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>du budget total (construction + suivi)</div>
          <div style={{ marginTop: 16, display: "inline-flex", gap: 6 }}>
            <div style={{ background: "var(--ok)", width: 12, height: 12, borderRadius: 2, marginTop: 2 }} />
            <span style={{ fontSize: 11, color: "var(--text)" }}>
              Économie nette : <strong style={{ color: "var(--ok)" }}>{fmt(economieSurArchi)} {cur}</strong>
            </span>
          </div>
        </div>

        {/* Tableau détaillé */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">Décomposition du budget total</div>
          <div className="archi-breakdown">
            <div className="archi-row">
              <span style={{ color: "var(--dim)" }}>Coût de construction optimisé</span>
              <span style={{ fontFamily: "'Cinzel',serif" }}>{fmt(coutBase)} {cur}</span>
            </div>
            <div className="archi-row" style={{ color: "var(--err)" }}>
              <span>+ Honoraires architecte ({archiPct}%)</span>
              <span style={{ fontFamily: "'Cinzel',serif" }}>{fmt(archiHonoraires)} {cur}</span>
            </div>
            <div className="archi-row total">
              <span>= Total avec architecte</span>
              <span style={{ fontFamily: "'Cinzel',serif", color: "var(--err)" }}>{fmt(totalAvecArchi)} {cur}</span>
            </div>
            <div style={{ height: 1, background: "linear-gradient(90deg,transparent,var(--border2),transparent)" }} />
            <div className="archi-row" style={{ color: "var(--dim)" }}>
              <span>Coût de construction optimisé</span>
              <span style={{ fontFamily: "'Cinzel',serif" }}>{fmt(coutBase)} {cur}</span>
            </div>
            <div className="archi-row" style={{ color: "var(--gold)" }}>
              <span>+ Abonnement PHG BUILD IA PRO / an</span>
              <span style={{ fontFamily: "'Cinzel',serif" }}>{fmt(phgAnnuel)} {cur}</span>
            </div>
            <div className="archi-row total">
              <span>= Total avec PHG BUILD IA</span>
              <span style={{ fontFamily: "'Cinzel',serif", color: "var(--ok)" }}>{fmt(totalAvecPHG)} {cur}</span>
            </div>
            <div className="archi-row savings">
              <span style={{ fontWeight: 700 }}>✓ Votre économie nette</span>
              <span style={{ fontFamily: "'Cinzel',serif", fontWeight: 800, fontSize: 14 }}>–{fmt(economieSurArchi)} {cur}</span>
            </div>
          </div>

          <div className="ratio-badge" style={{ display: "flex" }}>
            <span style={{ fontSize: 28 }}>⚡</span>
            <div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: "var(--gold)" }}>
                PHG BUILD IA coûte <strong>{ratioArchi}× moins cher</strong> que les honoraires d'un architecte
              </div>
              <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 3 }}>
                {fmt(archiHonoraires)} {cur} d'honoraires économisés — abonnement PHG à seulement {fmt(phgAnnuel)} {cur}/an
              </div>
            </div>
          </div>
        </div>

        {/* Avantages PHG vs Architecte */}
        <div className="sim-2col">
          <div className="card">
            <div className="card-title" style={{ color: "var(--err)" }}>👷 Architecte traditionnel</div>
            {[
              `Honoraires : ${archiPct}% du budget (${fmt(archiHonoraires)} ${cur})`,
              "Délai de démarrage : 4 à 8 semaines",
              "Disponibilité limitée et rendez-vous planifiés",
              "Révisions de plans facturées en supplément",
              "Pas d'export DXF / BIM automatique",
              "Suivi chantier souvent externalisé",
            ].map((e, i) => (
              <div key={i} className="erreur-item">
                <span style={{ color: "var(--err)", fontSize: 13, flexShrink: 0 }}>✗</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title" style={{ color: "var(--ok)" }}>𓂀 PHG BUILD IA PRO</div>
            {[
              `Abonnement fixe : ${fmt(phgAnnuel)} ${cur}/an — projets illimités`,
              "Disponible 24h/7j, démarrage immédiat",
              "IA génère plans + quantitatifs en minutes",
              "Révisions instantanées sans surcoût",
              "Export DXF / PDF / BIM inclus",
              "Suivi chantier temps réel intégré",
            ].map((g, i) => (
              <div key={i} className="gain-item">
                <span style={{ color: "var(--ok)", fontSize: 13, flexShrink: 0 }}>✓</span>
                <span style={{ color: "var(--text)" }}>{g}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="card">
          <div className="card-title">{t("sim_roi")}</div>
          <div className="sim-3col">
              { label: "Abonnement PHG PRO/an", value: `${fmt(phgAnnuel)} ${cur}`, color: "var(--gold)" },
              { label: "Rapport coût / valeur", value: `×${ratioArchi}`, color: "var(--ok)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", background: "rgba(76,175,110,.05)", border: "1px solid rgba(76,175,110,.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 14 }}>
            <span style={{ fontSize: 30 }}>💡</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ok)", marginBottom: 3 }}>
                PHG BUILD IA se rentabilise dès le 1er projet
              </div>
              <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.6 }}>
                Pour {ch.label.toLowerCase()} de {surface} {ch.unit.split(" ")[0]}, les honoraires d'un architecte à {archiPct}% représentent{" "}
                <strong style={{ color: "var(--err)" }}>{fmt(archiHonoraires)} {cur}</strong>.{" "}
                PHG BUILD IA vous offre les mêmes fonctionnalités pour seulement{" "}
                <strong style={{ color: "var(--gold)" }}>{fmt(phgAnnuel)} {cur}/an</strong>.
              </div>
            </div>
          </div>
          <CTAStrip setPage={setPage} pctEco={pctEconomiArchi} t={t} />
        </div>
      </>)}

      <div className="note" style={{ marginTop: 14 }}>{t("sim_disclaimer")}</div>
    </>
  );
}

// ── Bande CTA réutilisable ────────────────────────────────────────────────────
function CTAStrip({ setPage, pctEco, t }) {
  return (
    <div className="cta-strip">
      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "var(--gold)", marginBottom: 6 }}>
        {t("sim_cta_title")}
      </div>
      <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 14, lineHeight: 1.7 }}>
        {t("sim_cta_sub")} <strong style={{ color: "var(--ok)" }}>{pctEco}%</strong> {t("sim_cta_sub2")}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn btn-gold" style={{ padding: "10px 24px", fontSize: 13 }}
          onClick={() => setPage && setPage("maison")}>
          {t("sim_cta_btn1")}
        </button>
        <button className="btn btn-out" style={{ padding: "10px 24px", fontSize: 13 }}
          onClick={() => setPage && setPage("abonnement")}>
          {t("sim_cta_btn2")}
        </button>
      </div>
    </div>
  );
}
