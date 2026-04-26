import { useState, useCallback, useEffect } from "react";
import { LANGS, createT } from "./i18n.js";
import ExportDXF from "./ExportDXF.jsx";
import BibliothequePlans from "./BibliothequePlans.jsx";
import CarnetFournisseurs from "./CarnetFournisseurs.jsx";
import GestionChantier from "./GestionChantier.jsx";
import SimulateurEconomies from "./SimulateurEconomies.jsx";
import PhgRadar from "./PhgRadar.jsx";
import AssistantIA from "./AssistantIA.jsx";
import BudgetIA from "./BudgetIA";
import DiagnosticRestauration from "./DiagnosticRestauration.jsx";
import RapportPDF from "./RapportPDF.jsx";
import SuiviChantier from "./SuiviChantier.jsx";
import EnvoiArgent from "./EnvoiArgent.jsx";

// ── PHG BUILD IA — App complète avec plans Gratuit / Pro 12,90€/mois (77€/an) / Elite 25€/mois (210€/an) / Afrique 17€/mois (135€/an)
const API = import.meta.env.VITE_API_URL || "https://phg-build-ia-production-9dc4.up.railway.app";

const PRICES = {
  FR:{beton:185,acier:1.4, par:1.80,cim:8.5, sable:42,grav:48,tole:18,tuile:28,tuile_pre:42,fen:280,cable:2.8, pvc:3.4, maçon:220,elec:250,plom:260,ing:420},
  BE:{beton:170,acier:1.3, par:1.65,cim:7.8, sable:39,grav:44,tole:17,tuile:26,tuile_pre:39,fen:258,cable:2.6, pvc:3.1, maçon:202,elec:230,plom:239,ing:386},
  PT:{beton:144,acier:1.1, par:1.40,cim:6.6, sable:33,grav:37,tole:14,tuile:22,tuile_pre:33,fen:218,cable:2.2, pvc:2.65,maçon:172,elec:195,plom:203,ing:328},
  CH:{beton:260,acier:1.95,par:3.40,cim:12.5,sable:68,grav:75,tole:0, tuile:42,tuile_pre:56,fen:420,cable:4.2, pvc:4.9, maçon:380,elec:420,plom:440,ing:650},
  GB:{beton:240,acier:1.82,par:2.34,cim:11.1,sable:55,grav:62,tole:23,tuile:36,tuile_pre:55,fen:364,cable:3.64,pvc:4.42,maçon:286,elec:325,plom:338,ing:546},
  CA:{beton:200,acier:1.6, par:2.10,cim:10,  sable:50,grav:55,tole:22,tuile:34,tuile_pre:50,fen:350,cable:3.2, pvc:4.0, maçon:280,elec:320,plom:330,ing:500},
  US:{beton:231,acier:1.75,par:2.25,cim:10.6,sable:53,grav:60,tole:23,tuile:35,tuile_pre:53,fen:350,cable:3.5, pvc:4.25,maçon:275,elec:313,plom:325,ing:525},
  BR:{beton:115,acier:0.87,par:1.12,cim:5.3, sable:26,grav:30,tole:11,tuile:17,tuile_pre:26,fen:174,cable:1.74,pvc:2.11,maçon:136,elec:155,plom:161,ing:260},
  MA:{beton:130,acier:1.2, par:1.10,cim:6,   sable:28,grav:32,tole:13,tuile:20,tuile_pre:30,fen:190,cable:1.4, pvc:1.7, maçon:55, elec:70, plom:65, ing:140},
  TN:{beton:107,acier:0.81,par:1.04,cim:4.9, sable:24,grav:28,tole:10,tuile:16,tuile_pre:24,fen:162,cable:1.62,pvc:1.97,maçon:128,elec:145,plom:151,ing:244},
  DZ:{beton:96, acier:0.73,par:0.94,cim:4.4, sable:22,grav:25,tole:9, tuile:15,tuile_pre:22,fen:146,cable:1.46,pvc:1.77,maçon:114,elec:130,plom:135,ing:218},
  CI:{beton:120,acier:1.05,par:0.95,cim:5.2, sable:24,grav:27,tole:11,tuile:18,tuile_pre:26,fen:145,cable:1.1, pvc:1.4, maçon:40, elec:55, plom:50, ing:120},
  SN:{beton:115,acier:1.1, par:0.90,cim:5,   sable:22,grav:25,tole:10,tuile:17,tuile_pre:24,fen:130,cable:1.0, pvc:1.3, maçon:35, elec:48, plom:45, ing:100},
  NG:{beton:102,acier:0.77,par:0.99,cim:4.7, sable:23,grav:26,tole:10,tuile:15,tuile_pre:23,fen:154,cable:1.54,pvc:1.87,maçon:121,elec:138,plom:143,ing:231},
  BF:{beton:83, acier:0.63,par:0.81,cim:3.8, sable:19,grav:22,tole:8, tuile:13,tuile_pre:19,fen:126,cable:1.26,pvc:1.53,maçon:99, elec:113,plom:117,ing:189},
  ML:{beton:87, acier:0.66,par:0.85,cim:4.0, sable:20,grav:23,tole:8, tuile:13,tuile_pre:20,fen:132,cable:1.32,pvc:1.6, maçon:103,elec:118,plom:122,ing:197},
  TG:{beton:93, acier:0.7, par:0.90,cim:4.3, sable:21,grav:24,tole:9, tuile:14,tuile_pre:21,fen:140,cable:1.4, pvc:1.7, maçon:110,elec:125,plom:130,ing:210},
  BJ:{beton:96, acier:0.73,par:0.94,cim:4.4, sable:22,grav:25,tole:9, tuile:15,tuile_pre:22,fen:146,cable:1.46,pvc:1.77,maçon:114,elec:130,plom:135,ing:218},
  GN:{beton:78, acier:0.59,par:0.76,cim:3.6, sable:18,grav:20,tole:8, tuile:12,tuile_pre:18,fen:118,cable:1.18,pvc:1.43,maçon:92, elec:105,plom:109,ing:176},
  CM:{beton:107,acier:0.81,par:1.04,cim:4.9, sable:24,grav:28,tole:10,tuile:16,tuile_pre:24,fen:162,cable:1.62,pvc:1.97,maçon:128,elec:145,plom:151,ing:244},
  CG:{beton:111,acier:0.84,par:1.08,cim:5.1, sable:25,grav:29,tole:11,tuile:17,tuile_pre:25,fen:168,cable:1.68,pvc:2.04,maçon:132,elec:150,plom:156,ing:252},
  GA:{beton:126,acier:0.95,par:1.22,cim:5.8, sable:29,grav:33,tole:12,tuile:19,tuile_pre:29,fen:190,cable:1.9, pvc:2.31,maçon:150,elec:170,plom:177,ing:286},
};
const CUR = {
  FR:"€",  BE:"€",   PT:"€",    CH:"CHF", GB:"GBP",
  CA:"CAD",US:"USD", BR:"BRL",
  MA:"MAD",TN:"TND", DZ:"DZD",
  CI:"FCFA",SN:"FCFA",NG:"NGN",BF:"FCFA",ML:"FCFA",TG:"FCFA",BJ:"FCFA",GN:"GNF",
  CM:"FCFA",CG:"FCFA",GA:"FCFA",
};
const COUNTRIES = [
  // Europe
  {code:"FR",flag:"🇫🇷",name:"France",        cur:"€"},
  {code:"BE",flag:"🇧🇪",name:"Belgique",      cur:"€"},
  {code:"PT",flag:"🇵🇹",name:"Portugal",      cur:"€"},
  {code:"CH",flag:"🇨🇭",name:"Suisse",        cur:"CHF"},
  {code:"GB",flag:"🇬🇧",name:"R.-Uni",        cur:"GBP"},
  // Amérique
  {code:"CA",flag:"🇨🇦",name:"Canada",        cur:"CAD"},
  {code:"US",flag:"🇺🇸",name:"États-Unis",    cur:"USD"},
  {code:"BR",flag:"🇧🇷",name:"Brésil",        cur:"BRL"},
  // Afrique du Nord
  {code:"MA",flag:"🇲🇦",name:"Maroc",         cur:"MAD"},
  {code:"TN",flag:"🇹🇳",name:"Tunisie",       cur:"TND"},
  {code:"DZ",flag:"🇩🇿",name:"Algérie",       cur:"DZD"},
  // Afrique de l'Ouest
  {code:"CI",flag:"🇨🇮",name:"Côte d'Ivoire", cur:"FCFA"},
  {code:"SN",flag:"🇸🇳",name:"Sénégal",       cur:"FCFA"},
  {code:"NG",flag:"🇳🇬",name:"Nigeria",       cur:"NGN"},
  {code:"BF",flag:"🇧🇫",name:"Burkina Faso",  cur:"FCFA"},
  {code:"ML",flag:"🇲🇱",name:"Mali",          cur:"FCFA"},
  {code:"TG",flag:"🇹🇬",name:"Togo",          cur:"FCFA"},
  {code:"BJ",flag:"🇧🇯",name:"Bénin",         cur:"FCFA"},
  {code:"GN",flag:"🇬🇳",name:"Guinée",        cur:"GNF"},
  // Afrique Centrale
  {code:"CM",flag:"🇨🇲",name:"Cameroun",      cur:"FCFA"},
  {code:"CG",flag:"🇨🇬",name:"Congo",         cur:"FCFA"},
  {code:"GA",flag:"🇬🇦",name:"Gabon",         cur:"FCFA"},
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Montserrat:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --gold:#C9A84C;--gold2:#E8CC7A;--gold3:#7A6330;
  --bg:#0A0A0A;--panel:#141414;--panel2:#1C1C1C;--panel3:#222;
  --border:#272727;--border2:#333;
  --text:#EAE2D0;--dim:#808078;--dim2:#505048;
  --ok:#4CAF6E;--warn:#E8A94C;--err:#C94C4C;
  --r:7px;--r2:12px;
}
body{background:var(--bg);color:var(--text);font-family:'Montserrat',sans-serif;font-size:13px}
.app{display:flex;min-height:100vh}
.sb{width:224px;min-height:100vh;background:var(--panel);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;position:sticky;top:0;height:100vh}
.sb-top{padding:20px 18px 14px;border-bottom:1px solid var(--border);text-align:center}
.sb-glyph{font-size:28px;color:var(--gold);line-height:1}
.sb-brand{font-family:'Cinzel',serif;font-size:14px;color:var(--gold);letter-spacing:2px;margin:5px 0 2px}
.sb-sub{font-size:9px;color:var(--dim);letter-spacing:2.5px}
.plan-badge{display:inline-block;margin-top:7px;padding:2px 10px;border-radius:20px;font-size:9px;font-weight:600;letter-spacing:1px}
.pf{background:rgba(136,136,120,.15);color:var(--dim)}
.pp{background:rgba(201,168,76,.15);color:var(--gold)}
.pe{background:rgba(201,76,76,.12);color:#D4857A}
.sb-nav{flex:1;padding:8px 0;overflow-y:auto}
.nav-sec{padding:10px 16px 3px;font-size:9px;color:var(--gold3);letter-spacing:3px;text-transform:uppercase}
.nav-item{display:flex;align-items:center;gap:8px;padding:8px 16px;color:var(--dim);cursor:pointer;font-size:12px;font-weight:500;transition:all .15s;border-left:2px solid transparent}
.nav-item:hover{color:var(--text);background:rgba(201,168,76,.05)}
.nav-item.active{color:var(--gold);background:rgba(201,168,76,.09);border-left-color:var(--gold)}
.nav-lock{font-size:10px;margin-left:auto;opacity:.5}
.sb-foot{padding:12px 16px;border-top:1px solid var(--border);font-size:10px;color:var(--dim2);line-height:1.6}
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.topbar{background:var(--panel);border-bottom:1px solid var(--border);padding:0 24px;height:52px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
.tb-title{font-family:'Cinzel',serif;font-size:13px;color:var(--gold);letter-spacing:1.5px}
.tb-btns{display:flex;gap:7px}
.btn{padding:6px 14px;border-radius:var(--r);font-size:11px;font-family:'Montserrat',sans-serif;font-weight:600;letter-spacing:.4px;cursor:pointer;border:none;transition:all .15s;display:inline-flex;align-items:center;gap:5px}
.btn-gold{background:var(--gold);color:#0A0A0A}
.btn-gold:hover{background:var(--gold2)}
.btn-out{background:transparent;border:1px solid var(--border2);color:var(--dim)}
.btn-out:hover{border-color:var(--gold);color:var(--gold)}
.btn-sm{padding:5px 11px;font-size:10px}
.btn-block{width:100%;justify-content:center}
.content{padding:20px;flex:1;overflow-y:auto}
.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:16px;margin-bottom:12px}
.card-title{font-family:'Cinzel',serif;font-size:10px;color:var(--gold);letter-spacing:2px;margin-bottom:12px;text-transform:uppercase}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.kpi{background:var(--panel);border:1px solid var(--border);border-top:2px solid var(--gold);border-radius:var(--r);padding:12px 14px}
.kpi-lbl{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.kpi-val{font-family:'Cinzel',serif;font-size:20px;color:var(--gold)}
.kpi-sub{font-size:10px;color:var(--dim);margin-top:2px}
.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
.plan-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--r2);padding:18px;text-align:center;position:relative;transition:all .2s}
.plan-card:hover{transform:translateY(-2px)}
.plan-card.featured{border-color:var(--gold)}
.plan-chip{position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:var(--gold);color:#0A0A0A;font-size:9px;font-weight:700;letter-spacing:1.5px;padding:2px 10px;border-radius:20px;white-space:nowrap}
.plan-icon{font-size:26px;margin-bottom:6px}
.plan-name{font-family:'Cinzel',serif;font-size:13px;margin-bottom:5px}
.plan-amount{font-family:'Cinzel',serif;font-size:26px;color:var(--gold)}
.plan-period{font-size:10px;color:var(--dim)}
.plan-africa{font-size:10px;color:var(--ok);margin:3px 0 10px;min-height:14px}
.plan-feats{list-style:none;font-size:11px;color:var(--dim);text-align:left;margin-bottom:12px}
.plan-feats li{padding:3px 0;border-bottom:1px solid var(--border);display:flex;gap:5px;align-items:center}
.plan-feats li:last-child{border:none}
.fok{color:var(--ok)}.fno{color:var(--dim2)}
.steps{display:flex;margin-bottom:18px}
.step{flex:1;text-align:center;padding:8px 2px;font-size:10px;color:var(--dim);border-bottom:2px solid var(--border);transition:all .15s}
.step.done{color:var(--gold);border-bottom-color:var(--gold)}
.step-n{display:inline-block;width:16px;height:16px;border-radius:50%;border:1px solid currentColor;line-height:16px;font-size:9px;margin-bottom:2px}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.fg{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
label{font-size:10px;color:var(--dim);text-transform:uppercase;letter-spacing:1px}
input,select,textarea{background:var(--panel2);border:1px solid var(--border2);border-radius:var(--r);color:var(--text);padding:7px 10px;font-family:'Montserrat',sans-serif;font-size:12px;outline:none;transition:border .15s;width:100%}
input:focus,select:focus,textarea:focus{border-color:var(--gold)}
select option{background:var(--panel2)}
textarea{resize:vertical;min-height:60px}
.cnt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:12px}
.cnt{background:var(--panel2);border:1px solid var(--border);border-radius:var(--r);padding:9px;cursor:pointer;text-align:center;transition:all .15s}
.cnt:hover,.cnt.sel{border-color:var(--gold);background:rgba(201,168,76,.07)}
.cnt-flag{font-size:20px;margin-bottom:2px}
.cnt-name{font-size:11px;font-weight:500}
.cnt-cur{font-size:9px;color:var(--dim)}
.q-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.q-card{border:1px solid var(--border2);border-radius:var(--r);padding:12px;cursor:pointer;transition:all .15s;text-align:center}
.q-card.sel{border-color:var(--gold);background:rgba(201,168,76,.07)}
.q-name{font-size:12px;font-weight:600;margin-bottom:2px}
.q-sub{font-size:10px;color:var(--dim);line-height:1.5}
.q-delta{font-size:11px;font-weight:600;margin-top:5px}
.tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:16px}
.tab{padding:8px 16px;font-size:11px;font-weight:600;letter-spacing:.4px;color:var(--dim);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;text-transform:uppercase}
.tab.active{color:var(--gold);border-bottom-color:var(--gold)}
.result-wrap{background:var(--panel2);border:1px solid var(--gold3);border-radius:var(--r);padding:16px}
.cost-line{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px}
.cost-line:last-child{border:none}
.cost-line.total{font-weight:600;color:var(--gold);font-size:14px;margin-top:6px;padding-top:8px;border-top:1px solid var(--gold3)}
.cost-lbl{color:var(--dim)}
.mat-tbl{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px}
.mat-tbl th{text-align:left;padding:5px 8px;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border)}
.mat-tbl td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.03)}
.badge{display:inline-block;padding:2px 7px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
.b-house{background:rgba(201,168,76,.12);color:var(--gold)}.b-bridge{background:rgba(122,168,201,.12);color:#7AABC9}
.b-draft{background:rgba(136,136,120,.12);color:var(--dim)}.b-est{background:rgba(201,168,76,.15);color:var(--gold)}
.b-eco{background:rgba(76,175,110,.12);color:var(--ok)}.b-std{background:rgba(201,168,76,.12);color:var(--gold)}.b-pre{background:rgba(201,76,76,.12);color:#D4857A}
.lock-overlay{background:rgba(10,10,10,.85);border:1px solid var(--gold3);border-radius:var(--r2);padding:22px;text-align:center;margin-top:12px}
.lock-icon{font-size:26px;color:var(--gold);margin-bottom:6px}
.lock-title{font-family:'Cinzel',serif;font-size:13px;color:var(--gold);margin-bottom:5px}
.lock-sub{font-size:11px;color:var(--dim);margin-bottom:12px;line-height:1.7}
.score-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:10px}
.sc-item{background:var(--panel2);border:1px solid var(--border);border-radius:var(--r);padding:9px;text-align:center}
.sc-num{font-family:'Cinzel',serif;font-size:20px}
.sc-lbl{font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.rec-item{background:var(--panel2);border:1px solid var(--border);border-radius:var(--r);padding:10px;margin-bottom:7px}
.rec-hdr{display:flex;justify-content:space-between;margin-bottom:4px}
.rec-ttl{font-size:12px;font-weight:600}
.sev-h{font-size:10px;font-weight:700;color:var(--err)}.sev-m{font-size:10px;font-weight:700;color:var(--warn)}.sev-l{font-size:10px;font-weight:700;color:var(--ok)}
.rec-body{font-size:11px;color:var(--dim);line-height:1.7}
.gain{display:inline-block;background:rgba(76,175,110,.1);color:var(--ok);border-radius:4px;padding:2px 7px;font-size:10px;margin-top:3px}
.inf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.inf-card{background:var(--panel2);border:1px solid var(--border);border-radius:var(--r);padding:12px;cursor:pointer;text-align:center;transition:all .15s}
.inf-card:hover,.inf-card.sel{border-color:var(--gold);background:rgba(201,168,76,.07)}
.upload-z{border:2px dashed var(--border2);border-radius:var(--r);padding:24px;text-align:center;cursor:pointer;transition:all .2s;margin-bottom:10px}
.upload-z:hover{border-color:var(--gold);background:rgba(201,168,76,.03)}
.main-tbl{width:100%;border-collapse:collapse;font-size:12px}
.main-tbl th{text-align:left;padding:7px 10px;font-size:9px;color:var(--dim);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border)}
.main-tbl td{padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.03)}
.spinner{width:24px;height:24px;border:2px solid var(--border2);border-top-color:var(--gold);border-radius:50%;animation:spin .7s linear infinite;margin:20px auto}
@keyframes spin{to{transform:rotate(360deg)}}
.alert{padding:8px 12px;border-radius:var(--r);font-size:11px;margin-top:8px;line-height:1.6}
.alert-ok{background:rgba(76,175,110,.08);border:1px solid rgba(76,175,110,.25);color:var(--ok)}
.alert-warn{background:rgba(232,169,76,.08);border:1px solid rgba(232,169,76,.25);color:var(--warn)}
.note{background:rgba(201,168,76,.05);border-left:3px solid var(--gold3);padding:8px 11px;font-size:11px;color:var(--dim);margin-top:8px;line-height:1.7}
.divgold{height:1px;background:linear-gradient(90deg,transparent,var(--gold3),transparent);margin:12px 0}

/* ── Sélecteur de langue ── */
.lang-bar{display:flex;gap:4px;justify-content:center;padding:8px 12px 4px;border-top:1px solid var(--border)}
.lang-btn{background:transparent;border:1px solid transparent;border-radius:6px;padding:3px 7px;cursor:pointer;font-size:16px;line-height:1;transition:all .2s;color:var(--dim)}
.lang-btn:hover{border-color:var(--gold3);background:rgba(201,168,76,.06)}
.lang-btn.active{border-color:var(--gold);background:rgba(201,168,76,.12)}
.lang-btn-label{font-size:8px;font-family:'Montserrat',sans-serif;color:var(--dim);letter-spacing:.5px;display:block;margin-top:2px}

/* ── RTL (arabe) ── */
[dir="rtl"] .app{flex-direction:row-reverse}
[dir="rtl"] .sb{border-right:none;border-left:1px solid var(--border)}
[dir="rtl"] .nav-item{flex-direction:row-reverse;text-align:right}
[dir="rtl"] .nav-lock{margin-left:0;margin-right:auto}
[dir="rtl"] .nav-sec{text-align:right}
[dir="rtl"] .sb-top{direction:rtl}
[dir="rtl"] .topbar{flex-direction:row-reverse}
[dir="rtl"] .tb-btns{flex-direction:row-reverse}
[dir="rtl"] .note{border-left:none;border-right:3px solid var(--gold3)}
[dir="rtl"] .card-title{text-align:right}
[dir="rtl"] .content{direction:rtl}

/* ── Hamburger ── */
.hamburger{display:none;background:none;border:none;color:var(--text);font-size:22px;cursor:pointer;padding:4px 6px;line-height:1;border-radius:var(--r);transition:background .15s}
.hamburger:hover{background:rgba(201,168,76,.1)}
.sb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:98;display:none}

