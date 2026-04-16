import { useState, useEffect, useRef } from "react";
import { CHANTIERS_I18N } from "./i18n.js";

// ── Données de base (non-traduisibles) ────────────────────────────────────────
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
    cout_sans_m2: 1400,       // €/m² sans PHG (erreurs, surcoûts, imprévus)
    cout_avec_m2: 1050,       // €/m² avec PHG (optimisé)
    heures_sans: 280,         // heures de gestion chantier sans PHG
    heures_avec: 40,          // heures avec PHG
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
    erreurs_typiques: [
      "Calcul ferraillage incorrent (+18%)",
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

  const fmt = (n) => decimals > 0
    ? n.toFixed(decimals)
    : Math.round(n).toLocaleString("fr-FR");

  return <span>{prefix}{fmt(display)}{suffix}</span>;
}

// ── Barre de progression ──────────────────────────────────────────────────────
function CompareBar({ label, value, max, color, prefix = "", suffix = "" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: "var(--dim)" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{prefix}{value.toLocaleString("fr-FR")}{suffix}</span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,.06)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .8s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

export default function SimulateurEconomies({ setPage, t = (k) => k, lang = "fr" }) {
  const [selectedId, setSelectedId] = useState("maison");
  const [surface, setSurface] = useState(120);
  const [pays, setPays] = useState("CI");

  // Fusionner données de base avec traductions
  const i18nData = CHANTIERS_I18N[lang] || CHANTIERS_I18N.fr;
  const CHANTIERS = CHANTIERS_BASE.map(base => {
    const tr = i18nData.find(d => d.id === base.id);
    return tr ? { ...base, label: tr.label, unit: tr.unit, erreurs_typiques: tr.erreurs, gains_phg: tr.gains } : base;
  });

  const ch = CHANTIERS.find(c => c.id === selectedId);

  // Multiplicateur pays
  const PAYS_MULT = { FR: 1.0, CH: 1.4, CI: 0.65, SN: 0.60, MA: 0.72, CA: 1.15 };
  const PAYS_CUR  = { FR: "€", CH: "CHF", CI: "FCFA", SN: "FCFA", MA: "MAD", CA: "CAD" };
  const PAYS_EUR  = { FR: 1, CH: 1, CI: 655.957, SN: 655.957, MA: 10.6, CA: 1.45 };
  const mult = PAYS_MULT[pays] || 1;
  const cur  = PAYS_CUR[pays] || "€";
  const rate = PAYS_EUR[pays] || 1;

  const fmt = (n) => Math.round(n).toLocaleString("fr-FR");

  const coutSans  = Math.round(ch.cout_sans_m2 * surface * mult * rate);
  const coutAvec  = Math.round(ch.cout_avec_m2 * surface * mult * rate);
  const economie  = coutSans - coutAvec;
  const pctEco    = Math.round((economie / coutSans) * 100);
  const heuresSans = ch.heures_sans;
  const heuresAvec = ch.heures_avec;
  const heuresGain = heuresSans - heuresAvec;
  const roi       = Math.round((economie / (9.90 * rate)) / 12); // mois pour rentabiliser PRO

  // Sync surface quand on change de type
  useEffect(() => {
    setSurface(ch.surface_default);
  }, [selectedId]);

  return (
    <>
      <style>{`
        .sim-types { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
        .sim-type { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px 10px; text-align: center; cursor: pointer; transition: all .2s; }
        .sim-type:hover { border-color: var(--gold3); background: rgba(201,168,76,.05); }
        .sim-type.active { border-color: var(--gold); background: rgba(201,168,76,.09); box-shadow: 0 0 0 1px var(--gold3); }
        .sim-type-icon { font-size: 26px; margin-bottom: 6px; }
        .sim-type-label { font-size: 11px; font-weight: 600; color: var(--dim); line-height: 1.3; }
        .sim-type.active .sim-type-label { color: var(--gold); }
        .sim-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .sim-kpi { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px 14px; position: relative; overflow: hidden; }
        .sim-kpi::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
        .sim-kpi-lbl { font-size: 9px; color: var(--dim); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; }
        .sim-kpi-val { font-family: 'Cinzel', serif; font-size: 22px; line-height: 1.1; }
        .sim-kpi-sub { font-size: 10px; color: var(--dim); margin-top: 4px; }
        .sim-kpi-eco { border-color: rgba(76,175,110,.3) !important; background: rgba(76,175,110,.04) !important; }
        .sim-kpi-eco::after { background: var(--ok) !important; }
        .sim-kpi-time { border-color: rgba(201,168,76,.3) !important; }
        .sim-kpi-time::after { background: var(--gold) !important; }
        .sim-gauge { position: relative; width: 140px; height: 140px; margin: 0 auto 12px; }
        .sim-slider-wrap { display: flex; align-items: center; gap: 14px; }
        .sim-slider { flex: 1; -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: var(--border2); outline: none; }
        .sim-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--gold); cursor: pointer; box-shadow: 0 0 0 3px rgba(201,168,76,.2); }
        .sim-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--gold); cursor: pointer; border: none; }
        .gain-item { display: flex; gap: 8px; align-items: flex-start; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.04); font-size: 11px; }
        .gain-item:last-child { border: none; }
        .erreur-item { display: flex; gap: 8px; align-items: flex-start; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.04); font-size: 11px; color: var(--dim); }
        .erreur-item:last-child { border: none; }
        .roi-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(201,168,76,.1); border: 1px solid var(--gold3); border-radius: 8px; padding: 10px 16px; margin-top: 14px; }
        .versus-bar { position: relative; height: 48px; border-radius: 8px; overflow: hidden; margin-bottom: 8px; display: flex; align-items: center; }
        .cta-strip { background: linear-gradient(135deg, rgba(201,168,76,.12), rgba(201,168,76,.04)); border: 1px solid var(--gold3); border-radius: 12px; padding: 24px; text-align: center; margin-top: 4px; }
      `}</style>

      {/* ── Sélecteur de type ── */}
      <div className="card">
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1.5 }}>
              {t("sim_surface")} ({ch.surface_min}–{ch.surface_max} {ch.unit.split(" ")[0]})
            </label>
            <div className="sim-slider-wrap" style={{ marginTop: 10 }}>
              <input
                type="range" className="sim-slider"
                min={ch.surface_min} max={ch.surface_max} step={ch.surface_step}
                value={surface} onChange={e => setSurface(+e.target.value)}
              />
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: "var(--gold)", minWidth: 80, textAlign: "right" }}>
                {surface} <span style={{ fontSize: 11 }}>{ch.unit.split(" ")[0]}</span>
              </div>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1.5 }}>{t("sim_country")}</label>
            <select value={pays} onChange={e => setPays(e.target.value)} style={{ marginTop: 10, width: "100%" }}>
              <option value="CI">🇨🇮 Côte d'Ivoire (FCFA)</option>
              <option value="SN">🇸🇳 Sénégal (FCFA)</option>
              <option value="MA">🇲🇦 Maroc (MAD)</option>
              <option value="FR">🇫🇷 France (€)</option>
              <option value="CH">🇨🇭 Suisse (CHF)</option>
              <option value="CA">🇨🇦 Canada (CAD)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── KPIs animés ── */}
      <div className="sim-kpi-row">
        <div className="sim-kpi" style={{ borderTopColor: "var(--err)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--err)" }} />
          <div className="sim-kpi-lbl">{t("sim_without")}</div>
          <div className="sim-kpi-val" style={{ color: "var(--err)", fontSize: 18 }}>
            <AnimatedNumber value={coutSans} suffix={` ${cur}`} />
          </div>
          <div className="sim-kpi-sub">{t("sim_cost_sub")}</div>
        </div>

        <div className="sim-kpi" style={{ borderTopColor: "var(--gold)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--gold)" }} />
          <div className="sim-kpi-lbl">{t("sim_with")}</div>
          <div className="sim-kpi-val" style={{ color: "var(--gold)", fontSize: 18 }}>
            <AnimatedNumber value={coutAvec} suffix={` ${cur}`} />
          </div>
          <div className="sim-kpi-sub">{t("sim_opt_sub")}</div>
        </div>

        <div className="sim-kpi sim-kpi-eco">
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--ok)" }} />
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
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--gold)" }} />
          <div className="sim-kpi-lbl">{t("sim_time")}</div>
          <div className="sim-kpi-val" style={{ color: "var(--gold)" }}>
            <AnimatedNumber value={heuresGain} suffix=" h" />
          </div>
          <div className="sim-kpi-sub">
            {heuresSans}h {t("sim_mgmt")} → {heuresAvec}h {t("sim_with")}
          </div>
        </div>
      </div>

      {/* ── Comparaison visuelle ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Barre versus */}
        <div className="card">
          <div className="card-title">{t("sim_compare_costs")}</div>
          <div style={{ marginBottom: 16 }}>
            <CompareBar label={t("sim_without")} value={coutSans} max={coutSans} color="var(--err)" suffix={` ${cur}`} />
            <CompareBar label={t("sim_with")} value={coutAvec} max={coutSans} color="var(--gold)" suffix={` ${cur}`} />
          </div>

          {/* Barre visuelle empilée */}
          <div style={{ height: 40, borderRadius: 6, overflow: "hidden", display: "flex", marginBottom: 8 }}>
            <div style={{
              width: `${100 - pctEco}%`, background: "var(--gold)",
              display: "flex", alignItems: "center", paddingLeft: 10,
              fontSize: 10, fontWeight: 700, color: "#0A0A0A", transition: "width .8s"
            }}>
              PHG
            </div>
            <div style={{
              flex: 1, background: "rgba(201,76,76,.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: "var(--err)", fontWeight: 700
            }}>
              -{pctEco}% économisé
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--dim)" }}>
            <span>{t("sim_with")}</span>
            <span style={{ color: "var(--err)" }}>-{pctEco}%</span>
          </div>
        </div>

        {/* Temps */}
        <div className="card">
          <div className="card-title">{t("sim_compare_time")}</div>
          <div style={{ marginBottom: 16 }}>
            <CompareBar label={t("sim_classic")} value={heuresSans} max={heuresSans} color="var(--err)" suffix=" h" />
            <CompareBar label={t("sim_with")} value={heuresAvec} max={heuresSans} color="var(--gold)" suffix=" h" />
          </div>
          <div style={{ background: "rgba(201,168,76,.06)", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 28 }}>⏱️</span>
              <div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: "var(--gold)" }}>
                  <AnimatedNumber value={heuresGain} suffix=" h" />
                </div>
                <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>
                  {t("sim_freed")}
                </div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--dim)", lineHeight: 1.7 }}>
            {heuresSans}h = {Math.round(heuresSans / 8)} {t("sim_days")}.<br />
            PHG → <strong style={{ color: "var(--gold)" }}>{heuresAvec}h</strong>
          </div>
        </div>
      </div>

      {/* ── Détail erreurs vs gains ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
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

      {/* ── ROI + CTA ── */}
      <div className="card">
        <div className="card-title">{t("sim_roi")}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label: t("sim_roi_cost"), value: `${Math.round(9.90 * 12 * rate).toLocaleString("fr-FR")} ${cur}`, color: "var(--dim)" },
            { label: t("sim_roi_savings"), value: `${fmt(economie)} ${cur}`, color: "var(--ok)" },
            { label: t("sim_roi_label"), value: `×${Math.max(1, Math.round(economie / (9.90 * 12 * rate)))}`, color: "var(--gold)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,var(--gold3),transparent)", margin: "14px 0" }} />

        {/* Simulation mensuelle */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", background: "rgba(201,168,76,.05)", border: "1px solid var(--gold3)", borderRadius: 8, padding: "12px 16px", marginBottom: 14 }}>
          <span style={{ fontSize: 32 }}>💡</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 3 }}>
              {t("sim_rentabilise")} {roi <= 1 ? t("sim_month_1") : `${roi}${t("sim_month_n")}`} {t("sim_month_label")}
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.6 }}>
              {t("sim_for_a")} {ch.label.toLowerCase()} {t("sim_of")} {surface} {ch.unit.split(" ")[0]} {t("sim_in")} {pays === "CI" ? "Côte d'Ivoire" : pays === "SN" ? "Sénégal" : pays === "MA" ? "Maroc" : pays === "FR" ? "France" : pays === "CH" ? "Suisse" : "Canada"},
              {" "}{t("sim_economy")} <strong style={{ color: "var(--ok)" }}>{fmt(economie)} {cur}</strong> {t("sim_represents")}{" "}
              <strong style={{ color: "var(--gold)" }}>{Math.max(1, Math.round(economie / (9.90 * 12 * rate)))} {t("sim_x_price")}</strong>.
            </div>
          </div>
        </div>

        <div className="cta-strip">
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "var(--gold)", marginBottom: 6 }}>
            {t("sim_cta_title")}
          </div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 14, lineHeight: 1.7 }}>
            {t("sim_cta_sub")} <strong style={{ color: "var(--ok)" }}>{pctEco}%</strong> {t("sim_cta_sub2")}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-gold"
              style={{ padding: "10px 24px", fontSize: 13 }}
              onClick={() => setPage && setPage("maison")}
            >
              {t("sim_cta_btn1")}
            </button>
            <button
              className="btn btn-out"
              style={{ padding: "10px 24px", fontSize: 13 }}
              onClick={() => setPage && setPage("abonnement")}
            >
              {t("sim_cta_btn2")}
            </button>
          </div>
        </div>

        <div className="note" style={{ marginTop: 14 }}>
          {t("sim_disclaimer")}
        </div>
      </div>
    </>
  );
}
