import { useState } from "react";

const css = `
.chantier-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.ch-kpi { background: var(--panel); border: 1px solid var(--border); border-top: 2px solid var(--gold); border-radius: 8px; padding: 14px; }
.ch-kpi-lbl { font-size: 9px; color: var(--dim); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
.ch-kpi-val { font-family: 'Cinzel', serif; font-size: 22px; color: var(--gold); }
.ch-kpi-sub { font-size: 10px; color: var(--dim); margin-top: 2px; }
.progress-bar { height: 6px; background: rgba(201,168,76,.12); border-radius: 3px; margin-top: 4px; }
.progress-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #7A6330, #C9A84C); transition: width .5s; }
.planning-grid { display: grid; gap: 0; }
.week-header { display: flex; background: var(--panel2); border-bottom: 1px solid var(--border); }
.week-cell { flex: 1; padding: 6px; font-size: 9px; color: var(--gold3); text-align: center; border-right: 1px solid var(--border); text-transform: uppercase; letter-spacing: 1px; }
.task-row { display: flex; border-bottom: 1px solid rgba(255,255,255,.04); align-items: center; }
.task-row:hover { background: rgba(201,168,76,.03); }
.task-label { width: 180px; flex-shrink: 0; padding: 8px 10px; font-size: 11px; border-right: 1px solid var(--border); }
.task-bar-cell { flex: 1; padding: 4px; border-right: 1px solid rgba(255,255,255,.04); min-height: 32px; position: relative; }
.task-bar { height: 22px; border-radius: 4px; display: flex; align-items: center; padding: 0 6px; font-size: 9px; font-weight: 600; cursor: pointer; transition: opacity .2s; }
.task-bar:hover { opacity: 0.85; }
.t-planifie { background: rgba(136,136,120,.25); color: var(--dim); }
.t-en_cours { background: rgba(201,168,76,.3); color: var(--gold2); }
.t-termine { background: rgba(76,175,110,.2); color: var(--ok); }
.t-retard { background: rgba(201,76,76,.2); color: var(--err); }
.worker-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.worker-table th { text-align: left; padding: 8px 12px; font-size: 9px; color: var(--dim); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
.worker-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.04); }
.attendance-btn { width: 30px; height: 30px; border-radius: 50%; border: 1px solid; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all .15s; }
.att-present { background: rgba(76,175,110,.15); border-color: var(--ok); color: var(--ok); }
.att-absent { background: rgba(201,76,76,.15); border-color: var(--err); color: var(--err); }
.jalons-list { display: flex; flex-direction: column; gap: 8px; }
.jalon { background: var(--panel2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px; }
.jalon-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.j-paid { background: var(--ok); }
.j-due { background: var(--warn, #E8A94C); }
.j-future { background: var(--dim); }
.chantier-selector { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.ch-chip { padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); color: var(--dim); transition: all .2s; }
.ch-chip.active { background: rgba(201,168,76,.15); border-color: var(--gold); color: var(--gold); }
.photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.photo-slot { aspect-ratio: 4/3; background: var(--panel2); border: 1px dashed var(--border); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; font-size: 11px; color: var(--dim); }
.photo-slot:hover { border-color: var(--gold); color: var(--gold); }
.photo-filled { border-style: solid; border-color: rgba(201,168,76,.3); }
.alert-row { display: flex; gap: 8px; align-items: flex-start; padding: 10px; background: rgba(232,169,76,.06); border: 1px solid rgba(232,169,76,.2); border-radius: 6px; margin-bottom: 8px; font-size: 11px; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
.sb-en_cours { background: rgba(201,168,76,.15); color: var(--gold); }
.sb-planifie { background: rgba(120,120,120,.15); color: var(--dim); }
.sb-termine { background: rgba(76,175,110,.15); color: var(--ok); }
.sb-retard { background: rgba(201,76,76,.15); color: var(--err); }
`;

const TASK_CATEGORIES = ["fondations","maçonnerie","charpente","toiture","électricité","plomberie","enduit","carrelage","peinture","finitions"];
const WORKER_ROLES = ["maçon","électricien","plombier","charpentier","carreleur","peintre","menuisier","manœuvre","chef de chantier"];
const STATUS_COLORS = { planifie:"t-planifie", en_cours:"t-en_cours", termine:"t-termine", retard:"t-retard" };
const STATUS_LABELS_C = { planifie:"Planifié", en_cours:"En cours", termine:"Terminé", retard:"Retard" };

function fmt(n) { return Number(n || 0).toLocaleString("fr-FR"); }

// ── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_CHANTIERS = [
  {
    id: "ch1",
    name: "Villa Cocody",
    location: "Abidjan, Cocody",
    start_date: "2025-01-15",
    end_date: "2025-09-30",
    budget: 85000000,
    status: "en_cours",
    progress: 62,
  },
  {
    id: "ch2",
    name: "Immeuble R+3 Dakar",
    location: "Dakar, Plateau",
    start_date: "2025-03-01",
    end_date: "2026-02-28",
    budget: 220000000,
    status: "en_cours",
    progress: 28,
  },
  {
    id: "ch3",
    name: "Maison Lyon",
    location: "Lyon, France",
    start_date: "2024-09-01",
    end_date: "2025-05-31",
    budget: 320000,
    status: "termine",
    progress: 100,
  },
];

const MOCK_TASKS = {
  ch1: [
    { id:"t1", title:"Terrassement et implantation", category:"fondations", week:1, status:"termine", assigned_to:"Kouassi BAMBA", budget:2500000, paid:2500000 },
    { id:"t2", title:"Fondations et semelles", category:"fondations", week:2, status:"termine", assigned_to:"Kouassi BAMBA", budget:4800000, paid:4800000 },
    { id:"t3", title:"Élévation murs RDC", category:"maçonnerie", week:4, status:"termine", assigned_to:"Yao KOFFI", budget:7200000, paid:7200000 },
    { id:"t4", title:"Dalle RDC + plancher", category:"maçonnerie", week:7, status:"termine", assigned_to:"Yao KOFFI", budget:5500000, paid:5500000 },
    { id:"t5", title:"Élévation murs R+1", category:"maçonnerie", week:10, status:"en_cours", assigned_to:"Yao KOFFI", budget:6800000, paid:3000000 },
    { id:"t6", title:"Charpente bois", category:"charpente", week:13, status:"planifie", assigned_to:"Mamadou TRAORÉ", budget:3200000, paid:0 },
    { id:"t7", title:"Toiture tuiles", category:"toiture", week:15, status:"planifie", assigned_to:"Mamadou TRAORÉ", budget:4100000, paid:0 },
    { id:"t8", title:"Installation électrique", category:"électricité", week:17, status:"retard", assigned_to:"Issouf COULIBALY", budget:2800000, paid:0 },
    { id:"t9", title:"Plomberie et sanitaires", category:"plomberie", week:18, status:"planifie", assigned_to:"Soro DIOMANDE", budget:3600000, paid:0 },
    { id:"t10", title:"Enduit façade", category:"enduit", week:20, status:"planifie", assigned_to:"", budget:2100000, paid:0 },
  ],
  ch2: [
    { id:"t11", title:"Terrassement", category:"fondations", week:1, status:"termine", assigned_to:"Équipe A", budget:8500000, paid:8500000 },
    { id:"t12", title:"Pieux et fondations profondes", category:"fondations", week:3, status:"termine", assigned_to:"Équipe A", budget:22000000, paid:22000000 },
    { id:"t13", title:"Voile béton sous-sol", category:"maçonnerie", week:7, status:"en_cours", assigned_to:"Oumar NDIAYE", budget:15000000, paid:7000000 },
    { id:"t14", title:"Dalle R+1", category:"maçonnerie", week:11, status:"planifie", assigned_to:"Oumar NDIAYE", budget:18000000, paid:0 },
    { id:"t15", title:"Réseau électrique haute tension", category:"électricité", week:15, status:"planifie", assigned_to:"", budget:12000000, paid:0 },
  ],
  ch3: [
    { id:"t16", title:"Terrassement", category:"fondations", week:1, status:"termine", assigned_to:"ETP Martin", budget:15000, paid:15000 },
    { id:"t17", title:"Maçonnerie", category:"maçonnerie", week:3, status:"termine", assigned_to:"ETP Martin", budget:85000, paid:85000 },
    { id:"t18", title:"Charpente & toiture", category:"charpente", week:8, status:"termine", assigned_to:"Charpente Dupont", budget:42000, paid:42000 },
    { id:"t19", title:"Second œuvre", category:"électricité", week:12, status:"termine", assigned_to:"Multi-artisans", budget:68000, paid:68000 },
    { id:"t20", title:"Finitions", category:"finitions", week:18, status:"termine", assigned_to:"Multi-artisans", budget:35000, paid:35000 },
  ],
};