/* ── Responsive Mobile ── */
@media(max-width:768px){
  .sb{position:fixed;left:-270px;top:0;bottom:0;z-index:99;width:260px;height:100vh;min-height:unset;overflow-y:auto;transition:left .25s cubic-bezier(.4,0,.2,1)}
  .sb.open{left:0;box-shadow:4px 0 32px rgba(0,0,0,.8)}
  .sb-overlay{display:block}
  .hamburger{display:block}
  .main{width:100%;min-width:0}
  .topbar{padding:0 10px;height:48px}
  .tb-title{font-size:11px;letter-spacing:1px}
  .tb-btns{gap:4px}
  .tb-btns .btn{padding:6px 10px;font-size:10px;min-height:34px}
  .content{padding:10px}
  .kpi-row{grid-template-columns:1fr 1fr;gap:8px}
  .kpi-val{font-size:16px}
  .kpi-lbl{font-size:8px}
  .fg2{grid-template-columns:1fr}
  .fg3{grid-template-columns:1fr 1fr}
  .cnt-grid{grid-template-columns:repeat(2,1fr)}
  .q-row{grid-template-columns:1fr 1fr}
  .score-grid{grid-template-columns:repeat(2,1fr)}
  .inf-grid{grid-template-columns:repeat(2,1fr)}
  .plan-grid{grid-template-columns:1fr;gap:10px}
  .plan-grid .plan-card{padding:14px}
  .tabs{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .tab{white-space:nowrap;padding:8px 12px;font-size:10px}
  .btn{min-height:40px}
  .btn-sm{min-height:34px}
  .mat-tbl{font-size:10px}
  .mat-tbl td,.mat-tbl th{padding:4px 6px}
  .steps{gap:0}
  .step{font-size:9px;padding:5px 1px}
  .step-n{width:14px;height:14px;line-height:14px;font-size:8px}
  .card{padding:12px}
  .main-tbl{font-size:11px}
  .main-tbl td,.main-tbl th{padding:7px 8px}
  .upload-z{padding:16px}
  .lock-overlay{padding:16px}
}

@media(max-width:480px){
  .cnt-grid{grid-template-columns:1fr 1fr}
  .q-row{grid-template-columns:1fr}
  .fg3{grid-template-columns:1fr}
  .tb-title{display:none}
  .score-grid{grid-template-columns:1fr 1fr}
  .plan-grid{grid-template-columns:1fr}
}
`;

const fmt = (n, d = 0) => Number(n).toLocaleString("fr-FR", { maximumFractionDigits: d });
const scColor = n => n >= 80 ? "var(--ok)" : n >= 60 ? "var(--warn)" : "var(--err)";

// ── Plan limits ──
const CAN = {
  infra: p => p !== "free",
  analyse: p => p !== "free",
  fullMaterials: p => p !== "free",
  recs: p => p !== "free",
  pdf: p => p !== "free",
  unlimitedProjects: p => p !== "free",
};

export default function App() {
  const [page, setPage] = useState("accueil");
  const [planReal, setPlan] = useState("free");
  const [demoMode, setDemoMode] = useState(false);
  const plan = demoMode ? "elite" : planReal;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = (id) => { setPage(id); setSidebarOpen(false); };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("phg_user")); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("phg_token") || null);
  const [authModal, setAuthModal] = useState(false);   // true = ouvert
  const [authTab, setAuthTab]     = useState("login"); // "login" | "register"
  const [authForm, setAuthForm]   = useState({ email: "", password: "", full_name: "" });
  const [authLoading, setAuthLoading]   = useState(false);
  const [authError, setAuthError]       = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Clear state and show login whenever any API call fires phg:logout (e.g. stale token after SECRET_KEY rotation)
  useEffect(() => {
    const handler = () => {
      localStorage.clear();
      setToken(null);
      setUser(null);
      setPlan("free");
      setPendingPlan(null);
      setAuthModal(true);
      setAuthTab("login");
      setAuthError("Session expirée, reconnectez-vous.");
    };
    window.addEventListener("phg:logout", handler);
    return () => window.removeEventListener("phg:logout", handler);
  }, []);

  // ── Retour Stripe Checkout ────────────────────────────────────────────────
  const [checkoutStatus, setCheckoutStatus] = useState(null); // "success" | "cancelled" | null
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (status === "success") {
      const planBack = params.get("plan") || "";
      setCheckoutStatus({ ok: true, plan: planBack });
      setPage("abonnement");
      window.history.replaceState({}, "", "/");
    } else if (status === "cancelled") {
      setCheckoutStatus({ ok: false });
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const pwd = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setAuthForm(f => ({ ...f, password: pwd }));
    setShowPassword(true);
  };

  const saveSession = (token, userData) => {
    localStorage.setItem("phg_token", token);
    localStorage.setItem("phg_user",  JSON.stringify(userData));
    setToken(token);
    setUser(userData);
    setAuthModal(false);
    setAuthError("");
    if (pendingPlan) {
      const p = pendingPlan;
      setPendingPlan(null);
      setTimeout(() => activatePlan(p), 0);
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setPlan("free");
    setPendingPlan(null);
  };

  const submitAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      if (authTab === "register") {
        const res = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authForm.email, password: authForm.password, full_name: authForm.full_name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Erreur inscription");
        saveSession(data.access_token, data.user || { email: authForm.email, full_name: authForm.full_name });
      } else {
        const form = new URLSearchParams();
        form.append("username", authForm.email);
        form.append("password", authForm.password);
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Email ou mot de passe incorrect");
        // Récupérer le profil
        const meRes = await fetch(`${API}/auth/me`, {
          headers: { "Authorization": `Bearer ${data.access_token}` },
        });
        if (meRes.status === 401) {
          localStorage.clear();
          throw new Error("Token invalide après connexion. Réessayez.");
        }
        const me = meRes.ok ? await meRes.json() : { email: authForm.email };
        localStorage.setItem("phg_token", data.access_token);
                localStorage.setItem("phg_email", me.email || authForm.email);
        saveSession(data.access_token, me);
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Langue / i18n ──────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem("phg_lang") || "fr");
  const t = createT(lang);
  const isRTL = lang === "ar";

  const switchLang = (code) => { setLang(code); localStorage.setItem("phg_lang", code); };

  // Maison state
  const [step, setStep] = useState(1);
  const [cc, setCc] = useState("FR");
  const [mForm, setMForm] = useState({ l: 12, w: 10, fl: 1, roofType: "pitched", budget: "", sdb: 2, desc: "Maison 120m², 3 chambres, salon, cuisine ouverte", city: "", latitude: "", longitude: "" });
  const [qual, setQual] = useState("std");
  const [locating, setLocating] = useState(false);
  const [computing, setComputing] = useState(false);

  const locateMaison = () => {
    if (!navigator.geolocation) { alert("Géolocalisation non supportée par ce navigateur."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setMForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      () => { alert("Impossible d'obtenir la position."); setLocating(false); }
    );
  };
  const [mResult, setMResult] = useState(null);
  const [mTab, setMTab] = useState("mat");

  // Infra state
  const [infType, setInfType] = useState("pont");
  const [iForm, setIForm] = useState({ l: 50, w: 8, type: "beton", piers: 2, pHeight: 4, country: "CI" });
  const [iComputing, setIComputing] = useState(false);
  const [iResult, setIResult] = useState(null);
  const [iTab, setITab] = useState("mat");

  // Analyse state
  const [uploaded, setUploaded] = useState(false);
  const [anCC, setAnCC] = useState("CI");
  const [anComputing, setAnComputing] = useState(false);
  const [anResult, setAnResult] = useState(null);

  // Billing toggles (top-level — required by rules of hooks)
  const [billingAccueil, setBillingAccueil] = useState("monthly");
  const [billingAbonnement, setBillingAbonnement] = useState("monthly");

  // Projects
  const [projects] = useState([
    { id: 1, name: "Villa Cocody", type: "house", country: "🇨🇮", qual: "pre", cost: 48200, status: "estimated" },
    { id: 2, name: "Pont rural Man", type: "bridge", country: "🇨🇮", qual: "eco", cost: 112000, status: "estimated" },
    { id: 3, name: "Maison Lyon", type: "house", country: "🇫🇷", qual: "std", cost: null, status: "draft" },
  ]);

  const [checkoutLoading, setCheckoutLoading] = useState(null); // plan key en cours
  const [pendingPlan, setPendingPlan] = useState(null); // plan à activer après login

  // Mapping bouton → clé plan backend (doit correspondre aux clés de STRIPE_PLANS)
  const PLAN_KEY = {
    "pro": "PRO",
    "pro-annual": "PRO",
    "elite": "ELITE",
    "elite-annual": "ELITE",
    "elite-africa": "ELITE_AFRIQUE",
  };

  const activatePlan = async (p) => {
    const planKey = PLAN_KEY[p];
    if (!planKey) return;

    const currentToken = localStorage.getItem("phg_token") || token;
    if (!currentToken) {
      setPendingPlan(p);
      setAuthModal(true); setAuthTab("login");
      setAuthError("Connectez-vous pour souscrire à un plan.");
      return;
    }

    setCheckoutLoading(p);
    try {
      const res = await fetch(`${API}/stripe/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ plan: planKey, user_email: localStorage.getItem("phg_email") || "" }),
      });

      if (res.status === 401) {
        logout();
        setPage("accueil");
        setAuthModal(true); setAuthTab("login");
        setAuthError("Session expirée, reconnectez-vous.");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur ${res.status}`);
      }

      const { checkout_url } = await res.json();
      window.location.href = checkout_url;
    } catch (e) {
      alert(`Erreur paiement : ${e.message}`);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const computeMaison = useCallback(() => {
    const { l, w, fl, budget } = mForm;
    const P = PRICES[cc] || PRICES.FR;
    const C = CUR[cc] || "€";
    const qm = qual === "eco" ? 0.80 : qual === "pre" ? 1.32 : 1.0;
    const surf = l * w * fl;
    const wallS = 2 * (l + w) * 3.0 * fl;
    const roofS = l * w * 1.15;
    const roofKey = qual === "eco" ? "tole" : qual === "pre" ? "tuile_pre" : "tuile";
    const roofName = qual === "eco" ? "Tôle bac acier" : qual === "pre" ? "Tuile terre cuite premium" : "Tuile béton";
    const blockQ = Math.round(wallS / 0.08 * 1.05);
    const cimQ = Math.round(surf * 0.15 * 350 / 35 * 1.03);
    const sandV = parseFloat((surf * 0.15 * 0.5).toFixed(1));
    const gravV = parseFloat((surf * 0.15 * 0.8).toFixed(1));
    const roofQ = Math.round(roofS * 1.08);
    const winN = Math.max(6, Math.round(surf / 18));
    const cableM = Math.round(surf * 6);
    const pvcM = Math.round(surf * 1.8);
    const materials = [
      { n: "Parpaing creux 20", q: blockQ, u: "pce", pu: P.par * qm, t: Math.round(blockQ * P.par * qm) },
      { n: "Ciment Portland 35kg", q: cimQ, u: "sac", pu: P.cim * qm, t: Math.round(cimQ * P.cim * qm) },
      { n: "Sable de construction", q: sandV, u: "m³", pu: P.sable * qm, t: Math.round(sandV * P.sable * qm) },
      { n: "Gravier", q: gravV, u: "m³", pu: P.grav * qm, t: Math.round(gravV * P.grav * qm) },
      { n: roofName, q: roofQ, u: "m²", pu: (P[roofKey] || P.tuile) * qm, t: Math.round(roofQ * (P[roofKey] || P.tuile) * qm) },
      { n: "Fenêtre aluminium", q: winN, u: "pce", pu: P.fen * qm, t: Math.round(winN * P.fen * qm) },
      { n: "Câble électrique", q: cableM, u: "m", pu: P.cable * qm, t: Math.round(cableM * P.cable * qm) },
      { n: "Tube PVC plomberie", q: pvcM, u: "m", pu: P.pvc * qm, t: Math.round(pvcM * P.pvc * qm) },
    ];
    const matCost = materials.reduce((s, m) => s + m.t, 0);
    const labCost = Math.round(Math.max(10, surf / 8) * P.maçon + Math.max(4, surf / 25) * P.elec + Math.max(3, surf / 30) * P.plom);
    const logCost = Math.round(matCost * 0.03);
    const sub = matCost + labCost + logCost;
    const risk = Math.round(sub * 0.08);
    const total = sub + risk;
    const budgetN = parseFloat(budget) || 0;
    const bs = budgetN > 0 ? (total <= budgetN ? 92 : 62) : 70;
    const gs = Math.round((bs + 88 + (qual === "pre" ? 94 : qual === "eco" ? 77 : 85) + 80) / 4);
    setMResult({ materials, matCost, labCost, logCost, risk, total, cur: C, budget: budgetN, surf, gs, bs });
  }, [cc, mForm, qual]);

  const launchMaison = () => {
    setStep(4);
    setMResult(null);
    setComputing(true);
    setMTab("mat");
    setTimeout(() => { setComputing(false); computeMaison(); }, 1700);
  };

  const computeInfra = () => {
    const { l, w, piers, pHeight, country } = iForm;
    const P = PRICES[country] || PRICES.CI;
    const C = CUR[country] || "€";
    const dV = l * w * 0.30, piV = piers * 1.0 * pHeight, abV = dV * 0.20;
    const totB = Math.round((dV + piV + abV) * 10) / 10;
    const steel = Math.round(totB * (l > 80 ? 140 : 110) * 1.04);
    const betonC = Math.round(totB * P.beton);
    const acierC = Math.round(steel * P.acier);
    const labC = Math.round(Math.max(20, totB / 3) * P.maçon + Math.max(5, l / 10) * P.ing);
    const logC = Math.round((betonC + acierC) * 0.06);
    const sub = betonC + acierC + labC + logC;
    const risk = Math.round(sub * 0.15);
    const total = sub + risk;
    setIResult({ materials: [
      { n: "Béton armé (tablier)", q: (Math.round(dV * 10) / 10).toFixed(1), u: "m³", pu: fmt(P.beton), t: Math.round(dV * P.beton) },
      { n: "Béton armé (piles)", q: (Math.round(piV * 10) / 10).toFixed(1), u: "m³", pu: fmt(P.beton), t: Math.round(piV * P.beton) },
      { n: "Béton armé (culées)", q: (Math.round(abV * 10) / 10).toFixed(1), u: "m³", pu: fmt(P.beton), t: Math.round(abV * P.beton) },
      { n: "Acier armature HA", q: fmt(steel), u: "kg", pu: fmt(P.acier, 2), t: acierC },
    ], betonC, acierC, labC, logC, risk, total, cur: C });
  };

  const launchInfra = () => {
    setIResult(null);
    setIComputing(true);
    setITab("mat");
    setTimeout(() => { setIComputing(false); computeInfra(); }, 1600);
  };

  const launchAnalyse = () => {
    setAnResult(null);
    setAnComputing(true);
    setTimeout(() => {
      const P = PRICES[anCC] || PRICES.CI;
      const C = CUR[anCC] || "€";
      const surf = 100 + Math.round(Math.random() * 40);
      const base = surf * P.par * 80 + surf * P.cim * 12;
      setAnComputing(false);
      setAnResult({ surf, rooms: 5 + Math.round(Math.random() * 3), openings: 8 + Math.round(Math.random() * 4), eco: Math.round(base * 0.80), std: Math.round(base), pre: Math.round(base * 1.35), cur: C });
    }, 2200);
  };

  const pdfClick = () => {
    if (!CAN.pdf(plan)) alert("🔒 Export PDF réservé au plan PRO (12,90€/mois).\n\nLe PDF comprend : plan détaillé, liste complète des matériaux, estimation, notes de chantier — avec logo PHG.");
    else alert("✓ Génération du PDF en cours…\n\n(Dans l'app réelle, ReportLab génère le PDF côté serveur et le fichier est téléchargé automatiquement.)");
  };

  const planLabel = {
    free: t("plan_free"), pro: t("plan_pro"),
    elite: t("plan_elite"), "elite-africa": t("plan_elite_af"),
  };
  const planBadgeClass = { free: "pf", pro: "pp", elite: "pe", "elite-africa": "pe" };

  const NAV = [
    { sec: t("sec_start") },
    { id: "accueil",     icon: "◈",  label: t("nav_accueil") },
    { sec: t("sec_design") },
    { id: "maison",      icon: "🏠", label: t("nav_maison") },
    { id: "infra",       icon: "🌉", label: t("nav_infra"),      lock: !CAN.infra(plan) },
    { id: "analyse",     icon: "📐", label: t("nav_analyse"),    lock: !CAN.analyse(plan) },
    { id: "restauration",icon: "🏠", label: "Diagnostic Restauration", lock: !CAN.analyse(plan) },
    { id: "bibliotheque",icon: "📚", label: t("nav_biblio") },
    { id: "simulateur",  icon: "📊", label: t("nav_simulateur") },
    { sec: t("sec_pro") },
    { id: "export_dxf",    icon: "⬛", label: t("nav_dxf"),              lock: !CAN.pdf(plan) },
    { id: "rapport_pdf",   icon: "📄", label: "Rapport PDF",             lock: !CAN.pdf(plan) },
    { id: "fournisseurs",  icon: "🏪", label: t("nav_fourni"),           lock: !CAN.pdf(plan) },
    { id: "chantier",      icon: "🏗️", label: t("nav_chantier"),         lock: !CAN.pdf(plan) },
    { id: "suivi_chantier",icon: "📋", label: "Suivi de Chantier",       lock: !CAN.pdf(plan) },
    { id: "radar",         icon: "📡", label: t("nav_radar"),            lock: !CAN.pdf(plan) },
    { id: "assistant",     icon: "🤖", label: "Assistant IA",             lock: !CAN.pdf(plan) },
    { id: "envoiargent", icon: "🌍", label: "Construire depuis l'étranger" },
    { id: "budget",      icon: "💰", label: "Budget IA" },
    { sec: t("sec_data") },
    { id: "projets",     icon: "⬡",  label: t("nav_projets") },
    { id: "abonnement",  icon: "◆",  label: t("nav_abo") },
  ];

  const titles = {
    accueil:     t("title_accueil"),
    maison:      t("title_maison"),
    infra:       t("title_infra"),
    analyse:     t("title_analyse"),
    bibliotheque:t("title_biblio"),
    export_dxf:  t("title_dxf"),
    fournisseurs:t("title_fourni"),
    chantier:    t("title_chantier"),
    projets:     t("title_projets"),
    abonnement:  t("title_abo"),
    simulateur:  t("title_simulateur"),
    radar:       t("title_radar"),
    assistant:      "Assistant PHG IA",
    restauration:   "Diagnostic Restauration",
    rapport_pdf:    "Rapport d'Estimation PDF",
    suivi_chantier:  "Suivi de Chantier",
    envoiargent:     "Construire depuis l'étranger",
  };

  return (
    <>
      <style>{css}</style>
      <div className="app" dir={isRTL ? "rtl" : "ltr"}>

        {/* ── SIDEBAR OVERLAY (mobile) ── */}
        {sidebarOpen && <div className="sb-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* ── SIDEBAR ── */}
        <aside className={`sb${sidebarOpen ? " open" : ""}`}>
          {/* ── Sélecteur de langue ── */}
          <div className="lang-bar">
            {LANGS.map(l => (
              <button
                key={l.code}
                className={`lang-btn${lang === l.code ? " active" : ""}`}
                onClick={() => switchLang(l.code)}
                title={l.label}
              >
                {l.flag}
                <span className="lang-btn-label">{l.code.toUpperCase()}</span>
              </button>
            ))}
          </div>

          <div className="sb-top">
            <div className="sb-glyph">𓂀</div>
            <div className="sb-brand">PHG BUILD IA</div>
            <div className="sb-sub">{t("brand_sub")}</div>
            <span className={`plan-badge ${planBadgeClass[plan]}`}>{planLabel[plan]}</span>
          </div>
          <nav className="sb-nav">
            {NAV.map((item, i) =>
              item.sec ? <div key={i} className="nav-sec">{item.sec}</div> : (
                <div key={item.id} className={`nav-item${page === item.id ? " active" : ""}`} onClick={() => navigate(item.id)}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                  {item.lock && !demoMode && <span className="nav-lock">🔒</span>}
                </div>
              )
            )}
          </nav>
          <div style={{ padding: "10px 16px" }}>
            <button
              onClick={() => setDemoMode(v => !v)}
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: 8,
                border: demoMode ? "1px solid var(--gold)" : "1px solid var(--border)",
                background: demoMode ? "rgba(201,168,76,.15)" : "transparent",
                color: demoMode ? "var(--gold)" : "var(--dim)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: "pointer",
                textTransform: "uppercase",
                transition: "all .2s",
              }}
            >
              {demoMode ? "🟢 MODE DÉMO ACTIF" : "🔓 Activer mode démo"}
            </button>
            {demoMode && (
              <div style={{ fontSize: 9, color: "var(--gold)", textAlign: "center", marginTop: 4, opacity: .7 }}>
                Tous les modules déverrouillés
              </div>
            )}
          </div>
          <div className="sb-foot">PHG Éditions<br />Saint-Julien-en-Genevois<br />© 2025</div>
        </aside>

        {/* ── MAIN ── */}
        <div className="main">
          <div className="topbar">
            <button className="hamburger" onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">☰</button>
            <div className="tb-title">{titles[page] || "PHG BUILD IA"}</div>
            <div className="tb-btns">
              <button className="btn btn-out btn-sm" onClick={() => setPage("analyse")}>{t("btn_analyse")}</button>
              <button className="btn btn-gold btn-sm" onClick={() => { setPage("maison"); setStep(1); setMResult(null); }}>{t("btn_new_proj")}</button>
              {user ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--gold)", fontWeight: 600, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    👤 {user.full_name || user.email}
                  </span>
                  <button className="btn btn-out btn-sm" onClick={logout} style={{ fontSize: 10 }}>Déconnexion</button>
                </div>
              ) : (
                <button className="btn btn-gold btn-sm" onClick={() => { setAuthModal(true); setAuthTab("login"); setAuthError(""); setShowPassword(false); setAuthForm({ email: "", password: "", full_name: "" }); }}
                  style={{ marginLeft: 4 }}>
                  🔑 Connexion
                </button>
              )}
            </div>
          </div>
          <div className="content">

            {/* ── Bannière retour Stripe ── */}
            {checkoutStatus && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 18px", borderRadius: "var(--r)", marginBottom: 16,
                background: checkoutStatus.ok ? "rgba(76,175,110,.1)" : "rgba(201,76,76,.08)",
                border: `1px solid ${checkoutStatus.ok ? "rgba(76,175,110,.3)" : "rgba(201,76,76,.25)"}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: checkoutStatus.ok ? "var(--ok)" : "var(--err)" }}>
                  {checkoutStatus.ok
                    ? `✓ Paiement confirmé — plan ${checkoutStatus.plan} activé. Reconnectez-vous pour rafraîchir votre accès.`
                    : "✗ Paiement annulé — aucun prélèvement effectué."}
                </span>
                <button onClick={() => setCheckoutStatus(null)} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>×</button>
              </div>
            )}

            {/* ══ ACCUEIL ══ */}
            {page === "accueil" && (
              <div>
                <div style={{ textAlign: "center", padding: "32px 16px 24px", borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
                  <div style={{ fontSize: 48, color: "var(--gold)", lineHeight: 1, marginBottom: 8 }}>𓂀</div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 22, color: "var(--gold)", letterSpacing: 3, marginBottom: 5 }}>PHG BUILD IA</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginBottom: 12 }}>{t("acc_subtitle")}</div>
                  <div style={{ fontSize: 11, color: "var(--dim2)", maxWidth: 460, margin: "0 auto", lineHeight: 1.8 }}>{t("acc_desc")}</div>
                  <div style={{ marginTop: 18 }}>
                    <a
                      href="/Guide_PHG_BUILD_IA.pdf"
                      download="Guide_PHG_BUILD_IA.pdf"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "10px 22px", borderRadius: "var(--r)",
                        background: "transparent",
                        border: "1px solid var(--gold3)",
                        color: "var(--gold)",
                        fontSize: 12, fontWeight: 600,
                        fontFamily: "'Montserrat',sans-serif",
                        letterSpacing: ".4px",
                        textDecoration: "none",
                        transition: "all .15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,.1)"; e.currentTarget.style.borderColor = "var(--gold)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--gold3)"; }}
                    >
                      📥 Télécharger le guide gratuit
                    </a>
                  </div>
                </div>

                {/* ── Toggle mensuel / annuel ── */}
                {(() => {
                  const annual = billingAccueil === "annual";
                  return (
                    <>
                      {/* Toggle */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: !annual ? "var(--gold)" : "var(--dim)" }}>{t("toggle_monthly")}</span>
                        <div
                          onClick={() => setBillingAccueil(b => b === "monthly" ? "annual" : "monthly")}
                          style={{ width: 50, height: 26, borderRadius: 13, cursor: "pointer", position: "relative", background: annual ? "var(--gold)" : "var(--panel2)", border: "1px solid " + (annual ? "var(--gold)" : "var(--border2)"), transition: "background .25s" }}
                        >
                          <div style={{ position: "absolute", top: 3, left: annual ? 26 : 3, width: 18, height: 18, borderRadius: "50%", background: annual ? "#0A0A0A" : "var(--gold)", transition: "left .25s" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: annual ? "var(--gold)" : "var(--dim)" }}>
                          {t("toggle_annual")}
                          <span style={{ marginLeft: 6, background: "rgba(76,175,110,.15)", color: "var(--ok)", borderRadius: 10, padding: "2px 8px", fontSize: 9, fontWeight: 700 }}>
                            {t("toggle_savings")}
                          </span>
                        </span>
                      </div>

                      {/* Grille 3 plans */}
                      <div className="plan-grid">

                        {/* GRATUIT */}
                        <div className="plan-card">
                          <div className="plan-icon">🏗</div>
                          <div className="plan-name">{t("plan_free")}</div>
                          <div><span className="plan-amount">0</span><span className="plan-period"> €</span></div>
                          <div className="plan-africa">{t("plan_forever")}</div>
                          <ul className="plan-feats">
                            <li><span className="fok">✓</span>{t("f_free_1")}</li>
                            <li><span className="fok">✓</span>{t("f_free_2")}</li>
                            <li><span className="fok">✓</span>{t("f_free_3")}</li>
                            <li><span className="fno">✗</span>{t("f_free_4")}</li>
                            <li><span className="fno">✗</span>{t("f_free_5")}</li>
                            <li><span className="fno">✗</span>{t("f_free_6")}</li>
                          </ul>
                          <button className="btn btn-out btn-sm btn-block" onClick={() => activatePlan("free")}>{t("btn_continue_free")}</button>
                        </div>

                        {/* PRO */}
                        <div className="plan-card featured">
                          <div className="plan-chip">{t("plan_popular")}</div>
                          <div className="plan-icon">🏆</div>
                          <div className="plan-name">Pro</div>
                          {annual
                            ? <div><span className="plan-amount" style={{ fontSize: 22 }}>77</span><span className="plan-period"> €/an · 6,42€/mois</span></div>
                            : <div><span className="plan-amount">12,90</span><span className="plan-period"> €/mois</span></div>
                          }
                          {annual
                            ? <div className="plan-africa" style={{ color: "var(--ok)", fontWeight: 700 }}>{t("plan_months2")}</div>
                            : <div className="plan-africa">ou <strong style={{ color: "var(--gold)" }}>77€/an</strong> · {t("plan_months2")}</div>
                          }
                          <ul className="plan-feats">
                            <li><span className="fok">✓</span>{t("f_pro_1")}</li>
                            <li><span className="fok">✓</span>{t("f_pro_2")}</li>
                            <li><span className="fok">✓</span>{t("f_pro_3")}</li>
                            <li><span className="fok">✓</span>{t("f_pro_4")}</li>
                            <li><span className="fok">✓</span>{t("f_pro_5")}</li>
                            <li><span className="fok">✓</span>{t("f_pro_6")}</li>
                          </ul>
                          <button className="btn btn-gold btn-sm btn-block"
                            disabled={!!checkoutLoading}
                            onClick={() => activatePlan(annual ? "pro-annual" : "pro")}>
                            {checkoutLoading === (annual ? "pro-annual" : "pro")
                              ? "⏳ Redirection…"
                              : `${t("btn_activate_pro")} — ${annual ? "77€/an" : "12,90€/mois"}`}
                          </button>
                        </div>

                        {/* ELITE */}
                        <div className="plan-card">
                          <div className="plan-icon">👑</div>
                          <div className="plan-name">Élite</div>
                          {annual
                            ? <div><span className="plan-amount" style={{ fontSize: 22 }}>210</span><span className="plan-period"> €/an · 17,50€/mois</span></div>
                            : <div><span className="plan-amount">25</span><span className="plan-period"> €/mois</span></div>
                          }
                          {annual
                            ? <div className="plan-africa" style={{ color: "var(--ok)", fontWeight: 700 }}>{t("plan_months4")} · {t("plan_africa_yr")}</div>
                            : <div className="plan-africa">{t("plan_africa_mo")}</div>
                          }
                          <ul className="plan-feats">
                            <li><span className="fok">✓</span>{t("f_el_1")}</li>
                            <li><span className="fok">✓</span>{t("f_el_2")}</li>
                            <li><span className="fok">✓</span>{t("f_el_3")}</li>
                            <li><span className="fok">✓</span>{t("f_el_4")}</li>
                            <li><span className="fok">✓</span>{t("f_el_5")}</li>
                            <li><span className="fok">✓</span>{t("f_el_6")}</li>
                          </ul>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-out btn-sm" style={{ flex: 1 }}
                              disabled={!!checkoutLoading}
                              onClick={() => activatePlan(annual ? "elite-annual" : "elite")}>
                              {checkoutLoading === (annual ? "elite-annual" : "elite")
                                ? "⏳ Redirection…"
                                : annual ? "210€/an" : t("btn_europe")}
                            </button>
                            <button className="btn btn-gold btn-sm" style={{ flex: 1 }}
                              disabled={!!checkoutLoading}
                              onClick={() => activatePlan("elite-africa")}>
                              {checkoutLoading === "elite-africa"
                                ? "⏳ Redirection…"
                                : `${t("btn_africa")} ${annual ? "135€/an" : "17€/mois"}`}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bandeau économies annuelles */}
                      {annual && (
                        <div style={{ background: "rgba(76,175,110,.05)", border: "1px solid rgba(76,175,110,.2)", borderRadius: "var(--r2)", padding: "10px 16px", marginTop: 12, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
                          {[["Pro", 12.90, 77], ["Élite", 25, 210]].map(([name, mo, yr]) => (
                            <div key={name} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 10, color: "var(--dim)", letterSpacing: 1 }}>{name} {t("annual_label")}</div>
                              <div style={{ fontSize: 12, marginTop: 2 }}>
                                <span style={{ color: "var(--dim2)", textDecoration: "line-through" }}>{(mo * 12).toFixed(0)}€</span>
                                <span style={{ color: "var(--ok)", fontWeight: 700, marginLeft: 8 }}>{yr}€</span>
                              </div>
                              <div style={{ fontSize: 10, color: "var(--ok)" }}>{t("savings_label")} {((mo * 12) - yr).toFixed(0)}€</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="card" style={{ marginTop: 16 }}>
                  <div className="card-title">{t("cmp_title")}</div>
                  <table className="main-tbl">
                    <thead>
                      <tr>
                        <th>{t("cmp_feature")}</th>
                        <th>{t("cmp_free")}</th>
                        <th>{t("cmp_pro")}</th>
                        <th>{t("cmp_elite")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["cmp_r1","cmp_r2","cmp_r3","cmp_r4","cmp_r5","cmp_r6","cmp_r7","cmp_r8","cmp_r9","cmp_r10","cmp_r11","cmp_r12","cmp_r13","cmp_r14"].map((key, i) => {
                        const [f, a, b, c] = t(key);
                        return (
                          <tr key={i}>
                            <td>{f}</td>
                            <td style={{ color: a === "✗" ? "var(--err)" : a.includes("✓") || a === "Illimité" || a === "Unlimited" || a === "Ilimitado" || a === "غير محدود" || a === "3" ? "var(--ok)" : "var(--dim)" }}>{a}</td>
                            <td style={{ color: b === "✗" ? "var(--err)" : b.includes("✓") || b === "Illimité" || b === "Unlimited" || b === "Ilimitado" || b === "غير محدود" ? "var(--ok)" : "var(--warn)" }}>{b}</td>
                            <td style={{ color: c === "✗" ? "var(--err)" : "var(--ok)" }}>{c}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ MAISON ══ */}
            {page === "maison" && (
              <div>
                <div className="steps">
                  {["Pays", "Projet", "Qualité", "Résultat"].map((s, i) => (
                    <div key={i} className={`step${step > i ? " done" : ""}`}>
                      <div className="step-n">{i + 1}</div><br />{s}
                    </div>
                  ))}
                </div>

                {step === 1 && (
                  <div>
                    <div className="card">
                      <div className="card-title">Choisissez votre pays</div>
                      <div className="cnt-grid">
                        {COUNTRIES.map(c => (
                          <div key={c.code} className={`cnt${cc === c.code ? " sel" : ""}`} onClick={() => setCc(c.code)}>
                            <div className="cnt-flag">{c.flag}</div>
                            <div className="cnt-name">{c.name}</div>
                            <div className="cnt-cur">{c.cur}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="btn btn-gold" style={{ marginTop: 10 }} onClick={() => setStep(2)}>Continuer →</button>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <div className="card">
                      <div className="card-title">Décrivez votre projet</div>
                      <div className="fg" style={{ marginBottom: 12 }}>
                        <label>Description libre</label>
                        <textarea value={mForm.desc} onChange={e => setMForm(f => ({ ...f, desc: e.target.value }))} placeholder="Ex : Maison 120m², 3 chambres, cuisine ouverte, terrain plat…" />
                      </div>
                      <div className="fg2">
                        <div className="fg"><label>Longueur (m)</label><input type="number" value={mForm.l} onChange={e => setMForm(f => ({ ...f, l: parseFloat(e.target.value) || 12 })) } /></div>
                        <div className="fg"><label>Largeur (m)</label><input type="number" value={mForm.w} onChange={e => setMForm(f => ({ ...f, w: parseFloat(e.target.value) || 10 }))} /></div>
                        <div className="fg"><label>Étages</label><select value={mForm.fl} onChange={e => setMForm(f => ({ ...f, fl: parseInt(e.target.value) }))}><option value={1}>R+0</option><option value={2}>R+1</option><option value={3}>R+2</option></select></div>
                        <div className="fg"><label>Toiture</label><select value={mForm.roofType} onChange={e => setMForm(f => ({ ...f, roofType: e.target.value }))}><option value="pitched">Inclinée</option><option value="flat">Plate</option></select></div>
                        <div className="fg"><label>Budget cible</label><input type="number" value={mForm.budget} onChange={e => setMForm(f => ({ ...f, budget: e.target.value }))} placeholder="Optionnel" /></div>
                        <div className="fg"><label>Salles de bain</label><input type="number" value={mForm.sdb} onChange={e => setMForm(f => ({ ...f, sdb: parseInt(e.target.value) || 2 }))} /></div>
                        <div className="fg"><label>Ville / Région</label><input value={mForm.city} onChange={e => setMForm(f => ({ ...f, city: e.target.value }))} placeholder="Abidjan, Paris…" /></div>
                        <div className="fg"><label>Latitude</label><input type="number" step="any" value={mForm.latitude} onChange={e => setMForm(f => ({ ...f, latitude: e.target.value }))} placeholder="ex: 5.345317" /></div>
                        <div className="fg"><label>Longitude</label><input type="number" step="any" value={mForm.longitude} onChange={e => setMForm(f => ({ ...f, longitude: e.target.value }))} placeholder="ex: -4.024429" /></div>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <button type="button" className="btn btn-out" onClick={locateMaison} disabled={locating} style={{ fontSize: 12 }}>
                          {locating ? "⏳ Localisation…" : "📍 Localiser automatiquement"}
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="btn btn-out" onClick={() => setStep(1)}>← Retour</button>
                      <button className="btn btn-gold" onClick={() => setStep(3)}>Continuer →</button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <div className="card">
                      <div className="card-title">Qualité des matériaux</div>
                      <div className="q-row">
                        {[
                          { k: "eco", c: "var(--ok)", n: "Économique", sub: "Parpaing · Tôle · Finitions simples", d: "−20 à −25%" },
                          { k: "std", c: "var(--gold)", n: "Standard", sub: "Brique · Tuile béton · Alu standard", d: "Référence" },
                          { k: "pre", c: "#D4857A", n: "Premium", sub: "Béton cellulaire · Tuile cuite · Double vitrage", d: "+25 à +40%" },
                        ].map(q => (
                          <div key={q.k} className={`q-card${qual === q.k ? " sel" : ""}`} onClick={() => setQual(q.k)}>
                            <div style={{ fontSize: 20, marginBottom: 5, color: q.c }}>◉</div>
                            <div className="q-name" style={{ color: q.c }}>{q.n}</div>
                            <div className="q-sub">{q.sub}</div>
                            <div className="q-delta" style={{ color: q.c }}>{q.d}</div>
                          </div>
                        ))}
                      </div>
                      <div className="note" style={{ fontSize: 11 }}>
                        {qual === "eco" && "ÉCONOMIQUE — Parpaing creux · Tôle bac acier · Béton poli · PVC économique"}
                        {qual === "std" && "STANDARD — Brique creuse · Tuile béton · Fenêtres alu · Carrelage · Câble NF · PVC standard"}
                        {qual === "pre" && "PREMIUM — Béton cellulaire · Tuile terre cuite · Double vitrage · Parquet ou marbre · Domotique"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="btn btn-out" onClick={() => setStep(2)}>← Retour</button>
                      <button className="btn btn-gold" onClick={launchMaison}>⚡ Lancer l'estimation</button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div>
                    {computing && <div style={{ textAlign: "center", padding: 32 }}><div className="spinner" /><div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6 }}>PHG IA calcule votre estimation…</div></div>}
                    {mResult && !computing && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: "var(--gold)" }}>Résultat · Estimation PHG</div>
                          <span className="badge b-est">V1</span>
                        </div>
                        <div className="tabs">
                          {["mat", "cout", "recs"].map(t => (
                            <div key={t} className={`tab${mTab === t ? " active" : ""}`} onClick={() => setMTab(t)}>
                              {t === "mat" ? "Matériaux" : t === "cout" ? "Coût" : "Recommandations IA"}
                            </div>
                          ))}
                        </div>

                        {mTab === "mat" && (
                          <div>
                            <table className="mat-tbl">
                              <thead><tr><th>Matériau</th><th>Quantité</th><th>Unité</th><th>P.U.</th><th>Total</th></tr></thead>
                              <tbody>
                                {(CAN.fullMaterials(plan) ? mResult.materials : mResult.materials.slice(0, 3)).map((m, i) => (
                                  <tr key={i}>
                                    <td>{m.n}</td><td>{fmt(m.q)}</td><td>{m.u}</td>
                                    <td>{fmt(m.pu, 2)} {mResult.cur}</td>
                                    <td style={{ color: "var(--gold)", fontWeight: 600 }}>{fmt(m.t)} {mResult.cur}</td>
                                  </tr>
                                ))}
                                {!CAN.fullMaterials(plan) && (
                                  <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--dim)", padding: 8 }}>… +{mResult.materials.length - 3} matériaux masqués</td></tr>
                                )}
                              </tbody>
                            </table>
                            {!CAN.fullMaterials(plan) && (
                              <div className="lock-overlay">
                                <div className="lock-icon">🔒</div>
                                <div className="lock-title">Détail complet des matériaux</div>
                                <div className="lock-sub">Le plan Gratuit affiche les 3 premiers matériaux.<br />Passez à PRO (12,90€/mois) pour voir les {mResult.materials.length} matériaux avec quantités et prix exacts.</div>
                                <button className="btn btn-gold" onClick={() => setPage("abonnement")}>Débloquer PRO — 12,90€/mois</button>
                              </div>
                            )}
                          </div>
                        )}

                        {mTab === "cout" && (
                          <div>
                            <div className="result-wrap">
                              <div className="cost-line"><span className="cost-lbl">Matériaux</span><span>{fmt(mResult.matCost)} {mResult.cur}</span></div>
                              <div className="cost-line"><span className="cost-lbl">Main d'œuvre</span><span>{fmt(mResult.labCost)} {mResult.cur}</span></div>
                              <div className="cost-line"><span className="cost-lbl">Logistique</span><span>{fmt(mResult.logCost)} {mResult.cur}</span></div>
                              <div className="cost-line"><span className="cost-lbl">Marge risque (8%)</span><span>{fmt(mResult.risk)} {mResult.cur}</span></div>
                              <div className="cost-line total"><span>TOTAL ESTIMÉ</span><span>{fmt(mResult.total)} {mResult.cur}</span></div>
                            </div>
                            {mResult.budget > 0 && (
                              <div className={`alert ${mResult.total > mResult.budget ? "alert-warn" : "alert-ok"}`}>
                                {mResult.total > mResult.budget
                                  ? `Dépassement : +${fmt(mResult.total - mResult.budget)} ${mResult.cur} vs votre budget. Optez pour la qualité Éco ou réduisez la surface.`
                                  : `Dans le budget — marge disponible : ${fmt(mResult.budget - mResult.total)} ${mResult.cur}`}
                              </div>
                            )}
                          </div>
                        )}

                        {mTab === "recs" && (
                          CAN.recs(plan) ? (
                            <div>
                              <div className="score-grid">
                                {[{ l: "Budget", v: mResult.bs }, { l: "Construct.", v: 88 }, { l: "Matériaux", v: qual === "pre" ? 94 : qual === "eco" ? 77 : 85 }, { l: "Optim.", v: 80 }].map((s, i) => (
                                  <div key={i} className="sc-item"><div className="sc-num" style={{ color: scColor(s.v) }}>{s.v}</div><div className="sc-lbl">{s.l}</div></div>
                                ))}
                              </div>
                              <div style={{ textAlign: "center", marginBottom: 12 }}>
                                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 28, color: scColor(mResult.gs) }}>{mResult.gs}<span style={{ fontSize: 13, color: "var(--dim)" }}>/100</span></div>
                                <div style={{ fontSize: 11, color: "var(--dim)" }}>Score global PHG IA</div>
                              </div>
                              {mResult.budget > 0 && mResult.total > mResult.budget && (
                                <div className="rec-item"><div className="rec-hdr"><span className="rec-ttl">Dépassement budgétaire</span><span className="sev-h">HIGH</span></div><div className="rec-body">Le coût dépasse votre budget. <strong>→</strong> Réduire la surface ou opter pour la qualité Éco.<br /><span className="gain">💰 {fmt(Math.round((mResult.total - mResult.budget) * 0.35))} {mResult.cur} récupérables</span></div></div>
                              )}
                              <div className="rec-item"><div className="rec-hdr"><span className="rec-ttl">Optimisation circuits</span><span className="sev-l">LOW</span></div><div className="rec-body">Regrouper cuisine et salles de bain réduit les réseaux. <strong>→</strong> Économie plomberie estimée 3 à 5%.<br /><span className="gain">💰 {fmt(Math.round(mResult.total * 0.04))} {mResult.cur} d'économie possible</span></div></div>
                              {qual === "pre" && (cc === "CI" || cc === "SN") && (
                                <div className="rec-item"><div className="rec-hdr"><span className="rec-ttl">Premium en zone tropicale</span><span className="sev-m">MEDIUM</span></div><div className="rec-body">Certains matériaux premium sont sensibles à l'humidité tropicale. <strong>→</strong> Vérifier disponibilité locale.</div></div>
                              )}
                            </div>
                          ) : (
                            <div className="lock-overlay">
                              <div className="lock-icon">🔒</div>
                              <div className="lock-title">Recommandations IA</div>
                              <div className="lock-sub">Accédez aux recommandations personnalisées, score de projet et optimisations avec le plan PRO à 12,90€/mois.</div>
                              <button className="btn btn-gold" onClick={() => setPage("abonnement")}>Activer PRO →</button>
                            </div>
                          )
                        )}

                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button className="btn btn-out" onClick={() => { setStep(1); setMResult(null); }}>← Nouveau</button>
                          <button className="btn btn-gold" onClick={pdfClick}>📄 Exporter PDF</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══ INFRA ══ */}
            {page === "infra" && (
              !CAN.infra(plan) ? (
                <div className="lock-overlay" style={{ marginTop: 0 }}>
                  <div className="lock-icon">🔒</div>
                  <div className="lock-title">Module Infrastructure</div>
                  <div className="lock-sub">Ce module est réservé aux abonnés PRO et ELITE.<br />Passez à PRO (12,90€/mois) pour concevoir ponts, routes et bâtiments publics.</div>
                  <button className="btn btn-gold" onClick={() => setPage("abonnement")}>Voir les offres →</button>
                </div>
              ) : (
                <div>
                  <div className="card">
                    <div className="card-title">Type d'infrastructure</div>
                    <div className="inf-grid">
                      {[{ k: "pont", i: "🌉", n: "Pont", s: "Béton armé · Acier · Rural" }, { k: "route", i: "🛣️", n: "Route", s: "Bitume · Pavé · Piste" }, { k: "bat", i: "🏫", n: "Bâtiment public", s: "École · Dispensaire" }].map(t => (
                        <div key={t.k} className={`inf-card${infType === t.k ? " sel" : ""}`} onClick={() => setInfType(t.k)}>
                          <div style={{ fontSize: 26, marginBottom: 5 }}>{t.i}</div>
                          <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.n}</div>
                          <div style={{ fontSize: 10, color: "var(--dim)" }}>{t.s}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-title">Paramètres du pont</div>
                    <div className="fg2">
                      <div className="fg"><label>Longueur (m)</label><input type="number" value={iForm.l} onChange={e => setIForm(f => ({ ...f, l: parseFloat(e.target.value) || 50 }))} /></div>
                      <div className="fg"><label>Largeur (m)</label><input type="number" value={iForm.w} onChange={e => setIForm(f => ({ ...f, w: parseFloat(e.target.value) || 8 }))} /></div>
                      <div className="fg"><label>Structure</label><select value={iForm.type} onChange={e => setIForm(f => ({ ...f, type: e.target.value }))}><option value="beton">Béton armé</option><option value="acier">Charpente acier</option><option value="local">Locale simplifiée</option></select></div>
                      <div className="fg"><label>Nombre de piles</label><input type="number" value={iForm.piers} onChange={e => setIForm(f => ({ ...f, piers: parseInt(e.target.value) || 2 }))} /></div>
                      <div className="fg"><label>Hauteur piles (m)</label><input type="number" value={iForm.pHeight} onChange={e => setIForm(f => ({ ...f, pHeight: parseFloat(e.target.value) || 4 }))} /></div>
                      <div className="fg"><label>Pays</label><select value={iForm.country} onChange={e => setIForm(f => ({ ...f, country: e.target.value }))}><option value="FR">🇫🇷 France</option><option value="CI">🇨🇮 Côte d'Ivoire</option><option value="CH">🇨🇭 Suisse</option></select></div>
                    </div>
                    <button className="btn btn-gold" style={{ marginTop: 8 }} onClick={launchInfra}>⚡ Calculer l'infrastructure</button>
                  </div>
                  {iComputing && <div style={{ textAlign: "center", padding: 24 }}><div className="spinner" /></div>}
                  {iResult && !iComputing && (
                    <div>
                      <div className="alert alert-warn">Pré-estimation indicative — ne remplace pas une étude structurelle certifiée.</div>
                      <div className="tabs" style={{ marginTop: 12 }}>
                        {["mat", "cout"].map(t => <div key={t} className={`tab${iTab === t ? " active" : ""}`} onClick={() => setITab(t)}>{t === "mat" ? "Matériaux" : "Coût"}</div>)}
                      </div>
                      {iTab === "mat" && (
                        <table className="mat-tbl">
                          <thead><tr><th>Poste</th><th>Quantité</th><th>Unité</th><th>P.U.</th><th>Total</th></tr></thead>
                          <tbody>{iResult.materials.map((m, i) => <tr key={i}><td>{m.n}</td><td>{m.q}</td><td>{m.u}</td><td>{m.pu} {iResult.cur}</td><td style={{ color: "var(--gold)", fontWeight: 600 }}>{fmt(m.t)} {iResult.cur}</td></tr>)}</tbody>
                        </table>
                      )}
                      {iTab === "cout" && (
                        <div className="result-wrap">
                          <div className="cost-line"><span className="cost-lbl">Béton armé</span><span>{fmt(iResult.betonC)} {iResult.cur}</span></div>
                          <div className="cost-line"><span className="cost-lbl">Acier armature</span><span>{fmt(iResult.acierC)} {iResult.cur}</span></div>
                          <div className="cost-line"><span className="cost-lbl">Main d'œuvre</span><span>{fmt(iResult.labC)} {iResult.cur}</span></div>
                          <div className="cost-line"><span className="cost-lbl">Logistique (6%)</span><span>{fmt(iResult.logC)} {iResult.cur}</span></div>
                          <div className="cost-line"><span className="cost-lbl">Marge risque (15%)</span><span>{fmt(iResult.risk)} {iResult.cur}</span></div>
                          <div className="cost-line total"><span>TOTAL ESTIMÉ</span><span>{fmt(iResult.total)} {iResult.cur}</span></div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button className="btn btn-out" onClick={() => setIResult(null)}>← Modifier</button>
                        <button className="btn btn-gold" onClick={pdfClick}>📄 Dossier technique PDF</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* ══ ANALYSE ══ */}
            {page === "analyse" && (
              !CAN.analyse(plan) ? (
                <div className="lock-overlay" style={{ marginTop: 0 }}>
                  <div className="lock-icon">🔒</div>
                  <div className="lock-title">Analyse de plan IA</div>
                  <div className="lock-sub">L'analyse de plan (PDF, photo, croquis) est disponible dès le plan PRO à 12,90€/mois.<br />L'IA lit votre plan, détecte les erreurs et optimise les coûts.</div>
                  <button className="btn btn-gold" onClick={() => setPage("abonnement")}>Activer PRO →</button>
                </div>
              ) : (
                <div>
                  <div className="card">
                    <div className="card-title">Uploadez votre plan</div>
                    {!uploaded ? (
                      <div className="upload-z" onClick={() => setUploaded(true)}>
                        <div style={{ fontSize: 28, color: "var(--dim)", marginBottom: 8 }}>📁</div>
                        <div style={{ fontSize: 11, color: "var(--dim)" }}>Cliquez pour uploader<br /><span style={{ fontSize: 10 }}>PDF · Image · Croquis · DWG</span></div>
                      </div>
                    ) : (
                      <div style={{ background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 11, color: "var(--gold)", marginBottom: 10 }}>
                        📁 plan_maison_projet.pdf — prêt pour analyse
                      </div>
                    )}
                    {uploaded && (
                      <div>
                        <div className="fg2" style={{ marginTop: 10 }}>
                          <div className="fg"><label>Pays</label><select value={anCC} onChange={e => setAnCC(e.target.value)}><option value="CI">🇨🇮 Côte d'Ivoire</option><option value="FR">🇫🇷 France</option><option value="CH">🇨🇭 Suisse</option></select></div>
                          <div className="fg"><label>Type de fichier</label><select><option value="pdf">PDF</option><option value="image">Image / Photo</option></select></div>
                        </div>
                        <button className="btn btn-gold" style={{ marginTop: 8 }} onClick={launchAnalyse}>🧠 Analyser le plan</button>
                      </div>
                    )}
                  </div>
                  {anComputing && <div style={{ textAlign: "center", padding: 24 }}><div className="spinner" /><div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6 }}>L'IA analyse votre plan…</div></div>}
                  {anResult && !anComputing && (
                    <div>
                      <div className="card">
                        <div className="card-title">Données extraites</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                          <div className="kpi"><div className="kpi-lbl">Surface</div><div className="kpi-val">{anResult.surf}</div><div className="kpi-sub">m²</div></div>
                          <div className="kpi"><div className="kpi-lbl">Pièces</div><div className="kpi-val">{anResult.rooms}</div><div className="kpi-sub">détectées</div></div>
                          <div className="kpi"><div className="kpi-lbl">Ouvertures</div><div className="kpi-val">{anResult.openings}</div><div className="kpi-sub">portes & fenêtres</div></div>
                        </div>
                      </div>
                      <div className="card">
                        <div className="card-title">Diagnostic IA</div>
                        {[
                          { t: "Couloir surdimensionné", s: "medium", obs: "Le couloir occupe ~15% de la surface (norme 12%). Réduire pour gagner de l'espace habitable." },
                          { t: "Pièces humides éloignées", s: "medium", obs: "Cuisine et salle de bain non groupées → surcoût plomberie estimé +8%." },
                          { t: "Orientation solaire", s: "low", obs: "Le plan respecte bien l'orientation solaire. Aucune correction nécessaire." },
                        ].map((r, i) => (
                          <div key={i} className="rec-item">
                            <div className="rec-hdr"><span className="rec-ttl">{r.t}</span><span className={`sev-${r.s}`}>{r.s.toUpperCase()}</span></div>
                            <div className="rec-body">{r.obs}</div>
                          </div>
                        ))}
                      </div>
                      <div className="card">
                        <div className="card-title">Estimation automatique</div>
                        <div className="result-wrap">
                          <div className="cost-line"><span className="cost-lbl">Fourchette basse (Éco)</span><span>{fmt(anResult.eco)} {anResult.cur}</span></div>
                          <div className="cost-line"><span className="cost-lbl">Estimation standard</span><span>{fmt(anResult.std)} {anResult.cur}</span></div>
                          <div className="cost-line total"><span>Fourchette haute (Premium)</span><span>{fmt(anResult.pre)} {anResult.cur}</span></div>
                        </div>
                        <button className="btn btn-gold" style={{ marginTop: 12, width: "100%" }} onClick={pdfClick}>📄 Rapport complet PDF</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* ══ PROJETS ══ */}
            {page === "projets" && (
              <div className="card">
                <div className="card-title">Mes projets</div>
                <table className="main-tbl">
                  <thead><tr><th>Nom</th><th>Type</th><th>Pays</th><th>Qualité</th><th>Coût estimé</th><th>Statut</th><th></th></tr></thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td><span className={`badge ${p.type === "house" ? "b-house" : "b-bridge"}`}>{p.type === "house" ? "🏠 Maison" : "🌉 Pont"}</span></td>
                        <td>{p.country}</td>
                        <td><span className={`badge b-${p.qual}`}>{p.qual}</span></td>
                        <td style={{ fontFamily: "'Cinzel',serif", color: "var(--gold)" }}>{p.cost ? fmt(p.cost) + " €" : "—"}</td>
                        <td><span className={`badge ${p.status === "estimated" ? "b-est" : "b-draft"}`}>{p.status}</span></td>
                        <td><button className="btn btn-out btn-sm" onClick={() => { if (p.type === "bridge" && !CAN.infra(plan)) alert("🔒 Détail pont réservé au plan PRO."); else setPage("maison"); }}>Détail</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {plan === "free" && <div className="note">{t("proj_note")}</div>}
              </div>
            )}

            {/* ══ SIMULATEUR ══ */}
            {page === "simulateur" && <SimulateurEconomies setPage={setPage} t={t} lang={lang} />}

            {/* ══ BIBLIOTHÈQUE ══ */}
            {page === "bibliotheque" && <BibliothequePlans setPage={setPage} />}

            {/* ══ EXPORT DXF ══ */}
            {page === "export_dxf" && <ExportDXF plan={plan} />}

            {/* ══ FOURNISSEURS ══ */}
            {page === "fournisseurs" && <CarnetFournisseurs plan={plan} />}

            {/* ══ CHANTIER ══ */}
            {page === "budget" && <BudgetIA plan={plan} setPage={setPage} lang={lang} />}
          {page === "chantier" && <GestionChantier plan={plan} />}

            {/* ══ PHG RADAR ══ */}
            {page === "radar" && <PhgRadar setPage={setPage} t={t} lang={lang} />}
            {page === "assistant" && <AssistantIA plan={plan} lang={lang} />}
            {page === "restauration" && <DiagnosticRestauration plan={plan} lang={lang} />}

            {/* ══ RAPPORT PDF ══ */}
            {page === "rapport_pdf" && (
              !CAN.pdf(plan) ? (
                <div className="lock-overlay" style={{ marginTop: 0 }}>
                  <div className="lock-icon">🔒</div>
                  <div className="lock-title">Rapport PDF</div>
                  <div className="lock-sub">La génération de rapports PDF est disponible dès le plan PRO à 12,90€/mois.</div>
                  <button className="btn btn-gold" onClick={() => setPage("abonnement")}>Activer PRO →</button>
                </div>
              ) : (
                <RapportPDF
                  projet={{ nom: mForm.desc || "Mon Projet", type: "Maison individuelle", surface: mForm.l * mForm.w * mForm.fl, qualite: qual }}
                  résultat={mResult}
                  pays={cc}
                  plan={plan}
                />
              )
            )}

            {/* ══ CONSTRUIRE DEPUIS L'ÉTRANGER ══ */}
            {page === "envoiargent" && <EnvoiArgent plan={plan} lang={lang} />}

            {/* ══ SUIVI CHANTIER ══ */}
            {page === "suivi_chantier" && (
              !CAN.pdf(plan) ? (
                <div className="lock-overlay" style={{ marginTop: 0 }}>
                  <div className="lock-icon">🔒</div>
                  <div className="lock-title">Suivi de Chantier</div>
                  <div className="lock-sub">Le suivi de chantier visuel est disponible dès le plan PRO à 12,90€/mois.</div>
                  <button className="btn btn-gold" onClick={() => setPage("abonnement")}>Activer PRO →</button>
                </div>
              ) : (
                <SuiviChantier plan={plan} lang={lang} />
              )
            )}

            {/* ══ ABONNEMENT ══ */}
            {page === "abonnement" && (() => {
              const annual = billingAbonnement === "annual";
              const PLANS = [
                {
                  k: "free", name: t("plan_free"), icon: "◇", monthly: 0,
                  feats: [t("f_free_1"), t("f_free_2"), t("f_free_3"), t("f_pro_6"), `✗ ${t("f_free_5")}`, `✗ ${t("f_free_6")}`, `✗ ${t("f_pro_5")}`, `✗ ${t("f_el_2")}`],
                  btns: [{ l: t("btn_stay_free"), cls: "btn-out", p: "free" }],
                },
                {
                  k: "pro", name: "Pro", icon: "◆", monthly: 12.90, annual: 77, annualBadge: t("plan_months2"), chip: t("plan_popular"), featured: true,
                  feats: [t("f_pro_1"), t("f_pro_2"), t("f_pro_4"), t("f_free_6"), t("f_pro_3"), t("f_pro_5"), t("f_pro_6"), `✗ ${t("f_el_4")}`],
                  btns: [{ l: t("btn_activate_pro"), cls: "btn-gold", p: "pro" }],
                },
                {
                  k: "elite", name: "Élite", icon: "❖", monthly: 25, annual: 210, annualBadge: t("plan_months4"), africa: 17, chip: t("plan_all_included"),
                  feats: [t("f_el_1"), t("f_el_2"), t("f_el_3"), t("f_pro_1"), t("f_el_4"), t("f_el_5"), t("f_el_6"), t("plan_africa_mo")],
                  btns: [{ l: t("btn_europe"), cls: "btn-out", p: "elite" }, { l: `${t("btn_africa")} 17€/mois`, cls: "btn-gold", p: "elite-africa" }],
                },
              ];
              return (
                <div>
                  <div className="card" style={{ textAlign: "center", padding: "16px 22px", marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: "var(--gold)", letterSpacing: 2, marginBottom: 4 }}>{t("abo_current_plan")}</div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: 22 }}>{planLabel[plan]}</div>
                  </div>

                  {/* Toggle */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 20 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: !annual ? "var(--gold)" : "var(--dim)" }}>{t("toggle_monthly")}</span>
                    <div onClick={() => setBillingAbonnement(b => b === "monthly" ? "annual" : "monthly")}
                      style={{ width: 50, height: 26, borderRadius: 13, cursor: "pointer", position: "relative", background: annual ? "var(--gold)" : "var(--panel2)", border: "1px solid " + (annual ? "var(--gold)" : "var(--border2)"), transition: "background .25s" }}>
                      <div style={{ position: "absolute", top: 3, left: annual ? 26 : 3, width: 18, height: 18, borderRadius: "50%", background: annual ? "#0A0A0A" : "var(--gold)", transition: "left .25s" }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: annual ? "var(--gold)" : "var(--dim)" }}>
                      {t("toggle_annual")}
                      <span style={{ marginLeft: 6, background: "rgba(76,175,110,.15)", color: "var(--ok)", borderRadius: 10, padding: "2px 8px", fontSize: 9, fontWeight: 700 }}>{t("save_pct")}</span>
                    </span>
                  </div>

                  <div className="plan-grid">
                    {PLANS.map(pl => {
                      const isCurrent = plan === pl.k || (plan === "free" && pl.k === "free");
                      return (
                        <div key={pl.k} className={`plan-card${pl.featured ? " featured" : ""}`} style={isCurrent ? { boxShadow: "0 0 0 2px var(--gold)" } : {}}>
                          {pl.chip && <div className="plan-chip">{pl.chip}</div>}
                          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: "var(--gold)", marginBottom: 2 }}>{pl.icon}</div>
                          <div className="plan-name">{pl.name}</div>
                          {pl.k === "free"
                            ? <div><span className="plan-amount">0</span><span className="plan-period"> €</span></div>
                            : annual
                              ? <div><span className="plan-amount" style={{ fontSize: 22 }}>{pl.annual}</span><span className="plan-period"> €/an · {(pl.annual / 12).toFixed(2)}€/mois</span></div>
                              : <div><span className="plan-amount">{pl.monthly.toFixed(2).replace(".00", "")}</span><span className="plan-period"> €/mois</span></div>
                          }
                          {annual && pl.annualBadge && (
                            <div style={{ display: "inline-block", margin: "4px 0 2px", background: "rgba(76,175,110,.14)", color: "var(--ok)", border: "1px solid rgba(76,175,110,.3)", borderRadius: 10, padding: "2px 10px", fontSize: 9, fontWeight: 700 }}>
                              {pl.annualBadge}
                            </div>
                          )}
                          <div className="plan-africa">
                            {pl.k === "free" ? t("plan_forever") : pl.africa
                              ? (annual ? t("plan_africa_yr") : t("plan_africa_mo"))
                              : (annual ? "" : `ou ${pl.annual}€/an`)}
                          </div>
                          <ul className="plan-feats">
                            {pl.feats.map((f, i) => <li key={i}><span className={f.startsWith("✗") ? "fno" : "fok"}>{f.startsWith("✗") ? "✗" : "✓"}</span>{f.replace("✗ ", "")}</li>)}
                          </ul>
                          <div style={{ display: "flex", gap: 6 }}>
                            {pl.btns.map((b, i) => (
                              <button key={i} className={`btn ${b.cls} btn-sm`} style={{ flex: 1 }} onClick={() => activatePlan(b.p + (annual && b.p !== "free" && b.p !== "elite-africa" ? "-annual" : ""))}>
                                {b.l}{annual && b.p !== "free" && b.p !== "elite-africa" ? ` (${t("btn_annual")})` : ""}
                              </button>
                            ))}
                          </div>
                          {isCurrent && <div style={{ marginTop: 8, fontSize: 10, color: "var(--gold)", textAlign: "center", letterSpacing: 1 }}>{t("abo_active")}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {annual && (
                    <div style={{ background: "rgba(76,175,110,.05)", border: "1px solid rgba(76,175,110,.2)", borderRadius: "var(--r2)", padding: "10px 16px", marginTop: 12, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
                      {[["Pro", 12.90, 77], ["Élite", 25, 210]].map(([name, mo, yr]) => (
                        <div key={name} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "var(--dim)", letterSpacing: 1 }}>{name} {t("annual_label")}</div>
                          <div style={{ fontSize: 12, marginTop: 2 }}>
                            <span style={{ color: "var(--dim2)", textDecoration: "line-through" }}>{(mo * 12).toFixed(0)}€/an</span>
                            <span style={{ color: "var(--ok)", fontWeight: 700, marginLeft: 8 }}>{yr}€/an</span>
                          </div>
                          <div style={{ fontSize: 10, color: "var(--ok)" }}>{t("savings_label")} {((mo * 12) - yr).toFixed(0)}€</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="note" style={{ marginTop: 14 }}>
                    {t("abo_note")}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>

      {/* ── Modal Auth ── */}
      {authModal && (
        <div onClick={() => setAuthModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14,
            padding: 28, width: "100%", maxWidth: 380,
          }}>
            {/* Titre */}
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, color: "var(--gold)", textAlign: "center", marginBottom: 20, letterSpacing: 1.5 }}>
              𓂀 PHG BUILD IA
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", background: "var(--panel2)", borderRadius: 8, overflow: "hidden", marginBottom: 20, border: "1px solid var(--border)" }}>
              {[["login","Connexion"],["register","Créer un compte"]].map(([tab, label]) => (
                <button key={tab} onClick={() => { setAuthTab(tab); setAuthError(""); setShowPassword(false); }}
                  style={{ flex: 1, padding: "9px 0", fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none",
                    fontFamily: "'Montserrat',sans-serif", letterSpacing: .3,
                    background: authTab === tab ? "var(--gold)" : "transparent",
                    color: authTab === tab ? "#0A0A0A" : "var(--dim)" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Formulaire */}
            <form onSubmit={submitAuth}>
              {authTab === "register" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Nom complet</label>
                  <input type="text" required placeholder="Jean Dupont" value={authForm.full_name}
                    onChange={e => setAuthForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Email</label>
                <input type="email" required placeholder="vous@email.com" value={authForm.email}
                  onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <label style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>Mot de passe</label>
                  {authTab === "register" && (
                    <button type="button" onClick={generatePassword}
                      style={{ fontSize: 10, background: "rgba(201,168,76,.1)", border: "1px solid var(--gold3)", borderRadius: 5, padding: "2px 8px", color: "var(--gold)", cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
                      ⚡ Générer
                    </button>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required placeholder="••••••••"
                    value={authForm.password}
                    onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))}
                    style={{ paddingRight: 38 }}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    title={showPassword ? "Masquer" : "Afficher"}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "var(--dim)", lineHeight: 1 }}>
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
                {authTab === "register" && authForm.password && (
                  <div style={{ marginTop: 5, display: "flex", gap: 4 }}>
                    {["length","upper","number","special"].map(rule => {
                      const ok = rule === "length" ? authForm.password.length >= 8
                               : rule === "upper"  ? /[A-Z]/.test(authForm.password)
                               : rule === "number" ? /[0-9]/.test(authForm.password)
                               : /[^a-zA-Z0-9]/.test(authForm.password);
                      const label = rule === "length" ? "8 car." : rule === "upper" ? "Maj." : rule === "number" ? "Chiffre" : "Symbole";
                      return (
                        <span key={rule} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4,
                          background: ok ? "rgba(76,175,110,.12)" : "rgba(255,255,255,.04)",
                          color: ok ? "var(--ok)" : "var(--dim2)", border: `1px solid ${ok ? "rgba(76,175,110,.25)" : "var(--border)"}` }}>
                          {ok ? "✓" : "·"} {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {authError && (
                <div style={{ background: "rgba(201,76,76,.1)", border: "1px solid rgba(201,76,76,.3)", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "var(--err)", marginBottom: 14 }}>
                  {authError}
                </div>
              )}

              <button type="submit" className="btn btn-gold btn-block" disabled={authLoading}
                style={{ padding: "11px 0", fontSize: 13 }}>
                {authLoading ? "⏳ Chargement…" : authTab === "login" ? "Se connecter" : "Créer mon compte"}
              </button>
            </form>

            <button onClick={() => setAuthModal(false)} style={{
              display: "block", margin: "14px auto 0", background: "none", border: "none",
              color: "var(--dim2)", fontSize: 11, cursor: "pointer",
            }}>Annuler</button>
          </div>
        </div>
      )}
    </>
  );
}


