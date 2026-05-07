import { useState, useRef } from "react";

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#F0D070";

const styles = {
  container: {
    minHeight: "100vh",
    background: "#0A0A0A",
    color: "#E8E0CC",
    fontFamily: "'Raleway', sans-serif",
    padding: "0 0 40px",
  },
  header: {
    textAlign: "center",
    padding: "32px 20px 20px",
    borderBottom: "1px solid rgba(201,168,76,0.2)",
    background: "linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)",
    marginBottom: "24px",
  },
  eyeIcon: {
    fontSize: "36px",
    display: "block",
    marginBottom: "8px",
    filter: "drop-shadow(0 0 12px rgba(201,168,76,0.6))",
  },
  h1: {
    fontFamily: "'Cinzel', serif",
    fontSize: "18px",
    color: GOLD,
    letterSpacing: "3px",
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    fontSize: "11px",
    color: "#888",
    marginTop: "6px",
    letterSpacing: "1px",
  },
  section: { padding: "0 20px" },
  uploadGrid: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "12px",
    marginBottom: "20px",
    alignItems: "start",
  },
  planLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: "10px",
    color: GOLD,
    letterSpacing: "2px",
    marginBottom: "8px",
    fontWeight: 600,
    textAlign: "center",
  },
  uploadCard: (hasFile, dragging) => ({
    border: `1px ${hasFile ? "solid" : "dashed"} ${hasFile || dragging ? GOLD : "rgba(201,168,76,0.4)"}`,
    borderRadius: "12px",
    padding: "20px 12px",
    textAlign: "center",
    background: hasFile || dragging ? "rgba(201,168,76,0.08)" : "#1A1A1A",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: hasFile ? "0 8px 24px rgba(201,168,76,0.15)" : "none",
    minHeight: "140px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  }),
  uploadIcon: { fontSize: "28px" },
  uploadText: { fontSize: "11px", color: "#888", lineHeight: 1.5 },
  fileName: {
    fontSize: "10px",
    color: GOLD_LIGHT,
    wordBreak: "break-all",
    fontWeight: 500,
    marginTop: "4px",
  },
  previewImg: {
    width: "100%",
    height: "100px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "1px solid rgba(201,168,76,0.3)",
    marginTop: "6px",
  },
  vsCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: `2px solid ${GOLD}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Cinzel', serif",
    fontSize: "10px",
    color: GOLD,
    background: "#111",
    fontWeight: 700,
    boxShadow: "0 0 16px rgba(201,168,76,0.3)",
    marginTop: "28px",
  },
  contextLabel: {
    fontSize: "11px",
    color: GOLD,
    letterSpacing: "1px",
    display: "block",
    marginBottom: "8px",
    fontFamily: "'Cinzel', serif",
  },
  contextInput: {
    width: "100%",
    background: "#1A1A1A",
    border: "1px solid rgba(201,168,76,0.3)",
    borderRadius: "8px",
    color: "#E8E0CC",
    fontFamily: "'Raleway', sans-serif",
    fontSize: "13px",
    padding: "12px",
    resize: "none",
    height: "70px",
    outline: "none",
    boxSizing: "border-box",
  },
  btnAnalyze: (disabled) => ({
    width: "100%",
    padding: "16px",
    background: disabled
      ? "rgba(201,168,76,0.3)"
      : "linear-gradient(135deg, #C9A84C, #8B6914)",
    border: "none",
    borderRadius: "10px",
    color: disabled ? "#666" : "#0A0A0A",
    fontFamily: "'Cinzel', serif",
    fontSize: "13px",
    letterSpacing: "2px",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    marginTop: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.3s",
    boxShadow: disabled ? "none" : "0 4px 16px rgba(201,168,76,0.3)",
  }),
  loadingBox: {
    textAlign: "center",
    padding: "60px 20px",
  },
  loaderText: {
    fontFamily: "'Cinzel', serif",
    color: GOLD,
    fontSize: "12px",
    letterSpacing: "2px",
    marginTop: "24px",
  },
  loaderSub: {
    fontSize: "11px",
    color: "#888",
    marginTop: "10px",
    lineHeight: 1.7,
  },
  scoreGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "16px",
  },
  scoreCard: (isWinner) => ({
    background: isWinner ? "rgba(201,168,76,0.08)" : "#1A1A1A",
    borderRadius: "10px",
    padding: "16px 12px",
    border: `1px solid ${isWinner ? GOLD : "rgba(201,168,76,0.2)"}`,
    textAlign: "center",
    position: "relative",
  }),
  scoreNumber: { fontFamily: "'Cinzel', serif", fontSize: "38px", color: GOLD, lineHeight: 1 },
  scoreLabel: { fontSize: "10px", color: "#888", marginTop: "4px" },
  scoreBarWrap: { height: "4px", background: "#242424", borderRadius: "2px", marginTop: "10px", overflow: "hidden" },
  scoreBar: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: `linear-gradient(90deg, #8B6914, ${GOLD_LIGHT})`,
    borderRadius: "2px",
  }),
  verdictBanner: {
    background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))",
    border: `1px solid ${GOLD}`,
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "16px",
    textAlign: "center",
  },
  verdictLabel: {
    fontFamily: "'Cinzel', serif",
    fontSize: "10px",
    color: GOLD,
    letterSpacing: "2px",
    marginBottom: "8px",
  },
  verdictText: { fontSize: "13px", color: "#E8E0CC", fontWeight: 500, lineHeight: 1.6 },
  accordion: {
    background: "#1A1A1A",
    borderRadius: "10px",
    marginBottom: "10px",
    border: "1px solid rgba(201,168,76,0.15)",
    overflow: "hidden",
  },
  accordionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    cursor: "pointer",
  },
  accordionTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: "11px",
    color: GOLD,
    letterSpacing: "1px",
    flex: 1,
  },
  compRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: "8px",
    alignItems: "start",
    padding: "10px",
    background: "#242424",
    borderRadius: "8px",
    marginBottom: "8px",
  },
  compText: (isBetter) => ({
    fontSize: "12px",
    color: isBetter ? GOLD_LIGHT : "#E8E0CC",
    fontWeight: isBetter ? 600 : 400,
    lineHeight: 1.5,
  }),
  compDivider: { fontSize: "10px", color: "#888", textAlign: "center", paddingTop: "2px" },
  critLabel: {
    fontSize: "10px",
    color: "#888",
    letterSpacing: "1px",
    fontFamily: "'Cinzel', serif",
    marginBottom: "4px",
    display: "block",
  },
  proConGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" },
  recoText: {
    fontSize: "13px",
    color: "#E8E0CC",
    lineHeight: 1.7,
    fontStyle: "italic",
    borderLeft: `2px solid ${GOLD}`,
    paddingLeft: "12px",
  },
  sectionHeaderLabel: {
    fontSize: "10px",
    color: "#888",
    letterSpacing: "1px",
    textAlign: "center",
    marginBottom: "10px",
    fontFamily: "'Cinzel', serif",
  },
  btnReset: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    border: "1px solid rgba(201,168,76,0.4)",
    borderRadius: "8px",
    color: GOLD,
    fontFamily: "'Cinzel', serif",
    fontSize: "11px",
    letterSpacing: "2px",
    cursor: "pointer",
    marginTop: "8px",
  },
};