const MOCK_WORKERS = {
  ch1: [
    { id:"w1", name:"Kouassi BAMBA", role:"maçon", daily_rate:8000, phone:"+225 07 11 22 33", present_days:48, absent_days:4, total_paid:384000, today:null },
    { id:"w2", name:"Yao KOFFI", role:"maçon", daily_rate:8000, phone:"+225 05 44 55 66", present_days:42, absent_days:6, total_paid:336000, today:null },
    { id:"w3", name:"Issouf COULIBALY", role:"électricien", daily_rate:12000, phone:"+225 07 88 99 00", present_days:10, absent_days:2, total_paid:120000, today:null },
    { id:"w4", name:"Soro DIOMANDE", role:"plombier", daily_rate:11000, phone:"+225 05 22 33 44", present_days:8, absent_days:0, total_paid:88000, today:null },
    { id:"w5", name:"Adou KABORÉ", role:"manœuvre", daily_rate:5000, phone:"+225 07 66 77 88", present_days:50, absent_days:8, total_paid:250000, today:null },
    { id:"w6", name:"Ibrahim SANOGO", role:"chef de chantier", daily_rate:18000, phone:"+225 01 23 45 67", present_days:52, absent_days:2, total_paid:936000, today:null },
  ],
  ch2: [
    { id:"w7", name:"Oumar NDIAYE", role:"maçon", daily_rate:9000, phone:"+221 77 111 22 33", present_days:28, absent_days:3, total_paid:252000, today:null },
    { id:"w8", name:"Moussa FALL", role:"chef de chantier", daily_rate:20000, phone:"+221 78 444 55 66", present_days:30, absent_days:1, total_paid:600000, today:null },
    { id:"w9", name:"Cheikh DIOP", role:"manœuvre", daily_rate:5500, phone:"+221 76 777 88 99", present_days:25, absent_days:5, total_paid:137500, today:null },
  ],
  ch3: [
    { id:"w10", name:"Jean MARTIN", role:"maçon", daily_rate:220, phone:"+33 6 12 34 56 78", present_days:120, absent_days:5, total_paid:26400, today:null },
    { id:"w11", name:"Pierre DUPONT", role:"charpentier", daily_rate:240, phone:"+33 6 98 76 54 32", present_days:45, absent_days:2, total_paid:10800, today:null },
  ],
};

const MOCK_PHOTOS = {
  ch1: [
    { week: 1, label: "Terrassement", thumb: null },
    { week: 2, label: "Fondations", thumb: null },
    { week: 4, label: "Murs RDC", thumb: null },
    { week: 7, label: "Dalle RDC", thumb: null },
    { week: 10, label: "Murs R+1 — en cours", thumb: null },
  ],
  ch2: [
    { week: 1, label: "Démarrage chantier", thumb: null },
    { week: 3, label: "Pieux béton", thumb: null },
  ],
  ch3: [
    { week: 1, label: "Terrassement", thumb: null },
    { week: 8, label: "Charpente posée", thumb: null },
    { week: 18, label: "Livraison finale", thumb: null },
  ],
};

// ── COMPONENT ────────────────────────────────────────────────────────────────

