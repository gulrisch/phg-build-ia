import { useState } from "react";

const css = `
.supplier-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 14px; transition: all .2s; cursor: pointer; }
.supplier-card:hover { border-color: var(--gold3); background: rgba(201,168,76,.04); }
.supplier-card.selected { border-color: var(--gold); background: rgba(201,168,76,.07); }
.supplier-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.sup-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
.sup-name { font-size: 13px; font-weight: 700; color: var(--text); }
.sup-country { font-size: 11px; color: var(--dim); margin-top: 1px; }
.sup-cat { display: inline-block; background: rgba(201,168,76,.1); color: var(--gold); border-radius: 10px; padding: 2px 9px; font-size: 10px; font-weight: 600; margin-bottom: 8px; }
.verified-badge { background: rgba(76,175,110,.12); color: var(--ok); border-radius: 10px; padding: 2px 8px; font-size: 9px; font-weight: 700; }
.stars { color: var(--gold); font-size: 11px; }
.order-items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
.order-items-table th { text-align: left; padding: 6px 8px; font-size: 9px; color: var(--dim); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
.order-items-table td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,.04); }
.order-items-table input { padding: 4px 6px; font-size: 11px; }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
.s-pending   { background: rgba(232,169,76,.12);  color: var(--warn); }
.s-confirmed { background: rgba(122,171,201,.12); color: #7AABC9; }
.s-shipped   { background: rgba(201,168,76,.12);  color: var(--gold); }
.s-delivered { background: rgba(76,175,110,.12);  color: var(--ok); }
.s-cancelled { background: rgba(201,76,76,.12);   color: var(--err); }
.compare-bar  { height: 8px; border-radius: 4px; background: rgba(201,168,76,.12); margin-top: 3px; }
.compare-fill { height: 100%; border-radius: 4px; }
.price-label  { font-size: 10px; margin-bottom: 2px; }
.sup-tag-row  { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px; }
.sup-tag      { background: var(--panel2); border: 1px solid var(--border); border-radius: 4px; padding: 2px 7px; font-size: 9px; color: var(--dim); }
`;

