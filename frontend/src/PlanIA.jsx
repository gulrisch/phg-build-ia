import { useState, useRef } from "react";

const API_BASE = "https://phg-build-ia-production-9dc4.up.railway.app";

// Prix m² moyens par pays (construction neuve)
const PRIX_M2 = {
  "France": { construction: 1800, immobilier: 3200 },
  "Suisse": { construction: 3500, immobilier: 7000 },
  "Côte d'Ivoire": { construction: 450, immobilier: 800 },
  "Sénégal": { construction: 350, immobilier: 600 },
  "Cameroun": { construction: 400, immobilier: 700 },
  "Mali": { construction: 280, immobilier: 450 },
  "Burkina Faso": { construction: 260, immobilier: 420 },
  "Congo RDC": { construction: 300, immobilier: 500 },
  "Maroc": { construction: 600, immobilier: 1200 },
  "Algérie": { construction: 500, immobilier: 900 },
  "Tunisie": { construction: 550, immobilier: 1000 },
  "Ghana": { construction: 480, immobilier: 850 },
  "Nigeria": { construction: 400, immobilier: 750 },
  "Kenya": { construction: 520, immobilier: 950 },
  "Belgique": { construction: 1600, immobilier: 2800 },
  "Canada": { construction: 2000, immobilier: 4000 },
  "USA": { construction: 1900, immobilier: 3500 },
  "Gabon": { construction: 600, immobilier: 1100 },
  "Guinée": { construction: 320, immobilier: 550 },
  "Togo": { construction: 300, immobilier: 500 },
  "Bénin": { construction: 310, immobilier: 520 },
};

const PAYS_LIST = Object.keys(PRIX_M2).sort();

