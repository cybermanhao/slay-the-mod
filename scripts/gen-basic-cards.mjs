/**
 * 生成 Invoker 基础攻击牌和防御牌立绘
 * 以5个职业的原版基础牌作风格参考
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// 动态加载已编译的 generator
const { generateAsset } = await import(
  new URL(`file:///${ROOT.replace(/\\/g, '/')}/packages/sts2-mcp-server/dist/art-director/generator.js`)
);

const CARD_PORTRAITS = path.join(ROOT,
  'reference/decompiled_src/Slay the Spire 2/images/packed/card_portraits');

// 只从项目 .env 文件读取，忽略 shell 环境变量
const GEMINI_API_KEY = (() => {
  const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const m = env.match(/GEMINI_API_KEY=(.+)/);
  return m?.[1]?.trim();
})();

if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not found');

function loadRef(filePath) {
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return { data, mimeType };
}

// ── Strike references ──────────────────────────────────────────────
const strikeRefs = [
  path.join(CARD_PORTRAITS, 'ironclad/strike_ironclad.png'),
  path.join(CARD_PORTRAITS, 'defect/strike_defect.png'),
  path.join(CARD_PORTRAITS, 'silent/strike_silent.png'),
  path.join(CARD_PORTRAITS, 'necrobinder/strike_necrobinder.png'),
  path.join(CARD_PORTRAITS, 'regent/strike_regent.png'),
].filter(fs.existsSync).map(loadRef);

console.error(`[gen] Loaded ${strikeRefs.length} strike references`);

// ── Defend references ──────────────────────────────────────────────
const defendRefs = [
  path.join(CARD_PORTRAITS, 'ironclad/defend_ironclad.png'),
  path.join(CARD_PORTRAITS, 'defect/defend_defect.png'),
  path.join(CARD_PORTRAITS, 'silent/defend_silent.png'),
  path.join(CARD_PORTRAITS, 'necrobinder/defend_necrobinder.png'),
  path.join(CARD_PORTRAITS, 'regent/defend_regent.png'),
].filter(fs.existsSync).map(loadRef);

console.error(`[gen] Loaded ${defendRefs.length} defend references`);

const OUT_DIR = path.join(ROOT, 'mods/Invoker/images/invoker/cards');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Generate Strike ────────────────────────────────────────────────
console.error('[gen] Generating strike_invoker...');
const strikePrompt = `
These reference images show the basic "Strike" attack card artwork from 5 characters in Slay the Spire 2.
Carefully study their shared art style: painterly fantasy illustration, dramatic lighting, slightly desaturated palette,
dark vignette border, dynamic composition, landscape card portrait (4:3 ratio).

Now create a new "Strike" card portrait for the Invoker character — an arcane spellcaster who wields three elemental orbs (Quas=ice, Wex=lightning, Exort=fire).
The image shows a magical arcane projectile or energy bolt — glowing arcane energy condensed into a focused projectile shooting forward.
Color palette: cool blue-purple arcane energy with subtle multi-element (ice/lightning/fire) hints.
IMPORTANT: NO human figures, NO characters, NO hands, NO body parts. Only the magical effect/energy itself.
The subject should fill 80-90% of the frame. Same painterly STS2 art style as the references. Dark background. No text. No card frame.
`.trim();

const strikeBuf = await generateAsset({
  prompt: strikePrompt,
  assetType: 'card_portrait',
  imageSize: '1K',
  apiKey: GEMINI_API_KEY,
  referenceImages: strikeRefs,
});

const strikeOut = path.join(OUT_DIR, 'strike_invoker.png');
fs.writeFileSync(strikeOut, strikeBuf);
console.error(`[gen] Saved: ${strikeOut} (${strikeBuf.length} bytes)`);

// ── Generate Defend ────────────────────────────────────────────────
console.error('[gen] Generating defend_invoker...');
const defendPrompt = `
These reference images show the basic "Defend" block card artwork from 5 characters in Slay the Spire 2.
Carefully study their shared art style: painterly fantasy illustration, dramatic lighting, slightly desaturated palette,
dark vignette border, dynamic composition, landscape card portrait (4:3 ratio).

Now create a new "Defend" card portrait for the Invoker character — an arcane spellcaster who wields three elemental orbs (Quas=ice, Wex=lightning, Exort=fire).
The image shows a magical rune circle / arcane sigil barrier emanating protective energy outward.
Glowing arcane runes arranged in a circular pattern, radiating mystical shielding energy.
Color palette: cool purple-blue with faint gold rune glow.
IMPORTANT: NO human figures, NO characters, NO hands, NO body parts. Only the magical barrier/rune effect itself.
The subject should fill 80-90% of the frame. Same painterly STS2 art style as the references. Dark background. No text. No card frame.
`.trim();

const defendBuf = await generateAsset({
  prompt: defendPrompt,
  assetType: 'card_portrait',
  imageSize: '1K',
  apiKey: GEMINI_API_KEY,
  referenceImages: defendRefs,
});

const defendOut = path.join(OUT_DIR, 'defend_invoker.png');
fs.writeFileSync(defendOut, defendBuf);
console.error(`[gen] Saved: ${defendOut} (${defendBuf.length} bytes)`);

console.error('[gen] Done!');