// ── Données mock ───────────────────────────────────────────────────────────────
const MOCK_SUPPLIERS = [
  { id: 1,  name: "CIMAF Abidjan",         country: "CI", category: "ciment",      rating: 4.7, price_level: "standard", delivery_days: 3,  min_order_amount: 500000,  phone: "+225 07 123 456", email: "commandes@cimaf-ci.com",   is_verified: true,  tags: ["ISO 9001","Grand format","Stock permanent"] },
  { id: 2,  name: "Aciers Dakar SARL",     country: "SN", category: "acier",       rating: 4.5, price_level: "low",      delivery_days: 5,  min_order_amount: 300000,  phone: "+221 77 456 789", email: "contact@aciers-dakar.sn",  is_verified: true,  tags: ["HA8-HA32","Barres et ronds","Export Afrique"] },
  { id: 3,  name: "Ceramica Marrakech",    country: "MA", category: "carrelage",   rating: 4.8, price_level: "premium",  delivery_days: 10, min_order_amount: 200000,  phone: "+212 524 123 456", email: null,                       is_verified: true,  tags: ["Grès porcelainé","60×60 / 80×80","Motifs berbères"] },
  { id: 4,  name: "Bois & Charpentes Lyon",country: "FR", category: "bois",        rating: 4.3, price_level: "standard", delivery_days: 7,  min_order_amount: 800,     phone: "+33 4 72 123 456", email: "vente@boislyonnet.fr",     is_verified: true,  tags: ["Douglas","Chêne","Lamellé-collé","Certifié PEFC"] },
  { id: 5,  name: "PlombPro Douala",       country: "CM", category: "plomberie",   rating: 4.1, price_level: "low",      delivery_days: 4,  min_order_amount: 150000,  phone: "+237 699 234 567", email: "plombpro@yahoo.fr",        is_verified: false, tags: ["PVC","PEHD","Raccords","Robinetterie"] },
  { id: 6,  name: "ElecAfrique Ouaga",     country: "BF", category: "électricité", rating: 4.0, price_level: "low",      delivery_days: 6,  min_order_amount: 100000,  phone: "+226 70 345 678", email: "elecafrique@bf.com",        is_verified: false, tags: ["Câbles 2.5mm–16mm","Tableau élec","Prises"] },
  { id: 7,  name: "Couverture Gabon",      country: "GA", category: "couverture",  rating: 4.4, price_level: "standard", delivery_days: 8,  min_order_amount: 400000,  phone: "+241 06 789 123", email: null,                       is_verified: true,  tags: ["Tôle galva","Bac acier","Tuiles béton"] },
  { id: 8,  name: "Peintures SICO Maroc",  country: "MA", category: "peinture",    rating: 4.6, price_level: "standard", delivery_days: 5,  min_order_amount: 50000,   phone: "+212 522 456 789", email: "ventes@sico-maroc.com",    is_verified: true,  tags: ["Façade","Intérieur","Anti-humidité","Primaire"] },
  { id: 9,  name: "Sanitex CI",            country: "CI", category: "sanitaire",   rating: 4.2, price_level: "standard", delivery_days: 3,  min_order_amount: 200000,  phone: "+225 05 654 321", email: "sanitex@gmail.com",         is_verified: false, tags: ["WC","Lavabos","Baignoires","Receveurs"] },
  { id: 10, name: "Alu-Tech Sénégal",      country: "SN", category: "aluminium",   rating: 4.5, price_level: "premium",  delivery_days: 12, min_order_amount: 500000,  phone: "+221 33 567 890", email: "alutech@orange.sn",         is_verified: true,  tags: ["Portes alu","Fenêtres PVC","Façades vitrées"] },
  { id: 11, name: "CIMENCAM Cameroun",     country: "CM", category: "ciment",      rating: 4.3, price_level: "low",      delivery_days: 4,  min_order_amount: 200000,  phone: "+237 222 123 456", email: "cimencam@camtel.cm",       is_verified: true,  tags: ["CEM I 42.5","CEM II","Big bags","Vrac"] },
  { id: 12, name: "Ferailles du Maghreb",  country: "MA", category: "acier",       rating: 4.6, price_level: "standard", delivery_days: 8,  min_order_amount: 1000,    phone: "+212 537 789 012", email: "ferailles@maghreb.ma",     is_verified: true,  tags: ["Acier HA","Treillis soudé","Profilés HEA"] },
  { id: 13, name: "GraviSable Abidjan",    country: "CI", category: "ciment",      rating: 3.9, price_level: "low",      delivery_days: 2,  min_order_amount: 100000,  phone: "+225 01 987 654", email: null,                       is_verified: false, tags: ["Gravier 8/15","Gravier 15/25","Sable rivière"] },
  { id: 14, name: "Leroy Merlin France",   country: "FR", category: "carrelage",   rating: 4.4, price_level: "standard", delivery_days: 3,  min_order_amount: 200,     phone: "+33 3 20 000 000", email: "pro@leroymerlin.fr",       is_verified: true,  tags: ["Grès cérame","Faïence","Click-clack","Pro compte"] },
];

const CATEGORIES    = ["Tous","ciment","acier","carrelage","bois","plomberie","électricité","couverture","peinture","sanitaire","aluminium"];
const COUNTRIES_LIST = ["Tous","CI","SN","CM","MA","FR","GA","BF"];
const COUNTRY_NAMES  = { CI:"Côte d'Ivoire", SN:"Sénégal", CM:"Cameroun", MA:"Maroc", FR:"France", GA:"Gabon", BF:"Burkina Faso" };
const COUNTRY_FLAGS  = { CI:"🇨🇮", SN:"🇸🇳", CM:"🇨🇲", MA:"🇲🇦", FR:"🇫🇷", GA:"🇬🇦", BF:"🇧🇫" };

