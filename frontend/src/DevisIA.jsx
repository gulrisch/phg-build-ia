import { useState, useRef } from "react";

const API_BASE = "https://phg-build-ia-production-9dc4.up.railway.app";

const styles = {
  container: {
    background: "#0a0a0a",
    minHeight: "100vh",
    color: "#fff",
    fontFamily: "'Inter', sans-serif",
    padding: "2rem",
  },
  header: {
    borderBottom: "1px solid rgba(201,168,76,0.3)",
    paddingBottom: "1.5rem",
    marginBottom: "2rem",
  },
  title: {
    color: "#C9A84C",
    fontSize: "24px",
    fontWeight: "700",
    letterSpacing: "1px",
    margin: "0 0 4px",
    fontFamily: "'Cinzel', serif",
  },
  subtitle: {
    color: "#888",
    fontSize: "13px",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
    marginBottom: "1.5rem",
  },
  uploadCard: {
    background: "#111",
    border: "1px dashed rgba(201,168,76,0.3)",
    borderRadius: "12px",
    padding: "1.5rem",
    cursor: "pointer",
    transition: "border-color 0.2s",
    textAlign: "center",
  },
  uploadCardActive: {
    border: "1px dashed #C9A84C",
    background: "rgba(201,168,76,0.05)",
  },
  uploadIcon: {
    fontSize: "32px",
    marginBottom: "8px",
    display: "block",
  },
  uploadLabel: {
    color: "#C9A84C",
    fontSize: "14px",
    fontWeight: "600",
    display: "block",
    marginBottom: "4px",
  },
  uploadHint: {
    color: "#555",
    fontSize: "12px",
  },
  fileInput: {
    display: "none",
  },
  fileSelected: {
    marginTop: "10px",
    background: "rgba(201,168,76,0.1)",
    border: "1px solid rgba(201,168,76,0.3)",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    color: "#C9A84C",
    textAlign: "left",
  },
  btnPrimary: {
    width: "100%",
    padding: "14px",
    background: "#C9A84C",
    color: "#000",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "700",
    fontFamily: "'Cinzel', serif",
    letterSpacing: "1px",
    cursor: "pointer",
    textTransform: "uppercase",
    marginBottom: "2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  loader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#C9A84C",
    fontSize: "14px",
    margin: "1rem 0",
  },
  spin: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(201,168,76,0.3)",
    borderTop: "2px solid #C9A84C",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  resultatCard: {
    background: "#111",
    border: "1px solid rgba(201,168,76,0.3)",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  noteGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "1.5rem",
  },
  statCard: {
    background: "rgba(201,168,76,0.07)",
    border: "1px solid rgba(201,168,76,0.2)",
    borderRadius: "8px",
    padding: "12px",
    textAlign: "center",
  },
  statVal: {
    color: "#C9A84C",
    fontSize: "28px",
    fontWeight: "700",
    display: "block",
  },
  statLbl: {
    color: "#888",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  sectionTitle: {
    color: "#C9A84C",
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "2px",
    textTransform: "uppercase",
    marginBottom: "12px",
    marginTop: "1.5rem",
    borderBottom: "1px solid rgba(201,168,76,0.2)",
    paddingBottom: "6px",
  },
  alertItem: {
    background: "rgba(220,50,50,0.08)",
    border: "1px solid rgba(220,50,50,0.2)",
    borderLeft: "3px solid #dc3232",
    borderRadius: "6px",
    padding: "10px 14px",
    marginBottom: "8px",
  },
  alertPoste: {
    color: "#fff",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "2px",
  },
  alertRaison: {
    color: "#aaa",
    fontSize: "12px",
  },
  alertMontant: {
    color: "#dc3232",
    fontSize: "13px",
    fontWeight: "700",
    float: "right",
  },
  warningItem: {
    background: "rgba(201,168,76,0.07)",
    border: "1px solid rgba(201,168,76,0.2)",
    borderLeft: "3px solid #C9A84C",
    borderRadius: "6px",
    padding: "8px 14px",
    marginBottom: "6px",
    color: "#ccc",
    fontSize: "13px",
  },
  successItem: {
    background: "rgba(40,167,69,0.08)",
    border: "1px solid rgba(40,167,69,0.2)",
    borderLeft: "3px solid #28a745",
    borderRadius: "6px",
    padding: "8px 14px",
    marginBottom: "6px",
    color: "#ccc",
    fontSize: "13px",
  },
  conclusion: {
    background: "rgba(201,168,76,0.05)",
    border: "1px solid rgba(201,168,76,0.2)",
    borderRadius: "8px",
    padding: "1rem",
    color: "#ccc",
    fontSize: "14px",
    lineHeight: "1.6",
    marginTop: "1rem",
  },
  btnDownload: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "transparent",
    border: "1px solid #C9A84C",
    color: "#C9A84C",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "1rem",
  },
  noteTag: (note) => {
    const colors = {
      A: "#28a745", B: "#C9A84C", C: "#fd7e14", D: "#dc3232"
    };
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "48px",
      height: "48px",
      borderRadius: "50%",
      border: `2px solid ${colors[note] || "#888"}`,
      color: colors[note] || "#888",
      fontSize: "22px",
      fontWeight: "700",
    };
  },
};

