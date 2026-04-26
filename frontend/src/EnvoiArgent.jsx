import { useState, useMemo } from "react";

const TABS = [
  { id: "envoi",     icon: "💸", label: "Envoi d'argent" },
  { id: "suivi",     icon: "📷", label: "Suivi chantier" },
  { id: "peinture",  icon: "🎨", label: "Peinture à distance" },
  { id: "commandes", icon: "📦", label: "Commandes" },
  { id: "pieges",    icon: "⚠️", label: "Pièges & arnaques" },
  { id: "checklist", icon: "✅", label: "Checklist paiement" },
];

const SERVICES = [
  { name: "Wise (TransferWise)", fees: 0.007, time: "1-2j",      note: "Meilleur taux du marché" },
  { name: "Wave",                fees: 0.010, time: "Instantané", note: "CI, SN, ML, BF — mobile" },
  { name: "Orange Money",        fees: 0.020, time: "Instantané", note: "Afrique de l'Ouest" },
  { name: "Remitly",             fees: 0.022, time: "0-4h",       note: "Express disponible" },
  { name: "WorldRemit",          fees: 0.028, time: "0-2h",       note: "Bon taux de change" },
  { name: "Western Union",       fees: 0.035, time: "0-1h",       note: "Espèces en agence" },
  { name: "CCP / Mandats",       fees: 0.040, time: "3-7j",       note: "Poste Algérie" },
];

const CURRENCIES = [
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "CHF", flag: "🇨🇭", name: "Franc suisse" },
  { code: "GBP", flag: "🇬🇧", name: "Livre sterling" },
  { code: "CAD", flag: "🇨🇦", name: "Dollar canadien" },
  { code: "USD", flag: "🇺🇸", name: "Dollar US" },
];

const TARGET_CURRENCIES = [
  { code: "XOF", flag: "🌍", name: "FCFA (UEMOA)",      rate: 655.957 },
  { code: "MAD", flag: "🇲🇦", name: "Dirham marocain",  rate: 10.84 },
  { code: "DZD", flag: "🇩🇿", name: "Dinar algérien",   rate: 145.2 },
  { code: "TND", flag: "🇹🇳", name: "Dinar tunisien",   rate: 3.32 },
  { code: "NGN", flag: "🇳🇬", name: "Naira nigérian",   rate: 1650 },
  { code: "GNF", flag: "🇬🇳", name: "Franc guinéen",    rate: 9200 },
];

const COULEURS = [
  { name: "Blanc cassé Sahel",  hex: "#F5F0E8", usage: "Façade, intérieur" },
  { name: "Ocre chaud",         hex: "#C4893A", usage: "Façade, accent" },
  { name: "Terracotta",         hex: "#B85A3A", usage: "Extérieur, muret" },
  { name: "Vert tropical",      hex: "#3A7A4A", usage: "Volets, portails" },
  { name: "Bleu Tamaris",       hex: "#4A7A9B", usage: "Fenêtres, décor" },
  { name: "Gris perle",         hex: "#C0BCBA", usage: "Intérieur moderne" },
  { name: "Jaune soleil",       hex: "#D4A017", usage: "Accent, portail" },
  { name: "Noir graphite",      hex: "#2C2C2C", usage: "Grilles, ferronnerie" },
];

const PIEGES = [
  {
    cat: "Haute priorité", color: "var(--err)",
    items: [
      { title: "Acompte trop élevé", desc: "Ne jamais verser plus de 30% avant démarrage. Exiger un reçu officiel avec tampon et signature pour chaque versement." },
      { title: "Artisan fantôme", desc: "Vérifier l'existence légale : numéro RCCM, attestation fiscale. Demander 3 références de chantiers terminés avec contacts." },
      { title: "Matériaux substitués", desc: "Ciment standard remplacé par du ciment dégradé, acier HA remplacé par du rond lisse. Exiger les bons de livraison nominatifs." },
      { title: "Double facturation", desc: "Même prestation facturée deux fois sous des noms différents. Tenir un tableau de toutes les factures et comparer." },
    ],
  },
  {
    cat: "Risques courants", color: "var(--warn)",
    items: [
      { title: "Devis verbal sans écrit", desc: "Tout accord doit être signé. Un devis oral n'est pas opposable. Préférer un marché de gré à gré avec planning et prix fixe." },
      { title: "Avenants non documentés", desc: "Chaque modification = avenant écrit et signé avec montant supplémentaire. Refuser les 'on arrangera à la fin'." },
      { title: "Taux de change défavorable", desc: "Faire les virements quand l'euro est fort. Utiliser Wise ou WorldRemit plutôt que les banques classiques (15-40% plus cher)." },
      { title: "Frais cachés de douane", desc: "Pour les matériaux importés, prévoir 15-25% de frais supplémentaires (TVA + droits de douane + transitaire)." },
    ],
  },
  {
    cat: "Vigilance", color: "var(--ok)",
    items: [
      { title: "Sous-traitance non déclarée", desc: "L'entrepreneur principal cède le chantier à un sous-traitant non qualifié. Exiger de rencontrer l'équipe terrain." },
      { title: "Photos truquées", desc: "Photos d'archive envoyées. Demander une photo avec repère daté (journal du jour, main tenant une pièce spécifique)." },
      { title: "Urgences fabriquées", desc: "'Il faut payer maintenant sinon tout s'arrête.' Prendre 48h avant tout virement non planifié." },
    ],
  },
];