const STATUS_LABELS  = { pending:"En attente", confirmed:"Confirmée", shipped:"Expédiée", delivered:"Livrée", cancelled:"Annulée" };

// Commandes demo
const DEMO_ORDERS = [
  { id: 1, supplier_name: "CIMAF Abidjan", status: "delivered", total_amount: 2400000, currency: "FCFA",
    created_at: "2025-05-10T09:00:00", notes: "Livraison site Cocody",
    items: [{ name: "Ciment CEM II (sac 50kg)", qty: 300, unit: "sac", unit_price: 8000 }] },
  { id: 2, supplier_name: "Aciers Dakar SARL", status: "shipped", total_amount: 1750000, currency: "FCFA",
    created_at: "2025-06-01T14:00:00", notes: "HA12 et HA16 pour fondations R+2",
    items: [
      { name: "Fer HA12 (kg)", qty: 1200, unit: "kg", unit_price: 700 },
      { name: "Fer HA16 (kg)", qty: 850,  unit: "kg", unit_price: 700 },
    ] },
  { id: 3, supplier_name: "GraviSable Abidjan", status: "confirmed", total_amount: 900000, currency: "FCFA",
    created_at: "2025-06-08T10:30:00", notes: "",
    items: [
      { name: "Gravier 15/25 (m³)", qty: 30, unit: "m³", unit_price: 22000 },
      { name: "Sable de rivière (m³)", qty: 20, unit: "m³", unit_price: 18000 },
    ] },
];

function Stars({ n }) {
  return (
    <span className="stars">
      {Array.from({ length: 5 }, (_, i) => i < Math.round(n) ? "★" : "☆").join("")}
      <span style={{ color: "var(--dim)", fontSize: 10 }}> ({n.toFixed(1)})</span>
    </span>
  );
}

