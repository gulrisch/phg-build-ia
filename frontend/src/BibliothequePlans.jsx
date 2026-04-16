import { useState } from "react";

const css = `
.plans-filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.filter-chip { padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid #333; color: #808078; transition: all .2s; white-space: nowrap; }
.filter-chip.active { background: rgba(201,168,76,.15); border-color: #C9A84C; color: #C9A84C; }
.plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.plan-thumb { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; cursor: pointer; transition: all .25s; position: relative; }
.plan-thumb:hover { transform: translateY(-3px); border-color: var(--gold); box-shadow: 0 8px 32px rgba(201,168,76,.12); }
.plan-thumb-img { aspect-ratio: 4/3; background: #0d0d08; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.plan-thumb-body { padding: 12px; }
.plan-thumb-type { font-size: 9px; color: var(--gold3); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 3px; }
.plan-thumb-name { font-family: 'Cinzel', serif; font-size: 13px; color: var(--gold); margin-bottom: 4px; }
.plan-thumb-meta { display: flex; gap: 8px; flex-wrap: wrap; }
.plan-tag { background: rgba(201,168,76,.08); border: 1px solid rgba(201,168,76,.2); border-radius: 10px; padding: 2px 8px; font-size: 9px; color: var(--dim); }
.plan-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.88); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; }
.plan-modal { background: var(--panel); border: 1px solid var(--gold3); border-radius: 14px; width: 900px; max-width: 96vw; max-height: 90vh; overflow-y: auto; }
.plan-modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; justify-content: space-between; }
.plan-modal-body { padding: 20px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.plan-badge-type { background: rgba(201,168,76,.12); color: var(--gold); padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 1px; display: inline-block; margin-top: 5px; }
.feature-list { list-style: none; }
.feature-list li { padding: 5px 0; font-size: 12px; display: flex; gap: 8px; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,.04); }
.feature-list li:last-child { border: none; }
.cost-range { font-family: 'Cinzel', serif; font-size: 24px; color: var(--gold); }
.custom-section { background: var(--panel2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-top: 16px; }
`;

// ── 50 plans : 10 types × 5 surfaces ──────────────────────────────────────────
const TYPES = [
  { id: "villa_tropicale", label: "Villa Tropicale", icon: "🌴", color: "#2a3a1a" },
  { id: "maison_sahelienne", label: "Maison Sahélienne", icon: "☀️", color: "#3a2a1a" },
  { id: "immeuble_r2", label: "Immeuble R+2", icon: "🏢", color: "#1a2a3a" },
  { id: "duplex", label: "Duplex", icon: "🏘️", color: "#2a1a3a" },
  { id: "studio", label: "Studio", icon: "🏠", color: "#1a3a3a" },
  { id: "contemporaine", label: "Maison Contemporaine", icon: "⬜", color: "#3a3a1a" },
  { id: "villa_balneaire", label: "Villa Balnéaire", icon: "🌊", color: "#1a2a4a" },
  { id: "maison_bande", label: "Maison en Bande", icon: "🏙️", color: "#3a1a2a" },
  { id: "commerce_logement", label: "Commerce + Logement", icon: "🏪", color: "#2a3a2a" },
  { id: "residence_securisee", label: "Résidence Sécurisée", icon: "🔐", color: "#2a2a3a" },
];

const SURFACES = [40, 80, 120, 180, 250];

