export const PLAN_FEATURES = {
  gratuit: {
    plan2D: true, modePrecis: true, modeSketch: true,
    furnitureLimit: 10, exportPNG: true, exportPDF: false,
    autosaveDB: false, maxWalls: 30, watermark: true,
  },
  pro: {
    plan2D: true, modePrecis: true, modeSketch: true,
    furnitureLimit: Infinity, exportPNG: true, exportPDF: true,
    autosaveDB: true, maxWalls: Infinity, watermark: false,
  },
  elite_europe: {
    plan2D: true, modePrecis: true, modeSketch: true,
    furnitureLimit: Infinity, exportPNG: true, exportPDF: true,
    autosaveDB: true, maxWalls: Infinity, watermark: false,
  },
  elite_afrique: {
    plan2D: true, modePrecis: true, modeSketch: true,
    furnitureLimit: Infinity, exportPNG: true, exportPDF: true,
    autosaveDB: true, maxWalls: Infinity, watermark: false,
  },
};

export const PRO_UNLOCKS = [
  { icon: "🛋", text: "Mobilier illimité" },
  { icon: "🧱", text: "Murs illimités" },
  { icon: "🖨", text: "Export PDF professionnel" },
  { icon: "💾", text: "Sauvegarde automatique" },
  { icon: "📐", text: "Plans sans filigrane" },
];

export function getPlanFeatures(tier) {
  return PLAN_FEATURES[tier] || PLAN_FEATURES.gratuit;
}