export default function GestionChantier({ plan }) {
  const [tab, setTab] = useState("dashboard");
  const [chantiers, setChantiers] = useState(MOCK_CHANTIERS);
  const [activeId, setActiveId] = useState("ch1");
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [workers, setWorkers] = useState(MOCK_WORKERS);

  // Formulaires
  const [showNewChantier, setShowNewChantier] = useState(false);
  const [newCh, setNewCh] = useState({ name:"", location:"", start_date:"", end_date:"", budget:"" });
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title:"", category:"fondations", week:1, status:"planifie", assigned_to:"", budget:"" });
  const [showNewWorker, setShowNewWorker] = useState(false);
  const [newWorker, setNewWorker] = useState({ name:"", role:"maçon", daily_rate:"", phone:"" });

  const isPro = plan !== "free";
  const active = chantiers.find(c => c.id === activeId);
  const activeTasks = tasks[activeId] || [];
  const activeWorkers = workers[activeId] || [];
  const activePhotos = MOCK_PHOTOS[activeId] || [];

  // CRUD — local state only
  const createChantier = () => {
    if (!newCh.name) return;
    const id = "ch" + Date.now();
    setChantiers(prev => [...prev, { id, ...newCh, budget: +newCh.budget || 0, status:"planifie", progress:0 }]);
    setTasks(prev => ({ ...prev, [id]: [] }));
    setWorkers(prev => ({ ...prev, [id]: [] }));
    setActiveId(id);
    setShowNewChantier(false);
    setNewCh({ name:"", location:"", start_date:"", end_date:"", budget:"" });
  };

  const addTask = () => {
    if (!newTask.title) return;
    const id = "t" + Date.now();
    setTasks(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), { id, ...newTask, week:+newTask.week||1, budget:+newTask.budget||0, paid:0 }] }));
    setShowNewTask(false);
    setNewTask({ title:"", category:"fondations", week:1, status:"planifie", assigned_to:"", budget:"" });
  };

  const updateTaskStatus = (taskId) => {
    setTasks(prev => {
      const list = prev[activeId] || [];
      return { ...prev, [activeId]: list.map(t => {
        if (t.id !== taskId) return t;
        const next = t.status === "planifie" ? "en_cours" : t.status === "en_cours" ? "termine" : "planifie";
        return { ...t, status: next };
      })};
    });
  };

  const addWorker = () => {
    if (!newWorker.name) return;
    const id = "w" + Date.now();
    setWorkers(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), { id, ...newWorker, daily_rate:+newWorker.daily_rate||0, present_days:0, absent_days:0, total_paid:0, today:null }] }));
    setShowNewWorker(false);
    setNewWorker({ name:"", role:"maçon", daily_rate:"", phone:"" });
  };

  const markAttendance = (workerId, present) => {
    setWorkers(prev => {
      const list = prev[activeId] || [];
      return { ...prev, [activeId]: list.map(w => {
        if (w.id !== workerId) return w;
        if (w.today === present) return w; // already marked
        const newPresent = present ? w.present_days + 1 : w.present_days;
        const newAbsent = !present ? w.absent_days + 1 : w.absent_days;
        const newPaid = present ? w.total_paid + w.daily_rate : w.total_paid;
        return { ...w, today: present, present_days: newPresent, absent_days: newAbsent, total_paid: newPaid };
      })};
    });
  };

  // KPIs
  const totalBudget = active?.budget || 0;
  const workerSpend = activeWorkers.reduce((s, w) => s + w.total_paid, 0);
  const taskSpend = activeTasks.reduce((s, t) => s + (t.paid || 0), 0);
  const spent = workerSpend + taskSpend;
  const tasksDone = activeTasks.filter(t => t.status === "termine").length;
  const progress = active?.progress ?? (activeTasks.length ? Math.round(tasksDone / activeTasks.length * 100) : 0);
  const retards = activeTasks.filter(t => t.status === "retard").length;
  const workersPresentToday = activeWorkers.filter(w => w.today === true).length;

  // Planning weeks
  const maxWeek = Math.max(...activeTasks.map(t => t.week || 1), 12);
  const WEEKS = Array.from({ length: Math.min(maxWeek, 20) }, (_, i) => i + 1);

  if (!isPro) {
    return (
      <div className="lock-overlay" style={{ marginTop: 20 }}>
        <div className="lock-icon" style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
        <div className="lock-title">Gestion de chantier — Plan PRO</div>
        <div className="lock-sub">
          Le tableau de bord chantier complet est disponible à partir du plan PRO.<br />
          Planning Gantt, pointage ouvriers, jalons paiement, photos, alertes retard.
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>

      {/* Sélecteur de chantier */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:"var(--gold)", letterSpacing:2 }}>MES CHANTIERS</div>
          <button className="btn btn-gold btn-sm" onClick={() => setShowNewChantier(v => !v)}>+ Nouveau chantier</button>
        </div>

        {showNewChantier && (
          <div style={{ background:"var(--panel2)", border:"1px solid var(--gold3)", borderRadius:8, padding:14, marginBottom:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Nom du chantier</label>
                <input value={newCh.name} onChange={e => setNewCh(p => ({ ...p, name:e.target.value }))} placeholder="Ma Maison Dakar" style={{ marginTop:4, width:"100%" }} />
              </div>
              <div>
                <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Localisation</label>
                <input value={newCh.location} onChange={e => setNewCh(p => ({ ...p, location:e.target.value }))} placeholder="Ville, Quartier" style={{ marginTop:4, width:"100%" }} />
              </div>
              <div>
                <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Date début</label>
                <input type="date" value={newCh.start_date} onChange={e => setNewCh(p => ({ ...p, start_date:e.target.value }))} style={{ marginTop:4, width:"100%" }} />
              </div>
              <div>
                <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Date fin prévue</label>
                <input type="date" value={newCh.end_date} onChange={e => setNewCh(p => ({ ...p, end_date:e.target.value }))} style={{ marginTop:4, width:"100%" }} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Budget total (FCFA / €)</label>
                <input type="number" value={newCh.budget} onChange={e => setNewCh(p => ({ ...p, budget:e.target.value }))} placeholder="ex: 50000000" style={{ marginTop:4, width:"100%" }} />
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-gold btn-sm" onClick={createChantier} disabled={!newCh.name}>Créer</button>
              <button className="btn btn-out btn-sm" onClick={() => setShowNewChantier(false)}>Annuler</button>
            </div>
          </div>
        )}

        <div className="chantier-selector">
          {chantiers.map(c => (
            <div key={c.id} className={`ch-chip${activeId === c.id ? " active" : ""}`} onClick={() => setActiveId(c.id)}>
              🏗️ {c.name}
              <span style={{ marginLeft:6, opacity:.6, fontSize:10 }}>{c.location || ""}</span>
              <span className={`status-badge sb-${c.status}`} style={{ marginLeft:6 }}>{STATUS_LABELS_C[c.status] || c.status}</span>
            </div>
          ))}
        </div>
      </div>

      {active && (
        <>
          {/* Onglets */}
          <div className="tabs">
            {[
              { id:"dashboard", label:"📊 Vue d'ensemble" },
              { id:"planning",  label:"📅 Planning" },
              { id:"ouvriers",  label:"👷 Ouvriers" },
              { id:"paiements", label:"💰 Paiements" },
              { id:"photos",    label:"📷 Photos" },
              { id:"alertes",   label:"⚠️ Alertes" },
            ].map(t => (
              <div key={t.id} className={`tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</div>
            ))}
          </div>

          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && (
            <div>
              <div className="chantier-kpi-row">
                <div className="ch-kpi">
                  <div className="ch-kpi-lbl">Avancement</div>
                  <div className="ch-kpi-val">{progress}%</div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width:`${progress}%` }} /></div>
                </div>
                <div className="ch-kpi">
                  <div className="ch-kpi-lbl">Budget total</div>
                  <div className="ch-kpi-val" style={{ fontSize:16 }}>{fmt(totalBudget)}</div>
                  <div className="ch-kpi-sub">Dépensé : {fmt(spent)}</div>
                </div>
                <div className="ch-kpi">
                  <div className="ch-kpi-lbl">Tâches</div>
                  <div className="ch-kpi-val">{tasksDone}/{activeTasks.length}</div>
                  <div className="ch-kpi-sub">{retards} retard{retards > 1 ? "s" : ""}</div>
                </div>
                <div className="ch-kpi">
                  <div className="ch-kpi-lbl">Ouvriers</div>
                  <div className="ch-kpi-val">{activeWorkers.length}</div>
                  <div className="ch-kpi-sub">{workersPresentToday} présent{workersPresentToday > 1 ? "s" : ""} aujourd'hui</div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div className="card">
                  <div className="card-title">Infos chantier</div>
                  {[
                    ["Nom", active.name],
                    ["Localisation", active.location || "—"],
                    ["Début", active.start_date || "—"],
                    ["Fin prévue", active.end_date || "—"],
                    ["Statut", STATUS_LABELS_C[active.status] || active.status],
                    ["Budget", active.budget ? `${fmt(active.budget)}` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid var(--border)", fontSize:11 }}>
                      <span style={{ color:"var(--dim)" }}>{k}</span>
                      <span style={{ color:"var(--gold)", fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="card-title">Répartition des tâches</div>
                  {["planifie","en_cours","termine","retard"].map(s => {
                    const count = activeTasks.filter(t => t.status === s).length;
                    const pct = activeTasks.length ? Math.round(count / activeTasks.length * 100) : 0;
                    return (
                      <div key={s} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                          <span style={{ color:"var(--dim)" }}>{STATUS_LABELS_C[s]}</span>
                          <span style={{ color:"var(--gold)" }}>{count} ({pct}%)</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{
                            width:`${pct}%`,
                            background: s==="termine" ? "var(--ok)" : s==="retard" ? "var(--err)" : s==="en_cours" ? "var(--gold)" : "var(--dim)"
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Budget breakdown */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:14 }}>
                {[
                  { label:"Budget total", val:totalBudget, color:"var(--text, #f0f0f0)" },
                  { label:"Masse salariale", val:workerSpend, color:"var(--warn, #E8A94C)" },
                  { label:"Budget restant", val:Math.max(0, totalBudget - spent), color:"var(--ok)" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="card" style={{ textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:2, marginBottom:6 }}>{label}</div>
                    <div style={{ fontFamily:"'Cinzel',serif", fontSize:18, color }}>{fmt(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PLANNING ── */}
          {tab === "planning" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontSize:11, color:"var(--dim)" }}>
                  Planning semaine par semaine — {activeTasks.length} tâche{activeTasks.length > 1 ? "s" : ""}
                </div>
                <button className="btn btn-gold btn-sm" onClick={() => setShowNewTask(v => !v)}>+ Ajouter tâche</button>
              </div>

              {showNewTask && (
                <div className="card" style={{ marginBottom:14 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                    <div style={{ gridColumn:"1/-1" }}>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Titre de la tâche</label>
                      <input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title:e.target.value }))} placeholder="ex: Coulage des fondations" style={{ marginTop:4, width:"100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Catégorie</label>
                      <select value={newTask.category} onChange={e => setNewTask(p => ({ ...p, category:e.target.value }))} style={{ marginTop:4, width:"100%" }}>
                        {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Semaine</label>
                      <input type="number" min="1" max="52" value={newTask.week} onChange={e => setNewTask(p => ({ ...p, week:e.target.value }))} style={{ marginTop:4, width:"100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Statut</label>
                      <select value={newTask.status} onChange={e => setNewTask(p => ({ ...p, status:e.target.value }))} style={{ marginTop:4, width:"100%" }}>
                        {Object.entries(STATUS_LABELS_C).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Assigné à</label>
                      <input value={newTask.assigned_to} onChange={e => setNewTask(p => ({ ...p, assigned_to:e.target.value }))} placeholder="Nom artisan" style={{ marginTop:4, width:"100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Budget</label>
                      <input type="number" value={newTask.budget} onChange={e => setNewTask(p => ({ ...p, budget:e.target.value }))} placeholder="0" style={{ marginTop:4, width:"100%" }} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn btn-gold btn-sm" onClick={addTask} disabled={!newTask.title}>Ajouter</button>
                    <button className="btn btn-out btn-sm" onClick={() => setShowNewTask(false)}>Annuler</button>
                  </div>
                </div>
              )}

              {/* Gantt simplifié */}
              <div className="card" style={{ overflowX:"auto" }}>
                <div style={{ minWidth:640 }}>
                  <div className="week-header">
                    <div style={{ width:180, flexShrink:0, padding:"6px 10px", fontSize:9, color:"var(--gold3)", borderRight:"1px solid var(--border)", textTransform:"uppercase", letterSpacing:1 }}>Tâche</div>
                    {WEEKS.map(w => <div key={w} className="week-cell">S{w}</div>)}
                  </div>

                  {activeTasks.length === 0 && (
                    <div style={{ padding:20, textAlign:"center", color:"var(--dim)", fontSize:11 }}>Aucune tâche planifiée</div>
                  )}

                  {activeTasks.map(task => (
                    <div key={task.id} className="task-row">
                      <div className="task-label">
                        <div style={{ fontWeight:600, fontSize:11 }}>{task.title}</div>
                        <div style={{ fontSize:9, color:"var(--dim)" }}>{task.category}{task.assigned_to ? ` · ${task.assigned_to}` : ""}</div>
                      </div>
                      {WEEKS.map(w => (
                        <div key={w} className="task-bar-cell" onClick={() => updateTaskStatus(task.id)}>
                          {(task.week || 1) === w && (
                            <div className={`task-bar ${STATUS_COLORS[task.status] || "t-planifie"}`} title={`Statut: ${STATUS_LABELS_C[task.status]} — Cliquer pour avancer`}>
                              {STATUS_LABELS_C[task.status]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, color:"var(--dim)", marginTop:8 }}>
                  Cliquez sur une barre : Planifié → En cours → Terminé → Planifié
                </div>
              </div>
            </div>
          )}

          {/* ── OUVRIERS ── */}
          {tab === "ouvriers" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontSize:11, color:"var(--dim)" }}>
                  {activeWorkers.length} ouvrier{activeWorkers.length > 1 ? "s" : ""} enregistré{activeWorkers.length > 1 ? "s" : ""}
                </div>
                <button className="btn btn-gold btn-sm" onClick={() => setShowNewWorker(v => !v)}>+ Ajouter ouvrier</button>
              </div>

              {showNewWorker && (
                <div className="card" style={{ marginBottom:14 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                    <div>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Nom</label>
                      <input value={newWorker.name} onChange={e => setNewWorker(p => ({ ...p, name:e.target.value }))} placeholder="Prénom Nom" style={{ marginTop:4, width:"100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Rôle</label>
                      <select value={newWorker.role} onChange={e => setNewWorker(p => ({ ...p, role:e.target.value }))} style={{ marginTop:4, width:"100%" }}>
                        {WORKER_ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Taux journalier</label>
                      <input type="number" value={newWorker.daily_rate} onChange={e => setNewWorker(p => ({ ...p, daily_rate:e.target.value }))} placeholder="ex: 6000" style={{ marginTop:4, width:"100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1 }}>Téléphone</label>
                      <input value={newWorker.phone} onChange={e => setNewWorker(p => ({ ...p, phone:e.target.value }))} placeholder="+221 77 000 00 00" style={{ marginTop:4, width:"100%" }} />
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn btn-gold btn-sm" onClick={addWorker} disabled={!newWorker.name}>Ajouter</button>
                    <button className="btn btn-out btn-sm" onClick={() => setShowNewWorker(false)}>Annuler</button>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-title">Tableau de pointage</div>
                {activeWorkers.length === 0 ? (
                  <div style={{ textAlign:"center", color:"var(--dim)", fontSize:11, padding:20 }}>Aucun ouvrier enregistré</div>
                ) : (
                  <table className="worker-table">
                    <thead>
                      <tr>
                        <th>Nom</th><th>Rôle</th><th>Taux/j</th>
                        <th>Présences</th><th>Absences</th><th>Total payé</th>
                        <th>Pointage du jour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeWorkers.map(w => (
                        <tr key={w.id}>
                          <td style={{ fontWeight:600 }}>{w.name}</td>
                          <td>
                            <span style={{ background:"rgba(201,168,76,.08)", color:"var(--gold)", borderRadius:10, padding:"2px 8px", fontSize:10 }}>{w.role}</span>
                          </td>
                          <td style={{ color:"var(--dim)" }}>{w.daily_rate ? `${fmt(w.daily_rate)}` : "—"}</td>
                          <td style={{ color:"var(--ok)", fontWeight:600 }}>{w.present_days}j</td>
                          <td style={{ color:"var(--err)" }}>{w.absent_days}j</td>
                          <td style={{ fontFamily:"'Cinzel',serif", color:"var(--gold)" }}>{fmt(w.total_paid)}</td>
                          <td>
                            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                              <button
                                className={`attendance-btn ${w.today === true ? "att-present" : ""}`}
                                style={w.today !== true ? { background:"transparent", borderColor:"var(--border)", color:"var(--dim)" } : {}}
                                onClick={() => markAttendance(w.id, true)}
                                title="Présent"
                              >✓</button>
                              <button
                                className={`attendance-btn ${w.today === false ? "att-absent" : ""}`}
                                style={w.today !== false ? { background:"transparent", borderColor:"var(--border)", color:"var(--dim)" } : {}}
                                onClick={() => markAttendance(w.id, false)}
                                title="Absent"
                              >✗</button>
                              {w.today !== null && (
                                <span style={{ fontSize:9, color: w.today ? "var(--ok)" : "var(--err)" }}>
                                  {w.today ? "Présent" : "Absent"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop:"1px solid var(--gold3)" }}>
                        <td colSpan={5} style={{ padding:"8px 12px", fontFamily:"'Cinzel',serif", fontSize:11, color:"var(--gold)" }}>TOTAL MASSE SALARIALE</td>
                        <td style={{ padding:"8px 12px", fontFamily:"'Cinzel',serif", color:"var(--gold)", fontWeight:700 }}>
                          {fmt(workerSpend)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── PAIEMENTS / JALONS ── */}
          {tab === "paiements" && (
            <div>
              <div className="card" style={{ marginBottom:14 }}>
                <div className="card-title">Jalons de paiement artisans</div>
                <div className="jalons-list">
                  {activeTasks.filter(t => t.budget > 0).map(t => {
                    const paid = t.paid || 0;
                    const isPaid = paid >= t.budget;
                    const isDue = !isPaid && t.status === "termine";
                    return (
                      <div key={t.id} className="jalon">
                        <div className={`jalon-dot ${isPaid ? "j-paid" : isDue ? "j-due" : "j-future"}`} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:12 }}>{t.title}</div>
                          <div style={{ fontSize:10, color:"var(--dim)" }}>
                            {t.assigned_to || "Non assigné"} · {STATUS_LABELS_C[t.status]}
                          </div>
                          <div className="progress-bar" style={{ marginTop:4 }}>
                            <div className="progress-fill" style={{
                              width:`${Math.min(100, t.budget ? paid / t.budget * 100 : 0)}%`,
                              background: isPaid ? "var(--ok)" : isDue ? "var(--warn, #E8A94C)" : "var(--dim)"
                            }} />
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontFamily:"'Cinzel',serif", color:"var(--gold)", fontSize:14 }}>{fmt(t.budget)}</div>
                          <div style={{ fontSize:10, color: isPaid ? "var(--ok)" : isDue ? "var(--warn, #E8A94C)" : "var(--dim)" }}>
                            {isPaid ? "✓ Payé" : isDue ? "⚠ À payer" : "En attente"}
                          </div>
                          {isDue && (
                            <button
                              className="btn btn-gold btn-sm"
                              style={{ marginTop:4, fontSize:9, padding:"3px 10px" }}
                              onClick={() => setTasks(prev => ({ ...prev, [activeId]: (prev[activeId] || []).map(tk => tk.id === t.id ? { ...tk, paid: tk.budget } : tk) }))}
                            >Marquer payé</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {activeTasks.filter(t => t.budget > 0).length === 0 && (
                    <div style={{ textAlign:"center", color:"var(--dim)", fontSize:11, padding:20 }}>
                      Ajoutez des budgets aux tâches dans l'onglet Planning pour voir les jalons.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                {[
                  { label:"Budget total", val:totalBudget, color:"var(--text, #f0f0f0)" },
                  { label:"Masse salariale", val:workerSpend, color:"var(--warn, #E8A94C)" },
                  { label:"Budget restant", val:Math.max(0, totalBudget - spent), color:"var(--ok)" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="card" style={{ textAlign:"center" }}>
                    <div style={{ fontSize:9, color:"var(--dim)", textTransform:"uppercase", letterSpacing:2, marginBottom:6 }}>{label}</div>
                    <div style={{ fontFamily:"'Cinzel',serif", fontSize:18, color }}>{fmt(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PHOTOS ── */}
          {tab === "photos" && (
            <div className="card">
              <div className="card-title">Photos de chantier</div>
              <div style={{ fontSize:11, color:"var(--dim)", marginBottom:14 }}>
                Conservez un historique visuel de l'avancement semaine par semaine.
              </div>
              <div className="photo-grid">
                {activePhotos.map((p, i) => (
                  <div key={i} className="photo-slot photo-filled" style={{ borderColor:"rgba(201,168,76,.4)" }}>
                    <span style={{ fontSize:22, marginBottom:6 }}>📷</span>
                    <span style={{ fontWeight:600, color:"var(--gold)" }}>S{p.week}</span>
                    <span style={{ fontSize:10, marginTop:2 }}>{p.label}</span>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 12 - activePhotos.length) }, (_, i) => (
                  <div key={`empty-${i}`} className="photo-slot" onClick={() => alert("Connectez votre stockage cloud (AWS S3, Cloudinary, Firebase) pour activer l'upload.")}>
                    <span style={{ fontSize:22, marginBottom:6 }}>📷</span>
                    <span>Semaine {activePhotos.length + i + 1}</span>
                    <span style={{ fontSize:9, color:"var(--dim)", marginTop:2 }}>Cliquer pour ajouter</span>
                  </div>
                ))}
              </div>
              <div className="note" style={{ marginTop:14 }}>
                Connectez votre stockage cloud (AWS S3, Cloudinary, Firebase Storage) pour activer l'upload direct depuis l'application.
              </div>
            </div>
          )}

          {/* ── ALERTES ── */}
          {tab === "alertes" && (
            <div>
              <div className="card">
                <div className="card-title">Alertes et notifications</div>

                {retards === 0 && totalBudget === 0 && (!active.end_date || new Date(active.end_date) > new Date(Date.now() + 14 * 86400000)) && (
                  <div style={{ textAlign:"center", color:"var(--dim)", fontSize:11, padding:20 }}>
                    ✓ Aucune alerte active pour ce chantier
                  </div>
                )}

                {retards > 0 && (
                  <div className="alert-row">
                    <span style={{ fontSize:16 }}>🔴</span>
                    <div>
                      <div style={{ fontWeight:600, color:"var(--err)" }}>Retard détecté</div>
                      <div style={{ color:"var(--dim)", marginTop:2 }}>
                        {retards} tâche{retards > 1 ? "s" : ""} en retard : {activeTasks.filter(t => t.status === "retard").map(t => t.title).join(", ")}
                      </div>
                    </div>
                  </div>
                )}

                {totalBudget > 0 && spent > totalBudget * 0.8 && (
                  <div className="alert-row" style={{ background:"rgba(201,76,76,.06)", borderColor:"rgba(201,76,76,.2)" }}>
                    <span style={{ fontSize:16 }}>💸</span>
                    <div>
                      <div style={{ fontWeight:600, color:"var(--err)" }}>Budget à risque</div>
                      <div style={{ color:"var(--dim)", marginTop:2 }}>
                        {Math.round(spent / totalBudget * 100)}% du budget consommé — surveillez les dépenses.
                      </div>
                    </div>
                  </div>
                )}

                {active.end_date && new Date(active.end_date) < new Date(Date.now() + 14 * 86400000) && active.status !== "termine" && (
                  <div className="alert-row">
                    <span style={{ fontSize:16 }}>📅</span>
                    <div>
                      <div style={{ fontWeight:600, color:"var(--warn, #E8A94C)" }}>Fin de chantier approche</div>
                      <div style={{ color:"var(--dim)", marginTop:2 }}>
                        Date de fin prévue : {active.end_date}. Avancement actuel : {progress}%.
                      </div>
                    </div>
                  </div>
                )}

                {activeTasks.filter(t => t.status === "termine" && t.budget > 0 && (t.paid || 0) < t.budget).length > 0 && (
                  <div className="alert-row" style={{ background:"rgba(201,168,76,.06)", borderColor:"rgba(201,168,76,.2)" }}>
                    <span style={{ fontSize:16 }}>💰</span>
                    <div>
                      <div style={{ fontWeight:600, color:"var(--gold)" }}>Paiements en attente</div>
                      <div style={{ color:"var(--dim)", marginTop:2 }}>
                        {activeTasks.filter(t => t.status === "termine" && t.budget > 0 && (t.paid || 0) < t.budget).length} tâche{activeTasks.filter(t => t.status === "termine" && t.budget > 0 && (t.paid || 0) < t.budget).length > 1 ? "s" : ""} terminée{activeTasks.filter(t => t.status === "termine" && t.budget > 0 && (t.paid || 0) < t.budget).length > 1 ? "s" : ""} non payée{activeTasks.filter(t => t.status === "termine" && t.budget > 0 && (t.paid || 0) < t.budget).length > 1 ? "s" : ""}.
                        Allez dans l'onglet Paiements pour régulariser.
                      </div>
                    </div>
                  </div>
                )}

                {activeWorkers.filter(w => w.today === null).length > 0 && (
                  <div className="alert-row">
                    <span style={{ fontSize:16 }}>👷</span>
                    <div>
                      <div style={{ fontWeight:600, color:"var(--gold)" }}>Pointage du jour incomplet</div>
                      <div style={{ color:"var(--dim)", marginTop:2 }}>
                        {activeWorkers.filter(w => w.today === null).length} ouvrier{activeWorkers.filter(w => w.today === null).length > 1 ? "s" : ""} non pointé{activeWorkers.filter(w => w.today === null).length > 1 ? "s" : ""} aujourd'hui.
                        Allez dans l'onglet Ouvriers pour marquer les présences.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
