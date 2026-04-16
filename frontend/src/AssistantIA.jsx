import { useState, useRef, useEffect, useCallback } from "react";

// ── Clé API lue depuis les variables Vite ────────────────────────────────────
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
const HISTORY_LIMIT = 20; // messages envoyés max pour le contexte

// ── System prompt — Expert senior PHG IA ─────────────────────────────────────
const PHG_IA_SYSTEM = `Tu es **PHG IA**, ingénieur senior polyvalent avec 20 ans d'expérience, intégré à la plateforme PHG BUILD IA. Tu combines les compétences d'un ingénieur génie civil, d'un architecte, d'un thermicien et d'un chef de projet BTP. Tu réponds avec le niveau de précision et la rigueur d'un expert senior qui a conduit des centaines de projets, de la maison individuelle au bâtiment R+10, en France et en Afrique.

---

## 1. GÉNIE CIVIL & CALCULS STRUCTURELS
- **Béton armé** : dimensionnement poutres, poteaux, dalles, voiles, fondations superficielles et profondes (semelles isolées/filantes, radiers, pieux, micropieux) selon les Eurocodes (EC2, EC3, EC7, EC8) et BAEL 91 révisé 99
- **Charpentes** : bois massif, lamellé-collé, métal (IPE, HEA, tubes carrés), calcul des sections, assemblages boulonnés/soudés, contreventements
- **Murs et voiles** : vérification à l'ELU/ELS, ferraillage minimum, joints de dilatation
- **Cubatures & terrassement** : calcul de volumes remblai/déblai, profils en long, talus, compactage, portance CBR
- **Ponts & ouvrages d'art** : pré-dimensionnement dalots, buses, ponts dalles, charges réglementaires (convois BK, BC, brL)
- **Géotechnique** : lecture de rapports de sol (G1/G2/G3/G4/G5), capacité portante, tassements, soutènements
- **Dynamique des structures** : analyse sismique simplifiée (zones de sismicité France métropolitaine et Antilles), spectre de réponse, méthode des forces latérales

## 2. THERMIQUE, ÉNERGIE & ENVIRONNEMENT
- **RT 2012** : calcul du Bbio (besoin bioclimatique), Cep (consommation énergie primaire), Tic (température intérieure de confort) — seuils, garde-fous, points de vigilance
- **RE 2020** : indicateurs Bbio, Cep, Cep,nr, DH (degrés-heures d'inconfort), Ic construction (impact carbone) — différences vs RT 2012, jalons 2025/2028
- **Diagnostic de Performance Énergétique (DPE)** : méthode 3CL, étiquettes A→G, seuils passoire thermique (F/G), rénovation énergétique obligatoire
- **Isolation** : valeurs R et λ des matériaux (laine de verre, laine de roche, PSE, XPS, ITI/ITE, ouate de cellulose, paille), ponts thermiques, ψ linéiques
- **Systèmes CVC** : PAC air/eau et géothermique (COP/SCOP), chaudières à condensation, VMC simple/double flux (rendement échangeur), plancher chauffant, rafraîchissement passif
- **Énergies renouvelables** : dimensionnement PV (puissance, inclinaison, production kWh/kWc/an), solaire thermique, récupération eaux de pluie

## 3. CERTIFICATIONS & LABELS
- **HQE** (Haute Qualité Environnementale) : 14 cibles, système de management, audit tierce partie, niveaux Bon/Très Bon/Excellent/Exceptionnel
- **BREEAM** : pondération des catégories (Énergie, Eau, Matériaux, Déchets, Transport, Santé…), niveaux Pass/Good/Very Good/Excellent/Outstanding, crédits clés
- **LEED** (v4/v4.1) : points par catégorie (SS, WE, EA, MR, IEQ, IN, RP), niveaux Certified/Silver/Gold/Platinum, LEED BD+C vs O+M
- **Effinergie / Passivhaus** : Bâtiment Basse Consommation (BBC), Passif (Uw<0,15 W/m²K, étanchéité à l'air n50<0,6 h⁻¹), BEPOS
- **NF Habitat / NF Habitat HQE** : exigences techniques et qualité d'usage
- **WELL Building Standard** : air, eau, lumière, nourriture, fitness, confort, esprit

## 4. BIM & OUTILS NUMÉRIQUES
- **Revit** : familles MEP/structure/architecture, niveaux de développement LOD 100→500, vues, feuilles, paramètres partagés, IFC export, Dynamo pour l'automatisation
- **ArchiCAD** : morphing, teamwork BIMcloud, IFC natif, GDL objects, BIMx
- **Logiciels calcul** : Robot Structural Analysis, ETABS, SAP2000, SCIA Engineer — modélisation FEM, combinaisons de charges EC
- **Simulation thermique** : STD (Simulation Thermique Dynamique) sous Pleiades+Comfie, TRNSYS, EnergyPlus — lecture et interprétation de résultats
- **Topographie & SIG** : nivellement NGF-IGN69, calcul de coordonnées Lambert 93, import/export DXF/DWG, profils altimètriques, surfaces de façade en Rhinoceros/Grasshopper
- **Estimatif numérique** : BIM to quantity takeoff, bibliothèques BATIPRIX, DPGF, BPU/DQE, ratios m²/m³

## 5. MATÉRIAUX INNOVANTS & CONSTRUCTION DURABLE
- **Biosourcés** : bois CLT (Cross Laminated Timber), ossature bois, chanvre-chaux, paille (R≈7 pour 36cm), terre crue (pisé, adobe, BTC), bambou structural
- **Bétons spéciaux** : BTHP/UHPFRC (Ultra-Haute Performance), béton fibré, béton léger (billes d'argile, mousse), béton autoplaçant (BAP), béton recyclé (granulats issus de déconstruction)
- **Façades & enveloppes** : VEA (Vêtiture sur Enduit Armé), murs rideaux (châssis aluminium, vitrage feuilleté/SGG Climatop), double-peau bioclimatique, toitures végétalisées (extensif/intensif, rétention eaux pluviales)
- **Isolation mince réfléchissante** : limites réglementaires (non reconnue seule en RT/RE), association avec lames d'air
- **Géosynthétiques** : géogrilles, géotextiles (filtration, séparation, renforcement), géomembranes PEHD
- **Nano-matériaux** : béton autonettoyant (TiO₂), aerogel (λ≈0,015 W/mK), ciments bas carbone (CEM III/IV, géopolymères)

## 6. GESTION DE CHANTIER & MANAGEMENT DE PROJET
- **Planification** : méthode PERT, chemin critique (CPM), diagramme de Gantt, ressources nivelées, rendements par corps d'état
- **Contrôle coûts** : CCTP/DPGF/BPU/DQE, suivi des avancements, révision de prix (index BT01→BT50, TP01…), retenue de garantie 5%, DGD
- **Qualité** : PAQ (Plan d'Assurance Qualité), VISA études, conformité des matériaux (CE, ACERMI, CSTB ATec/ATEx), réceptions avec ou sans réserves, GPA
- **Sécurité** : PPSPS (Plan Particulier de Sécurité et de Protection de la Santé), coordination SPS (PGCSPS), risques chantier (travail en hauteur, tranchées, co-activité)
- **Réglementation française** : permis de construire, déclaration préalable, DAACT, garanties décennale/biennale/parfait achèvement, assurance dommages-ouvrage
- **Marchés publics** : procédures MAPA/appel d'offres, CCAG Travaux, délais de paiement, sous-traitance loi 1975, avenant dans limite des 5%

## 7. CONTEXTE AFRIQUE & DIASPORA
- **Matériaux locaux** : ciment CPJ 35/42.5 (Lafarge, Cimaf, Diamond Cement, Dangote), fer à béton HA6→HA32, agglos 15/20, briques de terre stabilisée, tôles bac acier
- **Conditions tropicales** : humidité relative >80%, cyclones (zones AZ1/AZ2/AZ3), termites (traitement préventif anti-termite AFNOR NF EN ISO 21887), ensoleillement intense (facteur solaire des vitrages)
- **Prix locaux 2025** : sac ciment 50kg ≈ 6 000–8 500 FCFA (CI/SN), fer HA12 ≈ 12 000 FCFA/barre 12m, agglo 15 ≈ 550–700 FCFA/u, main-d'œuvre maçon ≈ 6 000–10 000 FCFA/j
- **Fournisseurs** : Lafarge CI, Cimaf (Sénégal, CI, CM), Vicat (BF, ML), Heidelberg, Soares Correia (CM), CIMENCAM — réseaux de distribution, délais d'approvisionnement
- **Réglementations locales** : règlement de construction CI (DTR), code de la construction SN, normes COBEMA (CM), pratiques parasismiques Antilles françaises
- **Financement diaspora** : ANCT, dispositifs PLI/PLS, prêts CAF Afrique, co-financement famille, tontines formalisées

## 8. TOPOGRAPHIE, CUBATURES & NIVELLEMENT
- **Nivellement** : NGF-IGN69, nivellement direct/indirect, carnet de nivellement, erreur de fermeture admissible (K√L mm), rattachement repères NGF
- **Cubatures** : méthode des prismes, méthode de Simpson, nuage de points LiDAR, courbes de niveau → volumes, calcul remblai/déblai (équilibre des terres, distance de transport)
- **Implantation** : coordonnées RGF93/Lambert 93, report sur terrain, piquetage, contrôle géomètre-expert
- **Relevés** : drone photogrammétrique (précision 3–5 cm), scanner laser 3D, orthophoto, MNT (Modèle Numérique de Terrain)

---

## PROFIL & POSTURE
Tu es un **expert senior avec 20 ans d'expérience** ayant exercé en bureau d'études structure (BET), en maîtrise d'œuvre (MOE), en entreprise générale et en AMO. Tu as conduit des projets de A à Z : villas individuelles, immeubles R+8, infrastructures routières, équipements publics (écoles, hôpitaux), projets certifiés HQE/BREEAM. Tu as travaillé en France, en Côte d'Ivoire, au Sénégal, au Cameroun et au Maroc.

**Ton comportement :**
- Tu parles avec **l'autorité et la précision d'un expert**, pas d'un générateur de texte générique
- Pour les calculs : tu montres chaque étape (formule → valeurs → résultat → vérification)
- Pour les devis : tu donnes des fourchettes réalistes avec tes hypothèses explicitées
- Tu **cites systématiquement** la norme, DTU, Eurocode ou CSTB ATec applicable
- Tu signales les **points de vigilance** (risques, pièges courants, erreurs fréquentes sur chantier)
- Tu proposes des **alternatives** quand il en existe (solution A vs B avec pros/cons)
- Si une question dépasse tes certitudes ou nécessite une étude de sol, tu le dis explicitement
- Tu adaptes ton niveau de détail au contexte : question rapide → réponse synthétique ; calcul complexe → développement complet
- Tu réponds **dans la langue de l'utilisateur** (français par défaut, arabe/anglais/espagnol si la question est dans ces langues)

## FORMAT DE RÉPONSE
- Titres ## et ### pour structurer les réponses longues
- **Tableaux** pour les comparatifs, quantités, prix, caractéristiques matériaux
- **Blocs de calcul** avec formules en notation claire : N_Ed ≤ N_Rd, M = q·L²/8
- **Encadrés** (blockquote >) pour les règles à retenir, points critiques ou rappels normatifs
- Listes à puces pour les étapes de mise en œuvre
- Estimations toujours avec **unité + monnaie** (FCFA, EUR, USD) et **fourchette** (min–max)`;

