import { useState } from "react";

const css = `
.dxf-preview { background: #0d0d0d; border: 1px solid #2a2a1a; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.dxf-svg-wrap { width: 100%; aspect-ratio: 4/3; background: #060606; border-radius: 6px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.dxf-svg-wrap svg { width: 100%; height: 100%; }
.room-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.room-card { background: #1a1a0a; border: 1px solid #3a3a1a; border-radius: 6px; padding: 10px; cursor: pointer; text-align: center; transition: all .2s; }
.room-card:hover, .room-card.sel { border-color: #C9A84C; background: rgba(201,168,76,.08); }
.room-icon { font-size: 20px; margin-bottom: 3px; }
.room-name { font-size: 11px; color: #C9A84C; }
.export-status { padding: 10px 14px; border-radius: 6px; font-size: 12px; margin-top: 12px; }
.export-ok { background: rgba(76,175,110,.1); border: 1px solid rgba(76,175,110,.3); color: #4CAF6E; }
.export-err { background: rgba(201,76,76,.1); border: 1px solid rgba(201,76,76,.3); color: #C94C4C; }
.floor-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
.floor-tab { padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid #333; color: #808078; transition: all .2s; }
.floor-tab.active { background: rgba(201,168,76,.15); border-color: #C9A84C; color: #C9A84C; }
.format-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
.format-tab { padding: 6px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); color: var(--dim); transition: all .2s; }
.format-tab.active { background: rgba(201,168,76,.15); border-color: var(--gold); color: var(--gold); }
`;

const ROOM_PRESETS = [
  { id: "salon",    label: "Salon",        icon: "🛋️", w: 5,   h: 4   },
  { id: "cuisine",  label: "Cuisine",      icon: "🍳", w: 3.5, h: 3   },
  { id: "chambre1", label: "Chambre 1",    icon: "🛏️", w: 4,   h: 3.5 },
  { id: "chambre2", label: "Chambre 2",    icon: "🛏️", w: 3.5, h: 3   },
  { id: "sdb",      label: "Salle de bain",icon: "🚿", w: 2.5, h: 2.5 },
  { id: "wc",       label: "WC",           icon: "🚽", w: 1.5, h: 1.5 },
  { id: "garage",   label: "Garage",       icon: "🚗", w: 5,   h: 5   },
  { id: "bureau",   label: "Bureau",       icon: "💼", w: 3,   h: 3   },
  { id: "terrasse", label: "Terrasse",     icon: "🌿", w: 4,   h: 2.5 },
];