const CHECKLIST_ITEMS = [
  { id: 1,  phase: "Avant contrat",    text: "Vérifier l'identité légale de l'entrepreneur (RCCM, NIF)" },
  { id: 2,  phase: "Avant contrat",    text: "Obtenir 3 devis comparatifs signés et datés" },
  { id: 3,  phase: "Avant contrat",    text: "Signature d'un contrat avec planning, jalons et pénalités de retard" },
  { id: 4,  phase: "Acompte",          text: "Ne jamais dépasser 30% d'acompte initial" },
  { id: 5,  phase: "Acompte",          text: "Reçu officiel avec tampon, montant en lettres et en chiffres" },
  { id: 6,  phase: "Acompte",          text: "Photo du site avant tout premier versement" },
  { id: 7,  phase: "En cours",         text: "Photos hebdomadaires géolocalisées (WhatsApp)" },
  { id: 8,  phase: "En cours",         text: "Paiement par tranche lié à des jalons visibles" },
  { id: 9,  phase: "En cours",         text: "Conserver tous les bons de livraison matériaux" },
  { id: 10, phase: "En cours",         text: "Contre-visite surprise par un tiers de confiance sur place" },
  { id: 11, phase: "Fin de chantier",  text: "Inspection complète avant dernier paiement" },
  { id: 12, phase: "Fin de chantier",  text: "Liste des réserves écrite et signée par les deux parties" },
  { id: 13, phase: "Fin de chantier",  text: "Obtenir toutes les factures finales et garanties" },
  { id: 14, phase: "Fin de chantier",  text: "Photos de réception complète du chantier" },
];

const fmt = n => Number(n).toLocaleString("fr-FR");

const statusColor = s =>
  s === "livré" ? "var(--ok)" : s === "commandé" ? "var(--warn)" : "var(--dim)";

