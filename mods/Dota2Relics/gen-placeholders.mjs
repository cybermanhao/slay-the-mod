/**
 * 生成 Dota2RelicsMod 遗物占位图（256×256 彩色方块）
 * 之后批量生成真实图片时替换即可
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');  // slay-the-mod root

const sharp = (await import(
  new URL(`file:///${ROOT.replace(/\\/g, '/')}/packages/sts2-mcp-server/node_modules/sharp/lib/index.js`)
)).default;

const OUT_DIR = path.join(__dirname, 'images/dota2relics/relics');
fs.mkdirSync(OUT_DIR, { recursive: true });

const RELICS = [
  { file: 'dota_relics-blink_dagger_relic.png',        color: [30, 30, 80],    label: 'Blink' },
  { file: 'dota_relics-eul_scepter_relic.png',         color: [20, 60, 90],    label: 'Eul' },
  { file: 'dota_relics-skull_basher_relic.png',        color: [70, 20, 20],    label: 'Basher' },
  { file: 'dota_relics-black_king_bar_relic.png',      color: [80, 60, 10],    label: 'BKB' },
  { file: 'dota_relics-heart_of_tarrasque_relic.png',  color: [80, 10, 10],    label: 'Heart' },
  { file: 'dota_relics-refresher_orb_relic.png',       color: [10, 70, 50],    label: 'Refresh' },
];

for (const r of RELICS) {
  const [R, G, B] = r.color;
  // 256×256 solid color PNG
  const buf = await sharp({
    create: { width: 256, height: 256, channels: 3, background: { r: R, g: G, b: B } }
  }).png().toBuffer();

  const outPath = path.join(OUT_DIR, r.file);
  fs.writeFileSync(outPath, buf);
  console.log(`✓ ${r.file}`);
}

console.log('Done! Placeholder icons generated.');