const TYPE_DETAILS = {
  villa_tropicale: {
    desc: "Architecture adaptée aux zones tropicales humides. Grandes ouvertures, ventilation naturelle, toiture débordante, matériaux résistants à l'humidité.",
    regions: ["Côte d'Ivoire", "Cameroun", "Gabon", "Congo"],
    features: ["Toiture à fort débord (1.5m)", "Ventilation traversante", "Véranda périphérique", "Fondations sur pilotis option", "Paroi anti-moustique intégrée"],
    materials: ["Bois dur local", "Tôle ondulée galvanisée", "Béton armé tropical", "Enduit chaux"],
  },
  maison_sahelienne: {
    desc: "Conception optimisée pour les zones semi-arides et sahéliennes. Murs épais, petites ouvertures, orientation Nord-Sud pour minimiser l'apport solaire.",
    regions: ["Sénégal", "Mali", "Burkina Faso", "Niger"],
    features: ["Murs épais 35cm (inertie thermique)", "Toiture terrasse végétalisée option", "Patio central ombragé", "Citernes récupération eau de pluie", "Enduit banco ou pisé"],
    materials: ["Parpaing béton", "Pisé compacté", "Tôle pré-peinte", "Gravier local"],
  },
  immeuble_r2: {
    desc: "Immeuble résidentiel R+2 avec appartements par étage. Optimisé pour la rentabilité locative dans les zones urbaines africaines.",
    regions: ["Toutes grandes villes africaines"],
    features: ["3 appartements de 2/3 pièces", "Cage d'escalier centrale", "Balcons privatifs", "Compteurs individuels eau/élec", "Parking en sous-sol option"],
    materials: ["Béton armé", "Briques cuites", "Menuiseries aluminium", "Carrelage gré cérame"],
  },
  duplex: {
    desc: "Maison sur deux niveaux reliés par un escalier intérieur. Idéal pour séparer espace de vie et chambres, ou logement multigénérationnel.",
    regions: ["Universel"],
    features: ["RDC : séjour + cuisine + bureau", "Étage : 3 chambres + 2 SDB", "Escalier en colimaçon option", "Double entrée possible", "Terrasse sur toit accessible"],
    materials: ["Béton armé", "Parpaing", "Aluminium", "Carrelage"],
  },
  studio: {
    desc: "Logement compact optimisé pour une personne ou un couple. Espace multifonctionnel avec rangements intégrés. Idéal pour investissement locatif.",
    regions: ["Zones urbaines"],
    features: ["Espace salon/chambre combiné", "Cuisine ouverte équipée", "Salle d'eau complète", "Rangements encastrés", "Luminosité maximisée"],
    materials: ["Parpaing", "Carrelage", "PVC fenêtres", "Peinture lavable"],
  },
  contemporaine: {
    desc: "Architecture moderne avec lignes épurées, toiture plate, grandes baies vitrées. Allie esthétique internationale et confort tropical.",
    regions: ["Maroc", "Tunisie", "Côte d'Ivoire (zones huppées)"],
    features: ["Façade béton ciré", "Toiture terrasse accessible", "Baies coulissantes XXL", "Piscine intégrée option", "Domotique prête"],
    materials: ["Béton ciré", "Verre sécurit", "Aluminium anodisé", "Pierre naturelle"],
  },
  villa_balneaire: {
    desc: "Villa conçue pour les zones côtières. Résistance au sel marin, vue mer optimisée, terrasses multiples, accès direct plage.",
    regions: ["Côte d'Ivoire (Grand-Bassam)", "Sénégal (Saly)", "Maroc (Asilah)"],
    features: ["Matériaux anti-corrosion", "Piscine à débordement option", "Véranda panoramique", "Douche extérieure", "Pergola solaire"],
    materials: ["Inox 316L", "Bois traité sel", "Béton hydrofuge", "Pierre reconstituée"],
  },
  maison_bande: {
    desc: "Maison mitoyenne en bande (townhouse). Optimisée pour les terrains étroits en milieu urbain. Développement en hauteur.",
    regions: ["Dakar", "Abidjan Cocody", "Douala"],
    features: ["Façade < 6m", "3 niveaux max", "Toit terrasse habitable", "Jardin arrière privatif", "Garage intégré"],
    materials: ["Béton armé", "Briques", "Aluminium", "Pierre locale"],
  },
  commerce_logement: {
    desc: "Rez-de-chaussée commercial (boutique, bureau, restaurant) avec logement(s) aux étages supérieurs. Rentabilité double.",
    regions: ["Centres-villes africains"],
    features: ["RDC : 80m² commercial dégageable", "R+1/R+2 : appartements F3", "Vitrine commerciale large", "Accès séparés commerce/logement", "Stockage en sous-sol option"],
    materials: ["Béton armé", "Verre façade", "Carrelage anti-glisse RDC", "Peinture lavable"],
  },
  residence_securisee: {
    desc: "Ensemble résidentiel sécurisé avec gardiennage, clôture, et équipements communs. Pour promoteurs ou communautés.",
    regions: ["Abidjan", "Dakar", "Casablanca", "Douala"],
    features: ["Clôture 2.5m + portail automatique", "Guérite gardien", "Parking commun 20 places", "Groupe électrogène", "Fosse septique commune"],
    materials: ["Béton armé", "Fer forgé clôture", "Briques", "Pavé béton parking"],
  },
};

const SURFACE_ROOMS = {
  40: { rooms: "Studio ou T2", chambres: 1, sdb: 1, salon: true },
  80: { rooms: "T3", chambres: 2, sdb: 1, salon: true },
  120: { rooms: "T4", chambres: 3, sdb: 2, salon: true },
  180: { rooms: "T5", chambres: 4, sdb: 2, salon: true },
  250: { rooms: "T6+", chambres: 5, sdb: 3, salon: true },
};

