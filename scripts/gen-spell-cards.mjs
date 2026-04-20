/**
 * 一次生成 11 张技能牌卡图
 * 策略：生成 4×3 grid（16:9），Sharp 按格坐标裁剪 → 每格 resize 到 1000×760
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const { generateAsset } = await import(
  new URL(`file:///${ROOT.replace(/\\/g, '/')}/packages/sts2-mcp-server/dist/art-director/generator.js`)
);
const sharp = (await import(
  new URL(`file:///${ROOT.replace(/\\/g, '/')}/packages/sts2-mcp-server/node_modules/sharp/lib/index.js`)
)).default;

const RAW = path.join(ROOT, 'mods/Invoker/images/raw image/技能');
const CARD_PORTRAITS = path.join(ROOT,
  'reference/decompiled_src/Slay the Spire 2/images/packed/card_portraits');
const OUT_DIR = path.join(ROOT, 'mods/Invoker/images/invoker/cards');
const GRID_OUT = path.join(ROOT, 'mods/Invoker/images/generated_versions/spell-grid.png');
fs.mkdirSync(path.dirname(GRID_OUT), { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── 读取 Gemini API key 只从项目 .env ─────────────────────────────
const GEMINI_API_KEY = (() => {
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  return env.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
})();
if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not found in .env');

// ── 4×3 布局定义（row, col, rawFile, outputFile）─────────────────
const GRID = [
  // Row 0
  { r: 0, c: 0, raw: '急速冷却.png',  out: 'cold_snap.png',      label: 'Cold Snap: icy blue energy burst freezing in place' },
  { r: 0, c: 1, raw: '幽灵漫步.png',  out: 'ghost_walk.png',     label: 'Ghost Walk: ethereal green-white spectral mist' },
  { r: 0, c: 2, raw: '寒冰之墙.png',  out: 'ice_wall.png',       label: 'Ice Wall: crystalline blue ice spikes erupting from ground' },
  { r: 0, c: 3, raw: '强袭飓风.png',  out: 'tornado.png',        label: 'Tornado: swirling wind vortex with lightning' },
  // Row 1
  { r: 1, c: 0, raw: '超震声波.png',  out: 'deafening_blast.png',label: 'Deafening Blast: shockwave rings expanding outward' },
  { r: 1, c: 1, raw: '电磁脉冲.png',  out: 'emp.png',            label: 'EMP: electric pulse sphere crackling with lightning arcs' },
  { r: 1, c: 2, raw: '灵动迅捷.png',  out: 'alacrity.png',       label: 'Alacrity: golden speed trails and card blur motion' },
  { r: 1, c: 3, raw: '混沌陨石.png',  out: 'chaos_meteor.png',   label: 'Chaos Meteor: flaming rock falling from sky' },
  // Row 2
  { r: 2, c: 0, raw: '熔炉精灵.png',  out: 'forge_spirit.png',   label: 'Forge Spirit: molten fire elemental creature' },
  { r: 2, c: 1, raw: '阳炎冲击.png',  out: 'sun_strike.png',     label: 'Sun Strike: concentrated solar beam striking down' },
  { r: 2, c: 2, raw: '元素祈唤.png',  out: 'invoke.png',         label: 'Invoke: three elemental orbs (ice/lightning/fire) orbiting arcane runes' },
  // Row 2 Col 3: empty
];

// ── 加载参考图（原始技能图 + STS2 风格参考）──────────────────────
function loadImg(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ['.jpg', '.jpeg'].includes(ext) ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp' : 'image/png';
  return { data: fs.readFileSync(filePath), mimeType };
}

// 11 张原始素材
const rawRefs = GRID.map(g => loadImg(path.join(RAW, g.raw))).filter(Boolean);
console.error(`[gen] Loaded ${rawRefs.length} raw spell refs`);

// STS2 风格参考（各职业基础牌，提供绘画风格）
const styleRefs = [
  path.join(CARD_PORTRAITS, 'defect/strike_defect.png'),
  path.join(CARD_PORTRAITS, 'regent/defend_regent.png'),
  path.join(CARD_PORTRAITS, 'silent/strike_silent.png'),
].map(loadImg).filter(Boolean);
console.error(`[gen] Loaded ${styleRefs.length} STS2 style refs`);

// ── 构建提示词 ─────────────────────────────────────────────────────
const gridLabels = GRID.map((g, i) =>
  `Cell ${i + 1} (row ${g.r + 1}, col ${g.c + 1}): ${g.label}`
).join('\n');

const prompt = `
You are creating a sprite sheet of 11 card portrait artworks for a fantasy card game (Slay the Spire 2 style).

REFERENCE IMAGES PROVIDED:
- Images 1-11: The original artwork for each card (use these as composition/subject reference)
- Images 12-14: Examples of the target art style (painterly, dark fantasy, dramatic lighting, slightly desaturated)

OUTPUT FORMAT: A single image arranged as a 4-column × 3-row grid (16:9 total ratio).
Each cell contains one card portrait. The last cell (row 3, col 4) is EMPTY/BLACK.

Grid layout (left to right, top to bottom):
${gridLabels}
Cell 12 (row 3, col 4): BLACK/EMPTY

STYLE REQUIREMENTS (match the STS2 reference images):
- Painterly fantasy illustration style
- Dark background with dramatic lighting
- Slightly desaturated colors with vivid accent colors
- Each subject fills 80-90% of its cell
- NO human figures, NO characters, NO hands — only magical effects, creatures, or phenomena
- Thin subtle separator lines between cells are acceptable

Each cell must be clearly separated and contain only its designated content.
`.trim();

// ── 生成大图 ───────────────────────────────────────────────────────
console.error('[gen] Generating 4×3 spell grid (16:9, 4K)...');
const allRefs = [...rawRefs, ...styleRefs];
// 直接调用底层，绕过 assetType 映射，手动传 16:9
const { GoogleGenAI } = await import(
  new URL(`file:///${ROOT.replace(/\\/g, '/')}/packages/sts2-mcp-server/node_modules/@google/genai/dist/node/index.mjs`)
);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const parts = [
  ...allRefs.map(r => ({ inlineData: { mimeType: r.mimeType, data: r.data.toString('base64') } })),
  { text: prompt },
];
const resp = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  contents: [{ role: 'user', parts }],
  config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '16:9', imageSize: '4K' } },
});
const imgPart = resp.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));
if (!imgPart?.inlineData?.data) throw new Error('No image returned');
const gridBuffer = Buffer.from(imgPart.inlineData.data, 'base64');

// 临时保存大图（debug 用）
fs.writeFileSync(GRID_OUT, gridBuffer);
console.error(`[gen] Grid saved: ${GRID_OUT} (${gridBuffer.length} bytes)`);

// ── Sharp 裁剪每个格子 ─────────────────────────────────────────────
const meta = await sharp(gridBuffer).metadata();
const W = meta.width;
const H = meta.height;
console.error(`[gen] Grid dimensions: ${W}×${H}`);

const cellW = Math.floor(W / 4);
const cellH = Math.floor(H / 3);
console.error(`[gen] Cell size: ${cellW}×${cellH}`);

for (const g of GRID) {
  const left = g.c * cellW;
  const top = g.r * cellH;
  // 不超出图像边界
  const w = Math.min(cellW, W - left);
  const h = Math.min(cellH, H - top);

  const outPath = path.join(OUT_DIR, g.out);
  await sharp(gridBuffer)
    .extract({ left, top, width: w, height: h })
    .resize(1000, 760)
    .png({ quality: 100 })
    .toFile(outPath);

  console.error(`[gen] ✓ ${g.out} (${g.label.split(':')[0]})`);
}

console.error('[gen] Done! 11 cards generated.');