export default function DevisIA() {
  const [pdfFile, setPdfFile] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [rapportB64, setRapportB64] = useState(null);
  const [error, setError] = useState(null);
  const [pdfDragOver, setPdfDragOver] = useState(false);
  const [photoDragOver, setPhotoDragOver] = useState(false);

  const pdfInputRef = useRef();
  const photoInputRef = useRef();

  const analyser = async () => {
    if (!pdfFile && photos.length === 0) {
      setError("Veuillez uploader un devis PDF ou des photos.");
      return;
    }
    setLoading(true);
    setError(null);
    setResultat(null);

    try {
      const formData = new FormData();
      if (pdfFile) formData.append("devis", pdfFile);
      photos.forEach((p) => formData.append("photos", p));

      const res = await fetch(`${API_BASE}/devis/analyser`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);
      const data = await res.json();
      setResultat(data.analyse);
      if (data.rapport_pdf_b64) setRapportB64(data.rapport_pdf_b64);
    } catch (err) {
      setError("Erreur lors de l'analyse. Vérifiez votre connexion ou réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const telechargerRapport = () => {
    if (!rapportB64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${rapportB64}`;
    link.download = "rapport-devis-phg.pdf";
    link.click();
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (type === "pdf") {
      const pdf = files.find((f) => f.type === "application/pdf");
      if (pdf) setPdfFile(pdf);
      setPdfDragOver(false);
    } else {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      setPhotos((prev) => [...prev, ...imgs]);
      setPhotoDragOver(false);
    }
  };

  const getNoteLabel = (note) => {
    const labels = { A: "Excellent", B: "Correct", C: "À négocier", D: "Abusif" };
    return labels[note] || "";
  };

  return (
    <div style={styles.container}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .upload-card:hover { border-color: #C9A84C !important; background: rgba(201,168,76,0.05) !important; }
        .btn-analyse:hover:not(:disabled) { background: #d4af5a !important; }
        .btn-dl:hover { background: rgba(201,168,76,0.1) !important; }
        .resultat-section { animation: fadeIn 0.4s ease; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px", color: "#C9A84C" }}>𓂀</span>
          <div>
            <h1 style={styles.title}>Analyse de Devis IA</h1>
            <p style={styles.subtitle}>Détection de prix abusifs · Postes manquants · Rapport PDF</p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div style={styles.grid}>
        {/* PDF Upload */}
        <div
          className="upload-card"
          style={{ ...styles.uploadCard, ...(pdfDragOver ? styles.uploadCardActive : {}) }}
          onClick={() => pdfInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setPdfDragOver(true); }}
          onDragLeave={() => setPdfDragOver(false)}
          onDrop={(e) => handleDrop(e, "pdf")}
        >
          <span style={styles.uploadIcon}>📄</span>
          <span style={styles.uploadLabel}>Devis PDF</span>
          <span style={styles.uploadHint}>Glissez ou cliquez pour sélectionner</span>
          {pdfFile && (
            <div style={styles.fileSelected}>
              ✓ {pdfFile.name}
            </div>
          )}
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            style={styles.fileInput}
            onChange={(e) => setPdfFile(e.target.files[0])}
          />
        </div>

        {/* Photos Upload */}
        <div
          className="upload-card"
          style={{ ...styles.uploadCard, ...(photoDragOver ? styles.uploadCardActive : {}) }}
          onClick={() => photoInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setPhotoDragOver(true); }}
          onDragLeave={() => setPhotoDragOver(false)}
          onDrop={(e) => handleDrop(e, "photos")}
        >
          <span style={styles.uploadIcon}>📸</span>
          <span style={styles.uploadLabel}>Photos du chantier</span>
          <span style={styles.uploadHint}>Plusieurs photos acceptées</span>
          {photos.length > 0 && (
            <div style={styles.fileSelected}>
              ✓ {photos.length} photo{photos.length > 1 ? "s" : ""} sélectionnée{photos.length > 1 ? "s" : ""}
            </div>
          )}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            style={styles.fileInput}
            onChange={(e) => setPhotos([...e.target.files])}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: "8px", padding: "12px 16px", color: "#ff6b6b", fontSize: "13px", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Bouton Analyser */}
      <button
        className="btn-analyse"
        style={{ ...styles.btnPrimary, ...(loading ? styles.btnDisabled : {}) }}
        onClick={analyser}
        disabled={loading}
      >
        {loading ? (
          <>
            <div style={styles.spin} />
            Analyse en cours...
          </>
        ) : (
          <>🔍 Analyser le devis</>
        )}
      </button>

      {/* Résultats */}
      {resultat && (
        <div className="resultat-section">
          {/* Stats globales */}
          <div style={styles.noteGrid}>
            <div style={styles.statCard}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
                <div style={styles.noteTag(resultat.note_globale)}>
                  {resultat.note_globale}
                </div>
              </div>
              <span style={{ ...styles.statLbl }}>{getNoteLabel(resultat.note_globale)}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statVal}>
                {Number(resultat.montant_total || 0).toLocaleString("fr-FR")}€
              </span>
              <span style={styles.statLbl}>Montant total</span>
            </div>
            <div style={styles.statCard}>
              <span style={{ ...styles.statVal, color: "#28a745" }}>
                {Number(resultat.economie_potentielle || 0).toLocaleString("fr-FR")}€
              </span>
              <span style={styles.statLbl}>Économie potentielle</span>
            </div>
          </div>

          {/* Prix suspects */}
          {resultat.prix_suspects?.length > 0 && (
            <div style={styles.resultatCard}>
              <div style={styles.sectionTitle}>⚠️ Prix suspects détectés</div>
              {resultat.prix_suspects.map((item, i) => (
                <div key={i} style={styles.alertItem}>
                  <span style={styles.alertMontant}>{Number(item.montant || 0).toLocaleString("fr-FR")}€</span>
                  <div style={styles.alertPoste}>{item.poste}</div>
                  <div style={styles.alertRaison}>{item.raison}</div>
                </div>
              ))}
            </div>
          )}

          {/* Postes manquants */}
          {resultat.postes_manquants?.length > 0 && (
            <div style={styles.resultatCard}>
              <div style={styles.sectionTitle}>📋 Postes manquants</div>
              {resultat.postes_manquants.map((poste, i) => (
                <div key={i} style={styles.warningItem}>✦ {poste}</div>
              ))}
            </div>
          )}

          {/* Recommandations */}
          {resultat.recommandations?.length > 0 && (
            <div style={styles.resultatCard}>
              <div style={styles.sectionTitle}>💡 Recommandations</div>
              {resultat.recommandations.map((rec, i) => (
                <div key={i} style={styles.successItem}>✓ {rec}</div>
              ))}
            </div>
          )}

          {/* Conclusion */}
          {resultat.conclusion && (
            <div style={styles.resultatCard}>
              <div style={styles.sectionTitle}>📝 Conclusion</div>
              <div style={styles.conclusion}>{resultat.conclusion}</div>
            </div>
          )}

          {/* Bouton télécharger rapport */}
          {rapportB64 && (
            <button
              className="btn-dl"
              style={styles.btnDownload}
              onClick={telechargerRapport}
            >
              📥 Télécharger le rapport PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