// ── Génération DXF pure JS ─────────────────────────────────────────────────────
function generateDXF({ width, length, floors, projectName, rooms }) {
  const MM = 1000; // 1 mètre = 1000 unités DXF (millimètres)
  const W = width * MM, L = length * MM;
  const wallThick = 200; // 20cm murs extérieurs
  const intWall = 100;   // 10cm cloisons

  const lines = [];
  const ent = [];

  // Header DXF minimal
  lines.push(
    "0\nSECTION",
    "2\nHEADER",
    "9\n$ACADVER", "1\nAC1015",
    "9\n$INSUNITS", "70\n4",        // 4 = millimètres
    "9\n$EXTMIN", "10\n0.0", "20\n0.0", "30\n0.0",
    `9\n$EXTMAX`, `10\n${W + 2000}`, `20\n${L + 4000}`, "30\n0.0",
    "0\nENDSEC",
  );

  // Tables (LAYER definitions)
  lines.push(
    "0\nSECTION",
    "2\nTABLES",
    "0\nTABLE", "2\nLAYER", "70\n8",
  );
  const layers = [
    ["MURS_EXT",  "1", "50"],
    ["MURS_INT",  "3", "30"],
    ["COTES",     "4", "11"],
    ["TEXTES",    "7", "7"],
    ["CARTOUCHE", "6", "14"],
    ["GRILLE",    "8", "8"],
    ["OUVERTURES","5", "13"],
    ["HACHURES",  "9", "253"],
  ];
  for (const [name, color, ltype] of layers) {
    lines.push(
      "0\nLAYER",
      "2\n" + name,
      "70\n0",
      "62\n" + color,
    );
  }
  lines.push("0\nENDTABLE", "0\nENDSEC");

  // Entities
  const push = (...args) => ent.push(...args);

  const rect = (layer, x1, y1, w, h, closed = true) => {
    push("0\nLWPOLYLINE",
      "8\n" + layer,
      "90\n4",
      "70\n" + (closed ? "1" : "0"),
      `10\n${x1}`, `20\n${y1}`,
      `10\n${x1 + w}`, `20\n${y1}`,
      `10\n${x1 + w}`, `20\n${y1 + h}`,
      `10\n${x1}`, `20\n${y1 + h}`,
    );
  };

  const text = (layer, x, y, h, str) => {
    push("0\nTEXT",
      "8\n" + layer,
      `10\n${x}`, `20\n${y}`, "30\n0.0",
      `40\n${h}`,
      `1\n${str}`,
      "72\n1", // centré
      `11\n${x}`, `21\n${y}`,
    );
  };

  const dimH = (layer, x1, y1, x2, dimY, txt) => {
    push("0\nDIMENSION",
      "8\n" + layer,
      "70\n32",
      `10\n${(x1 + x2) / 2}`, `20\n${dimY}`,
      `13\n${x1}`, `23\n${y1}`,
      `14\n${x2}`, `24\n${y1}`,
      `1\n${txt}`,
    );
  };

  // Grille légère
  for (let x = 0; x <= Math.ceil(width); x++) {
    push("0\nLINE", "8\nGRILLE",
      `10\n${x * MM}`, `20\n0`,
      `11\n${x * MM}`, `21\n${L}`,
    );
  }
  for (let y = 0; y <= Math.ceil(length); y++) {
    push("0\nLINE", "8\nGRILLE",
      `10\n0`, `20\n${y * MM}`,
      `11\n${W}`, `21\n${y * MM}`,
    );
  }

  // Murs extérieurs (double ligne)
  rect("MURS_EXT", 0, 0, W, L);
  rect("MURS_EXT", wallThick, wallThick, W - 2 * wallThick, L - 2 * wallThick);

  // Pièces
  const colors = ["MURS_INT", "COTES", "OUVERTURES", "TEXTES", "GRILLE"];
  for (const r of rooms) {
    const rx = r.x * MM + wallThick;
    const ry = r.y * MM + wallThick;
    const rw = r.w * MM - intWall;
    const rh = r.h * MM - intWall;
    rect("MURS_INT", rx, ry, rw, rh);
    text("TEXTES", rx + rw / 2, ry + rh / 2 + 60, 120, r.name);
    text("TEXTES", rx + rw / 2, ry + rh / 2 - 80, 80, `${r.w}x${r.h}m`);
  }

  // Cotations extérieures
  dimH("COTES", 0, 0, W, -600, `${width * 1000}mm`);
  push("0\nDIMENSION", "8\nCOTES", "70\n33",
    `10\n${-600}`, `20\n${L / 2}`,
    `13\n0`, `23\n0`,
    `14\n0`, `24\n${L}`,
    `1\n${length * 1000}mm`,
  );

  // Cartouche (bas-droite)
  const cx = W + 500, cy = -500;
  rect("CARTOUCHE", cx, cy, 3000, 1200);
  text("CARTOUCHE", cx + 1500, cy + 900, 180, projectName.toUpperCase());
  text("CARTOUCHE", cx + 1500, cy + 650, 120, `Surface : ${(width * length * floors).toFixed(0)} m²`);
  text("CARTOUCHE", cx + 1500, cy + 450, 100, `Echelle 1:100  |  R+${floors - 1}`);
  text("CARTOUCHE", cx + 1500, cy + 250, 100, `PHG BUILD IA  |  ${new Date().toLocaleDateString("fr-FR")}`);

  // Étages supplémentaires (décalés vers le haut)
  for (let f = 1; f < floors; f++) {
    const offsetY = L * f + 1500 * f;
    rect("MURS_EXT", 0, offsetY, W, L);
    rect("MURS_EXT", wallThick, offsetY + wallThick, W - 2 * wallThick, L - 2 * wallThick);
    text("TEXTES", W / 2, offsetY - 400, 200, `ETAGE R+${f}`);
    for (const r of rooms) {
      const rx = r.x * MM + wallThick;
      const ry = offsetY + r.y * MM + wallThick;
      const rw = r.w * MM - intWall;
      const rh = r.h * MM - intWall;
      rect("MURS_INT", rx, ry, rw, rh);
      text("TEXTES", rx + rw / 2, ry + rh / 2, 100, r.name);
    }
  }

  lines.push("0\nSECTION", "2\nENTITIES");
  lines.push(...ent);
  lines.push("0\nENDSEC", "0\nEOF");

  return lines.join("\n");
}