export default function EnvoiArgent({ plan, lang }) {
  const [tab, setTab] = useState("envoi");

  // — Envoi d'argent
  const [montant, setMontant] = useState(500);
  const [fromCur, setFromCur] = useState("EUR");
  const [toCur, setToCur] = useState("XOF");

  // — Suivi chantier
  const [etapes, setEtapes] = useState([
    { id: 1,  label: "Fondations",                 done: true,  note: "Coulé le 15/03/2025",  date: "2025-03-15" },
    { id: 2,  label: "Élévation des murs RDC",     done: true,  note: "Terminé à 100%",        date: "2025-04-02" },
    { id: 3,  label: "Charpente / Toiture",         done: false, note: "",                      date: "" },
    { id: 4,  label: "Menuiseries extérieures",     done: false, note: "",                      date: "" },
    { id: 5,  label: "Plomberie",                   done: false, note: "",                      date: "" },
    { id: 6,  label: "Électricité",                 done: false, note: "",                      date: "" },
    { id: 7,  label: "Enduits intérieurs",           done: false, note: "",                      date: "" },
    { id: 8,  label: "Carrelage",                   done: false, note: "",                      date: "" },
    { id: 9,  label: "Peinture",                    done: false, note: "",                      date: "" },
    { id: 10, label: "Livraison finale",            done: false, note: "",                      date: "" },
  ]);
  const [newEtape, setNewEtape] = useState("");

  // — Peinture
  const [selectedColors, setSelectedColors] = useState([]);
  const [paintNote, setPaintNote] = useState("");

  // — Commandes
  const [commandes, setCommandes] = useState([
    { id: 1, article: "Ciment CPA 42.5 (50 sacs)",      fournisseur: "CIMAF CI",       montant: 180000, statut: "livré",      date: "2025-03-10" },
    { id: 2, article: "Fer à béton HA 10mm (500 kg)",   fournisseur: "SIFCA Matériaux", montant: 250000, statut: "livré",      date: "2025-03-12" },
    { id: 3, article: "Fenêtres aluminium (6 unités)",  fournisseur: "ALUPRO",          montant: 420000, statut: "en attente", date: "2025-04-20" },
    { id: 4, article: "Carrelage 60×60 (120 m²)",       fournisseur: "SAHELMAT",        montant: 180000, statut: "commandé",   date: "2025-04-18" },
  ]);
  const [newCmd, setNewCmd] = useState({ article: "", fournisseur: "", montant: "", statut: "commandé", date: "" });

  // — Checklist
  const [checked, setChecked] = useState({});

  // ── Calculs ──
  const targetRate = useMemo(() => TARGET_CURRENCIES.find(c => c.code === toCur)?.rate ?? 1, [toCur]);

  const comparatif = useMemo(() =>
    SERVICES.map(s => {
      const frais = Math.round(montant * s.fees * 100) / 100;
      const net   = montant - frais;
      const recu  = Math.round(net * targetRate);
      return { ...s, frais, net, recu };
    }), [montant, targetRate]);

  const progChantier = useMemo(() =>
    Math.round((etapes.filter(e => e.done).length / etapes.length) * 100),
  [etapes]);

  const totalCommandes = useMemo(() =>
    commandes.reduce((s, c) => s + (parseFloat(c.montant) || 0), 0),
  [commandes]);

  const checklistByPhase = useMemo(() => {
    const map = {};
    CHECKLIST_ITEMS.forEach(item => {
      (map[item.phase] = map[item.phase] || []).push(item);
    });
    return map;
  }, []);

  const checkCount = Object.values(checked).filter(Boolean).length;

  // ── Handlers ──
  const toggleEtape = id =>
    setEtapes(p => p.map(e => e.id === id ? { ...e, done: !e.done } : e));

  const addEtape = () => {
    if (!newEtape.trim()) return;
    setEtapes(p => [...p, { id: Date.now(), label: newEtape, done: false, note: "", date: "" }]);
    setNewEtape("");
  };

  const addCommande = () => {
    if (!newCmd.article.trim()) return;
    setCommandes(p => [...p, { ...newCmd, id: Date.now(), montant: parseFloat(newCmd.montant) || 0 }]);
    setNewCmd({ article: "", fournisseur: "", montant: "", statut: "commandé", date: "" });
  };

  const toggleColor = hex =>
    setSelectedColors(p => p.includes(hex) ? p.filter(c => c !== hex) : [...p, hex]);

  // ── Styles partagés ──
  const card = {
    background: "var(--panel)", border: "1px solid var(--border)",
    borderRadius: 10, padding: 16, marginBottom: 14,
  };
  const cardTitle = {
    fontFamily: "'Cinzel',serif", fontSize: 10, color: "var(--gold)",
    letterSpacing: 2, textTransform: "uppercase", marginBottom: 12,
  };
  const inp = {
    background: "var(--panel2)", border: "1px solid var(--border2)",
    borderRadius: 7, color: "var(--text)", padding: "7px 10px",
    fontSize: 12, outline: "none", fontFamily: "'Montserrat',sans-serif", width: "100%",
  };
  const kpiBox = (color) => ({
    background: "var(--panel)", border: "1px solid var(--border)",
    borderTop: `2px solid ${color}`, borderRadius: 7, padding: "12px 14px",
  });

  return (
    <div>
      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 20, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 14px", background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "var(--gold)" : "transparent"}`,
            color: tab === t.id ? "var(--gold)" : "var(--dim)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Montserrat',sans-serif", letterSpacing: .4,
            whiteSpace: "nowrap", textTransform: "uppercase", transition: "all .15s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══ ENVOI D'ARGENT ══ */}
      {tab === "envoi" && (
        <div>
          <div style={card}>
            <div style={cardTitle}>Simulateur de transfert</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Montant à envoyer</div>
                <input type="number" value={montant} min={1}
                  onChange={e => setMontant(parseFloat(e.target.value) || 0)}
                  style={{ ...inp, fontSize: 16, fontFamily: "'Cinzel',serif" }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Depuis</div>
                <select value={fromCur} onChange={e => setFromCur(e.target.value)} style={inp}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Vers</div>
                <select value={toCur} onChange={e => setToCur(e.target.value)} style={inp}>
                  {TARGET_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ background: "rgba(201,168,76,.06)", border: "1px solid var(--border2)", borderRadius: 7, padding: "8px 12px", fontSize: 11, color: "var(--dim)" }}>
              Taux indicatif : 1 {fromCur} = {targetRate.toLocaleString("fr-FR")} {toCur} · Mis à jour quotidiennement
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {comparatif.map((s, i) => (
              <div key={s.name} style={{
                background: "var(--panel)", border: `1px solid ${i === 0 ? "var(--gold)" : "var(--border)"}`,
                borderRadius: 10, padding: "14px 16px",
                display: "grid", gridTemplateColumns: "1fr auto auto auto", alignItems: "center", gap: 12,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, display: "flex", alignItems: "center", gap: 7 }}>
                    {s.name}
                    {i === 0 && (
                      <span style={{ fontSize: 9, background: "rgba(201,168,76,.15)", color: "var(--gold)", border: "1px solid var(--gold3)", borderRadius: 10, padding: "1px 7px", fontWeight: 700, letterSpacing: 1 }}>
                        MEILLEUR
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--dim)" }}>{s.time} · {s.note}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>Frais</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "var(--ok)" : "var(--warn)" }}>
                    {s.frais.toFixed(2)} {fromCur}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>Net envoyé</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.net.toFixed(2)} {fromCur}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>Reçu</div>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: 14, color: "var(--gold)" }}>{fmt(s.recu)} {toCur}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(201,168,76,.04)", borderLeft: "3px solid var(--gold3)", borderRadius: 4, padding: "10px 14px", fontSize: 11, color: "var(--dim)", marginTop: 14, lineHeight: 1.8 }}>
            💡 <strong style={{ color: "var(--text)" }}>Conseil PHG</strong> — Fractionnez vos virements via Wise pour minimiser les frais. Évitez les virements le vendredi soir (délais bancaires). Gardez captures d'écran de chaque transfert.
          </div>
        </div>
      )}

      {/* ══ SUIVI CHANTIER ══ */}
      {tab === "suivi" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Avancement",         val: progChantier + "%", sub: `${etapes.filter(e => e.done).length}/${etapes.length} étapes`, color: "var(--gold)" },
              { label: "Étapes terminées",   val: etapes.filter(e => e.done).length, sub: "phases complétées", color: "var(--ok)" },
              { label: "Restant",             val: etapes.filter(e => !e.done).length, sub: "phases en attente", color: "var(--warn)" },
            ].map(k => (
              <div key={k.label} style={kpiBox(k.color)}>
                <div style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 22, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 11 }}>
              <span style={{ color: "var(--dim)" }}>Progression globale</span>
              <span style={{ color: "var(--gold)", fontWeight: 700 }}>{progChantier}%</span>
            </div>
            <div style={{ height: 8, background: "var(--panel2)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: progChantier + "%", background: "linear-gradient(90deg,var(--gold3),var(--gold))", borderRadius: 4, transition: "width .4s" }} />
            </div>
          </div>

          <div style={card}>
            <div style={cardTitle}>Étapes du chantier</div>
            {etapes.map((e, i) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < etapes.length - 1 ? "1px solid var(--border)" : "none" }}>
                <button onClick={() => toggleEtape(e.id)} style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: `2px solid ${e.done ? "var(--ok)" : "var(--border2)"}`,
                  background: e.done ? "var(--ok)" : "transparent", cursor: "pointer", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#0A0A0A",
                }}>
                  {e.done ? "✓" : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: e.done ? "var(--dim)" : "var(--text)", textDecoration: e.done ? "line-through" : "none" }}>{e.label}</div>
                  {e.note && <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>{e.note}</div>}
                </div>
                {e.date && <div style={{ fontSize: 9, color: "var(--dim)", flexShrink: 0 }}>{e.date}</div>}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input value={newEtape} onChange={e => setNewEtape(e.target.value)}
              placeholder="Nouvelle étape..." onKeyDown={e => e.key === "Enter" && addEtape()}
              style={{ ...inp, flex: 1 }} />
            <button onClick={addEtape} style={{ background: "var(--gold)", border: "none", borderRadius: 7, padding: "8px 16px", color: "#0A0A0A", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
              + Ajouter
            </button>
          </div>

          <div style={{ background: "rgba(201,168,76,.04)", borderLeft: "3px solid var(--gold3)", borderRadius: 4, padding: "10px 14px", fontSize: 11, color: "var(--dim)", marginTop: 14, lineHeight: 1.8 }}>
            📱 <strong style={{ color: "var(--text)" }}>Astuce</strong> — Demandez une photo WhatsApp géolocalisée chaque lundi matin. Précisez que la photo doit inclure un repère visible (journal du jour, panneau daté).
          </div>
        </div>
      )}

      {/* ══ PEINTURE À DISTANCE ══ */}
      {tab === "peinture" && (
        <div>
          <div style={card}>
            <div style={cardTitle}>Palette de couleurs recommandées</div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 14 }}>
              Sélectionnez vos couleurs et transmettez la référence hexadécimale exacte à votre peintre.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {COULEURS.map(c => (
                <div key={c.hex} onClick={() => toggleColor(c.hex)} style={{
                  cursor: "pointer", border: `2px solid ${selectedColors.includes(c.hex) ? "var(--gold)" : "var(--border)"}`,
                  borderRadius: 8, overflow: "hidden", transition: "all .15s",
                }}>
                  <div style={{ height: 56, background: c.hex }} />
                  <div style={{ padding: "7px 8px", background: "var(--panel2)" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 1 }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>{c.usage}</div>
                    <div style={{ fontSize: 9, color: "var(--gold)", fontFamily: "monospace" }}>{c.hex}</div>
                  </div>
                  {selectedColors.includes(c.hex) && (
                    <div style={{ background: "var(--gold)", textAlign: "center", fontSize: 9, color: "#0A0A0A", fontWeight: 700, padding: "2px 0" }}>✓ SÉLECTIONNÉ</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedColors.length > 0 && (
            <div style={{ ...card, border: "1px solid var(--gold3)" }}>
              <div style={cardTitle}>Palette sélectionnée</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedColors.map(hex => {
                  const c = COULEURS.find(c => c.hex === hex);
                  return (
                    <div key={hex} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px" }}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, background: hex, border: "1px solid rgba(255,255,255,.1)", flexShrink: 0 }} />
                      <span style={{ fontSize: 11 }}>{c?.name}</span>
                      <span style={{ fontSize: 9, color: "var(--dim)", fontFamily: "monospace" }}>{hex}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={card}>
            <div style={cardTitle}>Notes pour le peintre</div>
            <textarea value={paintNote} onChange={e => setPaintNote(e.target.value)}
              placeholder="Ex : Murs intérieurs en blanc cassé Sahel (#F5F0E8), finition mate. Façade en ocre chaud avec soubassement gris perle. Volets en vert tropical brillant. Utiliser peinture SADEC ou DECO-MAT, 2 couches minimum..."
              style={{ ...inp, minHeight: 90, resize: "vertical", lineHeight: 1.7 }} />
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--dim)", lineHeight: 1.8 }}>
              <strong style={{ color: "var(--text)" }}>Finitions disponibles :</strong> Mate (intérieur), Satinée (cuisine / SdB), Brillante (boiseries / métal), Façade extérieure (acrylique).
            </div>
          </div>
        </div>
      )}

      {/* ══ COMMANDES ══ */}
      {tab === "commandes" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Total commandé",     val: fmt(totalCommandes) + " FCFA", color: "var(--gold)" },
              { label: "Commandes livrées",  val: commandes.filter(c => c.statut === "livré").length,    color: "var(--ok)" },
              { label: "En attente",          val: commandes.filter(c => c.statut !== "livré").length,    color: "var(--warn)" },
            ].map(k => (
              <div key={k.label} style={kpiBox(k.color)}>
                <div style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--panel2)" }}>
                  {["Article", "Fournisseur", "Montant", "Statut", "Date"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commandes.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,.03)" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 600 }}>{c.article}</td>
                    <td style={{ padding: "9px 12px", color: "var(--dim)" }}>{c.fournisseur}</td>
                    <td style={{ padding: "9px 12px", fontFamily: "'Cinzel',serif", color: "var(--gold)" }}>{fmt(c.montant)}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: .5, padding: "2px 8px", borderRadius: 10, background: statusColor(c.statut) + "22", color: statusColor(c.statut), border: `1px solid ${statusColor(c.statut)}44` }}>
                        {c.statut.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: 10, color: "var(--dim)" }}>{c.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={card}>
            <div style={cardTitle}>Nouvelle commande</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[
                { key: "article",      placeholder: "Article / matériau", type: "text" },
                { key: "fournisseur",  placeholder: "Fournisseur",        type: "text" },
                { key: "montant",      placeholder: "Montant",            type: "number" },
                { key: "date",         placeholder: "Date",               type: "date" },
              ].map(f => (
                <input key={f.key} type={f.type} value={newCmd[f.key]} placeholder={f.placeholder}
                  onChange={e => setNewCmd(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inp} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select value={newCmd.statut} onChange={e => setNewCmd(p => ({ ...p, statut: e.target.value }))} style={{ ...inp, width: "auto" }}>
                {["commandé", "livré", "en attente", "annulé"].map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={addCommande} style={{ background: "var(--gold)", border: "none", borderRadius: 7, padding: "8px 18px", color: "#0A0A0A", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Montserrat',sans-serif" }}>
                + Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PIÈGES & ARNAQUES ══ */}
      {tab === "pieges" && (
        <div>
          <div style={{ background: "rgba(201,76,76,.06)", border: "1px solid rgba(201,76,76,.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--err)", marginBottom: 4 }}>⚠️ Guide de vigilance — Construction depuis la diaspora</div>
            <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.8 }}>
              Les arnaques coûtent en moyenne <strong style={{ color: "var(--text)" }}>23 à 40%</strong> du budget total aux constructeurs de la diaspora. Ce guide vous aide à les identifier et les éviter.
            </div>
          </div>

          {PIEGES.map(cat => (
            <div key={cat.cat} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: cat.color }}>{cat.cat}</div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {cat.items.map(item => (
                  <div key={item.title} style={{ background: "var(--panel)", border: `1px solid ${cat.color}33`, borderLeft: `3px solid ${cat.color}`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.7 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ background: "rgba(76,175,110,.05)", border: "1px solid rgba(76,175,110,.2)", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ok)", marginBottom: 6 }}>✓ Règle d'or PHG — Paiement par jalons</div>
            <div style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.9 }}>
              Jalon 1 — Fondations coulées → <strong style={{ color: "var(--text)" }}>25%</strong>. Jalon 2 — Murs R+0 finis → <strong style={{ color: "var(--text)" }}>25%</strong>. Jalon 3 — Toiture posée → <strong style={{ color: "var(--text)" }}>20%</strong>. Jalon 4 — Menuiseries posées → <strong style={{ color: "var(--text)" }}>15%</strong>. Jalon 5 — Réception finale → <strong style={{ color: "var(--text)" }}>15%</strong>. Ne jamais verser la tranche finale avant inspection physique complète.
            </div>
          </div>
        </div>
      )}

      {/* ══ CHECKLIST PAIEMENT ══ */}
      {tab === "checklist" && (
        <div>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={cardTitle}>Complétude de la checklist</div>
              <div style={{ fontFamily: "'Cinzel',serif", color: "var(--gold)" }}>{checkCount}/{CHECKLIST_ITEMS.length}</div>
            </div>
            <div style={{ height: 6, background: "var(--panel2)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(checkCount / CHECKLIST_ITEMS.length) * 100}%`, background: "linear-gradient(90deg,var(--gold3),var(--gold))", borderRadius: 3, transition: "width .3s" }} />
            </div>
            {checkCount === CHECKLIST_ITEMS.length && (
              <div style={{ marginTop: 10, textAlign: "center", color: "var(--ok)", fontSize: 12, fontWeight: 700 }}>
                ✓ Toutes les cases cochées — votre paiement est sécurisé !
              </div>
            )}
          </div>

          {Object.entries(checklistByPhase).map(([phase, items]) => (
            <div key={phase} style={card}>
              <div style={cardTitle}>{phase}</div>
              {items.map((item, i) => (
                <div key={item.id} onClick={() => setChecked(p => ({ ...p, [item.id]: !p[item.id] }))}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${checked[item.id] ? "var(--ok)" : "var(--border2)"}`,
                    background: checked[item.id] ? "var(--ok)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#0A0A0A",
                  }}>
                    {checked[item.id] ? "✓" : ""}
                  </div>
                  <span style={{ fontSize: 12, color: checked[item.id] ? "var(--dim)" : "var(--text)", textDecoration: checked[item.id] ? "line-through" : "none" }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