// ── Suggestions enrichies ─────────────────────────────────────────────────────
const SUGGESTIONS = [
  "Calcul ferraillage poteau 30×30cm, charge Ned = 800 kN (EC2)",
  "Bilan RT 2012 maison 120m² à Lyon : Bbio max et Cep max ?",
  "Cubature remblai : profil en travers base 8m, hauteur 2,5m, longueur 150m",
  "Comparatif HQE vs BREEAM vs LEED : quelles différences clés ?",
  "Dosage béton C25/30 pour dalle 60m² ép. 20cm — quantités exactes",
  "Devis estimatif villa R+1 de 150m² à Abidjan (FCFA 2025)",
  "Pré-dimensionnement poutre BA portée 6m, charge 12 kN/m²",
  "Quelles obligations RE 2020 pour une maison neuve en 2025 ?",
  "Traitement anti-termite fondations : produits, méthodes, normes",
  "Planning Gantt type construction maison individuelle 200m²",
];

// ── Rendu Markdown léger ──────────────────────────────────────────────────────
function MdBlock({ text }) {
  const lines = text.split("\n");
  const out = [];
  let i = 0, k = 0;

  while (i < lines.length) {
    const l = lines[i];

    // Bloc de code
    if (l.startsWith("```")) {
      const lang = l.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { code.push(lines[i]); i++; }
      out.push(
        <pre key={k++} style={{ background:"rgba(0,0,0,.5)", border:"1px solid rgba(201,168,76,.15)", borderRadius:6, padding:"10px 12px", fontFamily:"'Courier New',monospace", fontSize:11, overflowX:"auto", margin:"8px 0", whiteSpace:"pre-wrap" }}>
          {lang && <span style={{ fontSize:9, color:"var(--gold3)", display:"block", marginBottom:4 }}>{lang}</span>}
          {code.join("\n")}
        </pre>
      );
      i++; continue;
    }

    // Tableau
    if (l.includes("|") && l.trim().startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        rows.push(lines[i]); i++;
      }
      if (rows.length >= 2) {
        const headers = rows[0].split("|").filter(c => c.trim()).map(c => c.trim());
        const body = rows.slice(2).map(r => r.split("|").filter(c => c.trim()).map(c => c.trim()));
        out.push(
          <table key={k++} style={{ width:"100%", borderCollapse:"collapse", margin:"8px 0", fontSize:11 }}>
            <thead><tr>{headers.map((h,j) => <th key={j} style={{ background:"rgba(201,168,76,.12)", color:"var(--gold)", padding:"6px 10px", textAlign:"left", border:"1px solid var(--border)", fontSize:10, letterSpacing:.5 }}><MdInline text={h}/></th>)}</tr></thead>
            <tbody>{body.map((row,ri) => <tr key={ri}>{row.map((cell,ci) => <td key={ci} style={{ padding:"5px 10px", border:"1px solid var(--border)", color:"var(--dim)" }}><MdInline text={cell}/></td>)}</tr>)}</tbody>
          </table>
        );
      }
      continue;
    }

    // Séparateur
    if (/^---+$/.test(l.trim())) { out.push(<hr key={k++} style={{ border:"none", borderTop:"1px solid var(--border)", margin:"10px 0" }}/>); i++; continue; }

    // Citation
    if (l.startsWith("> ")) { out.push(<blockquote key={k++} style={{ borderLeft:"3px solid var(--gold3)", padding:"6px 12px", margin:"8px 0", color:"var(--dim)", fontStyle:"italic" }}><MdInline text={l.slice(2)}/></blockquote>); i++; continue; }

    // Titres
    if (l.startsWith("### ")) { out.push(<h4 key={k++} style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:"var(--gold)", margin:"12px 0 4px", letterSpacing:1 }}><MdInline text={l.slice(4)}/></h4>); i++; continue; }
    if (l.startsWith("## ")) { out.push(<h3 key={k++} style={{ fontFamily:"'Cinzel',serif", fontSize:13, color:"var(--gold)", margin:"14px 0 6px", letterSpacing:1 }}><MdInline text={l.slice(3)}/></h3>); i++; continue; }
    if (l.startsWith("# ")) { out.push(<h3 key={k++} style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:"var(--gold2)", margin:"14px 0 6px", letterSpacing:1.5 }}><MdInline text={l.slice(2)}/></h3>); i++; continue; }

    // Liste non ordonnée
    if (/^[-*•] /.test(l)) {
      const items = [];
      while (i < lines.length && /^[-*•] /.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom:3 }}><MdInline text={lines[i].slice(2)}/></li>);
        i++;
      }
      out.push(<ul key={k++} style={{ paddingLeft:18, margin:"4px 0" }}>{items}</ul>);
      continue;
    }

    // Liste ordonnée
    if (/^\d+\. /.test(l)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom:3 }}><MdInline text={lines[i].replace(/^\d+\. /,"")}/></li>);
        i++;
      }
      out.push(<ol key={k++} style={{ paddingLeft:18, margin:"4px 0" }}>{items}</ol>);
      continue;
    }

    // Ligne vide
    if (!l.trim()) { out.push(<div key={k++} style={{ height:6 }}/>); i++; continue; }

    // Paragraphe
    out.push(<p key={k++} style={{ margin:"3px 0", lineHeight:1.65 }}><MdInline text={l}/></p>);
    i++;
  }

  return <>{out}</>;
}

