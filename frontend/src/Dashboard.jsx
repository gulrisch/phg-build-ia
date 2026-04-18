import { useState, useEffect, useCallback } from "react";
import { getToken } from "./api.js";

const API = "http://localhost:8000";

// ── Palette PHG ──────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Montserrat:wght@400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold: #C9A84C;
    --gold-light: #E8CC7A;
    --gold-dim: #7A6330;
    --black: #0A0A0A;
    --dark: #111111;
    --panel: #181818;
    --panel2: #1E1E1E;
    --border: #2A2A2A;
    --text: #E8E0D0;
    --text-dim: #888880;
    --success: #4CAF6E;
    --warning: #E8A94C;
    --danger: #C94C4C;
    --radius: 6px;
    --shadow: 0 4px 32px rgba(0,0,0,0.6);
  }

  body { background: var(--black); color: var(--text); font-family: 'Montserrat', sans-serif; }

  .app { display: flex; min-height: 100vh; }

  /* ── Sidebar ── */
  .sidebar {
    width: 240px; min-height: 100vh; background: var(--dark);
    border-right: 1px solid var(--border); display: flex; flex-direction: column;
    position: fixed; left: 0; top: 0; bottom: 0; z-index: 100;
  }
  .sidebar-logo {
    padding: 28px 24px 20px; border-bottom: 1px solid var(--border);
  }
  .sidebar-logo .brand { font-family: 'Cinzel', serif; font-size: 17px; color: var(--gold); letter-spacing: 2px; }
  .sidebar-logo .sub { font-size: 9px; color: var(--text-dim); letter-spacing: 3px; margin-top: 3px; text-transform: uppercase; }
  .sidebar-logo .glyph { font-size: 26px; margin-bottom: 6px; }

  .sidebar-nav { padding: 16px 0; flex: 1; }
  .nav-section { padding: 8px 24px 4px; font-size: 9px; color: var(--gold-dim); letter-spacing: 3px; text-transform: uppercase; margin-top: 8px; }
  .nav-item {
    display: flex; align-items: center; gap: 10px; padding: 10px 24px;
    color: var(--text-dim); cursor: pointer; font-size: 13px; font-weight: 500;
    transition: all .2s; border-left: 3px solid transparent; letter-spacing: .3px;
  }
  .nav-item:hover { color: var(--text); background: rgba(201,168,76,.06); }
  .nav-item.active { color: var(--gold); background: rgba(201,168,76,.10); border-left-color: var(--gold); }
  .nav-icon { font-size: 16px; width: 20px; text-align: center; }

  .sidebar-footer { padding: 16px 24px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-dim); }

  /* ── Main ── */
  .main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; }

  .topbar {
    background: var(--dark); border-bottom: 1px solid var(--border);
    padding: 0 32px; height: 60px; display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 50;
  }
  .topbar-title { font-family: 'Cinzel', serif; font-size: 14px; color: var(--gold); letter-spacing: 1.5px; }
  .topbar-actions { display: flex; gap: 10px; align-items: center; }

  .btn {
    padding: 8px 18px; border-radius: var(--radius); font-size: 12px;
    font-family: 'Montserrat', sans-serif; font-weight: 600; letter-spacing: .5px;
    cursor: pointer; border: none; transition: all .2s;
  }
  .btn-gold { background: var(--gold); color: var(--black); }
  .btn-gold:hover { background: var(--gold-light); }
  .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text-dim); }
  .btn-outline:hover { border-color: var(--gold); color: var(--gold); }
  .btn-sm { padding: 6px 14px; font-size: 11px; }
  .btn-danger { background: var(--danger); color: white; }

  .content { padding: 32px; flex: 1; }

  /* ── Cards ── */
  .card {
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
    padding: 24px; margin-bottom: 20px;
  }
  .card-title { font-family: 'Cinzel', serif; font-size: 13px; color: var(--gold); letter-spacing: 1px; margin-bottom: 16px; }

  /* ── KPI Row ── */
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .kpi-card {
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
    padding: 20px; position: relative; overflow: hidden;
  }
  .kpi-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--gold);
  }
  .kpi-label { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
  .kpi-value { font-family: 'Cinzel', serif; font-size: 28px; color: var(--gold); }
  .kpi-sub { font-size: 11px; color: var(--text-dim); margin-top: 4px; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 10px 14px; font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid var(--border); font-weight: 600; }
  td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.04); }
  tr:hover td { background: rgba(201,168,76,.04); }
  tr:last-child td { border-bottom: none; }

  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase;
  }
  .badge-draft { background: rgba(136,136,128,.15); color: var(--text-dim); }
  .badge-estimated { background: rgba(201,168,76,.15); color: var(--gold); }
  .badge-active { background: rgba(76,175,110,.15); color: var(--success); }
  .badge-house { background: rgba(201,168,76,.1); color: var(--gold); }
  .badge-bridge { background: rgba(76,122,175,.1); color: #7AABC9; }

  /* ── Form ── */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full { grid-column: 1/-1; }
  label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; }
  input, select {
    background: var(--panel2); border: 1px solid var(--border); border-radius: var(--radius);
    color: var(--text); padding: 10px 14px; font-family: 'Montserrat', sans-serif; font-size: 13px;
    outline: none; transition: border .2s;
  }
  input:focus, select:focus { border-color: var(--gold); }
  select option { background: var(--panel2); }

  /* ── Tabs ── */
  .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
  .tab {
    padding: 12px 24px; font-size: 12px; font-weight: 600; letter-spacing: .5px;
    color: var(--text-dim); cursor: pointer; border-bottom: 2px solid transparent;
    transition: all .2s; text-transform: uppercase;
  }
  .tab.active { color: var(--gold); border-bottom-color: var(--gold); }
  .tab:hover:not(.active) { color: var(--text); }

  /* ── Estimate Result ── */
  .estimate-box {
    background: var(--panel2); border: 1px solid var(--gold-dim); border-radius: 8px; padding: 24px;
    margin-top: 20px;
  }
  .cost-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .cost-row:last-child { border-bottom: none; }
  .cost-row.total { font-weight: 700; color: var(--gold); font-size: 15px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--gold-dim); }
  .cost-label { color: var(--text-dim); }

  /* ── Score ── */
  .score-ring { width: 80px; height: 80px; position: relative; }
  .scorecard-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
  .score-item { text-align: center; padding: 16px; background: var(--panel2); border-radius: 8px; border: 1px solid var(--border); }
  .score-num { font-family: 'Cinzel', serif; font-size: 28px; }
  .score-lbl { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }

  /* ── Recommendation ── */
  .rec-item { padding: 16px; border-radius: 8px; background: var(--panel2); border: 1px solid var(--border); margin-bottom: 10px; }
  .rec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .rec-title { font-weight: 600; font-size: 13px; color: var(--text); }
  .sev-high { color: var(--danger); }
  .sev-medium { color: var(--warning); }
  .sev-low { color: var(--success); }
  .rec-body { font-size: 12px; color: var(--text-dim); line-height: 1.7; }
  .rec-gain { display: inline-block; background: rgba(76,175,110,.1); color: var(--success); border-radius: 4px; padding: 2px 8px; font-size: 11px; margin-top: 6px; }

  /* ── Loader / Error ── */
  .loader { display: flex; justify-content: center; padding: 48px; }
  .spinner { width: 32px; height: 32px; border: 2px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty { text-align: center; padding: 48px; color: var(--text-dim); font-size: 13px; }
  .error-msg { background: rgba(201,76,76,.1); border: 1px solid var(--danger); border-radius: 6px; padding: 12px 16px; color: var(--danger); font-size: 13px; margin-top: 16px; }
  .success-msg { background: rgba(76,175,110,.1); border: 1px solid var(--success); border-radius: 6px; padding: 12px 16px; color: var(--success); font-size: 13px; margin-top: 16px; }

  /* ── Modal ── */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 200; display: flex; align-items: center; justify-content: center; }
  .modal { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 28px; width: 560px; max-height: 85vh; overflow-y: auto; box-shadow: var(--shadow); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .modal-title { font-family: 'Cinzel', serif; font-size: 15px; color: var(--gold); letter-spacing: 1px; }
  .modal-close { background: none; border: none; color: var(--text-dim); font-size: 20px; cursor: pointer; padding: 4px; }
  .modal-close:hover { color: var(--text); }
  .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; border-top: 1px solid var(--border); padding-top: 20px; }

  .divider-gold { height: 1px; background: linear-gradient(90deg, transparent, var(--gold-dim), transparent); margin: 20px 0; }

  @media (max-width: 900px) {
    .kpi-row { grid-template-columns: 1fr 1fr; }
    .form-grid { grid-template-columns: 1fr; }
    .scorecard-row { grid-template-columns: 1fr 1fr; }
  }

  /* ── Hamburger Dashboard ── */
  .dash-hamburger { display:none; background:none; border:none; color:var(--text); font-size:22px; cursor:pointer; padding:4px 6px; line-height:1; border-radius:var(--radius); transition:background .15s; }
  .dash-hamburger:hover { background:rgba(201,168,76,.1); }
  .dash-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:98; display:none; }

  @media (max-width: 768px) {
    .sidebar { position:fixed; left:-260px; top:0; bottom:0; z-index:99; width:250px; height:100vh; min-height:unset; overflow-y:auto; transition:left .25s cubic-bezier(.4,0,.2,1); }
    .sidebar.open { left:0; box-shadow:4px 0 32px rgba(0,0,0,.8); }
    .dash-overlay { display:block; }
    .dash-hamburger { display:block; }
    .main { margin-left:0; width:100%; }
    .topbar { padding:0 10px; height:50px; }
    .topbar-title { font-size:12px; letter-spacing:1px; }
    .topbar-actions { gap:6px; }
    .topbar-actions .btn { padding:6px 10px; font-size:10px; min-height:34px; }
    .content { padding:12px; }
    .kpi-row { grid-template-columns:1fr 1fr; gap:10px; }
    .kpi-value { font-size:20px; }
    .form-grid { grid-template-columns:1fr; }
    .modal { width:calc(100vw - 24px); padding:18px; }
    table { font-size:12px; }
    th, td { padding:8px 10px; }
    .tabs { overflow-x:auto; -webkit-overflow-scrolling:touch; }
    .tab { white-space:nowrap; padding:8px 14px; font-size:11px; }
    .btn { min-height:40px; }
    .btn-sm { min-height:34px; }
  }

  @media (max-width: 480px) {
    .kpi-row { grid-template-columns:1fr 1fr; gap:8px; }
    .kpi-value { font-size:18px; }
    .topbar-title { display:none; }
    .modal { width:calc(100vw - 16px); padding:14px; }
  }