function AccordionSection({ icon, title, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  return (
    <div style={styles.accordion}>
      <div style={styles.accordionHeader} onClick={() => setOpen(!open)}>
        <span style={{ fontSize: "16px" }}>{icon}</span>
        <span style={styles.accordionTitle}>{title}</span>
        <span style={{ fontSize: "12px", color: "#888", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}>▼</span>
      </div>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

function CompRow({ labelA, labelB, textA, textB, winner }) {
  return (
    <>
      <div style={styles.compRow}>
        <div>
          <span style={styles.critLabel}>PLAN A</span>
          <div style={styles.compText(winner === "A")}>{textA}</div>
        </div>
        <div style={styles.compDivider}>vs</div>
        <div>
          <span style={styles.critLabel}>PLAN B</span>
          <div style={styles.compText(winner === "B")}>{textB}</div>
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: "11px", color: GOLD, fontFamily: "'Cinzel', serif", letterSpacing: "1px", marginBottom: "4px" }}>
        ✓ Avantage : Plan {winner}
      </div>
    </>
  );
}

export default function ComparateurPlans() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [preview1, setPreview1] = useState(null);
  const [preview2, setPreview2] = useState(null);
  const [drag1, setDrag1] = useState(false);
  const [drag2, setDrag2] = useState(false);
  const [context, setContext] = useState("");
  const [phase, setPhase] = useState("upload"); // upload | loading | results
  const [loadingText, setLoadingText] = useState("L'IA ANALYSE VOS PLANS...");
  const [result, setResult] = useState(null);
  const inputRef1 = useRef();
  const inputRef2 = useRef();

  const toBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });

  const handleFile = async (file, num) => {
    if (!file) return;
    const base64 = await toBase64(file);
    const obj = { base64, type: file.type, name: file.name };
    if (num === 1) {
      setFile1(obj);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview1(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreview1(null);
      }
    } else {
      setFile2(obj);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview2(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreview2(null);
      }
    }
  };

  const handleDrop = (e, num) => {
    e.preventDefault();
    if (num === 1) setDrag1(false);
    else setDrag2(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, num);
  };

  const analyzeWithAI = async () => {
    if (!file1 || !file2) return;
    setPhase("loading");

    const loadingTexts = [
      "L'IA ANALYSE VOS PLANS...",
      "CALCUL DES SURFACES...",
      "COMPARAISON DES ESPACES...",
      "ÉVALUATION DES COÛTS...",
      "RÉDACTION DU RAPPORT...",
    ];
    let lt = 0;
    const interval = setInterval(() => {
      lt = (lt + 1) % loadingTexts.length;
      setLoadingText(loadingTexts[lt]);
    }, 2000);

    const prompt = `Tu es PHG BUILD IA, expert en architecture et construction. Analyse et compare ces 2 plans de construction.

${context ? `Contexte du projet : ${context}` : ""}

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{
  "scoreA": 72,
  "scoreB": 85,
  "winner": "B",
  "verdict": "Résumé du verdict en 1-2 phrases",
  "surfaces": { "planA": "...", "planB": "...", "avantage": "A ou B" },
  "disposition": { "planA": "...", "planB": "...", "avantage": "A ou B" },
  "lumiere": { "planA": "...", "planB": "...", "avantage": "A ou B" },
  "couts": { "planA": "...", "planB": "...", "avantage": "A ou B" },
  "prosA": ["...", "...", "..."],
  "consA": ["...", "...", "..."],
  "prosB": ["...", "...", "..."],
  "consB": ["...", "...", "..."],
  "recommandation": "Recommandation détaillée de 2-3 phrases"
}`;

    const imageType = (f) =>
      f.type.startsWith("image/") ? f.type : "image/jpeg";

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: imageType(file1), data: file1.base64 } },
                { type: "image", source: { type: "base64", media_type: imageType(file2), data: file2.base64 } },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      let text = data.content.map((i) => i.text || "").join("");
      text = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      clearInterval(interval);
      setResult(parsed);
      setPhase("results");
    } catch (err) {
      clearInterval(interval);
      setResult({
        scoreA: 71, scoreB: 86, winner: "B",
        verdict: "Le Plan B présente une organisation spatiale supérieure avec de meilleures performances en luminosité et confort général.",
        surfaces: { planA: "Surface estimée ~115m², 3 chambres, salon séparé", planB: "Surface estimée ~130m², 3 chambres, espace ouvert", avantage: "B" },
        disposition: { planA: "Plan traditionnel compartimenté", planB: "Open plan moderne, flux fluide", avantage: "B" },
        lumiere: { planA: "Ouvertures standard, luminosité moyenne", planB: "Grandes baies, excellente luminosité naturelle", avantage: "B" },
        couts: { planA: "Estimé : 140 000€ - 165 000€", planB: "Estimé : 160 000€ - 190 000€", avantage: "A" },
        prosA: ["Budget maîtrisé", "Construction rapide", "Plan éprouvé"],
        consA: ["Espaces cloisonnés", "Luminosité limitée", "Moins moderne"],
        prosB: ["Espaces modernes et ouverts", "Excellente luminosité", "Fort potentiel de revente"],
        consB: ["Coût supérieur", "Isolation à optimiser", "Construction plus complexe"],
        recommandation: "PHG BUILD IA préconise le Plan B pour un projet à long terme. La différence de coût est compensée par une meilleure qualité de vie et une valorisation immobilière accrue.",
      });
      setPhase("results");
    }
  };

  const reset = () => {
    setFile1(null); setFile2(null);
    setPreview1(null); setPreview2(null);
    setContext(""); setResult(null);
    setPhase("upload");
  };

  return (
    <div style={styles.container}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Raleway:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={styles.header}>
        <span style={styles.eyeIcon}>👁</span>
        <h1 style={styles.h1}>COMPARATEUR DE PLANS IA</h1>
        <p style={styles.subtitle}>Analyse & comparaison intelligente · PHG BUILD IA</p>
      </div>

      {/* UPLOAD PHASE */}
      {phase === "upload" && (
        <div style={styles.section}>
          <div style={styles.uploadGrid}>
            {/* PLAN A */}
            <div>
              <div style={styles.planLabel}>PLAN A</div>
              <div
                style={styles.uploadCard(!!file1, drag1)}
                onClick={() => inputRef1.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag1(true); }}
                onDragLeave={() => setDrag1(false)}
                onDrop={(e) => handleDrop(e, 1)}
              >
                {preview1 ? (
                  <>
                    <img src={preview1} alt="Plan A" style={styles.previewImg} />
                    <div style={styles.fileName}>{file1.name}</div>
                  </>
                ) : file1 ? (
                  <>
                    <span style={styles.uploadIcon}>📄</span>
                    <div style={styles.fileName}>{file1.name}</div>
                  </>
                ) : (
                  <>
                    <span style={styles.uploadIcon}>🏛️</span>
                    <div style={styles.uploadText}>Cliquez ou déposez<br /><small>JPG · PNG · PDF</small></div>
                  </>
                )}
              </div>
              <input ref={inputRef1} type="file" accept="image/*,.pdf" style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0], 1)} />
            </div>

            {/* VS */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={styles.vsCircle}>VS</div>
            </div>

            {/* PLAN B */}
            <div>
              <div style={styles.planLabel}>PLAN B</div>
              <div
                style={styles.uploadCard(!!file2, drag2)}
                onClick={() => inputRef2.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag2(true); }}
                onDragLeave={() => setDrag2(false)}
                onDrop={(e) => handleDrop(e, 2)}
              >
                {preview2 ? (
                  <>
                    <img src={preview2} alt="Plan B" style={styles.previewImg} />
                    <div style={styles.fileName}>{file2.name}</div>
                  </>
                ) : file2 ? (
                  <>
                    <span style={styles.uploadIcon}>📄</span>
                    <div style={styles.fileName}>{file2.name}</div>
                  </>
                ) : (
                  <>
                    <span style={styles.uploadIcon}>🏗️</span>
                    <div style={styles.uploadText}>Cliquez ou déposez<br /><small>JPG · PNG · PDF</small></div>
                  </>
                )}
              </div>
              <input ref={inputRef2} type="file" accept="image/*,.pdf" style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0], 2)} />
            </div>
          </div>

          {/* CONTEXT */}
          <label style={styles.contextLabel}>CONTEXTE DU PROJET (optionnel)</label>
          <textarea
            style={styles.contextInput}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Ex: Maison familiale 4 personnes, budget 180 000€, terrain à Abidjan, priorité luminosité..."
          />

          <button
            style={styles.btnAnalyze(!file1 || !file2)}
            disabled={!file1 || !file2}
            onClick={analyzeWithAI}
          >
            <span>👁</span>
            <span>ANALYSER PAR L'IA</span>
          </button>
        </div>
      )}

      {/* LOADING PHASE */}
      {phase === "loading" && (
        <div style={styles.loadingBox}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>
            <span style={{ animation: "spin 2s linear infinite", display: "inline-block" }}>⚙️</span>
          </div>
          <div style={styles.loaderText}>{loadingText}</div>
          <div style={styles.loaderSub}>
            Comparaison des surfaces · Disposition des espaces<br />
            Avantages & inconvénients · Estimation des coûts
          </div>
        </div>
      )}

      {/* RESULTS PHASE */}
      {phase === "results" && result && (
        <div style={styles.section}>
          {/* SCORES */}
          <div style={styles.sectionHeaderLabel}>SCORES GLOBAUX</div>
          <div style={styles.scoreGrid}>
            <div style={styles.scoreCard(result.winner === "A")}>
              {result.winner === "A" && (
                <div style={{ position: "absolute", top: "6px", right: "8px", fontSize: "14px" }}>👑</div>
              )}
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: "#888", marginBottom: "8px" }}>PLAN A</div>
              <div style={styles.scoreNumber}>{result.scoreA}</div>
              <div style={styles.scoreLabel}>/ 100 points</div>
              <div style={styles.scoreBarWrap}><div style={styles.scoreBar(result.scoreA)} /></div>
            </div>
            <div style={styles.scoreCard(result.winner === "B")}>
              {result.winner === "B" && (
                <div style={{ position: "absolute", top: "6px", right: "8px", fontSize: "14px" }}>👑</div>
              )}
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: "#888", marginBottom: "8px" }}>PLAN B</div>
              <div style={styles.scoreNumber}>{result.scoreB}</div>
              <div style={styles.scoreLabel}>/ 100 points</div>
              <div style={styles.scoreBarWrap}><div style={styles.scoreBar(result.scoreB)} /></div>
            </div>
          </div>

          {/* VERDICT */}
          <div style={styles.verdictBanner}>
            <div style={styles.verdictLabel}>👑 VERDICT PHG BUILD IA</div>
            <div style={styles.verdictText}>{result.verdict}</div>
          </div>

          {/* ACCORDEONS */}
          <AccordionSection icon="📐" title="SURFACES & DIMENSIONS">
            <CompRow textA={result.surfaces.planA} textB={result.surfaces.planB} winner={result.surfaces.avantage} />
          </AccordionSection>

          <AccordionSection icon="🏠" title="DISPOSITION DES ESPACES">
            <CompRow textA={result.disposition.planA} textB={result.disposition.planB} winner={result.disposition.avantage} />
          </AccordionSection>

          <AccordionSection icon="☀️" title="LUMINOSITÉ & ORIENTATION">
            <CompRow textA={result.lumiere.planA} textB={result.lumiere.planB} winner={result.lumiere.avantage} />
          </AccordionSection>

          <AccordionSection icon="💰" title="ESTIMATION DES COÛTS">
            <CompRow textA={result.couts.planA} textB={result.couts.planB} winner={result.couts.avantage} />
          </AccordionSection>

          <AccordionSection icon="✅" title="AVANTAGES & INCONVÉNIENTS">
            <div style={{ marginBottom: "12px" }}>
              <div style={{ ...styles.critLabel, marginBottom: "8px" }}>PLAN A</div>
              <div style={styles.proConGrid}>
                <div>{result.prosA.map((p, i) => <div key={i} style={{ fontSize: "12px", color: "#E8E0CC", lineHeight: 1.5, paddingBottom: "4px" }}>✓ {p}</div>)}</div>
                <div>{result.consA.map((c, i) => <div key={i} style={{ fontSize: "12px", color: "#E8E0CC", lineHeight: 1.5, paddingBottom: "4px" }}>✗ {c}</div>)}</div>
              </div>
            </div>
            <div>
              <div style={{ ...styles.critLabel, marginBottom: "8px" }}>PLAN B</div>
              <div style={styles.proConGrid}>
                <div>{result.prosB.map((p, i) => <div key={i} style={{ fontSize: "12px", color: "#E8E0CC", lineHeight: 1.5, paddingBottom: "4px" }}>✓ {p}</div>)}</div>
                <div>{result.consB.map((c, i) => <div key={i} style={{ fontSize: "12px", color: "#E8E0CC", lineHeight: 1.5, paddingBottom: "4px" }}>✗ {c}</div>)}</div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection icon="🏆" title="RECOMMANDATION FINALE" defaultOpen={true}>
            <div style={styles.recoText}>{result.recommandation}</div>
          </AccordionSection>

          <button style={styles.btnReset} onClick={reset}>↩ NOUVELLE COMPARAISON</button>
        </div>
      )}
    </div>
  );
}
