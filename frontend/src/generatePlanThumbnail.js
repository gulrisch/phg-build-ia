const GOLD = "#D4AF37";
const WALL_COLOR = "#c8b88a";

export function generatePlanThumbnail(plan, width = 240, height = 160) {
  const { walls = [], items = [], labels = [] } = plan;
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#111"; ctx.fillRect(0, 0, width, height);

  if (walls.length === 0 && items.length === 0) {
    ctx.fillStyle = "#1e1e1e"; ctx.fillRect(4, 4, width-8, height-8);
    ctx.fillStyle = "#2a2a2a";
    ctx.font = `bold ${Math.min(width,height)*0.12}px Georgia`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("𓂀", width/2, height/2-8);
    ctx.font = `${Math.min(width,height)*0.07}px sans-serif`;
    ctx.fillStyle = "#333"; ctx.fillText("Plan vide", width/2, height/2+14);
    return canvas.toDataURL("image/png");
  }

  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  for (const w of walls) { minX=Math.min(minX,w.x1,w.x2); minY=Math.min(minY,w.y1,w.y2); maxX=Math.max(maxX,w.x1,w.x2); maxY=Math.max(maxY,w.y1,w.y2); }
  for (const it of items) { minX=Math.min(minX,it.x); minY=Math.min(minY,it.y); maxX=Math.max(maxX,it.x+it.w); maxY=Math.max(maxY,it.y+it.h); }
  if (!isFinite(minX)) { minX=0; minY=0; maxX=200; maxY=200; }

  const pad=12, planW=maxX-minX||200, planH=maxY-minY||200;
  const sc=Math.min((width-pad*2)/planW, (height-pad*2)/planH, 1);
  const offX=pad+(width-pad*2-planW*sc)/2-minX*sc;
  const offY=pad+(height-pad*2-planH*sc)/2-minY*sc;
  const tx=x=>x*sc+offX, ty=y=>y*sc+offY;

  for (const it of items) {
    ctx.save(); ctx.translate(tx(it.x+it.w/2), ty(it.y+it.h/2));
    ctx.rotate((it.rot||0)*Math.PI/180);
    ctx.fillStyle=it.fill||"#555"; ctx.globalAlpha=0.7;
    ctx.fillRect(-it.w*sc/2,-it.h*sc/2,it.w*sc,it.h*sc);
    ctx.restore();
  }

  ctx.strokeStyle=WALL_COLOR; ctx.lineWidth=Math.max(2,6*sc); ctx.lineCap="square";
  for (const w of walls) { ctx.beginPath(); ctx.moveTo(tx(w.x1),ty(w.y1)); ctx.lineTo(tx(w.x2),ty(w.y2)); ctx.stroke(); }

  if (sc>0.3) {
    ctx.fillStyle="rgba(212,175,55,0.6)";
    ctx.font=`bold ${Math.max(8,11*sc)}px Georgia`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    for (const lb of labels) ctx.fillText(lb.text,tx(lb.x),ty(lb.y));
  }

  ctx.fillStyle="rgba(212,175,55,0.18)";
  ctx.font=`bold ${height*0.18}px Georgia`;
  ctx.textAlign="right"; ctx.textBaseline="bottom";
  ctx.fillText("𓂀", width-4, height-2);

  return canvas.toDataURL("image/png");
}