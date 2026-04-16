import { useState, useRef, useEffect, useCallback } from "react";

const API_KEY = import.meta.env?.VITE_ANTHROPIC_API_KEY || "";
const MODEL   = "claude-sonnet-4-6";

// ── Zones ─────────────────────────────────────────────────────────────────────
const ZONES = [
  { id: "facade",      fr: "Façade",        en: "Facade",       es: "Fachada",    ar: "الواجهة"  },
  { id: "toiture",     fr: "Toiture",       en: "Roof",         es: "Tejado",     ar: "السقف"    },
  { id: "cuisine",     fr: "Cuisine",       en: "Kitchen",      es: "Cocina",     ar: "المطبخ"   },
  { id: "sdb",         fr: "Salle de bain", en: "Bathroom",     es: "Baño",       ar: "الحمام"   },
  { id: "structure",   fr: "Structure",     en: "Structure",    es: "Estructura", ar: "الهيكل"   },
  { id: "electricite", fr: "Électricité",   en: "Electrical",   es: "Electricidad",ar: "الكهرباء" },
];
const zl = (z, lang) => z[lang] || z.fr;

const PLAN_ZONE_LIMIT = { free: 2, pro: 6, elite: 6 };

// ── Mock diagnostic ───────────────────────────────────────────────────────────
const MOCK_DIAG = {
  facade:      { score: 55, status: "warn",
    issues: { fr: ["Fissures horizontales (12 ml)", "Peinture extérieure dégradée", "Infiltrations ponctuelles"], en: ["Horizontal cracks (12 lm)", "Degraded exterior paint", "Localized water infiltrations"] },
    recs:   { fr: ["Rebouchage + enduit de finition", "Ravalement complet façade", "Traitement hydrofuge"], en: ["Crack filling + finish render", "Full facade renovation", "Waterproofing treatment"] } },
  toiture:     { score: 28, status: "err",
    issues: { fr: ["Tuiles cassées (~23 unités)", "Gouttière obstruée — risque débordement", "Faîtage partiellement décollé"], en: ["Broken tiles (~23 units)", "Blocked gutter — overflow risk", "Partially detached ridge"] },
    recs:   { fr: ["Remplacement tuiles URGENT", "Nettoyage + remplacement gouttières", "Réfection faîtage + zinguerie"], en: ["URGENT tile replacement", "Gutter cleaning + replacement", "Ridge + flashing overhaul"] } },
  cuisine:     { score: 71, status: "warn",
    issues: { fr: ["Carrelage fissuré (3 m²)", "Joints noircis", "Robinetterie présentant des fuites"], en: ["Cracked floor tiles (3 m²)", "Blackened grout", "Leaking fixtures"] },
    recs:   { fr: ["Remplacement carrelage localisé", "Rejointoiement complet", "Remplacement robinetterie"], en: ["Localized tile replacement", "Full regrouting", "Replace plumbing fixtures"] } },
  sdb:         { score: 42, status: "warn",
    issues: { fr: ["Humidité murale importante", "Ventilation insuffisante (absence VMC)", "Robinetterie vétuste"], en: ["Significant wall moisture", "Insufficient ventilation (no CMV)", "Outdated fixtures"] },
    recs:   { fr: ["Étanchéité + nouveau carrelage mural", "Installation VMC double flux", "Remplacement robinetterie"], en: ["Waterproofing + new wall tiling", "Double-flow CMV installation", "Replace fixtures"] } },
  structure:   { score: 85, status: "ok",
    issues: { fr: ["Légères microfissures en pignon nord", "Aucun désordre structurel majeur"], en: ["Minor microcracks on north gable", "No major structural disorder"] },
    recs:   { fr: ["Surveillance annuelle recommandée", "Injection résine si progression"], en: ["Annual monitoring recommended", "Resin injection if crack progresses"] } },
  electricite: { score: 25, status: "err",
    issues: { fr: ["Tableau électrique vétuste (pré-1980)", "Absence de différentiel 30 mA", "Fils non gainés dans combles"], en: ["Outdated panel (pre-1980)", "No 30 mA differential breaker", "Unsheathed wires in attic"] },
    recs:   { fr: ["Remplacement tableau NF C 15-100 URGENT", "Mise aux normes différentiels 30 mA", "Reprise câblage combles"], en: ["URGENT panel replacement (NF C 15-100)", "Install 30 mA differential breakers", "Rewire attic"] } },
};

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = {
  basique: {
    fr: "Basique", en: "Basic",
    desc: { fr: "Interventions essentielles uniquement — urgences critiques traitées.", en: "Essential interventions only — critical issues addressed." },
    duration: { fr: "2 – 3 mois", en: "2 – 3 months" },
    base: 18500, planReq: "free", recommended: false,
    perks: { fr: ["Toiture : réfection urgente", "Électricité : mise aux normes tableau", "Structure : injection microfissures", "Peinture non incluse"], en: ["Roof: urgent repairs", "Electrical: panel upgrade", "Structure: crack injection", "Paint not included"] },
  },
  standard: {
    fr: "Standard", en: "Standard",
    desc: { fr: "Rénovation complète — équilibre qualité / budget optimal.", en: "Full renovation — optimal quality/budget balance." },
    duration: { fr: "4 – 6 mois", en: "4 – 6 months" },
    base: 34800, planReq: "free", recommended: true,
    perks: { fr: ["Toiture complète + isolation", "Façade : ravalement + peinture", "Électricité : câblage NF C 15-100", "Salle de bain : rénovation totale", "Cuisine : carrelage + joints"], en: ["Full roof + insulation", "Facade: rendering + paint", "Full NF C 15-100 rewiring", "Bathroom: full renovation", "Kitchen: tiles + grout"] },
  },
  premium: {
    fr: "Premium", en: "Premium",
    desc: { fr: "Restauration haut de gamme — matériaux nobles, finitions excellence.", en: "High-end restoration — premium materials, excellence finishes." },
    duration: { fr: "6 – 9 mois", en: "6 – 9 months" },
    base: 57200, planReq: "pro", recommended: false,
    perks: { fr: ["Tout le Standard +", "Matériaux haut de gamme sélectionnés", "Domotique & smart home", "Isolation thermique RE 2020", "Finitions architecturales", "Rapport DPE inclus"], en: ["All Standard +", "Selected premium materials", "Home automation", "RE 2020 thermal insulation", "Architectural finishes", "DPE report included"] },
  },
};