const s = {
  page: { background: "#0a0a0a", minHeight: "100vh", color: "#fff", fontFamily: "'Inter', sans-serif", padding: "2rem" },
  header: { borderBottom: "1px solid rgba(201,168,76,0.3)", paddingBottom: "1.5rem", marginBottom: "2rem" },
  title: { color: "#C9A84C", fontSize: "24px", fontWeight: "700", letterSpacing: "1px", margin: "0 0 4px", fontFamily: "'Cinzel', serif" },
  subtitle: { color: "#888", fontSize: "13px", margin: 0 },
  tabs: { display: "flex", gap: "8px", marginBottom: "2rem" },
  tab: (active) => ({
    padding: "10px 20px", borderRadius: "8px", border: `1px solid ${active ? "#C9A84C" : "rgba(201,168,76,0.2)"}`,
    background: active ? "rgba(201,168,76,0.15)" : "transparent", color: active ? "#C9A84C" : "#888",
    fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s",
  }),
  uploadZone: (drag) => ({
    background: drag ? "rgba(201,168,76,0.05)" : "#111",
    border: `2px dashed ${drag ? "#C9A84C" : "rgba(201,168,76,0.3)"}`,
    borderRadius: "12px", padding: "2.5rem", textAlign: "center", cursor: "pointer",
    transition: "all 0.2s", marginBottom: "1.5rem",
  }),
  uploadIcon: { fontSize: "40px", display: "block", marginBottom: "12px" },
  uploadLabel: { color: "#C9A84C", fontSize: "15px", fontWeight: "600", display: "block", marginBottom: "4px" },
  uploadHint: { color: "#555", fontSize: "12px" },
  preview: { width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "8px", border: "1px solid rgba(201,168,76,0.2)", marginBottom: "1rem" },
  formGroup: { marginBottom: "1.2rem" },
  label: { color: "#aaa", fontSize: "13px", display: "block", marginBottom: "6px" },
  input: { width: "100%", background: "#111", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px", boxSizing: "border-box" },
  select: { width: "100%", background: "#111", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px", boxSizing: "border-box" },
  textarea: { width: "100%", background: "#111", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px", minHeight: "80px", boxSizing: "border-box", resize: "vertical" },
  btn: { width: "100%", padding: "14px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "700", fontFamily: "'Cinzel', serif", letterSpacing: "1px", cursor: "pointer", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  spin: { width: "20px", height: "20px", border: "2px solid rgba(201,168,76,0.3)", borderTop: "2px solid #C9A84C", borderRadius: "50%", animation: "spin 1s linear infinite" },
  card: { background: "#111", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" },
  sectionTitle: { color: "#C9A84C", fontSize: "12px", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px", borderBottom: "1px solid rgba(201,168,76,0.2)", paddingBottom: "6px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1.2rem" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.2rem" },
  statCard: { background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "8px", padding: "12px", textAlign: "center" },
  statVal: { color: "#C9A84C", fontSize: "22px", fontWeight: "700", display: "block" },
  statLbl: { color: "#888", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" },
  modifItem: { background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderLeft: "3px solid #C9A84C", borderRadius: "6px", padding: "10px 14px", marginBottom: "8px", color: "#ccc", fontSize: "13px", lineHeight: "1.6" },
  valeurBlock: { background: "rgba(40,167,69,0.05)", border: "1px solid rgba(40,167,69,0.2)", borderRadius: "8px", padding: "1rem", textAlign: "center" },
  bigVal: { color: "#28a745", fontSize: "36px", fontWeight: "700", display: "block" },
  fileTag: { background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", color: "#C9A84C", marginTop: "10px", display: "inline-block" },
  error: { background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: "8px", padding: "12px 16px", color: "#ff6b6b", fontSize: "13px", marginBottom: "1rem" },
  btnSecondary: { display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "1px solid #C9A84C", color: "#C9A84C", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", cursor: "pointer", marginTop: "1rem" },
};

export default function PlanIA() {
  const [activeTab, setActiveTab] = useState("modifier");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();

  // Modifier
  const [instructions, setInstructions] = useState("");
  const [resultModif, setResultModif] = useState(null);

  // Estimer
  const [pays, setPays] = useState("France");
  const [ville, setVille] = useState("");
  const [typeBien, setTypeBien] = useState("maison");
  const [resultEstim, setResultEstim] = useState(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResultModif(null);
    setResultEstim(null);
    setError(null);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const fileToBase64 = (f) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  const analyserModification = async () => {
    if (!file) { setError("Veuillez uploader un plan."); return; }
    setLoading(true); setError(null); setResultModif(null);
    try {
      const b64 = await fileToBase64(file);
      const isImage = file.type.startsWith("image/");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              isImage ? {
                type: "image",
                source: { type: "base64", media_type: file.type, data: b64 }
              } : {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: b64 }
              },
              {
                type: "text",
                text: `Tu es un architecte expert. Analyse ce plan de construction.
Instructions de modification demandées : "${instructions || "Propose les meilleures modifications possibles pour optimiser l'espace et la valeur."}"

Réponds UNIQUEMENT en JSON sans markdown :
{
  "analyse_actuelle": {
    "surface_estimee": "XX m²",
    "nb_pieces": 0,
    "configuration": "description courte",
    "points_forts": [""],
    "points_faibles": [""]
  },
  "modifications_proposees": [
    {"titre": "", "description": "", "impact": "positif/neutre", "cout_estime": ""}
  ],
  "plan_modifie_description": "Description détaillée du plan après modifications",
  "gain_valeur_estime": "XX%"
}`
              }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = data.content[0].text.replace(/```json|```/g, "").trim();
      setResultModif(JSON.parse(text));
    } catch (err) {
      setError("Erreur d'analyse. Vérifiez le fichier et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const analyserValeur = async () => {
    if (!file) { setError("Veuillez uploader un plan."); return; }
    setLoading(true); setError(null); setResultEstim(null);
    try {
      const b64 = await fileToBase64(file);
      const isImage = file.type.startsWith("image/");
      const prixRef = PRIX_M2[pays] || { construction: 500, immobilier: 900 };
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              isImage ? {
                type: "image",
                source: { type: "base64", media_type: file.type, data: b64 }
              } : {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: b64 }
              },
              {
                type: "text",
                text: `Tu es un expert immobilier et économiste de la construction.
Analyse ce plan. Localisation : ${pays}${ville ? `, ${ville}` : ""}. Type : ${typeBien}.
Prix m² référence construction : ${prixRef.construction}€. Prix m² immobilier : ${prixRef.immobilier}€.

Réponds UNIQUEMENT en JSON sans markdown :
{
  "surface_totale": 0,
  "surface_habitable": 0,
  "nb_pieces": 0,
  "nb_chambres": 0,
  "nb_salles_bain": 0,
  "configuration": "description",
  "cout_construction": 0,
  "valeur_immobiliere": 0,
  "valeur_min": 0,
  "valeur_max": 0,
  "prix_m2_local": ${prixRef.immobilier},
  "facteurs_plus": [""],
  "facteurs_moins": [""],
  "recommandations_valorisation": [""],
  "niveau_finition_suggere": "standard/bon/premium"
}`
              }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = data.content[0].text.replace(/```json|```/g, "").trim();
      setResultEstim(JSON.parse(text));
    } catch (err) {
      setError("Erreur d'estimation. Vérifiez le fichier et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .res-section { animation: fadeIn 0.4s ease; }
        select option { background: #111; color: #fff; }
        input::placeholder { color: #555; }
        textarea::placeholder { color: #555; }
      `}</style>

      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px", color: "#C9A84C" }}>𓂀</span>
          <div>
            <h1 style={s.title}>Plan IA</h1>
            <p style={s.subtitle}>Modification intelligente · Estimation valeur réelle · Monde entier</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={s.tab(activeTab === "modifier")} onClick={() => setActiveTab("modifier")}>
          ✏️ Modifier le plan
        </button>
        <button style={s.tab(activeTab === "estimer")} onClick={() => setActiveTab("estimer")}>
          💰 Estimer la valeur
        </button>
      </div>

      {/* Upload */}
      <div
        style={s.uploadZone(drag)}
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
      >
        <span style={s.uploadIcon}>{file ? "📐" : "📁"}</span>
        <span style={s.uploadLabel}>{file ? file.name : "Uploader votre plan"}</span>
        <span style={s.uploadHint}>JPG · PNG · PDF — Glissez ou cliquez</span>
        {file && <div style={s.fileTag}>✓ {file.name} ({(file.size / 1024).toFixed(0)} Ko)</div>}
        <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {/* Preview image */}
      {preview && <img src={preview} alt="Aperçu plan" style={s.preview} />}

      {error && <div style={s.error}>⚠️ {error}</div>}

      {/* Tab: Modifier */}
      {activeTab === "modifier" && (
        <div>
          <div style={s.formGroup}>
            <label style={s.label}>Instructions de modification (optionnel)</label>
            <textarea
              style={s.textarea}
              placeholder="Ex: Agrandir le salon, ajouter une chambre, déplacer la cuisine, ouvrir sur terrasse..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
          <button
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}), marginBottom: "2rem" }}
            onClick={analyserModification}
            disabled={loading}
          >
            {loading ? <><div style={s.spin} /> Analyse en cours...</> : "✏️ Analyser et modifier"}
          </button>

          {resultModif && (
            <div className="res-section">
              {/* Analyse actuelle */}
              <div style={s.card}>
                <div style={s.sectionTitle}>📐 Analyse du plan actuel</div>
                <div style={s.grid3}>
                  <div style={s.statCard}>
                    <span style={s.statVal}>{resultModif.analyse_actuelle?.surface_estimee}</span>
                    <span style={s.statLbl}>Surface</span>
                  </div>
                  <div style={s.statCard}>
                    <span style={s.statVal}>{resultModif.analyse_actuelle?.nb_pieces}</span>
                    <span style={s.statLbl}>Pièces</span>
                  </div>
                  <div style={s.statCard}>
                    <span style={{ ...s.statVal, color: "#28a745" }}>+{resultModif.gain_valeur_estime}</span>
                    <span style={s.statLbl}>Gain valeur</span>
                  </div>
                </div>
                <p style={{ color: "#aaa", fontSize: "13px", margin: "0 0 12px" }}>{resultModif.analyse_actuelle?.configuration}</p>

                <div style={s.grid2}>
                  <div>
                    <div style={{ color: "#28a745", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>✓ Points forts</div>
                    {resultModif.analyse_actuelle?.points_forts?.map((p, i) => (
                      <div key={i} style={{ color: "#ccc", fontSize: "12px", padding: "3px 0" }}>• {p}</div>
                    ))}
                  </div>
                  <div>
                    <div style={{ color: "#dc3232", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>✗ Points faibles</div>
                    {resultModif.analyse_actuelle?.points_faibles?.map((p, i) => (
                      <div key={i} style={{ color: "#ccc", fontSize: "12px", padding: "3px 0" }}>• {p}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modifications proposées */}
              <div style={s.card}>
                <div style={s.sectionTitle}>🔧 Modifications proposées</div>
                {resultModif.modifications_proposees?.map((m, i) => (
                  <div key={i} style={s.modifItem}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#C9A84C", fontWeight: "600", fontSize: "13px" }}>{m.titre}</span>
                      <span style={{ color: "#888", fontSize: "12px" }}>{m.cout_estime}</span>
                    </div>
                    <div>{m.description}</div>
                  </div>
                ))}
              </div>

              {/* Plan modifié */}
              <div style={s.card}>
                <div style={s.sectionTitle}>📋 Plan après modifications</div>
                <p style={{ color: "#ccc", fontSize: "14px", lineHeight: "1.7", margin: 0 }}>
                  {resultModif.plan_modifie_description}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Estimer */}
      {activeTab === "estimer" && (
        <div>
          <div style={s.grid2}>
            <div style={s.formGroup}>
              <label style={s.label}>Pays</label>
              <select style={s.select} value={pays} onChange={(e) => setPays(e.target.value)}>
                {PAYS_LIST.map((p) => <option key={p} value={p}>{p}</option>)}
                <option value="Autre">Autre pays</option>
              </select>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Ville (optionnel)</label>
              <input style={s.input} placeholder="Ex: Abidjan, Paris, Dakar..." value={ville}
                onChange={(e) => setVille(e.target.value)} />
            </div>
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Type de bien</label>
            <select style={s.select} value={typeBien} onChange={(e) => setTypeBien(e.target.value)}>
              <option value="maison">Maison individuelle</option>
              <option value="villa">Villa</option>
              <option value="appartement">Appartement</option>
              <option value="duplex">Duplex</option>
              <option value="immeuble">Immeuble</option>
              <option value="local_commercial">Local commercial</option>
            </select>
          </div>

          {pays && PRIX_M2[pays] && (
            <div style={{ background: "rgba(201,168,76,0.07)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#888", marginBottom: "1.2rem" }}>
              📊 Référence {pays} — Construction : <span style={{ color: "#C9A84C" }}>{PRIX_M2[pays].construction}€/m²</span> · Immobilier : <span style={{ color: "#C9A84C" }}>{PRIX_M2[pays].immobilier}€/m²</span>
            </div>
          )}

          <button
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}), marginBottom: "2rem" }}
            onClick={analyserValeur}
            disabled={loading}
          >
            {loading ? <><div style={s.spin} /> Estimation en cours...</> : "💰 Estimer la valeur réelle"}
          </button>

          {resultEstim && (
            <div className="res-section">
              {/* Stats */}
              <div style={s.card}>
                <div style={s.sectionTitle}>📐 Caractéristiques du bien</div>
                <div style={s.grid3}>
                  <div style={s.statCard}>
                    <span style={s.statVal}>{resultEstim.surface_totale} m²</span>
                    <span style={s.statLbl}>Surface totale</span>
                  </div>
                  <div style={s.statCard}>
                    <span style={s.statVal}>{resultEstim.surface_habitable} m²</span>
                    <span style={s.statLbl}>Habitable</span>
                  </div>
                  <div style={s.statCard}>
                    <span style={s.statVal}>{resultEstim.nb_pieces}</span>
                    <span style={s.statLbl}>Pièces</span>
                  </div>
                  <div style={s.statCard}>
                    <span style={s.statVal}>{resultEstim.nb_chambres}</span>
                    <span style={s.statLbl}>Chambres</span>
                  </div>
                  <div style={s.statCard}>
                    <span style={s.statVal}>{resultEstim.nb_salles_bain}</span>
                    <span style={s.statLbl}>SDB</span>
                  </div>
                  <div style={s.statCard}>
                    <span style={s.statVal} style={{ fontSize: "14px", textTransform: "capitalize" }}>{resultEstim.niveau_finition_suggere}</span>
                    <span style={s.statLbl}>Finition</span>
                  </div>
                </div>
              </div>

              {/* Valeurs */}
              <div style={s.card}>
                <div style={s.sectionTitle}>💰 Estimation financière</div>
                <div style={s.grid2}>
                  <div style={s.valeurBlock}>
                    <span style={{ color: "#C9A84C", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>Coût de construction</span>
                    <span style={{ ...s.bigVal, color: "#C9A84C" }}>{Number(resultEstim.cout_construction).toLocaleString("fr-FR")}€</span>
                  </div>
                  <div style={s.valeurBlock}>
                    <span style={{ color: "#28a745", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" }}>Valeur immobilière</span>
                    <span style={s.bigVal}>{Number(resultEstim.valeur_immobiliere).toLocaleString("fr-FR")}€</span>
                  </div>
                </div>
                <div style={{ textAlign: "center", color: "#888", fontSize: "12px", marginTop: "12px" }}>
                  Fourchette : <span style={{ color: "#ccc" }}>{Number(resultEstim.valeur_min).toLocaleString("fr-FR")}€</span> — <span style={{ color: "#ccc" }}>{Number(resultEstim.valeur_max).toLocaleString("fr-FR")}€</span>
                </div>
              </div>

              {/* Facteurs */}
              <div style={s.card}>
                <div style={s.grid2}>
                  <div>
                    <div style={{ color: "#28a745", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>✓ Facteurs valorisants</div>
                    {resultEstim.facteurs_plus?.map((f, i) => (
                      <div key={i} style={{ color: "#ccc", fontSize: "12px", padding: "3px 0" }}>• {f}</div>
                    ))}
                  </div>
                  <div>
                    <div style={{ color: "#dc3232", fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>✗ Facteurs dépréciatifs</div>
                    {resultEstim.facteurs_moins?.map((f, i) => (
                      <div key={i} style={{ color: "#ccc", fontSize: "12px", padding: "3px 0" }}>• {f}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommandations valorisation */}
              <div style={s.card}>
                <div style={s.sectionTitle}>🚀 Recommandations pour augmenter la valeur</div>
                {resultEstim.recommandations_valorisation?.map((r, i) => (
                  <div key={i} style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderLeft: "3px solid #C9A84C", borderRadius: "6px", padding: "8px 14px", marginBottom: "6px", color: "#ccc", fontSize: "13px" }}>
                    ✦ {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
