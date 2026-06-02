/**
 * 生成 10 张切球/祈唤卡立绘
 * 4×3 grid (16:9, 4K) → Sharp 裁切 → 1000×760 PNG
 *
 * 风格参考：已生成的法术卡 (cold_snap, sun_strike, invoke) + STS2 原版卡
 * 原始素材：raw image/ 中的元素球
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
const RAW_DIR   = path.join(ROOT, 'mods/Invoker/images/raw image');
const CARD_PORTRAITS = path.join(ROOT,
  'reference/decompiled_src/Slay the Spire 2/images/packed/card_portraits');
const GRID_OUT  = path.join(ROOT, 'mods/Invoker/images/generated_versions/orb-cards-grid.png');
fs.mkdirSync(path.dirname(GRID_OUT), { recursive: true });
fs.mkdirSync(CARDS_DIR, { recursive: true });

const GEMINI_API_KEY = (() => {
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  return env.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
})();
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not found in .env');

// ── 4×3 布局（10 张 + 2 空格）──────────────────────────────────────
const GRID = [
  // Row 0 — 普通基础切球
  { r: 0, c: 0, out: 'flame_strike.png',
    label: 'Flame Strike (Common Attack): Crimson fireball exploding on impact, Exort fire orb materializing beside it, hot ember sparks, orange-red palette' },
  { r: 0, c: 1, out: 'swift_thunder.png',
    label: 'Swift Thunder (Common Skill): Lightning arcs crackling through a deck of cards flying upward, electric blue-white energy, Wex lightning orb, fast motion blur' },
  { r: 0, c: 2, out: 'ice_shield.png',
    label: 'Ice Shield (Common Skill): Crystalline blue ice barrier forming, frosted hexagonal plates, Quas frost orb glowing, cool blue-white palette' },
  { r: 0, c: 3, out: 'quas_invoke.png',
    label: 'Quas Invoke (Common Skill): Icy blue frost orb being channeled, arcane runes forming a spell circle, cold mist rising, cool palette with purple invoke energy' },
  // Row 1 — 固定切球祈唤
  { r: 1, c: 0, out: 'wex_invoke.png',
    label: 'Wex Invoke (Uncommon Attack): Lightning bolt striking downward, Wex orb discharging energy, electric purple-blue flash, dynamic action pose' },
  { r: 1, c: 1, out: 'exort_invoke.png',
    label: 'Exort Invoke (Uncommon Skill): Multiple fire explosions spreading outward, Exort fire orb blazing, molten orange-red radiance, area effect blast' },
  { r: 1, c: 2, out: 'elemental_tune.png',
    label: 'Elemental Tune (Uncommon Skill): Three elemental orbs (ice/lightning/fire) arranged in a triangle with one glowing and being selected, prismatic magical energy converging' },
  { r: 1, c: 3, out: 'fate_strike.png',
    label: 'Fate Strike (Rare Attack): Massive elemental sword or energy blade descending, all three element colors (blue/purple/orange) blazing along the blade, dramatic lighting' },
  // Row 2 — 稀有终局
  { r: 2, c: 0, out: 'orb_invoke.png',
    label: 'Orb Invoke (Rare Skill): Three elemental orbs orbiting a central arcane circle with one being chosen to channel, magical card appearing from the energy, three-color elemental glow' },
  { r: 2, c: 1, out: 'elemental_resonance.png',
    label: 'Elemental Resonance (Rare Power): Three elemental symbols resonating in harmonic loops, ghostly translucent invoke card manifesting from the energy each turn, ethereal glow, power/aura art style' },
  // Row 2 Col 2-3: empty
];

function loadImg(filePath) {
  if (!fs.existsSync(filePath)) { console.error(`[warn] missing: ${filePath}`); return null; }
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ['.jpg','.jpeg'].includes(ext) ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp' : 'image/png';
  return { data: fs.readFileSync(filePath), mimeType };
}

// 风格参考：已满意的法术卡图 + STS2 原版卡
const styleRefs = [
  path.join(CARDS_DIR, 'cold_snap.png'),       // Quas冰系法术参考
  path.join(CARDS_DIR, 'emp.png'),              // Wex雷系法术参考
  path.join(CARDS_DIR, 'sun_strike.png'),       // Exort火系法术参考
  path.join(CARDS_DIR, 'invoke.png'),           // 祈唤卡参考
  path.join(CARD_PORTRAITS, 'defect/strike_defect.png'),  // STS2风格
  path.join(CARD_PORTRAITS, 'regent/defend_regent.png'),
].map(loadImg).filter(Boolean);
console.error(`[gen] Loaded ${styleRefs.length} style refs`);

// 原始元素球参考
const orbRefs = [
  path.join(RAW_DIR, '冰球.png'),
  path.join(RAW_DIR, '雷球.png'),
  path.join(RAW_DIR, '火球.png'),
].map(loadImg).filter(Boolean);
console.error(`[gen] Loaded ${orbRefs.length} orb refs`);

const gridLabels = GRID.map((g, i) =>
  `Cell ${i + 1} (row ${g.r + 1}, col ${g.c + 1}): ${g.label}`
).join('\n');

const prompt = `
You are creating card portrait artworks for an Invoker character in a dark fantasy card game (Slay the Spire 2 style).

REFERENCE IMAGES PROVIDED:
- Images 1-4: Style reference from existing satisfied card artworks for this mod (cold_snap/emp/sun_strike/invoke) — match this exact art style
- Images 5-6: STS2 original card style reference
- Images 7-9: Elemental orb references (ice/lightning/fire) — these are Quas/Wex/Exort orbs

OUTPUT FORMAT: A single image arranged as a 4-column × 3-row grid (16:9 total ratio).
Each cell contains one card portrait. The last 2 cells (row 3, col 3 and col 4) are EMPTY/BLACK.

Grid layout (left to right, top to bottom):
${gridLabels}
Cell 11 (row 3, col 3): BLACK/EMPTY
Cell 12 (row 3, col 4): BLACK/EMPTY

STYLE REQUIREMENTS (critically important — match the provided reference images exactly):
- Same painterly fantasy illustration style as the reference card artworks
- Dark backgrounds with dramatic elemental lighting
- Slightly desaturated overall with vivid accent colors for elemental effects
- Each subject fills 80-90% of its cell
- NO human figures, NO hands, NO characters — only magical effects, orbs, phenomena, spells
- Three elemental themes: Quas=icy blue/white frost, Wex=electric purple-blue lightning, Exort=hot orange-red fire
- Cards involving Invoke should show arcane energy/runes in addition to elemental effects
- Thin separator lines between cells are acceptable

Each cell must be clearly separated and contain only its designated content.
`.trim();

const allRefs = [...styleRefs, ...orbRefs];
console.error(`[gen] Total refs: ${allRefs.length}`);
console.error('[gen] Generating 4×3 orb-cards grid (16:9, 4K)...');

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const parts = [
  ...allRefs.map(r => ({ inlineData: { mimeType: r.mimeType, data: r.data.toString('base64') } })),
  { text: prompt },
];

const resp = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  contents: [{ role: 'user', parts }],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: { aspectRatio: '16:9', imageSize: '4K' },
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

const cellW = Math.floor(W / 4);
const cellH = Math.floor(H / 3);

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

console.error('[gen] Done! 10 orb-switch/invoke card images generated.');