const COST_RANGE = {
  40: ["2 500 000", "15 000 000"],
  80: ["5 000 000", "30 000 000"],
  120: ["7 500 000", "50 000 000"],
  180: ["12 000 000", "80 000 000"],
  250: ["18 000 000", "130 000 000"],
};

// Générer les 50 plans
const ALL_PLANS = TYPES.flatMap(type =>
  SURFACES.map(surface => ({
    id: `${type.id}_${surface}`,
    typeId: type.id,
    typeName: type.label,
    icon: type.icon,
    color: type.color,
    surface,
    name: `${type.label} ${surface}m²`,
    rooms: SURFACE_ROOMS[surface],
    costRange: COST_RANGE[surface],
    details: TYPE_DETAILS[type.id],
  }))
);

function MiniPlanSVG({ color, icon, surface }) {
  return (
    <svg viewBox="0 0 120 90" style={{ width: "100%", height: "100%" }}>
      <rect width="120" height="90" fill="#060606" />
      {/* Outline bâtiment */}
      <rect x="10" y="10" width="100" height="70" fill={color} stroke="#C9A84C" strokeWidth="1.5" opacity="0.8" />
      {/* Divisions internes */}
      <line x1="10" y1="45" x2="110" y2="45" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
      <line x1="60" y1="10" x2="60" y2="70" stroke="#C9A84C" strokeWidth="0.5" opacity="0.4" />
      {surface >= 120 && <line x1="35" y1="10" x2="35" y2="45" stroke="#C9A84C" strokeWidth="0.5" opacity="0.3" />}
      {surface >= 180 && <line x1="85" y1="45" x2="85" y2="80" stroke="#C9A84C" strokeWidth="0.5" opacity="0.3" />}
      {/* Surface label */}
      <text x="60" y="46" textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#C9A84C" fontFamily="Montserrat,sans-serif" fontWeight="600">{surface}m²</text>
      {/* Icone en haut à gauche */}
      <text x="20" y="30" textAnchor="middle" dominantBaseline="middle" fontSize="16">{icon}</text>
      {/* Cotes */}
      <line x1="10" y1="5" x2="110" y2="5" stroke="#7A6330" strokeWidth="0.7" />
      <line x1="115" y1="10" x2="115" y2="70" stroke="#7A6330" strokeWidth="0.7" />
    </svg>
  );
}

