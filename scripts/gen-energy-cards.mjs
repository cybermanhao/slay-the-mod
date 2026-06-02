/**
 * 生成 4 张能量卡立绘
 * 2×2 grid (4:3) → Sharp 裁切 → 1000×760 PNG
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const { GoogleGenAI } = await import(
  new URL(`file:///${ROOT.replace(/\\/g, '/')}/packages/sts2-mcp-server/node_modules/@google/genai/dist/node/index.mjs`)
);
const sharp = (await import(
  new URL(`file:///${ROOT.replace(/\\/g, '/')}/packages/sts2-mcp-server/node_modules/sharp/lib/index.js`)
)).default;

const CARDS_DIR = path.join(ROOT, 'mods/Invoker/images/invoker/cards');
const CARD_PORTRAITS = path.join(ROOT,
  'reference/decompiled_src/Slay the Spire 2/images/packed/card_portraits');
const GRID_OUT  = path.join(ROOT, 'mods/Invoker/images/generated_versions/energy-cards-grid.png');
fs.mkdirSync(path.dirname(GRID_OUT), { recursive: true });
fs.mkdirSync(CARDS_DIR, { recursive: true });

const GEMINI_API_KEY = (() => {
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  return env.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
})();
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not found in .env');

// ── 2×2 布局（4 张）──────────────────────────────────────
const GRID = [
  { r: 0, c: 0, out: 'primal_spark.png',
    label: 'Primal Spark (Common Skill): A burst of raw magical energy transforming into a random elemental orb — split between icy blue, electric purple, and hot orange glowing particles converging into a sphere, primal arcane power, energetic glow' },
  { r: 0, c: 1, out: 'orb_discharge.png',
    label: 'Orb Discharge (Uncommon Skill): Three elemental orbs (ice/lightning/fire) simultaneously discharging their energy in a massive three-color electric explosion, shattered orb fragments, blue-purple-orange energy burst radiating outward' },
  { r: 1, c: 0, out: 'arcane_conduit.png',
    label: 'Arcane Conduit (Uncommon Skill): A glowing magical conduit or channel connecting three orbs (ice/lightning/fire) in a triangular formation, arcane energy flowing through crystal tubes, energy meter filling up, three-color harmony' },
  { r: 1, c: 1, out: 'invoke_rush.png',
    label: 'Invoke Rush (Rare Skill): An explosive surge of arcane energy with cards flying outward in all directions from a central vortex of invoke runes, dynamic speed lines, three-colored elemental energy burst, dramatic rush of power' },
];

function loadImg(filePath) {
  if (!fs.existsSync(filePath)) { console.error(`[warn] missing: ${filePath}`); return null; }
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ['.jpg','.jpeg'].includes(ext) ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp' : 'image/png';
  return { data: fs.readFileSync(filePath), mimeType };
}

// 风格参考：已满意的卡图 + STS2 原版
const styleRefs = [
  path.join(CARDS_DIR, 'invoke.png'),
  path.join(CARDS_DIR, 'elemental_resonance.png'),
  path.join(CARDS_DIR, 'orb_invoke.png'),
  path.join(CARD_PORTRAITS, 'defect/turbo.png'),
  path.join(CARD_PORTRAITS, 'defect/double_energy.png'),
].map(loadImg).filter(Boolean);
console.error(`[gen] Loaded ${styleRefs.length} style refs`);

const gridLabels = GRID.map((g, i) =>
  `Cell ${i + 1} (row ${g.r + 1}, col ${g.c + 1}): ${g.label}`
).join('\n');

const prompt = `
You are creating card portrait artworks for an Invoker character in a dark fantasy card game (Slay the Spire 2 style).

REFERENCE IMAGES PROVIDED:
- Images 1-3: Style reference from existing satisfied card artworks for this mod (invoke/elemental_resonance/orb_invoke) — match this exact art style
- Images 4-5: STS2 original energy card style reference (Turbo/DoubleEnergy from the Defect character)

OUTPUT FORMAT: A single image arranged as a 2-column × 2-row grid (4:3 total ratio).
Each cell contains one card portrait.

Grid layout (left to right, top to bottom):
${gridLabels}

STYLE REQUIREMENTS (critically important — match the provided reference images exactly):
- Same painterly fantasy illustration style as the reference card artworks
- Dark backgrounds with dramatic elemental lighting
- Slightly desaturated overall with vivid accent colors for elemental effects
- Each subject fills 80-90% of its cell
- NO human figures, NO hands, NO characters — only magical effects, orbs, phenomena, spells
- Three elemental themes: Quas=icy blue/white frost, Wex=electric purple-blue lightning, Exort=hot orange-red fire
- Energy cards should convey a sense of power burst, surge, or flow of magical energy
- Thin separator lines between cells are acceptable

Each cell must be clearly separated and contain only its designated content.
`.trim();

console.error(`[gen] Total refs: ${styleRefs.length}`);
console.error('[gen] Generating 2×2 energy-cards grid (4:3)...');

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const parts = [
  ...styleRefs.map(r => ({ inlineData: { mimeType: r.mimeType, data: r.data.toString('base64') } })),
  { text: prompt },
];

const resp = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  contents: [{ role: 'user', parts }],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: { aspectRatio: '4:3' },
  },
});

const imgPart = resp.candidates?.[0]?.content?.parts?.find(
  p => p.inlineData?.mimeType?.startsWith('image/')
);
if (!imgPart?.inlineData?.data) throw new Error('No image returned from Gemini');

const gridBuffer = Buffer.from(imgPart.inlineData.data, 'base64');
fs.writeFileSync(GRID_OUT, gridBuffer);
console.error(`[gen] Grid saved: ${GRID_OUT} (${gridBuffer.length} bytes)`);

const meta = await sharp(gridBuffer).metadata();
const W = meta.width, H = meta.height;
console.error(`[gen] Grid: ${W}×${H}`);

const cellW = Math.floor(W / 2);
const cellH = Math.floor(H / 2);

for (const g of GRID) {
  const left = g.c * cellW;
  const top  = g.r * cellH;
  const w    = Math.min(cellW, W - left);
  const h    = Math.min(cellH, H - top);
  const outPath = path.join(CARDS_DIR, g.out);

  await sharp(gridBuffer)
    .extract({ left, top, width: w, height: h })
    .resize(1000, 760)
    .png({ quality: 100 })
    .toFile(outPath);

  console.error(`[gen] ✓ ${g.out}`);
}

console.error('[gen] Done! 4 energy card images generated.');