// ── Materials ─────────────────────────────────────────────────────────────────
const MATS = [
  { id:"m01", zone:"facade",      fr:"Enduit de façade",               en:"Facade render",           unit:"m²",  qty:{ basique:80,  standard:120, premium:120 }, up:{ basique:28,   standard:42,   premium:72    } },
  { id:"m02", zone:"facade",      fr:"Peinture extérieure",            en:"Exterior paint",          unit:"m²",  qty:{ basique:0,   standard:120, premium:120 }, up:{ basique:0,    standard:24,   premium:55    } },
  { id:"m03", zone:"toiture",     fr:"Tuiles terre cuite",             en:"Clay roof tiles",         unit:"u",   qty:{ basique:25,  standard:25,  premium:25  }, up:{ basique:4.5,  standard:4.5,  premium:14    } },
  { id:"m04", zone:"toiture",     fr:"Membrane d'étanchéité",          en:"Waterproofing membrane",  unit:"m²",  qty:{ basique:0,   standard:90,  premium:90  }, up:{ basique:0,    standard:18,   premium:38    } },
  { id:"m05", zone:"toiture",     fr:"Laine de verre (sous-toiture)",  en:"Glass wool insulation",   unit:"m²",  qty:{ basique:0,   standard:90,  premium:90  }, up:{ basique:0,    standard:12,   premium:28    } },
  { id:"m06", zone:"cuisine",     fr:"Carrelage sol",                  en:"Floor tiles",             unit:"m²",  qty:{ basique:8,   standard:14,  premium:14  }, up:{ basique:22,   standard:48,   premium:135   } },
  { id:"m07", zone:"cuisine",     fr:"Robinetterie cuisine",           en:"Kitchen faucets",         unit:"ens", qty:{ basique:1,   standard:1,   premium:1   }, up:{ basique:180,  standard:650,  premium:1800  } },
  { id:"m08", zone:"sdb",         fr:"Faïence murale",                 en:"Wall tiles",              unit:"m²",  qty:{ basique:20,  standard:32,  premium:32  }, up:{ basique:18,   standard:42,   premium:105   } },
  { id:"m09", zone:"sdb",         fr:"Robinetterie salle de bain",     en:"Bathroom fixtures",       unit:"ens", qty:{ basique:1,   standard:1,   premium:1   }, up:{ basique:320,  standard:890,  premium:2600  } },
  { id:"m10", zone:"sdb",         fr:"VMC double flux",                en:"Double-flow CMV unit",    unit:"u",   qty:{ basique:0,   standard:1,   premium:1   }, up:{ basique:0,    standard:950,  premium:1800  } },
  { id:"m11", zone:"structure",   fr:"Résine d'injection",             en:"Injection resin",         unit:"L",   qty:{ basique:5,   standard:5,   premium:5   }, up:{ basique:28,   standard:28,   premium:45    } },
  { id:"m12", zone:"electricite", fr:"Tableau électrique",             en:"Electrical panel",        unit:"u",   qty:{ basique:1,   standard:1,   premium:1   }, up:{ basique:1200, standard:1850, premium:2900  } },
  { id:"m13", zone:"electricite", fr:"Câblage NF C 15-100",            en:"NF C 15-100 wiring",      unit:"ml",  qty:{ basique:50,  standard:120, premium:120 }, up:{ basique:8,    standard:13,   premium:20    } },
];

