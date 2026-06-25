import { useState, useRef, useEffect, useCallback } from "react";

// ── Constantes ──────────────────────────────────────────────────────────────
const GRID = 20; // px par unité (1 unité = 10cm)
const WALL_THICKNESS = 3; // unités = 30cm
const COLORS = {
  bg: "#0A0A0A", panel: "#141414", panel2: "#1C1C1C",
  border: "#272727", gold: "#C9A84C", dim: "#808078",
  wall: "#C9A84C", room: "rgba(201,168,76,0.07)",
  door: "#4CAF6E", window: "#7AABC9", grid: "#1A1A1A",
  selected: "#E8CC7A",
};

const TOOLS = [
  { id: "select", icon: "⬡", label: "Sélection" },
  { id: "wall", icon: "▬", label: "Mur" },
  { id: "door", icon: "🚪", label: "Porte" },
  { id: "window", icon: "🪟", label: "Fenêtre" },
  { id: "room", icon: "⬜", label: "Pièce" },
  { id: "delete", icon: "✕", label: "Supprimer" },
];

const ROOM_TYPES = [
  { id: "salon", label: "Salon", color: "rgba(201,168,76,0.12)" },
  { id: "chambre", label: "Chambre", color: "rgba(122,171,201,0.12)" },
  { id: "cuisine", label: "Cuisine", color: "rgba(76,175,110,0.12)" },
  { id: "sdb", label: "Salle de bain", color: "rgba(201,76,76,0.12)" },
  { id: "couloir", label: "Couloir", color: "rgba(128,128,120,0.12)" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const snap = v => Math.round(v / GRID) * GRID;
const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: { display: "flex", flexDirection: "column", height: "100vh", background: COLORS.bg, color: "#EAE2D0", fontFamily: "'Inter', sans-serif", overflow: "hidden" },
  topbar: { display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.panel, flexShrink: 0 },
  title: { fontFamily: "'Cinzel', serif", color: COLORS.gold, fontSize: "14px", letterSpacing: "1.5px", marginRight: "8px" },
  toolBtn: (active) => ({ padding: "6px 12px", borderRadius: "6px", border: `1px solid ${active ? COLORS.gold : COLORS.border}`, background: active ? "rgba(201,168,76,0.15)" : "transparent", color: active ? COLORS.gold : COLORS.dim, fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontWeight: 600, transition: "all 0.15s" }),
  actionBtn: (color) => ({ padding: "6px 14px", borderRadius: "6px", border: `1px solid ${color || COLORS.border}`, background: color ? `${color}22` : "transparent", color: color || COLORS.dim, fontSize: "11px", cursor: "pointer", fontWeight: 600, transition: "all 0.15s" }),
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: "200px", background: COLORS.panel, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" },
  sideSection: { padding: "12px", borderBottom: `1px solid ${COLORS.border}` },
  sideTitle: { fontSize: "9px", color: COLORS.gold, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" },
  canvas3d: { flex: 1, position: "relative", overflow: "hidden" },
  statusBar: { padding: "4px 16px", background: COLORS.panel, borderTop: `1px solid ${COLORS.border}`, fontSize: "10px", color: COLORS.dim, display: "flex", gap: "24px", flexShrink: 0 },
  propInput: { width: "100%", background: COLORS.panel2, border: `1px solid ${COLORS.border}`, borderRadius: "4px", color: "#EAE2D0", padding: "5px 8px", fontSize: "11px", marginTop: "4px", boxSizing: "border-box" },
  propLabel: { fontSize: "10px", color: COLORS.dim, display: "block", marginTop: "8px" },
  roomBtn: (sel, color) => ({ width: "100%", padding: "6px 10px", borderRadius: "5px", border: `1px solid ${sel ? COLORS.gold : COLORS.border}`, background: sel ? color : "transparent", color: sel ? COLORS.gold : COLORS.dim, fontSize: "11px", cursor: "pointer", marginBottom: "4px", textAlign: "left" }),
};

export default function Editeur2D3D() {
  const canvasRef = useRef(null);
  const threeContainerRef = useRef(null);
  const threeRef = useRef({});

  const [mode, setMode] = useState("2d"); // "2d" | "3d"
  const [tool, setTool] = useState("wall");
  const [walls, setWalls] = useState([]);
  const [doors, setDoors] = useState([]);
  const [windows, setWindows] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const [roomType, setRoomType] = useState("salon");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [wallHeight, setWallHeight] = useState(280); // cm
  const [floorCount, setFloorCount] = useState(1);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSurface = rooms.reduce((s, r) => {
    const w = Math.abs(r.x2 - r.x1) * 10 / 100; // m
    const h = Math.abs(r.y2 - r.y1) * 10 / 100;
    return s + w * h;
  }, 0);

  // ── Canvas 2D ─────────────────────────────────────────────────────────────
  const draw2D = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Grille
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    const step = GRID;
    for (let x = -500; x < W + 500; x += step) {
      ctx.beginPath(); ctx.moveTo(x, -500); ctx.lineTo(x, H + 500); ctx.stroke();
    }
    for (let y = -500; y < H + 500; y += step) {
      ctx.beginPath(); ctx.moveTo(-500, y); ctx.lineTo(W + 500, y); ctx.stroke();
    }
    // Axes
    ctx.strokeStyle = "rgba(201,168,76,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -500); ctx.lineTo(0, H + 500); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-500, 0); ctx.lineTo(W + 500, 0); ctx.stroke();

    // Pièces
    rooms.forEach(r => {
      const rt = ROOM_TYPES.find(t => t.id === r.type);
      ctx.fillStyle = rt ? rt.color : COLORS.room;
      ctx.strokeStyle = selected?.id === r.id ? COLORS.selected : "rgba(201,168,76,0.3)";
      ctx.lineWidth = selected?.id === r.id ? 2 : 1;
      ctx.beginPath();
      ctx.rect(Math.min(r.x1, r.x2), Math.min(r.y1, r.y2), Math.abs(r.x2 - r.x1), Math.abs(r.y2 - r.y1));
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = COLORS.gold;
      ctx.font = "10px Inter";
      ctx.textAlign = "center";
      const cx = (r.x1 + r.x2) / 2, cy = (r.y1 + r.y2) / 2;
      ctx.fillText(rt?.label || "Pièce", cx, cy - 4);
      const w = (Math.abs(r.x2 - r.x1) * 10 / 100).toFixed(1);
      const h = (Math.abs(r.y2 - r.y1) * 10 / 100).toFixed(1);
      ctx.fillStyle = COLORS.dim;
      ctx.fillText(`${w}m × ${h}m`, cx, cy + 10);
    });

    // Murs
    walls.forEach(w => {
      const isSel = selected?.id === w.id;
      ctx.strokeStyle = isSel ? COLORS.selected : COLORS.wall;
      ctx.lineWidth = WALL_THICKNESS * (isSel ? 1.3 : 1);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
      // Cote
      const m = midpoint(w, { x: w.x2, y: w.y2 });
      const len = (dist({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) * 10 / 100).toFixed(2);
      ctx.fillStyle = COLORS.dim;
      ctx.font = "9px Inter";
      ctx.textAlign = "center";
      ctx.fillText(`${len}m`, m.x, m.y - 6);
    });

    // Portes
    doors.forEach(d => {
      ctx.strokeStyle = selected?.id === d.id ? COLORS.selected : COLORS.door;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 20, d.angle, d.angle + Math.PI / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + Math.cos(d.angle) * 20, d.y + Math.sin(d.angle) * 20);
      ctx.stroke();
      ctx.strokeStyle = COLORS.dim;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(d.x + Math.cos(d.angle) * -5, d.y + Math.sin(d.angle) * -5);
      ctx.lineTo(d.x + Math.cos(d.angle) * 25, d.y + Math.sin(d.angle) * 25);
      ctx.stroke();
    });

    // Fenêtres
    windows.forEach(win => {
      ctx.strokeStyle = selected?.id === win.id ? COLORS.selected : COLORS.window;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(win.x1, win.y1);
      ctx.lineTo(win.x2, win.y2);
      ctx.stroke();
      const m = midpoint(win, { x: win.x2, y: win.y2 });
      const dx = win.x2 - win.x1, dy = win.y2 - win.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len * 5, ny = dx / len * 5;
      ctx.strokeStyle = COLORS.window;
      ctx.lineWidth = 1;
      [-1, 0, 1].forEach(i => {
        const t = 0.3 + i * 0.2;
        const px = win.x1 + dx * t, py = win.y1 + dy * t;
        ctx.beginPath();
        ctx.moveTo(px - nx, py - ny);
        ctx.lineTo(px + nx, py + ny);
        ctx.stroke();
      });
    });

    // En cours de dessin
    if (drawing) {
      ctx.strokeStyle = COLORS.selected;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      if (tool === "room") {
        ctx.rect(Math.min(drawing.x, mousePos.x), Math.min(drawing.y, mousePos.y),
          Math.abs(mousePos.x - drawing.x), Math.abs(mousePos.y - drawing.y));
      } else {
        ctx.moveTo(drawing.x, drawing.y);
        ctx.lineTo(mousePos.x, mousePos.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [walls, doors, windows, rooms, drawing, mousePos, pan, zoom, selected, tool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "2d") return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw2D();
  }, [draw2D, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "2d") return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw2D();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw2D, mode]);

  // ── Mouse events 2D ──────────────────────────────────────────────────────
  const toCanvas = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: snap((e.clientX - rect.left - pan.x) / zoom),
      y: snap((e.clientY - rect.top - pan.y) / zoom),
    };
  };

  const handleMouseMove = (e) => {
    const p = toCanvas(e);
    setMousePos(p);
  };

  const handleClick = (e) => {
    const p = toCanvas(e);

    if (tool === "select") {
      // Chercher élément cliqué
      const w = walls.find(w => {
        const d = distToSegment(p, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
        return d < 10;
      });
      if (w) { setSelected({ ...w, kind: "wall" }); return; }
      const r = rooms.find(r => p.x >= Math.min(r.x1, r.x2) && p.x <= Math.max(r.x1, r.x2) && p.y >= Math.min(r.y1, r.y2) && p.y <= Math.max(r.y1, r.y2));
      if (r) { setSelected({ ...r, kind: "room" }); return; }
      setSelected(null);
      return;
    }

    if (tool === "delete") {
      setWalls(ws => ws.filter(w => distToSegment(p, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) > 10));
      setRooms(rs => rs.filter(r => !(p.x >= Math.min(r.x1, r.x2) && p.x <= Math.max(r.x1, r.x2) && p.y >= Math.min(r.y1, r.y2) && p.y <= Math.max(r.y1, r.y2))));
      setDoors(ds => ds.filter(d => dist(p, d) > 25));
      setWindows(ws => ws.filter(w => distToSegment(p, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) > 10));
      return;
    }

    if (tool === "door") {
      setDoors(ds => [...ds, { id: Date.now(), x: p.x, y: p.y, angle: 0 }]);
      return;
    }

    if (!drawing) {
      setDrawing(p);
    } else {
      if (tool === "wall") {
        setWalls(ws => [...ws, { id: Date.now(), x1: drawing.x, y1: drawing.y, x2: p.x, y2: p.y }]);
      } else if (tool === "window") {
        setWindows(ws => [...ws, { id: Date.now(), x1: drawing.x, y1: drawing.y, x2: p.x, y2: p.y }]);
      } else if (tool === "room") {
        setRooms(rs => [...rs, { id: Date.now(), x1: drawing.x, y1: drawing.y, x2: p.x, y2: p.y, type: roomType }]);
      }
      setDrawing(null);
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    setDrawing(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.3, Math.min(3, z * factor)));
  };

  // ── Three.js 3D ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "3d") return;
    const container = threeContainerRef.current;
    if (!container) return;

    let animId;
    import("https://esm.sh/three@0.160.0").then(THREE => {
      const W = container.offsetWidth, H = container.offsetHeight;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0A0A0A);
      scene.fog = new THREE.Fog(0x0A0A0A, 200, 600);

      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
      camera.position.set(0, 150, 300);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(W, H);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      // Lumières
      const ambient = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambient);
      const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
      sun.position.set(100, 200, 100);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      scene.add(sun);
      const gold = new THREE.PointLight(0xC9A84C, 0.5, 300);
      gold.position.set(0, 100, 0);
      scene.add(gold);

      // Sol
      const floorGeo = new THREE.PlaneGeometry(600, 600);
      const floorMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);

      // Grille
      const grid = new THREE.GridHelper(600, 60, 0x1A1A1A, 0x1A1A1A);
      scene.add(grid);

      // Matériaux
      const wallMat = new THREE.MeshLambertMaterial({ color: 0x2A2417 });
      const wallOutline = new THREE.LineBasicMaterial({ color: 0xC9A84C, linewidth: 1 });
      const doorMat = new THREE.MeshLambertMaterial({ color: 0x1a3a24 });
      const winMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a, transparent: true, opacity: 0.5 });

      const scale = 10 / 100; // 10cm par unité canvas, en mètres
      const H3 = (wallHeight / 100) * 10; // hauteur en unités 3D

      // Pièces (dalles de sol colorées)
      rooms.forEach(r => {
        const rw = Math.abs(r.x2 - r.x1) * scale;
        const rh = Math.abs(r.y2 - r.y1) * scale;
        const cx = ((r.x1 + r.x2) / 2) * scale;
        const cz = ((r.y1 + r.y2) / 2) * scale;
        const rt = ROOM_TYPES.find(t => t.id === r.type);
        const col = rt ? parseInt(rt.color.replace(/[^0-9a-f]/gi, "").substring(0, 6), 16) || 0x1a1a1a : 0x1a1a1a;
        const geo = new THREE.PlaneGeometry(rw, rh);
        const mat = new THREE.MeshLambertMaterial({ color: col || 0x1E1A12 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(cx, 0.1, cz);
        scene.add(mesh);
      });

      // Murs
      walls.forEach(w => {
        const dx = (w.x2 - w.x1) * scale;
        const dz = (w.y2 - w.y1) * scale;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const thick = WALL_THICKNESS * scale;
        const geo = new THREE.BoxGeometry(len, H3, thick);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(
          (w.x1 + w.x2) / 2 * scale,
          H3 / 2,
          (w.y1 + w.y2) / 2 * scale
        );
        mesh.rotation.y = -angle;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        // Contour doré
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, wallOutline);
        line.position.copy(mesh.position);
        line.rotation.copy(mesh.rotation);
        scene.add(line);
      });

      // Portes
      doors.forEach(d => {
        const geo = new THREE.BoxGeometry(20 * scale, H3 * 0.9, WALL_THICKNESS * scale);
        const mesh = new THREE.Mesh(geo, doorMat);
        mesh.position.set(d.x * scale, H3 * 0.45, d.y * scale);
        scene.add(mesh);
      });

      // Fenêtres
      windows.forEach(win => {
        const dx = (win.x2 - win.x1) * scale;
        const dz = (win.y2 - win.y1) * scale;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);
        const geo = new THREE.BoxGeometry(len, H3 * 0.4, WALL_THICKNESS * scale * 0.5);
        const mesh = new THREE.Mesh(geo, winMat);
        mesh.position.set((win.x1 + win.x2) / 2 * scale, H3 * 0.6, (win.y1 + win.y2) / 2 * scale);
        mesh.rotation.y = -angle;
        scene.add(mesh);
      });

      // Contrôles orbitaux manuels
      let isDragging = false, lastMouse = { x: 0, y: 0 };
      let theta = 0, phi = Math.PI / 4, radius = 300;
      const updateCamera = () => {
        camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
        camera.lookAt(0, 0, 0);
      };
      updateCamera();

      const onMouseDown = e => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; };
      const onMouseUp = () => { isDragging = false; };
      const onMouseMove = e => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
        theta -= dx * 0.005;
        phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi + dy * 0.005));
        lastMouse = { x: e.clientX, y: e.clientY };
        updateCamera();
      };
      const onWheel = e => {
        radius = Math.max(50, Math.min(600, radius + e.deltaY * 0.5));
        updateCamera();
      };

      renderer.domElement.addEventListener("mousedown", onMouseDown);
      renderer.domElement.addEventListener("mouseup", onMouseUp);
      renderer.domElement.addEventListener("mousemove", onMouseMove);
      renderer.domElement.addEventListener("wheel", onWheel);

      const animate = () => {
        animId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();

      threeRef.current = { renderer, scene, camera, animId };
    });

    return () => {
      cancelAnimationFrame(animId);
      if (threeRef.current.renderer) {
        threeRef.current.renderer.dispose();
        if (container.contains(threeRef.current.renderer.domElement)) {
          container.removeChild(threeRef.current.renderer.domElement);
        }
      }
    };
  }, [mode, walls, doors, windows, rooms, wallHeight]);

  // ── Export DXF ─────────────────────────────────────────────────────────────
  const exportDXF = () => {
    let dxf = `0\nSECTION\n2\nENTITIES\n`;
    walls.forEach(w => {
      dxf += `0\nLINE\n8\nWALLS\n10\n${w.x1 * 10}\n20\n${w.y1 * 10}\n30\n0\n11\n${w.x2 * 10}\n21\n${w.y2 * 10}\n31\n0\n`;
    });
    rooms.forEach(r => {
      const x1 = Math.min(r.x1, r.x2) * 10, y1 = Math.min(r.y1, r.y2) * 10;
      const x2 = Math.max(r.x1, r.x2) * 10, y2 = Math.max(r.y1, r.y2) * 10;
      dxf += `0\nLWPOLYLINE\n8\nROOMS\n90\n4\n70\n1\n`;
      [[x1, y1], [x2, y1], [x2, y2], [x1, y2]].forEach(([x, y]) => { dxf += `10\n${x}\n20\n${y}\n`; });
    });
    dxf += `0\nENDSEC\n0\nEOF`;
    const blob = new Blob([dxf], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "plan-phg.dxf"; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export PDF (SVG → canvas → PDF via impression) ─────────────────────────
  const exportPDF = () => {
    const printW = window.open("", "_blank");
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" style="background:#fff">`;
    svg += `<rect width="800" height="600" fill="white"/>`;
    svg += `<text x="400" y="30" text-anchor="middle" font-family="serif" font-size="16" fill="#333">PHG BUILD IA — Plan architectural</text>`;
    const offX = 400, offY = 300, sc = 0.5;
    rooms.forEach(r => {
      const rt = ROOM_TYPES.find(t => t.id === r.type);
      svg += `<rect x="${Math.min(r.x1, r.x2) * sc + offX}" y="${Math.min(r.y1, r.y2) * sc + offY}" width="${Math.abs(r.x2 - r.x1) * sc}" height="${Math.abs(r.y2 - r.y1) * sc}" fill="rgba(200,180,100,0.1)" stroke="rgba(180,150,50,0.5)" stroke-width="1"/>`;
      svg += `<text x="${(r.x1 + r.x2) / 2 * sc + offX}" y="${(r.y1 + r.y2) / 2 * sc + offY}" text-anchor="middle" font-size="9" fill="#666">${rt?.label || ""}</text>`;
    });
    walls.forEach(w => {
      svg += `<line x1="${w.x1 * sc + offX}" y1="${w.y1 * sc + offY}" x2="${w.x2 * sc + offX}" y2="${w.y2 * sc + offY}" stroke="#333" stroke-width="2" stroke-linecap="round"/>`;
    });
    svg += `<text x="400" y="580" text-anchor="middle" font-size="9" fill="#999">PHARAOH GOLD PHG ÉDITIONS — Saint-Julien-en-Genevois © 2025</text>`;
    svg += `</svg>`;
    printW.document.write(`<html><head><title>Plan PHG</title></head><body style="margin:0">${svg}</body></html>`);
    printW.document.close();
    setTimeout(() => printW.print(), 500);
  };

  const clearAll = () => { if (window.confirm("Effacer tout le plan ?")) { setWalls([]); setDoors([]); setWindows([]); setRooms([]); setSelected(null); setDrawing(null); } };

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@400;500;600&display=swap');`}</style>

      {/* Topbar */}
      <div style={S.topbar}>
        <span style={{ fontSize: "22px", color: COLORS.gold }}>𓂀</span>
        <div style={S.title}>ÉDITEUR 2D/3D</div>
        <div style={{ height: "24px", width: "1px", background: COLORS.border, margin: "0 4px" }} />

        {/* Mode */}
        {["2d", "3d"].map(m => (
          <button key={m} style={S.toolBtn(mode === m)} onClick={() => setMode(m)}>
            {m === "2d" ? "📐 Vue 2D" : "🏗️ Vue 3D"}
          </button>
        ))}

        <div style={{ height: "24px", width: "1px", background: COLORS.border, margin: "0 4px" }} />

        {/* Outils (2D seulement) */}
        {mode === "2d" && TOOLS.map(t => (
          <button key={t.id} style={S.toolBtn(tool === t.id)} onClick={() => { setTool(t.id); setDrawing(null); }} title={t.label}>
            {t.icon} {t.label}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button style={S.actionBtn()} onClick={clearAll}>🗑 Effacer</button>
          <button style={S.actionBtn(COLORS.door)} onClick={exportDXF}>⬛ DXF</button>
          <button style={S.actionBtn(COLORS.gold)} onClick={exportPDF}>📄 PDF</button>
        </div>
      </div>

      {/* Corps */}
      <div style={S.body}>

        {/* Sidebar */}
        <div style={S.sidebar}>
          {/* Stats */}
          <div style={S.sideSection}>
            <div style={S.sideTitle}>Projet</div>
            {[
              ["Murs", walls.length],
              ["Portes", doors.length],
              ["Fenêtres", windows.length],
              ["Pièces", rooms.length],
              ["Surface", `${totalSurface.toFixed(1)} m²`],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", padding: "3px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ color: COLORS.dim }}>{l}</span>
                <span style={{ color: COLORS.gold, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Propriétés bâtiment */}
          <div style={S.sideSection}>
            <div style={S.sideTitle}>Bâtiment</div>
            <span style={S.propLabel}>Hauteur murs (cm)</span>
            <input type="number" value={wallHeight} onChange={e => setWallHeight(Number(e.target.value))} style={S.propInput} min={200} max={400} step={10} />
            <span style={S.propLabel}>Nombre d'étages</span>
            <input type="number" value={floorCount} onChange={e => setFloorCount(Number(e.target.value))} style={S.propInput} min={1} max={5} />
          </div>

          {/* Type de pièce */}
          {mode === "2d" && tool === "room" && (
            <div style={S.sideSection}>
              <div style={S.sideTitle}>Type de pièce</div>
              {ROOM_TYPES.map(rt => (
                <button key={rt.id} style={S.roomBtn(roomType === rt.id, rt.color)} onClick={() => setRoomType(rt.id)}>
                  {rt.label}
                </button>
              ))}
            </div>
          )}

          {/* Sélection */}
          {selected && (
            <div style={S.sideSection}>
              <div style={S.sideTitle}>Sélection</div>
              <div style={{ fontSize: "11px", color: COLORS.gold, marginBottom: "8px", textTransform: "capitalize" }}>
                {selected.kind}
              </div>
              {selected.kind === "room" && (
                <>
                  <span style={S.propLabel}>Type</span>
                  <select
                    value={selected.type}
                    onChange={e => {
                      const newType = e.target.value;
                      setRooms(rs => rs.map(r => r.id === selected.id ? { ...r, type: newType } : r));
                      setSelected(s => ({ ...s, type: newType }));
                    }}
                    style={{ ...S.propInput, background: COLORS.panel2 }}
                  >
                    {ROOM_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
                  </select>
                  <div style={{ fontSize: "10px", color: COLORS.dim, marginTop: "8px" }}>
                    Surface : {((Math.abs(selected.x2 - selected.x1) * 10 / 100) * (Math.abs(selected.y2 - selected.y1) * 10 / 100)).toFixed(1)} m²
                  </div>
                </>
              )}
              <button
                style={{ ...S.actionBtn("rgba(201,76,76,0.8)"), marginTop: "10px", width: "100%", justifyContent: "center" }}
                onClick={() => {
                  if (selected.kind === "wall") setWalls(ws => ws.filter(w => w.id !== selected.id));
                  if (selected.kind === "room") setRooms(rs => rs.filter(r => r.id !== selected.id));
                  setSelected(null);
                }}
              >
                ✕ Supprimer
              </button>
            </div>
          )}

          {/* Instructions */}
          <div style={S.sideSection}>
            <div style={S.sideTitle}>Aide</div>
            <div style={{ fontSize: "10px", color: COLORS.dim, lineHeight: "1.7" }}>
              {mode === "2d" ? (
                <>
                  <b style={{ color: COLORS.gold }}>Mur/Pièce/Fenêtre</b> : clic départ + clic fin<br />
                  <b style={{ color: COLORS.gold }}>Porte</b> : clic pour placer<br />
                  <b style={{ color: COLORS.gold }}>Clic droit</b> : annuler<br />
                  <b style={{ color: COLORS.gold }}>Molette</b> : zoom<br />
                  Grille : 1 case = 20cm
                </>
              ) : (
                <>
                  <b style={{ color: COLORS.gold }}>Glisser</b> : orbite<br />
                  <b style={{ color: COLORS.gold }}>Molette</b> : zoom<br />
                  Vue générée depuis le plan 2D
                </>
              )}
            </div>
          </div>
        </div>

        {/* Zone principale */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Canvas 2D */}
          {mode === "2d" && (
            <canvas
              ref={canvasRef}
              style={{ width: "100%", height: "100%", cursor: tool === "select" ? "default" : tool === "delete" ? "crosshair" : "crosshair" }}
              onClick={handleClick}
              onMouseMove={handleMouseMove}
              onContextMenu={handleRightClick}
              onWheel={handleWheel}
            />
          )}

          {/* Vue 3D */}
          {mode === "3d" && (
            <div ref={threeContainerRef} style={{ width: "100%", height: "100%" }}>
              {walls.length === 0 && rooms.length === 0 && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", pointerEvents: "none" }}>
                  <div style={{ fontSize: "40px", color: COLORS.gold, opacity: 0.3 }}>𓂀</div>
                  <div style={{ color: COLORS.dim, fontSize: "13px" }}>Dessinez d'abord en vue 2D</div>
                </div>
              )}
            </div>
          )}

          {/* Indicateur outil actif */}
          {mode === "2d" && drawing && (
            <div style={{ position: "absolute", top: "12px", left: "50%", transform: "translateX(-50%)", background: "rgba(201,168,76,0.15)", border: `1px solid ${COLORS.gold}`, borderRadius: "6px", padding: "4px 14px", fontSize: "11px", color: COLORS.gold, pointerEvents: "none" }}>
              {tool === "wall" ? "Clic pour terminer le mur" : tool === "room" ? "Clic pour terminer la pièce" : "Clic pour terminer"}
            </div>
          )}
        </div>
      </div>

      {/* Barre de statut */}
      <div style={S.statusBar}>
        <span>X: {Math.round(mousePos.x * 10)} cm · Y: {Math.round(mousePos.y * 10)} cm</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Outil: {TOOLS.find(t => t.id === tool)?.label || tool}</span>
        <span>{walls.length} murs · {rooms.length} pièces · Surface: {totalSurface.toFixed(1)} m²</span>
        {drawing && <span style={{ color: COLORS.gold }}>● Dessin en cours — clic droit pour annuler</span>}
      </div>
    </div>
  );
}

// Helper géométrique
function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}