export default function BibliothequePlans({ setPage }) {
  const [filterType, setFilterType] = useState("all");
  const [filterSurface, setFilterSurface] = useState("all");
  const [selected, setSelected] = useState(null);
  const [customSurface, setCustomSurface] = useState("");
  const [customName, setCustomName] = useState("");

  const filtered = ALL_PLANS.filter(p => {
    if (filterType !== "all" && p.typeId !== filterType) return false;
    if (filterSurface !== "all" && p.surface !== parseInt(filterSurface)) return false;
    return true;
  });

  const openPlan = (plan) => {
    setSelected(plan);
    setCustomSurface(plan.surface);
    setCustomName(plan.name);
  };

  return (
    <>
      <style>{css}</style>

      {/* Modal */}
      {selected && (
        <div className="plan-modal-overlay" onClick={e => e.target.className === "plan-modal-overlay" && setSelected(null)}>
          <div className="plan-modal">
            <div className="plan-modal-header">
              <div>
                <div style={{ fontSize: 10, color: "var(--dim)", letterSpacing: 2, textTransform: "uppercase" }}>Plan prêt à l'emploi</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 20, color: "var(--gold)", marginTop: 4 }}>
                  {selected.icon} {selected.name}
                </div>
                <span className="plan-badge-type">{selected.typeName}</span>
                <span className="plan-badge-type" style={{ marginLeft: 6 }}>{selected.surface} m²</span>
              </div>
              <button className="btn btn-out btn-sm" onClick={() => setSelected(null)}>✕ Fermer</button>
            </div>

            <div className="plan-modal-body">
              <div>
                <div style={{ background: "#060606", borderRadius: 8, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, overflow: "hidden" }}>
                  <MiniPlanSVG color={selected.color} icon={selected.icon} surface={selected.surface} />
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.8, marginBottom: 14 }}>
                  {selected.details.desc}
                </div>
                <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Zones recommandées</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                  {selected.details.regions.map(r => (
                    <span key={r} style={{ background: "rgba(201,168,76,.07)", border: "1px solid rgba(201,168,76,.2)", borderRadius: 10, padding: "2px 9px", fontSize: 10, color: "var(--dim)" }}>{r}</span>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Matériaux typiques</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {selected.details.materials.map(m => (
                    <span key={m} style={{ background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 10, padding: "2px 9px", fontSize: 10, color: "var(--dim)" }}>{m}</span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Caractéristiques</div>
                <ul className="feature-list" style={{ marginBottom: 16 }}>
                  {selected.details.features.map(f => (
                    <li key={f}><span style={{ color: "var(--ok)", fontSize: 12 }}>✓</span><span>{f}</span></li>
                  ))}
                </ul>

                <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Composition (plan {selected.surface}m²)</div>
                <div style={{ background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  {[
                    ["Surface", `${selected.surface} m²`],
                    ["Configuration", selected.rooms.rooms],
                    ["Chambres", selected.rooms.chambres],
                    ["Salle(s) de bain", selected.rooms.sdb],
                    ["Salon/Séjour", "Inclus"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: 11 }}>
                      <span style={{ color: "var(--dim)" }}>{k}</span>
                      <span style={{ color: "var(--gold)", fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Fourchette de coût estimé (FCFA)</div>
                <div className="cost-range" style={{ marginBottom: 4 }}>
                  {selected.costRange[0]} — {selected.costRange[1]}
                </div>
                <div style={{ fontSize: 10, color: "var(--dim)", marginBottom: 16 }}>
                  Variable selon pays, qualité et finitions
                </div>

                <div className="custom-section">
                  <div style={{ fontSize: 10, color: "var(--gold)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Personnaliser ce plan</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>Nom du projet</label>
                      <input value={customName} onChange={e => setCustomName(e.target.value)}
                        style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", padding: "7px 10px", fontSize: 12, width: "100%", marginTop: 4 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>Surface souhaitée (m²)</label>
                      <input type="number" value={customSurface} onChange={e => setCustomSurface(+e.target.value)} min="20" max="500"
                        style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", padding: "7px 10px", fontSize: 12, width: "100%", marginTop: 4 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="btn btn-gold" style={{ flex: 1, fontSize: 11 }}
                      onClick={() => { setSelected(null); if (setPage) setPage("maison"); }}>
                      Utiliser pour estimer
                    </button>
                    <button className="btn btn-out" style={{ flex: 1, fontSize: 11 }}
                      onClick={() => { setSelected(null); if (setPage) setPage("export_dxf"); }}>
                      Exporter en DXF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>Type de bâtiment</div>
        <div className="plans-filters">
          <div className={`filter-chip${filterType === "all" ? " active" : ""}`} onClick={() => setFilterType("all")}>
            Tous les types
          </div>
          {TYPES.map(t => (
            <div key={t.id} className={`filter-chip${filterType === t.id ? " active" : ""}`} onClick={() => setFilterType(t.id)}>
              {t.icon} {t.label}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10, marginTop: 14 }}>Surface</div>
        <div className="plans-filters">
          <div className={`filter-chip${filterSurface === "all" ? " active" : ""}`} onClick={() => setFilterSurface("all")}>
            Toutes surfaces
          </div>
          {SURFACES.map(s => (
            <div key={s} className={`filter-chip${filterSurface === String(s) ? " active" : ""}`} onClick={() => setFilterSurface(String(s))}>
              {s} m²
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 10 }}>
          {filtered.length} plan{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}
          {filterType !== "all" || filterSurface !== "all" ? ` (filtré${filtered.length > 1 ? "s" : ""})` : " sur 50"}
        </div>
      </div>

      {/* Grille des plans */}
      <div className="plans-grid">
        {filtered.map(plan => (
          <div key={plan.id} className="plan-thumb" onClick={() => openPlan(plan)}>
            <div className="plan-thumb-img">
              <MiniPlanSVG color={plan.color} icon={plan.icon} surface={plan.surface} />
            </div>
            <div className="plan-thumb-body">
              <div className="plan-thumb-type">{plan.typeName}</div>
              <div className="plan-thumb-name">{plan.icon} {plan.surface}m²</div>
              <div className="plan-thumb-meta">
                <span className="plan-tag">{plan.rooms.rooms}</span>
                <span className="plan-tag">{plan.rooms.chambres} ch.</span>
                <span className="plan-tag">{plan.rooms.sdb} SDB</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: "var(--dim)" }}>
                {plan.costRange[0]} — {plan.costRange[1]} FCFA
              </div>
            </div>
            <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(201,168,76,.85)", color: "#0A0A0A", borderRadius: 10, padding: "2px 8px", fontSize: 9, fontWeight: 700 }}>
              PRÊT
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