// ── i18n ──────────────────────────────────────────────────────────────────────
const UI = {
  fr: {
    title: "Diagnostic & Restauration",
    tabs: ["Photos", "Diagnostic", "Scénarios", "Matériaux", "Assistant", "Export"],
    uploadTitle: "Glissez vos photos ici",
    uploadSub: "ou cliquez pour parcourir — JPG, PNG, WEBP",
    addPhoto: "+ Ajouter",
    analyzeBtn: "Lancer le diagnostic IA",
    analyzing: "Analyse en cours…",
    noAnalysis: "Lancez d'abord le diagnostic IA depuis l'onglet Photos.",
    scoreLabel: "Score",
    issuesLabel: "Problèmes détectés",
    recsLabel: "Recommandations",
    globalScore: "Score global bâtiment",
    selectScenario: "Sélectionner",
    selected: "Sélectionné ✓",
    recommended: "Recommandé",
    duration: "Durée estimée",
    totalCost: "Coût estimé HT",
    zoneCol: "Zone", matCol: "Matériau", unitCol: "Unité", qtyCol: "Qté", upCol: "PU (€)", totalCol: "Total (€)",
    grandTotal: "Total matériaux HT",
    laborLine: "Main-d'œuvre estimée (≈ 45%)",
    totalHT: "TOTAL HT",
    matNote: "* Prix indicatifs HT — France métropolitaine 2025. Ajustez les quantités pour recalculer.",
    chatPlaceholder: "Posez votre question sur le diagnostic ou les travaux…",
    send: "Envoyer",
    exportTitle: "Rapport de Diagnostic",
    exportBtn: "Télécharger le rapport (HTML)",
    printBtn: "Imprimer",
    lockedPlan: (p) => `Disponible à partir du plan ${p}`,
    upgradeExport: "Passez au plan Pro pour télécharger le rapport complet.",
    chatError: "Erreur de connexion — vérifiez votre clé API.",
    noMsgYet: "Posez une question sur votre diagnostic ou votre projet de rénovation.",
    suggestions: ["Quels travaux sont urgents ?", "Quel scénario recommandez-vous ?", "Coût rénovation toiture ?", "Aides financières disponibles ?"],
    planBadge: { free: "Gratuit", pro: "Pro", elite: "Élite" },
    zonesLimited: (n) => `Plan Gratuit — ${n} zones sur 6 incluses`,
    status: { ok: "Bon état", warn: "À surveiller", err: "Urgent" },
  },
  en: {
    title: "Diagnosis & Restoration",
    tabs: ["Photos", "Diagnosis", "Scenarios", "Materials", "Assistant", "Export"],
    uploadTitle: "Drop your photos here",
    uploadSub: "or click to browse — JPG, PNG, WEBP",
    addPhoto: "+ Add",
    analyzeBtn: "Run AI Diagnosis",
    analyzing: "Analyzing…",
    noAnalysis: "Run the AI diagnosis from the Photos tab first.",
    scoreLabel: "Score",
    issuesLabel: "Detected issues",
    recsLabel: "Recommendations",
    globalScore: "Building global score",
    selectScenario: "Select",
    selected: "Selected ✓",
    recommended: "Recommended",
    duration: "Estimated duration",
    totalCost: "Estimated cost (excl. tax)",
    zoneCol: "Zone", matCol: "Material", unitCol: "Unit", qtyCol: "Qty", upCol: "Unit price (€)", totalCol: "Total (€)",
    grandTotal: "Materials total (excl. tax)",
    laborLine: "Estimated labor (≈ 45%)",
    totalHT: "TOTAL (excl. tax)",
    matNote: "* Indicative prices excl. tax — France 2025. Adjust quantities to recalculate.",
    chatPlaceholder: "Ask a question about your diagnosis or renovation…",
    send: "Send",
    exportTitle: "Diagnostic Report",
    exportBtn: "Download report (HTML)",
    printBtn: "Print",
    lockedPlan: (p) => `Available from the ${p} plan`,
    upgradeExport: "Upgrade to Pro plan to download the full report.",
    chatError: "Connection error — check your API key.",
    noMsgYet: "Ask a question about your diagnosis or renovation project.",
    suggestions: ["Which works are urgent?", "Which scenario do you recommend?", "Roof renovation cost?", "Available financial grants?"],
    planBadge: { free: "Free", pro: "Pro", elite: "Elite" },
    zonesLimited: (n) => `Free plan — ${n} out of 6 zones included`,
    status: { ok: "Good", warn: "Monitor", err: "Urgent" },
  },
};
const t = (lang) => UI[lang] || UI.fr;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtN  = (n) => Number(n).toLocaleString("fr-FR");
const fmtEur = (n) => fmtN(n) + " €";
const delay  = (ms) => new Promise((r) => setTimeout(r, ms));
const sc     = (s) => s === "ok" ? "var(--ok)" : s === "warn" ? "var(--warn)" : "var(--err)";
const planOrd = { free: 0, pro: 1, elite: 2 };

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
.dr{font-family:'Montserrat',sans-serif;background:var(--bg,#111);border:1px solid var(--border);border-radius:var(--r,6px);overflow:hidden;color:var(--text)}
.dr-hd{padding:18px 24px 0;border-bottom:1px solid var(--border);background:var(--panel)}
.dr-row{display:flex;align-items:center;gap:8px}
.dr-ttl{font-size:17px;font-weight:700;color:var(--gold);letter-spacing:.04em}
.dr-bdg{font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;border:1px solid var(--gold);color:var(--gold)}
.dr-sub{font-size:11px;color:var(--dim,#888);margin-top:3px}
.dr-tabs{display:flex;overflow-x:auto;margin-top:14px;gap:0}
.dr-tab{padding:8px 15px;font-size:12px;font-weight:600;cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;color:var(--dim,#888);white-space:nowrap;transition:color .15s,border-color .15s}
.dr-tab:hover{color:var(--text)}
.dr-tab.on{color:var(--gold);border-bottom-color:var(--gold)}
.dr-sc-pill{margin-left:5px;font-size:9px;padding:1px 5px;border-radius:8px;font-weight:700;vertical-align:middle}
.dr-bd{padding:22px}
.dr-warn-banner{font-size:11px;color:var(--warn,#E8A94C);background:rgba(232,169,76,.08);border:1px solid var(--warn,#E8A94C);border-radius:var(--r,6px);padding:8px 14px;margin-bottom:14px}
/* photos */
.dr-zgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.dr-zcard{border:1px solid var(--border);border-radius:var(--r,6px);background:var(--panel);overflow:hidden}
.dr-zhead{display:flex;align-items:center;padding:9px 13px;border-bottom:1px solid var(--border)}
.dr-zname{font-size:13px;font-weight:600}
.dr-zcnt{margin-left:auto;font-size:10px;color:var(--dim,#888)}
.dr-drop{border:1.5px dashed var(--border);border-radius:var(--r,6px);margin:10px;padding:18px 10px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s}
.dr-drop:hover,.dr-drop.over{border-color:var(--gold);background:rgba(201,168,76,.06)}
.dr-drop-ttl{font-size:12px;color:var(--dim,#888);margin-top:4px}
.dr-drop-sub{font-size:10px;color:var(--dim,#888);margin-top:2px}
.dr-thumbs{display:flex;flex-wrap:wrap;gap:5px;padding:0 10px 10px}
.dr-thumb{position:relative;width:58px;height:58px;border-radius:4px;overflow:hidden;border:1px solid var(--border)}
.dr-thumb img{width:100%;height:100%;object-fit:cover}
.dr-tdel{position:absolute;top:2px;right:2px;width:15px;height:15px;border-radius:50%;background:rgba(0,0,0,.75);border:none;color:#fff;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1}
.dr-abtn{display:block;margin:18px auto 0;padding:10px 32px;background:var(--gold);color:#000;font-size:13px;font-weight:700;border:none;border-radius:var(--r,6px);cursor:pointer;letter-spacing:.05em;transition:opacity .15s}
.dr-abtn:disabled{opacity:.5;cursor:default}
.dr-pulse{animation:dr-pulse 1.1s ease-in-out infinite}
@keyframes dr-pulse{0%,100%{opacity:1}50%{opacity:.4}}
/* diagnostic */
.dr-dgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.dr-dcard{border:1px solid var(--border);border-radius:var(--r,6px);background:var(--panel);padding:15px}
.dr-dhead{display:flex;align-items:center;gap:10px;margin-bottom:11px}
.dr-circle{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;border:2px solid}
.dr-stag{font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px}
.dr-slbl{font-size:10px;font-weight:700;color:var(--dim,#888);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px;margin-top:8px}
.dr-ul{list-style:none;padding:0;margin:0}
.dr-ul li{font-size:12px;padding:3px 0 3px 13px;position:relative;color:var(--text)}
.dr-ul li::before{content:"–";position:absolute;left:1px;color:var(--dim,#888)}
.dr-gbar{margin:16px 0 0;padding:14px 18px;background:var(--panel);border:1px solid var(--border);border-radius:var(--r,6px);display:flex;align-items:center;gap:18px}
.dr-gbig{font-size:34px;font-weight:700;color:var(--gold)}
.dr-prog{flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden}
.dr-progf{height:100%;border-radius:3px;transition:width .7s ease}
.dr-nodata{text-align:center;padding:40px 20px;color:var(--dim,#888);font-size:13px}
/* scenarios */
.dr-sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px;padding-top:12px}
.dr-scard{border:1.5px solid var(--border);border-radius:var(--r,6px);background:var(--panel);padding:18px;position:relative;transition:border-color .15s;cursor:pointer}
.dr-scard.on{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold)}
.dr-scard.locked{opacity:.4;cursor:not-allowed;pointer-events:none}
.dr-srec{position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:700;padding:2px 10px;border-radius:10px;background:var(--gold);color:#000;white-space:nowrap}
.dr-slck{position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:10px;padding:2px 10px;border-radius:10px;background:var(--panel);border:1px solid var(--border);color:var(--dim,#888);white-space:nowrap}
.dr-sttl{font-size:14px;font-weight:700;margin-bottom:6px}
.dr-sdsc{font-size:11px;color:var(--dim,#888);margin-bottom:11px;line-height:1.5}
.dr-sprc{font-size:20px;font-weight:700;color:var(--gold);margin-bottom:3px}
.dr-sdur{font-size:11px;color:var(--dim,#888);margin-bottom:11px}
.dr-sperks{list-style:none;padding:0;margin:0 0 13px}
.dr-sperks li{font-size:11px;padding:3px 0 3px 15px;position:relative}
.dr-sperks li::before{content:"✓";position:absolute;left:0;color:var(--ok,#4CAF6E)}
.dr-sbtn{width:100%;padding:7px;border-radius:var(--r,6px);border:1.5px solid var(--gold);background:transparent;color:var(--gold);font-size:12px;font-weight:700;cursor:pointer;transition:background .15s,color .15s}
.dr-sbtn.on{background:var(--gold);color:#000}
/* materials */
.dr-stabs{display:flex;gap:6px;margin-bottom:14px}
.dr-stab{padding:4px 12px;border-radius:var(--r,6px);border:1px solid var(--border);background:transparent;font-size:11px;font-weight:600;cursor:pointer;transition:border-color .15s,color .15s;color:var(--dim,#888)}
.dr-stab.on{border-color:var(--gold);background:rgba(201,168,76,.1);color:var(--gold)}
.dr-tbl{width:100%;border-collapse:collapse;font-size:12px}
.dr-tbl th{color:var(--dim,#888);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;text-align:left;padding:6px 9px;border-bottom:1px solid var(--border)}
.dr-tbl td{padding:7px 9px;border-bottom:1px solid var(--border);vertical-align:middle}
.dr-tbl tr:hover td{background:rgba(255,255,255,.018)}
.dr-qtyin{width:58px;background:var(--bg,#111);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:3px 6px;font-size:12px;text-align:right}
.dr-qtyin:focus{outline:none;border-color:var(--gold)}
.dr-ztag{display:inline-block;font-size:10px;padding:1px 7px;border-radius:10px;background:rgba(201,168,76,.12);color:var(--gold)}
.dr-tfoot td{font-weight:700;color:var(--gold);background:rgba(201,168,76,.04)}
.dr-mnote{font-size:11px;color:var(--dim,#888);margin-top:10px}
/* chat */
.dr-chat{display:flex;flex-direction:column;height:450px}
.dr-msgs{flex:1;overflow-y:auto;padding-bottom:10px;display:flex;flex-direction:column;gap:9px}
.dr-msg{max-width:78%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.55;white-space:pre-wrap}
.dr-msg.user{align-self:flex-end;background:var(--gold);color:#000;font-weight:500;border-bottom-right-radius:3px}
.dr-msg.assistant{align-self:flex-start;background:var(--panel);border:1px solid var(--border);border-bottom-left-radius:3px}
.dr-cinput-row{display:flex;gap:8px;margin-top:10px}
.dr-cinput{flex:1;background:var(--panel);border:1px solid var(--border);border-radius:var(--r,6px);color:var(--text);padding:9px 13px;font-size:13px;resize:none;outline:none;font-family:inherit}
.dr-cinput:focus{border-color:var(--gold)}
.dr-csend{padding:9px 16px;background:var(--gold);border:none;border-radius:var(--r,6px);color:#000;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;transition:opacity .15s}
.dr-csend:disabled{opacity:.4;cursor:default}
.dr-sugs{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}
.dr-sug{font-size:11px;padding:4px 10px;background:transparent;border:1px solid var(--border);border-radius:12px;color:var(--dim,#888);cursor:pointer;transition:border-color .15s,color .15s}
.dr-sug:hover{border-color:var(--gold);color:var(--gold)}
.dr-typing{display:inline-flex;gap:4px;align-items:center;padding:10px 14px;background:var(--panel);border:1px solid var(--border);border-radius:12px;border-bottom-left-radius:3px;align-self:flex-start}
.dr-dot{width:6px;height:6px;border-radius:50%;background:var(--dim,#888);animation:dr-bounce .9s ease-in-out infinite}
.dr-dot:nth-child(2){animation-delay:.2s}.dr-dot:nth-child(3){animation-delay:.4s}
@keyframes dr-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
/* export */
.dr-exprev{background:var(--panel);border:1px solid var(--border);border-radius:var(--r,6px);padding:18px;font-size:12px;line-height:1.7;max-height:340px;overflow-y:auto}
.dr-exbtns{display:flex;gap:9px;margin-top:14px;justify-content:flex-end}
.dr-expbtn{padding:8px 18px;background:var(--gold);border:none;border-radius:var(--r,6px);color:#000;font-size:12px;font-weight:700;cursor:pointer}
.dr-exsbtn{padding:8px 18px;background:transparent;border:1.5px solid var(--border);border-radius:var(--r,6px);color:var(--text);font-size:12px;cursor:pointer;transition:border-color .15s,color .15s}
.dr-exsbtn:hover{border-color:var(--gold);color:var(--gold)}
.dr-lockbox{padding:36px 20px;text-align:center;font-size:12px;color:var(--dim,#888);border:1px dashed var(--border);border-radius:var(--r,6px);margin-top:14px}
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function DiagnosticRestauration({ plan = "free", lang = "fr" }) {
  const ui         = t(lang);
  const zoneLimit  = PLAN_ZONE_LIMIT[plan] ?? 2;
  const visZones   = ZONES.slice(0, zoneLimit);

  const [tab,          setTab]          = useState(0);
  const [photos,       setPhotos]       = useState({});
  const [diag,         setDiag]         = useState(null);
  const [analyzing,    setAnalyzing]    = useState(false);
  const [scenario,     setScenario]     = useState("standard");
  const [qtyOvr,       setQtyOvr]       = useState({});
  const [msgs,         setMsgs]         = useState([]);
  const [chatIn,       setChatIn]       = useState("");
  const [chatBusy,     setChatBusy]     = useState(false);
  const [dragOver,     setDragOver]     = useState(null);

  const chatEndRef = useRef(null);
  const fileRefs   = useRef({});

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  // ── Photos ────────────────────────────────────────────────────────────────
  const addPhotos = useCallback((zoneId, files) => {
    const items = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    setPhotos((p) => ({ ...p, [zoneId]: [...(p[zoneId] || []), ...items].slice(0, 5) }));
  }, []);

  const removePhoto = useCallback((zoneId, idx) => {
    setPhotos((p) => {
      const arr = [...(p[zoneId] || [])];
      URL.revokeObjectURL(arr[idx].url);
      arr.splice(idx, 1);
      return { ...p, [zoneId]: arr };
    });
  }, []);

  // ── Diagnosis ─────────────────────────────────────────────────────────────
  const runDiagnosis = useCallback(async () => {
    setAnalyzing(true);
    await delay(1800);
    const results = {};
    visZones.forEach((z) => {
      const raw = MOCK_DIAG[z.id];
      results[z.id] = {
        score: raw.score, status: raw.status,
        issues: raw.issues[lang] || raw.issues.fr,
        recs:   raw.recs[lang]   || raw.recs.fr,
      };
    });
    setDiag(results);
    setAnalyzing(false);
    setTab(1);
  }, [visZones, lang]);

  const globalScore = diag
    ? Math.round(Object.values(diag).reduce((s, d) => s + d.score, 0) / Object.keys(diag).length)
    : null;

  // ── Materials calculation ─────────────────────────────────────────────────
  const computedMats = MATS
    .filter((m) => visZones.some((z) => z.id === m.zone))
    .filter((m) => m.qty[scenario] > 0)
    .map((m) => {
      const qty = qtyOvr[m.id] !== undefined ? Number(qtyOvr[m.id]) : m.qty[scenario];
      const up  = m.up[scenario];
      return { ...m, qty, up, total: qty * up };
    });

  const grandTotal     = computedMats.reduce((s, m) => s + m.total, 0);
  const laborCost      = Math.round(grandTotal * 0.45);
  const totalWithLabor = grandTotal + laborCost;

  // ── Chat ──────────────────────────────────────────────────────────────────
  const sysPrompt = () => {
    const summary = diag
      ? Object.entries(diag)
          .map(([id, d]) => `${ZONES.find((z) => z.id === id)?.[lang] || id}: ${d.score}/100 (${d.status}) — ${d.issues.join("; ")}`)
          .join("\n")
      : lang === "fr" ? "Aucun diagnostic effectué." : "No diagnosis performed yet.";
    return `Tu es PHG IA, expert en rénovation du bâtiment.\nDiagnostic actuel :\n${summary}\nScénario sélectionné : ${scenario}. Coût estimé total : ${fmtEur(totalWithLabor)}.\nRéponds en ${lang === "fr" ? "français" : "anglais"}, de façon concise et experte.`;
  };

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || chatBusy) return;
    const userMsg = { role: "user", content: text };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setChatIn("");
    setChatBusy(true);

    if (!API_KEY) {
      await delay(600);
      const zones_err = diag ? Object.entries(diag).filter(([, d]) => d.status === "err").map(([id]) => ZONES.find((z) => z.id === id)?.[lang] || id) : [];
      const fallback = lang === "fr"
        ? `Sur la base du diagnostic (score global : ${globalScore ?? "N/A"}/100), ${zones_err.length ? `les zones urgentes sont : ${zones_err.join(", ")}.` : "aucune zone critique détectée."} Je recommande le scénario ${scenario}. Coût estimé : ${fmtEur(totalWithLabor)}.`
        : `Based on the diagnosis (global score: ${globalScore ?? "N/A"}/100), ${zones_err.length ? `urgent zones: ${zones_err.join(", ")}.` : "no critical zones."} Recommended scenario: ${scenario}. Estimated cost: ${fmtEur(totalWithLabor)}.`;
      setMsgs((m) => [...m, { role: "assistant", content: fallback }]);
      setChatBusy(false);
      return;
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: MODEL, max_tokens: 512,
          system: sysPrompt(),
          messages: history.slice(-14).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data  = await res.json();
      const reply = data.content?.[0]?.text || ui.chatError;
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: ui.chatError }]);
    }
    setChatBusy(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, chatBusy, diag, globalScore, lang, scenario, totalWithLabor]);

  // ── Export ────────────────────────────────────────────────────────────────
  const exportHTML = () => {
    const scDef = SCENARIOS[scenario];
    const diagRows = diag
      ? Object.entries(diag).map(([id, d]) => {
          const z = ZONES.find((z) => z.id === id);
          return `<h3>${zl(z, lang)} — ${d.score}/100 (${ui.status[d.status]})</h3>
<p><strong>${ui.issuesLabel}:</strong></p><ul>${d.issues.map((i) => `<li>${i}</li>`).join("")}</ul>
<p><strong>${ui.recsLabel}:</strong></p><ul>${d.recs.map((r) => `<li>${r}</li>`).join("")}</ul>`;
        }).join("")
      : "";
    const matRows = computedMats.map((m) => {
      const z = ZONES.find((z) => z.id === m.zone);
      return `<tr><td>${zl(z, lang)}</td><td>${m[lang] || m.fr}</td><td>${m.unit}</td><td style="text-align:right">${m.qty}</td><td style="text-align:right">${fmtN(m.up)}</td><td style="text-align:right">${fmtN(m.total)}</td></tr>`;
    }).join("");
    const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"/>
<title>PHG BUILD IA — ${ui.exportTitle}</title>
<style>body{font-family:sans-serif;background:#0A0A0A;color:#E8E0D0;padding:40px;max-width:900px;margin:auto}
h1,h2,h3{color:#C9A84C}h2{border-bottom:1px solid #333;padding-bottom:6px;margin-top:28px}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #333}
th{font-size:11px;color:#C9A84C}.total-r{font-weight:700;color:#C9A84C;background:rgba(201,168,76,.06)}
p{margin:6px 0}ul{margin:4px 0 8px 18px}li{margin:3px 0}.meta{color:#666;font-size:12px;margin-top:4px}</style>
</head><body>
<h1>PHG BUILD IA — ${ui.exportTitle}</h1>
<p class="meta">${new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")} — ${ui.planBadge[plan]} — ${scDef[lang] || scDef.fr}</p>
${diag ? `<h2>${ui.globalScore} : ${globalScore}/100</h2>${diagRows}` : ""}
<h2>${ui.totalCost} — ${scDef[lang] || scDef.fr} (${scDef.duration[lang] || scDef.duration.fr})</h2>
<table><thead><tr><th>${ui.zoneCol}</th><th>${ui.matCol}</th><th>${ui.unitCol}</th><th>${ui.qtyCol}</th><th>${ui.upCol}</th><th>${ui.totalCol}</th></tr></thead>
<tbody>${matRows}
<tr class="total-r"><td colspan="5">${ui.grandTotal}</td><td style="text-align:right">${fmtN(grandTotal)} €</td></tr>
<tr><td colspan="5" style="color:#888">${ui.laborLine}</td><td style="text-align:right;color:#888">${fmtN(laborCost)} €</td></tr>
<tr class="total-r"><td colspan="5">${ui.totalHT}</td><td style="text-align:right">${fmtN(totalWithLabor)} €</td></tr>
</tbody></table>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: `phg-diagnostic-${Date.now()}.html` });
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render: Photos ────────────────────────────────────────────────────────
  const renderPhotos = () => (
    <div>
      {plan === "free" && <div className="dr-warn-banner">{ui.zonesLimited(zoneLimit)}</div>}
      <div className="dr-zgrid">
        {visZones.map((zone) => {
          const zPhotos = photos[zone.id] || [];
          return (
            <div key={zone.id} className="dr-zcard">
              <div className="dr-zhead">
                <span className="dr-zname">{zl(zone, lang)}</span>
                <span className="dr-zcnt">{zPhotos.length}/5</span>
              </div>
              <div
                className={`dr-drop${dragOver === zone.id ? " over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(zone.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); setDragOver(null); addPhotos(zone.id, e.dataTransfer.files); }}
                onClick={() => fileRefs.current[zone.id]?.click()}
              >
                <div style={{ fontSize: 20, color: "var(--gold)" }}>+</div>
                <div className="dr-drop-ttl">{ui.uploadTitle}</div>
                <div className="dr-drop-sub">{ui.uploadSub}</div>
                <input
                  ref={(el) => (fileRefs.current[zone.id] = el)}
                  type="file" multiple accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { addPhotos(zone.id, e.target.files); e.target.value = ""; }}
                />
              </div>
              {zPhotos.length > 0 && (
                <div className="dr-thumbs">
                  {zPhotos.map((p, i) => (
                    <div key={i} className="dr-thumb">
                      <img src={p.url} alt={p.name} />
                      <button className="dr-tdel" onClick={() => removePhoto(zone.id, i)}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button className={`dr-abtn${analyzing ? " dr-pulse" : ""}`} disabled={analyzing} onClick={runDiagnosis}>
        {analyzing ? ui.analyzing : ui.analyzeBtn}
      </button>
    </div>
  );

  // ── Render: Diagnostic ────────────────────────────────────────────────────
  const renderDiag = () => {
    if (!diag) return (
      <div className="dr-nodata">
        <div style={{ fontSize: 26, marginBottom: 10, opacity: .4 }}>◎</div>
        <div>{ui.noAnalysis}</div>
        <button className="dr-abtn" style={{ marginTop: 14, display: "inline-block" }} onClick={() => setTab(0)}>
          ← {ui.tabs[0]}
        </button>
      </div>
    );
    const gcol = globalScore >= 70 ? "var(--ok)" : globalScore >= 40 ? "var(--warn)" : "var(--err)";
    return (
      <div>
        <div className="dr-gbar">
          <div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 2 }}>{ui.globalScore}</div>
            <div className="dr-gbig" style={{ color: gcol }}>{globalScore}<span style={{ fontSize: 14, opacity: .55 }}>/100</span></div>
          </div>
          <div className="dr-prog"><div className="dr-progf" style={{ width: `${globalScore}%`, background: gcol }} /></div>
        </div>
        <div className="dr-dgrid" style={{ marginTop: 14 }}>
          {visZones.map((zone) => {
            const d = diag[zone.id];
            if (!d) return null;
            return (
              <div key={zone.id} className="dr-dcard">
                <div className="dr-dhead">
                  <div className="dr-circle" style={{ background: `${sc(d.status)}18`, borderColor: sc(d.status), color: sc(d.status) }}>{d.score}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{zl(zone, lang)}</div>
                    <span className="dr-stag" style={{ background: `${sc(d.status)}18`, color: sc(d.status) }}>{ui.status[d.status]}</span>
                  </div>
                </div>
                <div className="dr-slbl">{ui.issuesLabel}</div>
                <ul className="dr-ul">{d.issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul>
                <div className="dr-slbl">{ui.recsLabel}</div>
                <ul className="dr-ul">{d.recs.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Render: Scenarios ─────────────────────────────────────────────────────
  const renderScenarios = () => (
    <div className="dr-sgrid">
      {Object.entries(SCENARIOS).map(([key, s]) => {
        const isOn     = scenario === key;
        const isLocked = planOrd[s.planReq] > planOrd[plan];
        return (
          <div
            key={key}
            className={`dr-scard${isOn ? " on" : ""}${isLocked ? " locked" : ""}`}
            onClick={() => !isLocked && setScenario(key)}
            style={{ marginTop: s.recommended || isLocked ? 14 : 0 }}
          >
            {s.recommended && !isLocked && <span className="dr-srec">{ui.recommended}</span>}
            {isLocked && <span className="dr-slck">🔒 {ui.lockedPlan(s.planReq)}</span>}
            <div className="dr-sttl">{s[lang] || s.fr}</div>
            <div className="dr-sdsc">{s.desc[lang] || s.desc.fr}</div>
            <div className="dr-sprc">{fmtEur(s.base)}</div>
            <div className="dr-sdur">{ui.duration} : {s.duration[lang] || s.duration.fr}</div>
            <ul className="dr-sperks">
              {(s.perks[lang] || s.perks.fr).map((p, i) => <li key={i}>{p}</li>)}
            </ul>
            <button
              className={`dr-sbtn${isOn ? " on" : ""}`}
              disabled={isLocked}
              onClick={(e) => { e.stopPropagation(); if (!isLocked) setScenario(key); }}
            >
              {isOn ? ui.selected : ui.selectScenario}
            </button>
          </div>
        );
      })}
    </div>
  );

  // ── Render: Materials ─────────────────────────────────────────────────────
  const renderMaterials = () => (
    <div>
      <div className="dr-stabs">
        {Object.entries(SCENARIOS).map(([key, s]) => (
          <button key={key} className={`dr-stab${scenario === key ? " on" : ""}`} onClick={() => setScenario(key)}>
            {s[lang] || s.fr}
          </button>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="dr-tbl">
          <thead>
            <tr>
              <th>{ui.zoneCol}</th><th>{ui.matCol}</th><th>{ui.unitCol}</th>
              <th style={{ textAlign: "right" }}>{ui.qtyCol}</th>
              <th style={{ textAlign: "right" }}>{ui.upCol}</th>
              <th style={{ textAlign: "right" }}>{ui.totalCol}</th>
            </tr>
          </thead>
          <tbody>
            {computedMats.map((m) => {
              const z = ZONES.find((z) => z.id === m.zone);
              return (
                <tr key={`${m.id}-${scenario}`}>
                  <td><span className="dr-ztag">{zl(z, lang)}</span></td>
                  <td>{m[lang] || m.fr}</td>
                  <td style={{ color: "var(--dim)" }}>{m.unit}</td>
                  <td style={{ textAlign: "right" }}>
                    <input
                      type="number" min="0" className="dr-qtyin"
                      value={qtyOvr[m.id] !== undefined ? qtyOvr[m.id] : m.qty}
                      onChange={(e) => setQtyOvr((q) => ({ ...q, [m.id]: e.target.value }))}
                    />
                  </td>
                  <td style={{ textAlign: "right", color: "var(--dim)" }}>{fmtN(m.up)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtN(m.total)} €</td>
                </tr>
              );
            })}
            <tr className="dr-tfoot">
              <td colSpan={5} style={{ textAlign: "right", paddingRight: 10 }}>{ui.grandTotal}</td>
              <td style={{ textAlign: "right" }}>{fmtEur(grandTotal)}</td>
            </tr>
            <tr>
              <td colSpan={5} style={{ textAlign: "right", paddingRight: 10, fontSize: 11, color: "var(--dim)" }}>{ui.laborLine}</td>
              <td style={{ textAlign: "right", fontSize: 11, color: "var(--dim)" }}>{fmtEur(laborCost)}</td>
            </tr>
            <tr className="dr-tfoot" style={{ borderBottom: "none" }}>
              <td colSpan={5} style={{ textAlign: "right", paddingRight: 10 }}>{ui.totalHT}</td>
              <td style={{ textAlign: "right" }}>{fmtEur(totalWithLabor)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="dr-mnote">{ui.matNote}</div>
    </div>
  );

  // ── Render: Chat ──────────────────────────────────────────────────────────
  const renderChat = () => (
    <div className="dr-chat">
      <div className="dr-sugs">
        {ui.suggestions.map((s, i) => (
          <button key={i} className="dr-sug" onClick={() => sendMessage(s)}>{s}</button>
        ))}
      </div>
      <div className="dr-msgs">
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 12, padding: "18px 0" }}>{ui.noMsgYet}</div>
        )}
        {msgs.map((m, i) => <div key={i} className={`dr-msg ${m.role}`}>{m.content}</div>)}
        {chatBusy && (
          <div className="dr-typing">
            <div className="dr-dot" /><div className="dr-dot" /><div className="dr-dot" />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="dr-cinput-row">
        <textarea
          className="dr-cinput" rows={2}
          value={chatIn} placeholder={ui.chatPlaceholder}
          onChange={(e) => setChatIn(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatIn); } }}
        />
        <button className="dr-csend" disabled={chatBusy || !chatIn.trim()} onClick={() => sendMessage(chatIn)}>
          {ui.send}
        </button>
      </div>
    </div>
  );

  // ── Render: Export ────────────────────────────────────────────────────────
  const renderExport = () => {
    if (!diag) return (
      <div className="dr-nodata">
        <div style={{ fontSize: 26, marginBottom: 10, opacity: .4 }}>◎</div>
        <div>{ui.noAnalysis}</div>
      </div>
    );
    const scDef = SCENARIOS[scenario];
    return (
      <div>
        <div className="dr-exprev">
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", marginBottom: 5 }}>PHG BUILD IA — {ui.exportTitle}</div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 14 }}>
            {new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")} — {ui.planBadge[plan]} — {scDef[lang] || scDef.fr}
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{ui.globalScore} : {globalScore}/100</div>
          {Object.entries(diag).map(([id, d]) => {
            const z = ZONES.find((z) => z.id === id);
            return (
              <div key={id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: sc(d.status) }}>{zl(z, lang)} — {d.score}/100</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginLeft: 10, marginTop: 2 }}>
                  {d.issues.map((iss, i) => <div key={i}>• {iss}</div>)}
                </div>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 8 }}>
            <div style={{ fontWeight: 700, color: "var(--gold)" }}>{ui.totalHT} : {fmtEur(totalWithLabor)}</div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{scDef[lang] || scDef.fr} — {scDef.duration[lang] || scDef.duration.fr}</div>
          </div>
        </div>
        {plan === "free" ? (
          <div className="dr-lockbox">🔒 {ui.upgradeExport}</div>
        ) : (
          <div className="dr-exbtns">
            <button className="dr-exsbtn" onClick={() => window.print()}>{ui.printBtn}</button>
            <button className="dr-expbtn" onClick={exportHTML}>{ui.exportBtn}</button>
          </div>
        )}
      </div>
    );
  };

  // ── Tab definitions ───────────────────────────────────────────────────────
  const TABS = [renderPhotos, renderDiag, renderScenarios, renderMaterials, renderChat, renderExport];

  return (
    <div className="dr">
      <style>{CSS}</style>

      {/* Header */}
      <div className="dr-hd">
        <div className="dr-row">
          <span className="dr-ttl">{ui.title}</span>
          <span className="dr-bdg">{ui.planBadge[plan]}</span>
        </div>
        <div className="dr-sub">PHG BUILD IA — {lang === "fr" ? "Analyse & planification de restauration" : "Building analysis & restoration planning"}</div>
        <div className="dr-tabs">
          {ui.tabs.map((label, i) => (
            <button key={i} className={`dr-tab${tab === i ? " on" : ""}`} onClick={() => setTab(i)}>
              {label}
              {i === 1 && diag && (
                <span
                  className="dr-sc-pill"
                  style={{ background: globalScore >= 70 ? "var(--ok)" : globalScore >= 40 ? "var(--warn)" : "var(--err)", color: "#000" }}
                >
                  {globalScore}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="dr-bd">{TABS[tab]?.()}</div>
    </div>
  );
}
