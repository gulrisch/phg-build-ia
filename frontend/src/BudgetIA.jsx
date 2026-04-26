import { useState } from "react";

const PHASES = [
  { id: "fondations", label: "Fondations", icon: "⬛", color: "#B8860B" },
  { id: "gros_oeuvre", label: "Gros Œuvre", icon: "🧱", color: "#DAA520" },
  { id: "toiture", label: "Toiture", icon: "🏠", color: "#CD853F" },
  { id: "electricite", label: "Électricité", icon: "⚡", color: "#FFD700" },
  { id: "plomberie", label: "Plomberie", icon: "🔧", color: "#B8860B" },
  { id: "finitions", label: "Finitions", icon: "✨", color: "#DAA520" },
];

const INITIAL_BUDGET = [
  { id: "fondations", prevu: 12000, depense: 11500, statut: "terminé" },
  { id: "gros_oeuvre", prevu: 35000, depense: 28000, statut: "en_cours" },
  { id: "toiture", prevu: 18000, depense: 0, statut: "planifié" },
  { id: "electricite", prevu: 8000, depense: 0, statut: "planifié" },
  { id: "plomberie", prevu: 6500, depense: 0, statut: "planifié" },
  { id: "finitions", prevu: 15000, depense: 0, statut: "planifié" },
];

const VERSEMENTS = [
  { date: "15 Jan 2025", phase: "Fondations", montant: 6000, statut: "payé", beneficiaire: "Konan Construction" },
  { date: "10 Fév 2025", phase: "Fondations", montant: 5500, statut: "payé", beneficiaire: "Konan Construction" },
  { date: "05 Mar 2025", phase: "Gros Œuvre", montant: 15000, statut: "payé", beneficiaire: "Atlas BTP" },
  { date: "20 Avr 2025", phase: "Gros Œuvre", montant: 13000, statut: "payé", beneficiaire: "Atlas BTP" },
  { date: "15 Juin 2025", phase: "Toiture", montant: 9000, statut: "prévu", beneficiaire: "Roofing Pro CI" },
  { date: "30 Juil 2025", phase: "Toiture", montant: 9000, statut: "prévu", beneficiaire: "Roofing Pro CI" },
];

const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