`;

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => n == null ? "—" : Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const fmtCur = (n, cur = "EUR") => n == null ? "—" : Number(n).toLocaleString("fr-FR", { style: "currency", currency: cur, maximumFractionDigits: 0 });

async function api(path, method = "GET", body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("phg:logout"));
    throw new Error("Session expirée");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur ${res.status}`);
  }
  return res.json();
}

// ── Score Color ───────────────────────────────────────────────────────────────
function scoreColor(n) {
  if (n >= 80) return "var(--success)";
  if (n >= 60) return "var(--warning)";
  return "var(--danger)";
}

// ── Sidebar Component ─────────────────────────────────────────────────────────
function Sidebar({ page, setPage, sidebarOpen }) {
  const nav = [
    { section: "Tableau de bord" },
    { id: "dashboard", icon: "◈", label: "Vue d'ensemble" },
    { section: "Projets" },
    { id: "projects", icon: "⬡", label: "Projets" },
    { id: "new-project", icon: "＋", label: "Nouveau projet" },
    { section: "Analyse" },
    { id: "plans", icon: "⊞", label: "Plans & analyses" },
    { id: "clients", icon: "◉", label: "Clients" },
    { section: "Gestion" },
    { id: "subscriptions", icon: "◆", label: "Abonnements" },
  ];
  return (
    <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
      <div className="sidebar-logo">
        <div className="glyph">𓂀</div>
        <div className="brand">PHG BUILD IA</div>
        <div className="sub">Estimation & Construction</div>
      </div>
      <nav className="sidebar-nav">
        {nav.map((item, i) =>
          item.section ? (
            <div key={i} className="nav-section">{item.section}</div>
          ) : (
            <div key={item.id} className={`nav-item${page === item.id ? " active" : ""}`} onClick={() => setPage(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          )
        )}
      </nav>
      <div className="sidebar-footer">PHG Éditions © 2025<br />Saint-Julien-en-Genevois</div>
    </aside>
  );
}

// ── Dashboard Overview ────────────────────────────────────────────────────────
function DashboardPage() {
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api("/mobile/dashboard"), api("/projects")])
      .then(([dash, projs]) => { setData(dash); setProjects(projs); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  const total = projects.reduce((s, p) => s + (p.estimated_total_cost || 0), 0);
  const estimated = projects.filter(p => p.status === "estimated").length;
  const draft = projects.filter(p => p.status === "draft").length;

  return (
    <div>
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Projets total</div>
          <div className="kpi-value">{projects.length}</div>
          <div className="kpi-sub">{draft} brouillons</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Estimés</div>
          <div className="kpi-value">{estimated}</div>
          <div className="kpi-sub">projets chiffrés</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Volume total</div>
          <div className="kpi-value" style={{ fontSize: 20 }}>{fmtCur(total)}</div>
          <div className="kpi-sub">estimations cumulées</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pays couverts</div>
          <div className="kpi-value">3</div>
          <div className="kpi-sub">FR · CH · CI</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Projets récents</div>
        {projects.length === 0 ? <div className="empty">Aucun projet. Créez votre premier projet.</div> : (
          <table>
            <thead><tr>
              <th>Nom</th><th>Type</th><th>Qualité</th><th>Statut</th><th>Coût estimé</th>
            </tr></thead>
            <tbody>
              {projects.slice(0, 8).map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                  <td><span className={`badge badge-${p.project_type}`}>{p.project_type === "house" ? "🏠 Maison" : "🌉 Pont"}</span></td>
                  <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{p.quality_target}</td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                  <td style={{ fontFamily: "'Cinzel', serif", color: "var(--gold)" }}>{fmtCur(p.estimated_total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Projects Page ─────────────────────────────────────────────────────────────
function ProjectsPage({ onNewProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [recs, setRecs] = useState(null);
  const [tab, setTab] = useState("estimate");
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/projects").then(setProjects).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const runEstimate = async (p) => {
    setWorking(true); setMsg(null); setEstimate(null); setRecs(null);
    try {
      const res = await api(`/projects/${p.id}/estimation`);
      setEstimate(res);
      setMsg({ type: "success", text: "Estimation générée avec succès." });
      load();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally { setWorking(false); }
  };

  const runRecs = async (p) => {
    setWorking(true); setMsg(null);
    try {
      const res = await api(`/projects/${p.id}/estimation`);
      setRecs(res);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally { setWorking(false); }
  };

  const selectProject = (p) => {
    setSelected(p); setEstimate(null); setRecs(null); setMsg(null); setTab("estimate");
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 20 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "var(--gold)", letterSpacing: 1 }}>Projets ({projects.length})</div>
          <button className="btn btn-gold btn-sm" onClick={onNewProject}>+ Nouveau</button>
        </div>
        {projects.length === 0 ? <div className="empty">Aucun projet encore.</div> : (
          projects.map(p => (
            <div key={p.id}
              onClick={() => selectProject(p)}
              className="card"
              style={{ cursor: "pointer", borderColor: selected?.id === p.id ? "var(--gold)" : "var(--border)", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.project_name}</span>
                <span className={`badge badge-${p.status}`}>{p.status}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span className={`badge badge-${p.project_type}`}>{p.project_type === "house" ? "🏠 Maison" : "🌉 Pont"}</span>
                <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Qualité : {p.quality_target}</span>
              </div>
              {p.estimated_total_cost && (
                <div style={{ fontFamily: "'Cinzel', serif", color: "var(--gold)", fontSize: 15 }}>
                  {fmtCur(p.estimated_total_cost)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="card" style={{ position: "sticky", top: 20, alignSelf: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div className="card-title" style={{ margin: 0 }}>{selected.project_name}</div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
          <div className="divider-gold" />

          <div className="tabs">
            <div className={`tab${tab === "estimate" ? " active" : ""}`} onClick={() => setTab("estimate")}>Estimation</div>
            <div className={`tab${tab === "recs" ? " active" : ""}`} onClick={() => setTab("recs")}>Recommandations</div>
          </div>

          {tab === "estimate" && (
            <>
              <button className="btn btn-gold" onClick={() => runEstimate(selected)} disabled={working} style={{ width: "100%" }}>
                {working ? "Calcul en cours…" : "⚡ Lancer l'estimation"}
              </button>
              {msg && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}
              {estimate && (
                <div className="estimate-box">
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 14 }}>Détail des matériaux</div>
                  <table style={{ marginBottom: 16, fontSize: 12 }}>
                    <thead><tr><th>Matériau</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead>
                    <tbody>
                      {estimate.materials.map((m, i) => (
                        <tr key={i}>
                          <td>{m.material_name}</td>
                          <td>{fmt(m.quantity)} {m.unit}</td>
                          <td>{fmt(m.unit_price)}</td>
                          <td style={{ color: "var(--gold)" }}>{fmt(m.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="divider-gold" />
                  <div className="cost-row"><span className="cost-label">Matériaux</span><span>{fmt(estimate.material_cost)}</span></div>
                  <div className="cost-row"><span className="cost-label">Main d'œuvre</span><span>{fmt(estimate.labor_cost)}</span></div>
                  <div className="cost-row"><span className="cost-label">Logistique</span><span>{fmt(estimate.logistics_cost)}</span></div>
                  <div className="cost-row"><span className="cost-label">Marge risque (8%)</span><span>{fmt(estimate.risk_margin)}</span></div>
                  <div className="cost-row total"><span>TOTAL ESTIMÉ</span><span>{fmt(estimate.total_cost)}</span></div>
                  <div style={{ marginTop: 14 }}>
                    {estimate.notes.map((n, i) => <div key={i} style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 3 }}>• {n}</div>)}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "recs" && (
            <>
              <button className="btn btn-gold" onClick={() => runRecs(selected)} disabled={working} style={{ width: "100%" }}>
                {working ? "Analyse en cours…" : "🧠 Analyser le projet"}
              </button>
              {msg && <div className={msg.type === "error" ? "error-msg" : "success-msg"}>{msg.text}</div>}
              {recs && (
                <div style={{ marginTop: 16 }}>
                  <div className="scorecard-row">
                    {Object.entries(recs.scorecard).filter(([k]) => k !== "global_score").map(([k, v]) => (
                      <div key={k} className="score-item">
                        <div className="score-num" style={{ color: scoreColor(v) }}>{v}</div>
                        <div className="score-lbl">{k.replace(/_score$/, "").replace(/_/g, " ")}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 36, color: scoreColor(recs.scorecard.global_score) }}>
                      {recs.scorecard.global_score}<span style={{ fontSize: 16, color: "var(--text-dim)" }}>/100</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{recs.summary}</div>
                  </div>
                  {recs.recommendations.length === 0
                    ? <div className="empty">Aucune recommandation critique.</div>
                    : recs.recommendations.map((r, i) => (
                      <div key={i} className="rec-item">
                        <div className="rec-header">
                          <span className="rec-title">{r.category}</span>
                          <span className={`sev-${r.severity}`} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{r.severity}</span>
                        </div>
                        <div className="rec-body">
                          <strong>Observation :</strong> {r.observation}<br />
                          <strong>Impact :</strong> {r.impact}<br />
                          <strong>Action :</strong> {r.recommendation}
                          {r.estimated_gain_value > 0 && (
                            <div><span className="rec-gain">💰 Gain estimé : {fmt(r.estimated_gain_value)} ({r.estimated_gain_percent}%)</span></div>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── New Project Modal ─────────────────────────────────────────────────────────
function NewProjectModal({ onClose, onCreated }) {
  const [countries, setCountries] = useState([]);
  const [form, setForm] = useState({
    title: "", project_type: "villa", country: "", city: "",
    surface_m2: "", floors: 1, quality_level: "standard",
    latitude: "", longitude: "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const locateMe = () => {
    if (!navigator.geolocation) { setError("Géolocalisation non supportée par ce navigateur."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => { setError("Impossible d'obtenir la position."); setLocating(false); }
    );
  };

  useEffect(() => {
    api("/countries").then(setCountries).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const payload = {
        title: form.title,
        country: form.country,
        city: form.city || null,
        project_type: form.project_type,
        surface_m2: parseFloat(form.surface_m2) || 100,
        floors: parseInt(form.floors) || 1,
        quality_level: form.quality_level,
        latitude: form.latitude !== "" ? parseFloat(form.latitude) : null,
        longitude: form.longitude !== "" ? parseFloat(form.longitude) : null,
      };
      const p = await api("/projects", "POST", payload);
      onCreated(p);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Nouveau projet</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <div className="form-group full">
            <label>Nom du projet</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Villa Cocody, Maison Lyon…" />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={form.project_type} onChange={e => set("project_type", e.target.value)}>
              <option value="villa">🏠 Villa</option>
              <option value="appartement">🏢 Appartement</option>
              <option value="commerce">🏪 Commerce</option>
              <option value="bureau">🏛 Bureau</option>
              <option value="entrepot">🏭 Entrepôt</option>
            </select>
          </div>
          <div className="form-group">
            <label>Qualité</label>
            <select value={form.quality_level} onChange={e => set("quality_level", e.target.value)}>
              <option value="economique">Économique</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="form-group">
            <label>Pays</label>
            <select value={form.country} onChange={e => set("country", e.target.value)}>
              <option value="">-- Choisir --</option>
              {countries.map(c => <option key={c.country_code} value={c.country_code}>{c.country_name} ({c.currency})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Ville / Région (optionnel)</label>
            <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Abidjan, Paris…" />
          </div>
          <div className="form-group">
            <label>Latitude</label>
            <input type="number" step="any" value={form.latitude} onChange={e => set("latitude", e.target.value)} placeholder="ex: 5.345317" />
          </div>
          <div className="form-group">
            <label>Longitude</label>
            <input type="number" step="any" value={form.longitude} onChange={e => set("longitude", e.target.value)} placeholder="ex: -4.024429" />
          </div>
          <div className="form-group full">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={locateMe}
              disabled={locating}
              style={{ width: "fit-content" }}
            >
              {locating ? "⏳ Localisation…" : "📍 Localiser automatiquement"}
            </button>
          </div>
          <div className="form-group">
            <label>Surface (m²)</label>
            <input type="number" value={form.surface_m2} onChange={e => set("surface_m2", e.target.value)} placeholder="120" />
          </div>
          <div className="form-group">
            <label>Étages</label>
            <input type="number" value={form.floors} onChange={e => set("floors", e.target.value)} min="1" max="10" />
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-gold" onClick={submit} disabled={saving || !form.title || !form.country}>
            {saving ? "Création…" : "Créer le projet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Clients Page ──────────────────────────────────────────────────────────────
function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "" });
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api("/clients").then(setClients).finally(() => setLoading(false)); };
  useEffect(load, []);

  const submit = async () => {
    setSaving(true);
    try { await api("/clients", "POST", form); load(); setShowNew(false); setForm({ name: "", email: "", phone: "", country: "" }); }
    catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "var(--gold)", letterSpacing: 1 }}>Clients ({clients.length})</div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowNew(true)}>+ Ajouter</button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Nouveau client</div>
          <div className="form-grid">
            <div className="form-group"><label>Nom *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="form-group"><label>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="form-group"><label>Téléphone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="form-group"><label>Pays</label><input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-gold btn-sm" onClick={submit} disabled={saving || !form.name}>{saving ? "…" : "Enregistrer"}</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowNew(false)}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? <div className="loader"><div className="spinner" /></div> : (
        <div className="card">
          {clients.length === 0 ? <div className="empty">Aucun client enregistré.</div> : (
            <table>
              <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Pays</th></tr></thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ color: "var(--text-dim)" }}>{c.email || "—"}</td>
                    <td style={{ color: "var(--text-dim)" }}>{c.phone || "—"}</td>
                    <td style={{ color: "var(--text-dim)" }}>{c.country || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Plans Page ────────────────────────────────────────────────────────────────
function PlansPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api("/mobile/plans").then(setData).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div>
      <div className="card">
        <div className="card-title">Analyses de plans</div>
        {!data?.items?.length ? <div className="empty">Aucune analyse disponible.</div> : (
          <table>
            <thead><tr><th>Fichier</th><th>Projet #</th><th>Statut</th><th>Surface</th><th>Pièces</th></tr></thead>
            <tbody>
              {data.items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.file_name}</td>
                  <td style={{ color: "var(--text-dim)" }}>{item.project_id}</td>
                  <td><span className={`badge badge-${item.status === "processed" ? "active" : "draft"}`}>{item.status}</span></td>
                  <td>{item.surface ? `${item.surface} m²` : "—"}</td>
                  <td>{item.rooms ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Subscriptions Page ────────────────────────────────────────────────────────
function SubscriptionsPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api("/subscriptions").then(setSubs).finally(() => setLoading(false)); }, []);

  const plans = [
    { name: "free", label: "Gratuit", price: "0 €/mois", features: ["3 projets", "Estimation basique"] },
    { name: "pro", label: "Pro", price: "29 €/mois", features: ["Projets illimités", "Export PDF", "Recommandations IA"] },
    { name: "enterprise", label: "Enterprise", price: "Sur devis", features: ["Multi-utilisateurs", "API privée", "Support dédié"] },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {plans.map(plan => (
          <div key={plan.name} className="card" style={{ textAlign: "center", border: plan.name === "pro" ? "1px solid var(--gold)" : "1px solid var(--border)" }}>
            {plan.name === "pro" && <div style={{ background: "var(--gold)", color: "var(--black)", fontSize: 10, fontWeight: 700, letterSpacing: 2, padding: "4px 0", margin: "-24px -24px 16px", borderRadius: "8px 8px 0 0" }}>RECOMMANDÉ</div>}
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: plan.name === "pro" ? "var(--gold)" : "var(--text)", marginBottom: 6 }}>{plan.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>{plan.price}</div>
            {plan.features.map((f, i) => <div key={i} style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>✓ {f}</div>)}
            <button className={`btn ${plan.name === "pro" ? "btn-gold" : "btn-outline"} btn-sm`} style={{ marginTop: 14, width: "100%" }}>
              {plan.name === "free" ? "Plan actuel" : "Souscrire"}
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Abonnements actifs</div>
        {loading ? <div className="loader"><div className="spinner" /></div> : subs.length === 0 ? <div className="empty">Aucun abonnement.</div> : (
          <table>
            <thead><tr><th>Plan</th><th>Statut</th><th>Fournisseur</th><th>Depuis</th></tr></thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, textTransform: "uppercase" }}>{s.plan_name}</td>
                  <td><span className={`badge badge-${s.status === "active" ? "active" : "draft"}`}>{s.status}</span></td>
                  <td style={{ color: "var(--text-dim)" }}>{s.provider}</td>
                  <td style={{ color: "var(--text-dim)", fontSize: 12 }}>{s.started_at ? new Date(s.started_at).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Page Titles ───────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: "Vue d'ensemble",
  projects: "Projets",
  "new-project": "Nouveau projet",
  plans: "Plans & Analyses",
  clients: "Clients",
  subscriptions: "Abonnements",
};

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [showNewProject, setShowNewProject] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNewCreated = () => {
    setShowNewProject(false);
    setPage("projects");
    setRefreshKey(k => k + 1);
  };

  const goNewProject = () => { setShowNewProject(true); setPage("projects"); setSidebarOpen(false); };
  const navigate = (p) => { setPage(p); setSidebarOpen(false); };

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage key={refreshKey} />;
      case "projects":
      case "new-project":
        return <ProjectsPage key={refreshKey} onNewProject={goNewProject} />;
      case "plans": return <PlansPage />;
      case "clients": return <ClientsPage />;
      case "subscriptions": return <SubscriptionsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {sidebarOpen && <div className="dash-overlay" onClick={() => setSidebarOpen(false)} />}
        <Sidebar page={page} setPage={navigate} sidebarOpen={sidebarOpen} />
        <div className="main">
          <div className="topbar">
            <button className="dash-hamburger" onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">☰</button>
            <div className="topbar-title">{PAGE_TITLES[page] || "PHG BUILD IA"}</div>
            <div className="topbar-actions">
              <button className="btn btn-outline btn-sm" onClick={() => api("/health").then(() => alert("✅ API connectée")).catch(() => alert("❌ API non joignable"))}>
                ◉ Tester API
              </button>
              <button className="btn btn-gold btn-sm" onClick={goNewProject}>+ Projet</button>
            </div>
          </div>
          <div className="content">
            {renderPage()}
          </div>
        </div>
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={handleNewCreated}
        />
      )}
    </>
  );
}