function PriceBar({ level }) {
  const pct   = level === "low" ? 33 : level === "standard" ? 66 : 100;
  const color = level === "low" ? "var(--ok)" : level === "standard" ? "var(--gold)" : "var(--err)";
  const label = level === "low" ? "Prix bas" : level === "standard" ? "Standard" : "Premium";
  return (
    <div>
      <div className="price-label" style={{ color }}>{label}</div>
      <div className="compare-bar">
        <div className="compare-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function CarnetFournisseurs({ plan }) {
  const [tab,            setTab]            = useState("fournisseurs");
  const [filterCat,      setFilterCat]      = useState("Tous");
  const [filterCountry,  setFilterCountry]  = useState("Tous");
  const [search,         setSearch]         = useState("");
  const [selectedSup,    setSelectedSup]    = useState(null);
  const [compareCat,     setCompareCat]     = useState("ciment");
  const [orders,         setOrders]         = useState(DEMO_ORDERS);

  // Formulaire commande
  const [orderSupName,   setOrderSupName]   = useState("");
  const [orderItems,     setOrderItems]     = useState([{ name: "", qty: 1, unit: "sac", unit_price: 0 }]);
  const [orderNotes,     setOrderNotes]     = useState("");
  const [orderCur,       setOrderCur]       = useState("FCFA");
  const [orderMsg,       setOrderMsg]       = useState(null);

  const isPro = plan !== "free";
  const total = orderItems.reduce((s, it) => s + it.qty * it.unit_price, 0);

  const filteredSups = MOCK_SUPPLIERS.filter(s => {
    if (filterCat !== "Tous" && s.category !== filterCat) return false;
    if (filterCountry !== "Tous" && s.country !== filterCountry) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const compareSups = [...MOCK_SUPPLIERS.filter(s => s.category === compareCat)]
    .sort((a, b) => (a.price_level === "low" ? 0 : a.price_level === "standard" ? 1 : 2) -
                    (b.price_level === "low" ? 0 : b.price_level === "standard" ? 1 : 2));

  const addItem    = () => setOrderItems(p => [...p, { name: "", qty: 1, unit: "sac", unit_price: 0 }]);
  const removeItem = i  => setOrderItems(p => p.filter((_, j) => j !== i));
  const updateItem = (i, f, v) => setOrderItems(p => p.map((it, j) => j === i ? { ...it, [f]: v } : it));

  const submitOrder = () => {
    if (!isPro) { setOrderMsg({ type: "err", txt: "Commandes réservées aux plans PRO/ELITE." }); return; }
    if (!orderSupName.trim()) { setOrderMsg({ type: "err", txt: "Renseignez le nom du fournisseur." }); return; }
    if (orderItems.some(it => !it.name.trim())) { setOrderMsg({ type: "err", txt: "Tous les articles doivent avoir un nom." }); return; }
    const o = {
      id: Date.now(), supplier_name: orderSupName, status: "pending",
      total_amount: total, currency: orderCur,
      created_at: new Date().toISOString(), notes: orderNotes,
      items: orderItems.filter(it => it.name.trim()),
    };
    setOrders(p => [o, ...p]);
    setOrderMsg({ type: "ok", txt: "✓ Commande enregistrée avec succès !" });
    setOrderItems([{ name: "", qty: 1, unit: "sac", unit_price: 0 }]);
    setOrderNotes("");
    setOrderSupName("");
  };

  const updateOrderStatus = (id, status) =>
    setOrders(p => p.map(o => o.id === id ? { ...o, status } : o));

  const openOrder = (s) => {
    setSelectedSup(s);
    setOrderSupName(s.name);
    setTab("commande");
  };

  return (
    <>
      <style>{css}</style>

      <div className="tabs">
        {[
          { id: "fournisseurs", label: "📋 Fournisseurs" },
          { id: "commande",     label: "🛒 Nouvelle commande" },
          { id: "suivi",        label: `📦 Mes commandes (${orders.length})` },
          { id: "comparateur",  label: "📊 Comparateur prix" },
        ].map(t => (
          <div key={t.id} className={`tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>

      {/* ══ FOURNISSEURS ══ */}
      {tab === "fournisseurs" && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <label style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>Recherche</label>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom du fournisseur…" style={{ marginTop: 4 }} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>Catégorie</label>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ marginTop: 4 }}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>Pays</label>
                <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} style={{ marginTop: 4 }}>
                  {COUNTRIES_LIST.map(c => <option key={c} value={c}>{c === "Tous" ? "Tous les pays" : `${COUNTRY_FLAGS[c]} ${COUNTRY_NAMES[c]}`}</option>)}
                </select>
              </div>
              <div style={{ paddingBottom: 2 }}>
                <span style={{ fontSize: 11, color: "var(--dim)" }}>{filteredSups.length} résultat{filteredSups.length > 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          <div className="supplier-grid">
            {filteredSups.map(s => (
              <div key={s.id} className={`supplier-card${selectedSup?.id === s.id ? " selected" : ""}`}
                onClick={() => openOrder(s)}>
                <div className="sup-header">
                  <div>
                    <div className="sup-name">{s.name}</div>
                    <div className="sup-country">{COUNTRY_FLAGS[s.country]} {COUNTRY_NAMES[s.country] || s.country}</div>
                  </div>
                  {s.is_verified && <span className="verified-badge">✓ Vérifié</span>}
                </div>
                <span className="sup-cat">{s.category}</span>
                <div style={{ marginBottom: 8 }}><Stars n={s.rating} /></div>
                <PriceBar level={s.price_level} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, fontSize: 11 }}>
                  <div style={{ color: "var(--dim)" }}>Livraison : <strong style={{ color: "var(--text)" }}>{s.delivery_days}j</strong></div>
                  <div style={{ color: "var(--dim)" }}>Min. : <strong style={{ color: "var(--text)" }}>{s.min_order_amount?.toLocaleString("fr-FR")}</strong></div>
                </div>
                {s.phone && <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 6 }}>📞 {s.phone}</div>}
                {s.email && <div style={{ fontSize: 10, color: "var(--dim)" }}>✉ {s.email}</div>}
                <div className="sup-tag-row">
                  {s.tags.map(tag => <span key={tag} className="sup-tag">{tag}</span>)}
                </div>
                <button className="btn btn-out btn-sm" style={{ marginTop: 10, width: "100%" }}
                  onClick={e => { e.stopPropagation(); openOrder(s); }}>
                  Commander chez ce fournisseur →
                </button>
              </div>
            ))}
            {filteredSups.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 32, color: "var(--dim)", fontSize: 12 }}>
                Aucun fournisseur ne correspond aux filtres sélectionnés.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ NOUVELLE COMMANDE ══ */}
      {tab === "commande" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
          <div>
            <div className="card">
              <div className="card-title">Bon de commande</div>

              {selectedSup && (
                <div style={{ background: "rgba(201,168,76,.06)", border: "1px solid var(--gold3)", borderRadius: 8, padding: 10, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11 }}>
                    <strong style={{ color: "var(--gold)" }}>{selectedSup.name}</strong>
                    <span style={{ color: "var(--dim)", marginLeft: 8 }}>{COUNTRY_FLAGS[selectedSup.country]} {COUNTRY_NAMES[selectedSup.country]}</span>
                    <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>
                      Note {selectedSup.rating}/5 · {selectedSup.delivery_days}j livraison
                    </div>
                  </div>
                  <button className="btn btn-out btn-sm" style={{ fontSize: 9 }} onClick={() => setSelectedSup(null)}>✕</button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
                <div className="fg">
                  <label>Fournisseur</label>
                  <input value={orderSupName} onChange={e => setOrderSupName(e.target.value)} placeholder="Nom du fournisseur" />
                </div>
                <div className="fg">
                  <label>Devise</label>
                  <select value={orderCur} onChange={e => setOrderCur(e.target.value)} style={{ minWidth: 80 }}>
                    {["FCFA","EUR","MAD","CAD","CHF"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Articles commandés</div>
              <table className="order-items-table">
                <thead>
                  <tr><th>Désignation</th><th>Qté</th><th>Unité</th><th>Prix unit.</th><th>Total</th><th></th></tr>
                </thead>
                <tbody>
                  {orderItems.map((it, i) => (
                    <tr key={i}>
                      <td><input value={it.name} onChange={e => updateItem(i, "name", e.target.value)} placeholder="Article…" style={{ width: "100%" }} /></td>
                      <td style={{ width: 60 }}><input type="number" min="1" value={it.qty} onChange={e => updateItem(i, "qty", +e.target.value)} /></td>
                      <td style={{ width: 80 }}>
                        <select value={it.unit} onChange={e => updateItem(i, "unit", e.target.value)}>
                          {["sac","kg","tonne","m²","m","ml","m³","unité","lot","rouleau"].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ width: 90 }}><input type="number" min="0" value={it.unit_price} onChange={e => updateItem(i, "unit_price", +e.target.value)} /></td>
                      <td style={{ color: "var(--gold)", fontWeight: 600, whiteSpace: "nowrap", fontSize: 11 }}>
                        {(it.qty * it.unit_price).toLocaleString("fr-FR")}
                      </td>
                      <td>
                        <button className="btn btn-out btn-sm" onClick={() => removeItem(i)} style={{ padding: "3px 7px", fontSize: 10 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-out btn-sm" onClick={addItem} style={{ marginBottom: 12 }}>+ Ajouter un article</button>

              <div className="fg" style={{ marginBottom: 12 }}>
                <label>Notes / Instructions de livraison</label>
                <textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)}
                  placeholder="Adresse, délais, conditions…" style={{ minHeight: 60 }} />
              </div>

              <button className={`btn btn-block ${isPro ? "btn-gold" : "btn-out"}`} onClick={submitOrder}>
                {isPro ? "✓ Enregistrer la commande" : "🔒 Commandes — Plan PRO requis"}
              </button>
              {orderMsg && (
                <div className={`alert${orderMsg.type === "ok" ? " alert-ok" : ""}`}
                  style={{ marginTop: 10, background: orderMsg.type === "err" ? "rgba(201,76,76,.1)" : undefined, border: orderMsg.type === "err" ? "1px solid rgba(201,76,76,.3)" : undefined, color: orderMsg.type === "err" ? "var(--err)" : undefined }}>
                  {orderMsg.txt}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-title">Récapitulatif</div>
              {orderItems.filter(it => it.name).map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border)", fontSize: 11 }}>
                  <span style={{ color: "var(--dim)" }}>{it.name} × {it.qty} {it.unit}</span>
                  <span>{(it.qty * it.unit_price).toLocaleString("fr-FR")}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--gold3)", fontFamily: "'Cinzel',serif", marginTop: 4 }}>
                <span style={{ color: "var(--gold)" }}>TOTAL</span>
                <span style={{ color: "var(--gold)", fontSize: 20 }}>{total.toLocaleString("fr-FR")} {orderCur}</span>
              </div>
              {selectedSup && (
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--dim)" }}>
                  <div>📦 Délai estimé : <strong style={{ color: "var(--text)" }}>{selectedSup.delivery_days} jours</strong></div>
                  <div>💳 Min. commande : <strong style={{ color: "var(--text)" }}>{selectedSup.min_order_amount?.toLocaleString("fr-FR")}</strong></div>
                  {selectedSup.phone && <div>📞 Contact : <strong style={{ color: "var(--text)" }}>{selectedSup.phone}</strong></div>}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">Articles fréquents</div>
              {[
                ["Ciment Portland (sac 50kg)", "sac",    8000],
                ["Fer à béton HA12 (kg)",       "kg",     700],
                ["Gravier 15/25 (m³)",          "m³",     22000],
                ["Sable de rivière (m³)",        "m³",     18000],
                ["Parpaing 20cm (unité)",        "unité",  400],
                ["Carrelage 60×60cm (m²)",       "m²",     9500],
                ["Tôle galvanisée (m²)",         "m²",     14000],
                ["Câble électrique 2.5mm (m)",   "m",      1100],
              ].map(([name, unit, price]) => (
                <button key={name} className="btn btn-out btn-sm"
                  style={{ marginBottom: 5, fontSize: 10, textAlign: "left", width: "100%", justifyContent: "space-between", display: "flex" }}
                  onClick={() => setOrderItems(p => [...p, { name, qty: 1, unit, unit_price: price }])}>
                  <span>{name}</span>
                  <span style={{ color: "var(--gold)" }}>{price.toLocaleString("fr-FR")}/u</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ SUIVI COMMANDES ══ */}
      {tab === "suivi" && (
        <div>
          {!isPro ? (
            <div className="lock-overlay">
              <div className="lock-icon">🔒</div>
              <div className="lock-title">Suivi commandes — Plan PRO</div>
              <div className="lock-sub">Accédez à l'historique et au suivi des livraisons avec un abonnement PRO ou ELITE.</div>
            </div>
          ) : orders.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--dim)", padding: 32 }}>
              Aucune commande enregistrée.<br />
              <button className="btn btn-gold btn-sm" style={{ marginTop: 10 }} onClick={() => setTab("commande")}>Créer une commande</button>
            </div>
          ) : (
            <div>
              {/* Résumé rapide */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
                {["pending","confirmed","shipped","delivered","cancelled"].map(s => {
                  const n = orders.filter(o => o.status === s).length;
                  return (
                    <div key={s} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 22, color: "var(--gold)" }}>{n}</div>
                      <span className={`status-pill s-${s}`} style={{ fontSize: 9 }}>{STATUS_LABELS[s]}</span>
                    </div>
                  );
                })}
              </div>

              {orders.map(o => (
                <div key={o.id} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 13, color: "var(--gold)" }}>{o.supplier_name}</div>
                      <div style={{ fontSize: 10, color: "var(--dim)" }}>
                        {new Date(o.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`status-pill s-${o.status}`}>{STATUS_LABELS[o.status]}</span>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: 16, color: "var(--gold)", marginTop: 4 }}>
                        {o.total_amount.toLocaleString("fr-FR")} {o.currency}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 8 }}>
                    {o.items.slice(0, 3).map((it, i) => (
                      <span key={i} style={{ marginRight: 10 }}>· {it.qty} {it.unit} {it.name}</span>
                    ))}
                    {o.items.length > 3 && <span style={{ color: "var(--gold3)" }}>+{o.items.length - 3} articles</span>}
                  </div>
                  {o.notes && <div style={{ fontSize: 10, color: "var(--dim2)", fontStyle: "italic", marginBottom: 8 }}>{o.notes}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {o.status === "pending" && (
                      <button className="btn btn-out btn-sm" style={{ fontSize: 9, color: "#7AABC9" }}
                        onClick={() => updateOrderStatus(o.id, "confirmed")}>✓ Confirmer</button>
                    )}
                    {o.status === "confirmed" && (
                      <button className="btn btn-out btn-sm" style={{ fontSize: 9, color: "var(--gold)" }}
                        onClick={() => updateOrderStatus(o.id, "shipped")}>🚚 Expédiée</button>
                    )}
                    {o.status === "shipped" && (
                      <button className="btn btn-out btn-sm" style={{ fontSize: 9, color: "var(--ok)" }}
                        onClick={() => updateOrderStatus(o.id, "delivered")}>📦 Livrée</button>
                    )}
                    {o.status !== "cancelled" && o.status !== "delivered" && (
                      <button className="btn btn-out btn-sm" style={{ fontSize: 9, color: "var(--err)" }}
                        onClick={() => updateOrderStatus(o.id, "cancelled")}>✕ Annuler</button>
                    )}
                    <button className="btn btn-out btn-sm" style={{ fontSize: 9 }}
                      onClick={() => { setSelectedSup(null); setOrderSupName(o.supplier_name); setOrderItems(o.items); setTab("commande"); }}>
                      ↺ Renouveler
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ COMPARATEUR ══ */}
      {tab === "comparateur" && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Comparateur de prix fournisseurs</div>
            <div className="fg" style={{ maxWidth: 260 }}>
              <label>Catégorie à comparer</label>
              <select value={compareCat} onChange={e => setCompareCat(e.target.value)}>
                {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {compareSups.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--dim)" }}>Aucun fournisseur dans cette catégorie.</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--panel2)", borderBottom: "1px solid var(--border)" }}>
                    {["Fournisseur","Pays","Prix","Note","Délai","Statut",""].map((h, i) => (
                      <th key={i} style={{ textAlign: "left", padding: "10px 14px", fontSize: 9, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareSups.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: i === 0 ? "rgba(76,175,110,.04)" : "transparent" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        {i === 0 && <span style={{ fontSize: 9, color: "var(--ok)", fontWeight: 700 }}>★ MEILLEUR PRIX</span>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>{COUNTRY_FLAGS[s.country]} {COUNTRY_NAMES[s.country]}</td>
                      <td style={{ padding: "12px 14px", width: 130 }}><PriceBar level={s.price_level} /></td>
                      <td style={{ padding: "12px 14px" }}><Stars n={s.rating} /></td>
                      <td style={{ padding: "12px 14px", color: "var(--dim)" }}>{s.delivery_days}j</td>
                      <td style={{ padding: "12px 14px" }}>
                        {s.is_verified
                          ? <span style={{ color: "var(--ok)", fontSize: 10, fontWeight: 700 }}>✓ Vérifié</span>
                          : <span style={{ color: "var(--dim2)", fontSize: 10 }}>Non vérifié</span>}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button className="btn btn-out btn-sm" onClick={() => openOrder(s)}>Commander</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