export default function BudgetIA({ plan, setPage, lang }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [budget, setBudget] = useState(INITIAL_BUDGET);
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [aiQuery, setAiQuery] = useState("");

  const totalPrevu = budget.reduce((a, b) => a + b.prevu, 0);
  const totalDepense = budget.reduce((a, b) => a + b.depense, 0);
  const totalRestant = totalPrevu - totalDepense;
  const progression = Math.round((totalDepense / totalPrevu) * 100);
  const projetNom = plan?.desc || plan?.nom || "Mon Projet";

  const handleAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    setShowAI(true);
    try {
      const budgetContext = budget
        .map((b) => {
          const phase = PHASES.find((p) => p.id === b.id);
          return `${phase.label}: prévu ${fmt(b.prevu)}, dépensé ${fmt(b.depense)}, statut: ${b.statut}`;
        })
        .join("\n");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Tu es PHG BUDGET IA, conseiller financier expert en gestion de chantiers de construction, spécialisé dans les projets diaspora. Réponds en français, de façon concise et structurée.\n\nProjet: ${projetNom}\nBudget total prévu: ${fmt(totalPrevu)}\nTotal dépensé: ${fmt(totalDepense)}\nRestant: ${fmt(totalRestant)}\nProgression: ${progression}%\n\nDétail par poste:\n${budgetContext}`,
          messages: [{ role: "user", content: aiQuery }],
        }),
      });
      const data = await res.json();
      setAiResponse(data.content?.[0]?.text || "Aucune réponse.");
    } catch {
      setAiResponse("Erreur de connexion à PHG IA.");
    }
    setAiLoading(false);
  };

  const updateDepense = (id, val) => {
    setBudget((prev) =>
      prev.map((b) => (b.id === id ? { ...b, depense: Number(val) } : b))
    );
    setEditingId(null);
  };

  const StatCard = ({ label, value, sub, accent }) => (
    <div style={{ background: "linear-gradient(145deg,#111,#1a1400)", border: `1px solid ${accent||"#B8860B"}33`, borderRadius: 16, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position:"absolute", top:0, right:0, width:80, height:80, background:`radial-gradient(circle at top right,${accent||"#DAA520"}22,transparent 70%)` }} />
      <div style={{ color:"#888", fontSize:11, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
      <div style={{ color:accent||"#DAA520", fontSize:26, fontWeight:700, fontFamily:"'Playfair Display',serif" }}>{value}</div>
      {sub && <div style={{ color:"#555", fontSize:12, marginTop:4 }}>{sub}</div>}
    </div>
  );

  const tabs = [
    { id: "dashboard", label: "Tableau de Bord" },
    { id: "postes", label: "Postes Budgétaires" },
    { id: "versements", label: "Versements" },
    { id: "ia", label: "✨ PHG IA" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#0a0900", color:"#e8d5a0", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .btab:hover{background:#DAA52022!important}
        .brow:hover{background:#1a1400!important}
        @keyframes pg{0%,100%{box-shadow:0 0 0 0 #DAA52033}50%{box-shadow:0 0 20px 4px #DAA52022}}
        @keyframes sg{0%{background-position:-200% center}100%{background-position:200% center}}
        .gs{background:linear-gradient(90deg,#B8860B,#FFD700,#B8860B);background-size:200% auto;animation:sg 3s linear infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        *{box-sizing:border-box}
      `}</style>

      {/* Header */}
      <div style={{ background:"#0f0c00", borderBottom:"1px solid #DAA52022", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={() => setPage("dashboard")} style={{ background:"transparent", border:"1px solid #DAA52033", borderRadius:8, color:"#DAA520", cursor:"pointer", padding:"6px 12px", fontSize:13, fontFamily:"inherit" }}>← Retour</button>
          <div style={{ width:1, height:28, background:"#DAA52022" }} />
          <div style={{ width:36, height:36, background:"linear-gradient(135deg,#B8860B,#FFD700)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, animation:"pg 3s infinite" }}>𓂀</div>
          <div>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:3, color:"#DAA520", textTransform:"uppercase" }}>PHG BUILD IA</div>
            <div className="gs" style={{ fontSize:16, fontWeight:700, fontFamily:"'Playfair Display',serif" }}>BUDGET IA</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"#DAA52011", border:"1px solid #DAA52033", borderRadius:20, padding:"6px 14px" }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 6px #4ade80" }} />
          <span style={{ fontSize:12, color:"#888" }}>Projet : {projetNom}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, padding:"16px 28px 0", borderBottom:"1px solid #DAA52011" }}>
        {tabs.map((t) => (
          <button key={t.id} className="btab" onClick={() => setActiveTab(t.id)} style={{ background:activeTab===t.id?"#DAA52022":"transparent", border:"none", borderBottom:activeTab===t.id?"2px solid #DAA520":"2px solid transparent", color:activeTab===t.id?"#DAA520":"#666", padding:"10px 20px", cursor:"pointer", fontSize:13, fontWeight:activeTab===t.id?600:400, transition:"all 0.2s", borderRadius:"8px 8px 0 0", fontFamily:"inherit" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:28 }}>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
              <StatCard label="Budget Total" value={fmt(totalPrevu)} sub="Enveloppe globale" accent="#DAA520" />
              <StatCard label="Dépensé" value={fmt(totalDepense)} sub={`${progression}% du budget`} accent="#F59E0B" />
              <StatCard label="Restant" value={fmt(totalRestant)} sub="Disponible" accent="#10B981" />
              <StatCard label="Progression" value={`${progression}%`} sub="Avancement financier" accent="#60A5FA" />
            </div>
            <div style={{ background:"#111", border:"1px solid #DAA52022", borderRadius:16, padding:24, marginBottom:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                <span style={{ color:"#888", fontSize:12, letterSpacing:2, textTransform:"uppercase" }}>Avancement du Chantier</span>
                <span style={{ color:"#DAA520", fontSize:13, fontWeight:600 }}>{progression}% financé</span>
              </div>
              <div style={{ background:"#1a1400", borderRadius:99, height:12, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${progression}%`, background:"linear-gradient(90deg,#B8860B,#FFD700)", borderRadius:99, boxShadow:"0 0 12px #DAA52066", transition:"width 0.8s ease" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                <span style={{ color:"#444", fontSize:11 }}>0 €</span>
                <span style={{ color:"#444", fontSize:11 }}>{fmt(totalPrevu)}</span>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
              {budget.map((b) => {
                const phase = PHASES.find((p) => p.id === b.id);
                const pct = b.prevu > 0 ? Math.round((b.depense/b.prevu)*100) : 0;
                const sc = b.statut==="terminé"?"#4ade80":b.statut==="en_cours"?"#DAA520":"#555";
                const sl = b.statut==="terminé"?"Terminé":b.statut==="en_cours"?"En cours":"Planifié";
                return (
                  <div key={b.id} className="brow" style={{ background:"#111", border:`1px solid ${b.statut==="en_cours"?"#DAA52044":"#DAA52011"}`, borderRadius:14, padding:18, transition:"all 0.2s" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:18 }}>{phase.icon}</span>
                        <span style={{ fontSize:14, fontWeight:600, color:"#e8d5a0" }}>{phase.label}</span>
                      </div>
                      <span style={{ fontSize:11, color:sc, background:`${sc}22`, padding:"3px 10px", borderRadius:20, fontWeight:600 }}>{sl}</span>
                    </div>
                    <div style={{ fontSize:20, fontWeight:700, color:phase.color, fontFamily:"'Playfair Display',serif", marginBottom:4 }}>{fmt(b.depense)}</div>
                    <div style={{ fontSize:12, color:"#555", marginBottom:10 }}>sur {fmt(b.prevu)} prévu</div>
                    <div style={{ background:"#1a1400", borderRadius:99, height:6 }}>
                      <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, background:pct>100?"#ef4444":`linear-gradient(90deg,${phase.color},${phase.color}aa)`, borderRadius:99 }} />
                    </div>
                    <div style={{ fontSize:11, color:"#444", marginTop:6 }}>{pct}% consommé</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* POSTES */}
        {activeTab === "postes" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ color:"#DAA520", fontFamily:"'Playfair Display',serif", fontSize:22 }}>Postes Budgétaires</h2>
              <div style={{ fontSize:12, color:"#555" }}>Cliquez sur un montant pour le modifier</div>
            </div>
            <div style={{ background:"#111", border:"1px solid #DAA52022", borderRadius:16, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", background:"#1a1400", padding:"14px 24px" }}>
                {["Poste","Budget Prévu","Dépensé","Restant","Statut"].map((h) => (
                  <div key={h} style={{ color:"#666", fontSize:11, letterSpacing:1.5, textTransform:"uppercase" }}>{h}</div>
                ))}
              </div>
              {budget.map((b, i) => {
                const phase = PHASES.find((p) => p.id === b.id);
                const restant = b.prevu - b.depense;
                const over = restant < 0;
                return (
                  <div key={b.id} className="brow" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", padding:"16px 24px", borderTop:i>0?"1px solid #DAA52011":"none", transition:"background 0.15s", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:18 }}>{phase.icon}</span>
                      <span style={{ fontWeight:500, color:"#e8d5a0" }}>{phase.label}</span>
                    </div>
                    <div style={{ color:"#DAA520", fontWeight:600 }}>{fmt(b.prevu)}</div>
                    <div style={{ color:"#F59E0B", fontWeight:600, cursor:"pointer", padding:"4px 8px", borderRadius:6, border:editingId===b.id?"1px solid #DAA520":"1px solid transparent", background:editingId===b.id?"#DAA52011":"transparent", display:"inline-flex", alignItems:"center", gap:4 }}
                      onClick={() => { setEditingId(b.id); setEditVal(b.depense); }}>
                      {editingId===b.id ? (
                        <input autoFocus type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={() => updateDepense(b.id,editVal)} onKeyDown={(e) => e.key==="Enter"&&updateDepense(b.id,editVal)} style={{ background:"transparent", border:"none", color:"#F59E0B", fontWeight:600, width:90, fontSize:14, fontFamily:"inherit" }} />
                      ) : <>{fmt(b.depense)} <span style={{ fontSize:10, color:"#555" }}>✏️</span></>}
                    </div>
                    <div style={{ color:over?"#ef4444":"#4ade80", fontWeight:600 }}>{over?"−":""}{fmt(Math.abs(restant))}{over&&<span style={{ fontSize:10, marginLeft:4 }}>⚠️</span>}</div>
                    <div>
                      <span style={{ fontSize:11, fontWeight:600, color:b.statut==="terminé"?"#4ade80":b.statut==="en_cours"?"#DAA520":"#555", background:b.statut==="terminé"?"#4ade8022":b.statut==="en_cours"?"#DAA52022":"#55555522", padding:"4px 12px", borderRadius:20 }}>
                        {b.statut==="terminé"?"✓ Terminé":b.statut==="en_cours"?"⚙ En cours":"○ Planifié"}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", padding:"16px 24px", borderTop:"2px solid #DAA52033", background:"#1a1400" }}>
                <div style={{ fontWeight:700, color:"#DAA520", fontSize:12, letterSpacing:1, textTransform:"uppercase" }}>TOTAL</div>
                <div style={{ color:"#DAA520", fontWeight:700, fontSize:16 }}>{fmt(totalPrevu)}</div>
                <div style={{ color:"#F59E0B", fontWeight:700, fontSize:16 }}>{fmt(totalDepense)}</div>
                <div style={{ color:"#4ade80", fontWeight:700, fontSize:16 }}>{fmt(totalRestant)}</div>
                <div style={{ color:"#DAA520", fontSize:13, fontWeight:600 }}>{progression}% utilisé</div>
              </div>
            </div>
          </div>
        )}

        {/* VERSEMENTS */}
        {activeTab === "versements" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ color:"#DAA520", fontFamily:"'Playfair Display',serif", fontSize:22 }}>Historique des Versements</h2>
              <button style={{ background:"linear-gradient(135deg,#B8860B,#DAA520)", border:"none", borderRadius:10, padding:"10px 20px", color:"#000", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>+ Nouveau Versement</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
              {VERSEMENTS.map((v, i) => (
                <div key={i} className="brow" style={{ background:"#111", border:`1px solid ${v.statut==="payé"?"#DAA52022":"#55555522"}`, borderRadius:14, padding:"16px 24px", display:"grid", gridTemplateColumns:"1fr 1.5fr 1fr 1fr 1fr", alignItems:"center", transition:"background 0.15s" }}>
                  <div style={{ color:"#555", fontSize:13 }}>📅 {v.date}</div>
                  <div style={{ color:"#e8d5a0", fontWeight:500 }}>{v.beneficiaire}</div>
                  <div><span style={{ background:"#DAA52011", padding:"2px 8px", borderRadius:6, color:"#DAA520", fontSize:11 }}>{v.phase}</span></div>
                  <div style={{ color:"#FFD700", fontWeight:700, fontSize:16, fontFamily:"'Playfair Display',serif" }}>{fmt(v.montant)}</div>
                  <div>
                    <span style={{ fontSize:11, fontWeight:600, color:v.statut==="payé"?"#4ade80":"#F59E0B", background:v.statut==="payé"?"#4ade8022":"#F59E0B22", padding:"4px 12px", borderRadius:20 }}>
                      {v.statut==="payé"?"✓ Payé":"○ Prévu"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ background:"#111", border:"1px solid #4ade8022", borderRadius:14, padding:20 }}>
                <div style={{ color:"#555", fontSize:11, letterSpacing:2, marginBottom:8 }}>TOTAL VERSÉ</div>
                <div style={{ color:"#4ade80", fontSize:24, fontWeight:700, fontFamily:"'Playfair Display',serif" }}>{fmt(VERSEMENTS.filter((v)=>v.statut==="payé").reduce((a,b)=>a+b.montant,0))}</div>
              </div>
              <div style={{ background:"#111", border:"1px solid #F59E0B22", borderRadius:14, padding:20 }}>
                <div style={{ color:"#555", fontSize:11, letterSpacing:2, marginBottom:8 }}>VERSEMENTS PRÉVUS</div>
                <div style={{ color:"#F59E0B", fontSize:24, fontWeight:700, fontFamily:"'Playfair Display',serif" }}>{fmt(VERSEMENTS.filter((v)=>v.statut==="prévu").reduce((a,b)=>a+b.montant,0))}</div>
              </div>
            </div>
          </div>
        )}

        {/* PHG IA */}
        {activeTab === "ia" && (
          <div>
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{ fontSize:40, marginBottom:8 }}>𓂀</div>
              <h2 className="gs" style={{ fontFamily:"'Playfair Display',serif", fontSize:28, marginBottom:8 }}>PHG BUDGET IA</h2>
              <p style={{ color:"#555", fontSize:14 }}>Votre conseiller financier IA pour chantier diaspora</p>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20, justifyContent:"center" }}>
              {["Analyse mon budget global","Quels postes sont à risque ?","Comment optimiser mes versements ?","Est-ce que je peux me permettre les finitions ?"].map((q) => (
                <button key={q} onClick={() => setAiQuery(q)} style={{ background:"#DAA52011", border:"1px solid #DAA52033", borderRadius:20, padding:"8px 16px", color:"#DAA520", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{q}</button>
              ))}
            </div>
            <div style={{ background:"#111", border:"1px solid #DAA52033", borderRadius:16, padding:20, marginBottom:16 }}>
              <textarea value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} placeholder="Posez votre question sur le budget du chantier..." style={{ width:"100%", background:"transparent", border:"1px solid #DAA52022", borderRadius:10, padding:14, color:"#e8d5a0", fontSize:14, fontFamily:"inherit", resize:"none", minHeight:90 }} />
              <button onClick={handleAI} disabled={aiLoading||!aiQuery.trim()} style={{ marginTop:12, width:"100%", background:aiLoading?"#333":"linear-gradient(135deg,#B8860B,#FFD700)", border:"none", borderRadius:10, padding:14, color:aiLoading?"#666":"#000", fontWeight:700, fontSize:14, cursor:aiLoading?"not-allowed":"pointer", fontFamily:"inherit", letterSpacing:1 }}>
                {aiLoading?"𓂀 PHG IA analyse...":"✨ Analyser avec PHG IA"}
              </button>
            </div>
            {showAI && (
              <div style={{ background:"linear-gradient(145deg,#0f0c00,#1a1400)", border:"1px solid #DAA52033", borderRadius:16, padding:24, position:"relative" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#DAA520,transparent)" }} />
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                  <span style={{ fontSize:20 }}>𓂀</span>
                  <span style={{ color:"#DAA520", fontWeight:600, fontSize:13, letterSpacing:1 }}>RÉPONSE PHG BUDGET IA</span>
                </div>
                <div style={{ color:"#e8d5a0", fontSize:14, lineHeight:1.8, whiteSpace:"pre-wrap" }}>
                  {aiLoading?"Analyse en cours...":aiResponse}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}