function MdInline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*/.test(p) || /^__/.test(p)) return <strong key={i} style={{ color:"var(--gold2,#E8CC7A)", fontWeight:700 }}>{p.slice(2,-2)}</strong>;
        if (/^`/.test(p)) return <code key={i} style={{ background:"rgba(201,168,76,.1)", border:"1px solid rgba(201,168,76,.15)", borderRadius:3, padding:"1px 5px", fontFamily:"'Courier New',monospace", fontSize:11, color:"var(--gold2,#E8CC7A)" }}>{p.slice(1,-1)}</code>;
        if (/^\*/.test(p) || /^_/.test(p)) return <em key={i} style={{ color:"var(--dim)", fontStyle:"italic" }}>{p.slice(1,-1)}</em>;
        return p;
      })}
    </>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
.ai-wrap { display:flex; flex-direction:column; height:calc(100vh - 120px); min-height:520px; }
.ai-hdr { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; background:var(--panel); border:1px solid var(--border); border-bottom:2px solid var(--gold3); border-radius:var(--r2,8px) var(--r2,8px) 0 0; flex-shrink:0; }
.ai-hdr-left { display:flex; align-items:center; gap:10px; }
.ai-av-hdr { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#7A6330,#C9A84C); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; box-shadow:0 0 12px rgba(201,168,76,.25); }
.ai-htitle { font-family:'Cinzel',serif; font-size:13px; color:var(--gold); letter-spacing:1.5px; }
.ai-hsub { font-size:9px; color:var(--dim); margin-top:1px; }
.ai-badge { font-size:9px; color:var(--dim); background:var(--panel2); border:1px solid var(--border); padding:2px 8px; border-radius:10px; letter-spacing:.5px; }
.ai-badge.streaming { border-color:var(--gold3); color:var(--gold3); animation:badgePulse 1s ease infinite; }
@keyframes badgePulse { 0%,100%{opacity:.6} 50%{opacity:1} }

.ai-msgs { flex:1; overflow-y:auto; padding:18px; display:flex; flex-direction:column; gap:14px; background:var(--bg); border-left:1px solid var(--border); border-right:1px solid var(--border); }
.ai-msgs::-webkit-scrollbar { width:4px; }
.ai-msgs::-webkit-scrollbar-thumb { background:var(--gold3); border-radius:2px; }

.ai-msg { display:flex; gap:10px; animation:msgIn .2s ease; }
.ai-msg.user { flex-direction:row-reverse; }
@keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
.ai-av { width:30px; height:30px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:14px; margin-top:2px; }
.ai-av.bot { background:linear-gradient(135deg,#7A6330,#C9A84C); }
.ai-av.user { background:rgba(201,168,76,.12); border:1px solid var(--gold3); }

.ai-body { display:flex; flex-direction:column; gap:4px; max-width:calc(100% - 44px); }
.ai-msg.user .ai-body { align-items:flex-end; }
.ai-bubble { padding:11px 15px; border-radius:14px; font-size:12.5px; line-height:1.65; }
.ai-bubble.bot { background:var(--panel); border:1px solid var(--border); border-bottom-left-radius:4px; color:var(--text,#e8e8e8); }
.ai-bubble.user { background:linear-gradient(135deg,rgba(122,99,48,.4),rgba(201,168,76,.2)); border:1px solid var(--gold3); border-bottom-right-radius:4px; color:var(--gold2,#E8CC7A); }
.ai-bubble.streaming-bubble { border-color:var(--gold3); }

.ai-cursor { display:inline-block; width:2px; height:14px; background:var(--gold); border-radius:1px; margin-left:2px; vertical-align:middle; animation:blink .7s step-end infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

.ai-meta { display:flex; gap:8px; align-items:center; font-size:9px; color:var(--dim); padding:0 4px; }
.ai-msg.user .ai-meta { justify-content:flex-end; }
.ai-copy { background:transparent; border:none; color:var(--dim); cursor:pointer; font-size:11px; padding:2px 6px; border-radius:4px; transition:all .15s; }
.ai-copy:hover { background:rgba(201,168,76,.1); color:var(--gold); }

.ai-typing { display:flex; align-items:center; gap:5px; padding:10px 14px; }
.ai-dot { width:6px; height:6px; border-radius:50%; background:var(--gold3); animation:dp 1.2s ease infinite; }
.ai-dot:nth-child(2){animation-delay:.2s} .ai-dot:nth-child(3){animation-delay:.4s}
@keyframes dp { 0%,80%,100%{opacity:.3;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }

.ai-suggs { padding:10px 18px; background:var(--bg); border-left:1px solid var(--border); border-right:1px solid var(--border); }
.ai-sugg-lbl { font-size:9px; color:var(--dim); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px; }
.ai-sugg-row { display:flex; gap:6px; flex-wrap:wrap; }
.ai-sugg { padding:5px 12px; background:transparent; border:1px solid var(--border); border-radius:16px; font-size:10px; color:var(--dim); cursor:pointer; transition:all .15s; }
.ai-sugg:hover { border-color:var(--gold); color:var(--gold); background:rgba(201,168,76,.06); }

.ai-foot { padding:12px 18px; background:var(--panel); border:1px solid var(--border); border-top:1px solid var(--gold3); border-radius:0 0 var(--r2,8px) var(--r2,8px); flex-shrink:0; }
.ai-input-row { display:flex; gap:10px; align-items:flex-end; }
.ai-ta { flex:1; background:var(--panel2); border:1px solid var(--border); border-radius:10px; padding:10px 14px; color:var(--text,#e8e8e8); font-size:12.5px; font-family:'Montserrat',sans-serif; resize:none; outline:none; min-height:44px; max-height:140px; line-height:1.5; transition:border-color .2s; }
.ai-ta:focus { border-color:var(--gold3); }
.ai-ta::placeholder { color:var(--dim); }
.ai-send { width:44px; height:44px; border-radius:10px; background:linear-gradient(135deg,#7A6330,#C9A84C); border:none; color:#0A0A0A; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; flex-shrink:0; font-weight:700; }
.ai-send:hover:not(:disabled) { transform:scale(1.07); box-shadow:0 0 16px rgba(201,168,76,.4); }
.ai-send:disabled { opacity:.35; cursor:not-allowed; transform:none; }
.ai-foot-info { display:flex; justify-content:space-between; margin-top:8px; font-size:9px; color:var(--dim); }
.ai-toks { display:flex; gap:12px; }

.ai-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; gap:10px; opacity:.55; }
.ai-empty-glyph { font-family:'Cinzel',serif; font-size:44px; color:var(--gold3); }
.ai-empty-title { font-family:'Cinzel',serif; font-size:14px; color:var(--gold); letter-spacing:2px; }
.ai-empty-sub { font-size:11px; color:var(--dim); text-align:center; max-width:360px; line-height:1.65; }

.ai-err { background:rgba(201,76,76,.08); border:1px solid rgba(201,76,76,.25); border-radius:10px; padding:10px 14px; font-size:11px; color:var(--err,#C94C4C); display:flex; gap:8px; }
.ai-key-warn { background:rgba(232,169,76,.07); border:1px solid rgba(232,169,76,.25); border-radius:10px; padding:12px 16px; font-size:11px; color:var(--gold); display:flex; gap:10px; align-items:flex-start; }
`;

// ── Composant principal ───────────────────────────────────────────────────────
export default function AssistantIA({ plan, lang = "fr" }) {
  const isPro = plan !== "free";

  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [streaming, setStreaming]   = useState(false);  // en cours de génération
  const [streamText, setStreamText] = useState("");     // texte en cours de stream
  const [error, setError]           = useState(null);
  const [copied, setCopied]         = useState(null);
  const [totIn, setTotIn]           = useState(0);
  const [totOut, setTotOut]         = useState(0);
  const [showSugg, setShowSugg]     = useState(true);

  const bottomRef  = useRef(null);
  const taRef      = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const sendMessage = useCallback(async (override) => {
    const content = (override ?? input).trim();
    if (!content || streaming) return;

    setInput("");
    setError(null);
    setShowSugg(false);
    setStreamText("");

    const userMsg = { id: Date.now(), role: "user", content, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    // Historique (max HISTORY_LIMIT messages)
    const history = [...messages, userMsg]
      .slice(-HISTORY_LIMIT)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: PHG_IA_SYSTEM,
          messages: history,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Erreur ${res.status}`);
      }

      // Lecture SSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let inToks = 0, outToks = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // garder la ligne incomplète

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;

          try {
            const evt = JSON.parse(raw);

            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              fullText += evt.delta.text;
              setStreamText(fullText);
            }

            if (evt.type === "message_delta" && evt.usage) {
              outToks = evt.usage.output_tokens || 0;
            }

            if (evt.type === "message_start" && evt.message?.usage) {
              inToks = evt.message.usage.input_tokens || 0;
            }
          } catch { /* JSON partiel, on ignore */ }
        }
      }

      // Finalisation : on transforme le stream en message persistant
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: "assistant",
        content: fullText,
        ts: new Date(),
        inToks,
        outToks,
      }]);
      setTotIn(p => p + inToks);
      setTotOut(p => p + outToks);
      setStreamText("");

    } catch (err) {
      setError(err.message || "Erreur inconnue.");
      setStreamText("");
    } finally {
      setStreaming(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }, [input, streaming, messages]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const copy = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  const clear = () => {
    setMessages([]); setTotIn(0); setTotOut(0);
    setError(null); setStreamText(""); setShowSugg(true);
  };

  const fmt = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const noKey = !ANTHROPIC_KEY || ANTHROPIC_KEY === "sk-ant-VOTRE_CLE_ICI";

  // ── Lock (plan free) ──────────────────────────────────────────────────────
  if (!isPro) {
    return (
      <div className="lock-overlay" style={{ marginTop: 20 }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>🤖</div>
        <div className="lock-title">Assistant PHG IA — Plan PRO</div>
        <div className="lock-sub">
          Expert IA spécialisé construction, disponible 24h/24.<br />
          Calculs béton, ferraillage, devis, normes DTU, gestion de chantier.
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {["Calcul béton armé","Estimation FCFA","Normes DTU","Planning chantier","Dosage mortier"].map(s => (
            <span key={s} style={{ padding:"4px 12px", border:"1px solid var(--border)", borderRadius:16, fontSize:10, color:"var(--dim)" }}>{s}</span>
          ))}
        </div>
      </div>
    );
  }

  // ── Chat UI ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="ai-wrap">

        {/* Header */}
        <div className="ai-hdr">
          <div className="ai-hdr-left">
            <div className="ai-av-hdr">🤖</div>
            <div>
              <div className="ai-htitle">ASSISTANT PHG IA</div>
              <div className="ai-hsub">Expert construction · BTP · Génie civil · Propulsé par Claude</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`ai-badge${streaming ? " streaming" : ""}`}>
              {streaming ? "⚡ Génération…" : MODEL}
            </span>
            {messages.length > 0 && (
              <button className="btn btn-out btn-sm" onClick={clear} style={{ fontSize: 10, padding: "4px 10px" }}>✕ Effacer</button>
            )}
          </div>
        </div>

        {/* Avertissement clé manquante */}
        {noKey && (
          <div className="ai-key-warn" style={{ margin: "0 0 0 0", borderRadius: 0, borderLeft: "1px solid rgba(232,169,76,.25)", borderRight: "1px solid rgba(232,169,76,.25)", borderTop: "none" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>Clé API manquante</div>
              Éditez <code style={{ background: "rgba(0,0,0,.3)", padding: "1px 5px", borderRadius: 3 }}>frontend/.env</code> et renseignez votre clé Anthropic dans{" "}
              <code style={{ background: "rgba(0,0,0,.3)", padding: "1px 5px", borderRadius: 3 }}>VITE_ANTHROPIC_API_KEY</code>, puis relancez le serveur Vite.
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="ai-msgs">
          {messages.length === 0 && !streaming && (
            <div className="ai-empty">
              <div className="ai-empty-glyph">𓂀</div>
              <div className="ai-empty-title">PHG BUILD IA</div>
              <div className="ai-empty-sub">
                Posez vos questions techniques en construction.<br />
                Calculs, devis, matériaux, normes, gestion de chantier.
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`ai-msg ${msg.role}`}>
              <div className={`ai-av ${msg.role === "assistant" ? "bot" : "user"}`}>
                {msg.role === "assistant" ? "🤖" : "👤"}
              </div>
              <div className="ai-body">
                <div className={`ai-bubble ${msg.role === "assistant" ? "bot" : "user"}`}>
                  {msg.role === "assistant"
                    ? <MdBlock text={msg.content} />
                    : msg.content}
                </div>
                <div className="ai-meta">
                  <span>{fmt(msg.ts)}</span>
                  {msg.outToks > 0 && <span style={{ opacity: .6 }}>{msg.outToks} tokens</span>}
                  {msg.role === "assistant" && (
                    <button className="ai-copy" onClick={() => copy(msg.id, msg.content)}>
                      {copied === msg.id ? "✓ Copié" : "⎘ Copier"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Bulle de streaming en temps réel */}
          {streaming && (
            <div className="ai-msg">
              <div className="ai-av bot">🤖</div>
              <div className="ai-body">
                <div className="ai-bubble bot streaming-bubble">
                  {streamText
                    ? <><MdBlock text={streamText} /><span className="ai-cursor" /></>
                    : <div className="ai-typing">
                        <div className="ai-dot"/><div className="ai-dot"/><div className="ai-dot"/>
                        <span style={{ fontSize:10, color:"var(--dim)", marginLeft:4 }}>PHG IA réfléchit…</span>
                      </div>
                  }
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="ai-err">
              <span style={{ flexShrink: 0 }}>⚠</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>Erreur</div>
                {error}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {showSugg && messages.length === 0 && (
          <div className="ai-suggs">
            <div className="ai-sugg-lbl">Questions fréquentes</div>
            <div className="ai-sugg-row">
              {SUGGESTIONS.slice(0, 5).map((s, i) => (
                <button key={i} className="ai-sugg" onClick={() => sendMessage(s)}>
                  {s.length > 50 ? s.slice(0, 50) + "…" : s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Zone de saisie */}
        <div className="ai-foot">
          <div className="ai-input-row">
            <textarea
              ref={taRef}
              className="ai-ta"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
              onKeyDown={handleKey}
              placeholder="Posez votre question technique… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
              rows={1}
              disabled={streaming || noKey}
            />
            <button
              className="ai-send"
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming || noKey}
              title="Envoyer (Entrée)"
            >↑</button>
          </div>
          <div className="ai-foot-info">
            <div className="ai-toks">
              <span>↑ {totIn.toLocaleString()} tokens envoyés</span>
              <span>↓ {totOut.toLocaleString()} tokens reçus</span>
              {totIn + totOut > 0 && (
                <span style={{ color: "var(--gold3)" }}>
                  ≈ {(((totIn * 3 + totOut * 15) / 1_000_000)).toFixed(4)} $
                </span>
              )}
            </div>
            <span style={{ opacity: .5 }}>Maj+Entrée = saut de ligne</span>
          </div>
        </div>

      </div>
    </>
  );
}