// ── SVG preview ────────────────────────────────────────────────────────────────
function PlanSVG({ width, length, rooms }) {
  const svgW = 400, svgH = 300;
  const margin = 30;
  const scaleX = (svgW - 2 * margin) / width;
  const scaleY = (svgH - 2 * margin) / length;
  const scale = Math.min(scaleX, scaleY);
  const W = width * scale, L = length * scale;
  const ox = (svgW - W) / 2, oy = (svgH - L) / 2;
  const colors = ["#1a3a2a","#1a1a3a","#2a1a3a","#3a2a1a","#1a2a3a","#2a3a1a","#3a1a1a","#1a3a3a","#3a3a1a"];

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`}>
      {Array.from({ length: Math.ceil(length) }, (_, i) => (
        <line key={`h${i}`} x1={ox} y1={oy + i * scale} x2={ox + W} y2={oy + i * scale} stroke="#1a1a1a" strokeWidth="0.5" />
      ))}
      {Array.from({ length: Math.ceil(width) }, (_, i) => (
        <line key={`v${i}`} x1={ox + i * scale} y1={oy} x2={ox + i * scale} y2={oy + L} stroke="#1a1a1a" strokeWidth="0.5" />
      ))}
      <rect x={ox} y={oy} width={W} height={L} fill="#111108" stroke="#C9A84C" strokeWidth="2.5" />
      {rooms.map((r, i) => {
        const rx = ox + r.x * scale, ry = oy + r.y * scale;
        const rw = r.w * scale, rh = r.h * scale;
        return (
          <g key={i}>
            <rect x={rx} y={ry} width={rw} height={rh} fill={colors[i % colors.length]} stroke="#C9A84C" strokeWidth="1" strokeDasharray="3,2" opacity="0.8" />
            <text x={rx + rw / 2} y={ry + rh / 2} textAnchor="middle" dominantBaseline="middle"
              fontSize={Math.max(7, Math.min(10, rw / 5))} fill="#E8CC7A" fontFamily="Montserrat,sans-serif">{r.name}</text>
            <text x={rx + rw / 2} y={ry + rh / 2 + 10} textAnchor="middle" dominantBaseline="middle"
              fontSize={Math.max(5, Math.min(8, rw / 7))} fill="#808078" fontFamily="Montserrat,sans-serif">{r.w}×{r.h}m</text>
          </g>
        );
      })}
      <line x1={ox} y1={oy - 10} x2={ox + W} y2={oy - 10} stroke="#7A6330" strokeWidth="1" />
      <text x={ox + W / 2} y={oy - 15} textAnchor="middle" fontSize="9" fill="#7A6330" fontFamily="Montserrat,sans-serif">{width}m</text>
      <line x1={ox - 10} y1={oy} x2={ox - 10} y2={oy + L} stroke="#7A6330" strokeWidth="1" />
      <text x={ox - 20} y={oy + L / 2} textAnchor="middle" fontSize="9" fill="#7A6330" fontFamily="Montserrat,sans-serif"
        transform={`rotate(-90 ${ox - 20} ${oy + L / 2})`}>{length}m</text>
      <text x={svgW - 20} y={20} textAnchor="middle" fontSize="9" fill="#C9A84C">N</text>
      <line x1={svgW - 20} y1={22} x2={svgW - 20} y2={35} stroke="#C9A84C" strokeWidth="1.5" markerEnd="url(#arr)" />
    </svg>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function ExportDXF({ plan }) {
  const [width, setWidth]             = useState(10);
  const [length, setLength]           = useState(12);
  const [floors, setFloors]           = useState(1);
  const [projectName, setProjectName] = useState("Ma Maison PHG");
  const [selectedRooms, setSelectedRooms] = useState(["salon", "cuisine", "chambre1", "sdb"]);
  const [format, setFormat]           = useState("dxf");
  const [status, setStatus]           = useState(null);

  const isPro = plan !== "free";

  const placedRooms = (() => {
    const rooms = ROOM_PRESETS.filter(r => selectedRooms.includes(r.id));
    let curX = 0.2, curY = 0.2, rowH = 0;
    const placed = [];
    for (const r of rooms) {
      if (curX + r.w > width - 0.2) { curX = 0.2; curY += rowH + 0.2; rowH = 0; }
      if (curY + r.h <= length - 0.2) {
        placed.push({ ...r, name: r.label, x: curX, y: curY });
        curX += r.w + 0.2;
        rowH = Math.max(rowH, r.h);
      }
    }
    return placed;
  })();

  const toggleRoom = (id) =>
    setSelectedRooms(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  const handleExport = () => {
    if (!isPro) {
      setStatus({ type: "err", msg: "Export DXF/DWG réservé aux plans PRO et ELITE." });
      return;
    }
    try {
      const content = generateDXF({ width, length, floors, projectName, rooms: placedRooms });
      const blob = new Blob([content], { type: "application/dxf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fname = `plan_${projectName.replace(/\s+/g, "_")}.${format}`;
      a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "ok", msg: `✓ ${fname} téléchargé — compatible AutoCAD, QCAD, DraftSight, ArchiCAD.` });
    } catch (e) {
      setStatus({ type: "err", msg: "Erreur génération : " + e.message });
    }
  };

  const handleSVGExport = () => {
    const svgEl = document.querySelector(".dxf-svg-wrap svg");
    if (!svgEl) return;
    const blob = new Blob([svgEl.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `plan_${projectName.replace(/\s+/g, "_")}.svg`; a.click();
    URL.revokeObjectURL(url);
    setStatus({ type: "ok", msg: "✓ SVG téléchargé — ouvrez dans Inkscape ou votre navigateur." });
  };

  return (
    <>
      <style>{css}</style>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Colonne gauche */}
        <div>
          <div className="card">
            <div className="card-title">Paramètres du plan</div>

            <div className="fg">
              <label>Nom du projet</label>
              <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Ma Maison PHG" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
              <div className="fg">
                <label>Largeur (m)</label>
                <input type="number" min="4" max="50" value={width} onChange={e => setWidth(+e.target.value)} />
              </div>
              <div className="fg">
                <label>Longueur (m)</label>
                <input type="number" min="4" max="80" value={length} onChange={e => setLength(+e.target.value)} />
              </div>
            </div>

            <div className="fg" style={{ marginBottom: 12 }}>
              <label>Nombre d'étages</label>
              <div className="floor-tabs">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className={`floor-tab${floors === n ? " active" : ""}`} onClick={() => setFloors(n)}>
                    R+{n - 1}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
              Pièces à inclure
            </div>
            <div className="room-grid">
              {ROOM_PRESETS.map(r => (
                <div key={r.id} className={`room-card${selectedRooms.includes(r.id) ? " sel" : ""}`} onClick={() => toggleRoom(r.id)}>
                  <div className="room-icon">{r.icon}</div>
                  <div className="room-name">{r.label}</div>
                  <div style={{ fontSize: 9, color: "var(--dim)", marginTop: 2 }}>{r.w}×{r.h}m</div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(201,168,76,.05)", border: "1px solid var(--border)", borderRadius: 6, padding: 10, marginBottom: 12, fontSize: 11, color: "var(--dim)" }}>
              Surface brute : <strong style={{ color: "var(--gold)" }}>{(width * length * floors).toFixed(0)} m²</strong>
              {" · "}Surface utile : <strong style={{ color: "var(--gold)" }}>{(width * length * 0.78 * floors).toFixed(0)} m²</strong>
            </div>

            {/* Format */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "var(--gold3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Format d'export</div>
              <div className="format-tabs">
                {["dxf", "dwg"].map(f => (
                  <div key={f} className={`format-tab${format === f ? " active" : ""}`} onClick={() => setFormat(f)}>
                    {f.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className={`btn btn-block${isPro ? " btn-gold" : " btn-out"}`}
                onClick={handleExport} style={{ flex: 2, fontSize: 12, padding: "10px 0" }}>
                {isPro ? `⬇ Télécharger .${format.toUpperCase()}` : "🔒 Export — Plan PRO requis"}
              </button>
              <button className="btn btn-out" onClick={handleSVGExport} style={{ flex: 1, fontSize: 11 }}>
                ⬇ SVG
              </button>
            </div>

            {status && (
              <div className={`export-status ${status.type === "ok" ? "export-ok" : "export-err"}`}>
                {status.msg}
              </div>
            )}

            {!isPro && (
              <div className="note" style={{ marginTop: 12 }}>
                L'export DXF/DWG est disponible à partir du plan <strong style={{ color: "var(--gold)" }}>PRO</strong>. Compatible AutoCAD, QCAD, DraftSight, ArchiCAD, SketchUp, Revit.
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Compatibilité logiciels</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { n: "AutoCAD",   v: "2010+",     ok: true },
                { n: "QCAD",      v: "Gratuit",   ok: true },
                { n: "DraftSight", v: "2019+",    ok: true },
                { n: "ArchiCAD",  v: "Import",    ok: true },
                { n: "SketchUp",  v: "Via plugin",ok: true },
                { n: "Revit",     v: "Import DXF",ok: true },
              ].map(s => (
                <div key={s.n} style={{ background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 6, padding: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--ok)", fontSize: 12 }}>✓</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{s.n}</div>
                    <div style={{ fontSize: 10, color: "var(--dim)" }}>{s.v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite */}
        <div>
          <div className="card dxf-preview">
            <div className="card-title">Aperçu du plan 2D</div>
            <div className="dxf-svg-wrap">
              <PlanSVG width={width} length={length} rooms={placedRooms} />
            </div>
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: "var(--dim)" }}>
              Aperçu simplifié — le fichier DXF contient toutes les cotes, calques et cartouche
            </div>
          </div>

          <div className="card">
            <div className="card-title">Contenu du fichier DXF</div>
            {[
              { icon: "🏗️", label: "Calque MURS_EXT",  desc: "Murs extérieurs double ligne, épaisseur 20cm" },
              { icon: "🏠", label: "Calque MURS_INT",  desc: "Cloisons intérieures 10cm, identifiants pièces" },
              { icon: "📏", label: "Calque COTES",     desc: "Cotations automatiques en millimètres" },
              { icon: "📝", label: "Calque TEXTES",    desc: "Noms pièces + surfaces calculées" },
              { icon: "🔲", label: "Calque GRILLE",    desc: "Grille de référence 1m" },
              { icon: "📋", label: "Cartouche PHG",    desc: "Nom projet · Surface · Date · Échelle 1:100" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: i < 5 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)" }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: "var(--dim)" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Récapitulatif du projet</div>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Projet",         projectName],
                  ["Dimensions",     `${width}m × ${length}m`],
                  ["Étages",         `R+${floors - 1} (${floors} niveau${floors > 1 ? "x" : ""})`],
                  ["Surface brute",  `${(width * length * floors).toFixed(0)} m²`],
                  ["Surface utile",  `${(width * length * 0.78 * floors).toFixed(0)} m²`],
                  ["Pièces",         `${selectedRooms.length} sélectionnée${selectedRooms.length > 1 ? "s" : ""}`],
                  ["Format",         `${format.toUpperCase()} R2010 (AutoCAD)`],
                  ["Unités",         "Millimètres (standard archi)"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ padding: "5px 0", color: "var(--dim)", borderBottom: "1px solid var(--border)", width: "50%" }}>{k}</td>
                    <td style={{ padding: "5px 0", textAlign: "right", color: "var(--gold)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
