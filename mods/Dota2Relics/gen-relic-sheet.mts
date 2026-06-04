/**
 * Dota2 Relic Icon Sheet Generator
 * 一次 Gemini 请求生成 4×4 = 16 个遗物图标，再用 Sharp 切分为 256×256 PNG。
 *
 * 用法:
 *   npx tsx gen-relic-sheet.mts [batch]
 *   batch: 1 (default) 或 2
 */

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 物品定义 ──────────────────────────────────────────────────────────────────

const BATCHES: Array<Array<{ id: string; name: string; description: string }>> = [
  // Batch 1: 当前 6 个已有遗物
  [
    { id: 'dotarelics-blink_dagger_relic',         name: 'Blink Dagger',        description: 'a blue dagger with a teleportation crystal' },
    { id: 'dotarelics-eul_scepter_relic',           name: "Eul's Scepter",       description: 'a golden magical scepter with wind swirls' },
    { id: 'dotarelics-skull_basher_relic',          name: 'Skull Basher',        description: 'a brutal spiked mace with a cracked skull' },
    { id: 'dotarelics-black_king_bar_relic',        name: 'Black King Bar',      description: 'a massive dark golden bar with a crown' },
    { id: 'dotarelics-heart_of_tarrasque_relic',   name: 'Heart of Tarrasque',  description: 'a glowing red dragon heart with golden veins' },
    { id: 'dotarelics-refresher_orb_relic',        name: 'Refresher Orb',       description: 'a swirling blue-white orb of reset energy' },
    { id: 'dotarelics-aghanims_scepter_relic',     name: "Aghanim's Scepter",   description: 'a purple crystalline scepter with a glowing tip' },
    { id: 'dotarelics-divine_rapier_relic',        name: 'Divine Rapier',       description: 'a radiant golden rapier with divine light' },
    { id: 'dotarelics-daedalus_relic',             name: 'Daedalus',            description: 'a dark serrated sword with red critical energy' },
    { id: 'dotarelics-butterfly_relic',            name: 'Butterfly',           description: 'a delicate emerald butterfly with iridescent wings' },
    { id: 'dotarelics-mjolnir_relic',              name: 'Mjolnir',             description: 'a heavy golden hammer crackling with lightning' },
    { id: 'dotarelics-shivas_guard_relic',         name: "Shiva's Guard",       description: 'an ornate blue-green armor plate with ice shards' },
    { id: 'dotarelics-assault_cuirass_relic',      name: 'Assault Cuirass',     description: 'a silver battle breastplate with spinning gears' },
    { id: 'dotarelics-linkens_sphere_relic',       name: "Linken's Sphere",     description: 'a glowing green orb inside a golden ring' },
    { id: 'dotarelics-scythe_of_vyse_relic',       name: 'Scythe of Vyse',      description: 'a curved purple scythe with a sheep emblem' },
    { id: 'dotarelics-manta_style_relic',          name: 'Manta Style',         description: 'twin curved blue blades crossing each other' },
  ],
  // Batch 2: 更多物品
  [
    { id: 'dotarelics-shadow_blade_relic',         name: 'Shadow Blade',        description: 'a dark blade that fades into shadows' },
    { id: 'dotarelics-force_staff_relic',          name: 'Force Staff',         description: 'a green staff with a pushing force aura' },
    { id: 'dotarelics-orchid_malevolence_relic',   name: 'Orchid Malevolence',  description: 'a crimson orchid flower staff with silence energy' },
    { id: 'dotarelics-lotus_orb_relic',            name: 'Lotus Orb',           description: 'a golden lotus flower petal orb glowing with magic' },
    { id: 'dotarelics-battle_fury_relic',          name: 'Battle Fury',         description: 'a broad axe with cleave energy arcs' },
    { id: 'dotarelics-pipe_of_insight_relic',      name: 'Pipe of Insight',     description: 'a mystical pipe with magical smoke and a barrier bubble' },
    { id: 'dotarelics-ethereal_blade_relic',       name: 'Ethereal Blade',      description: 'a translucent ghost blade with ether energy' },
    { id: 'dotarelics-bloodthorn_relic',           name: 'Bloodthorn',          description: 'a thorned dark red blade dripping blood' },
    { id: 'dotarelics-nullifier_relic',            name: 'Nullifier',           description: 'a heavy silver maul that dispels magic' },
    { id: 'dotarelics-moon_shard_relic',           name: 'Moon Shard',          description: 'a crescent moon crystal shard glowing silver' },
    { id: 'dotarelics-abyssal_blade_relic',        name: 'Abyssal Blade',       description: 'a deep dark blade with a stun rune' },
    { id: 'dotarelics-guardian_greaves_relic',     name: 'Guardian Greaves',    description: 'golden armored boots with a healing aura' },
    { id: 'dotarelics-veil_of_discord_relic',      name: 'Veil of Discord',     description: 'a torn mystical veil with chaos runes' },
    { id: 'dotarelics-sange_yasha_relic',          name: 'Sange and Yasha',     description: 'two curved blades, one red one blue' },
    { id: 'dotarelics-octarine_core_relic',        name: 'Octarine Core',       description: 'a pulsing octagonal crystal with rainbow hues' },
    { id: 'dotarelics-solar_crest_relic',          name: 'Solar Crest',         description: 'a radiant golden sun medallion on a chain' },
  ],
];

// ── Gemini 生成 ───────────────────────────────────────────────────────────────

const CELL = 256;
const COLS = 4;
const ROWS = 4;
const SHEET_SIZE = CELL * COLS; // 1024

async function generateSheet(items: typeof BATCHES[0], apiKey: string): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey });

  const itemDescriptions = items.map((item, i) => {
    const row = Math.floor(i / COLS) + 1;
    const col = (i % COLS) + 1;
    return `(row ${row}, col ${col}): ${item.name} — ${item.description}`;
  }).join('\n');

  const prompt = `Create a 4x4 sprite sheet of exactly 16 Dota 2 item icons arranged in a 4 column by 4 row grid.
Each icon occupies one equal cell in the grid.

Art style requirements:
- Slay the Spire relic icon style: dark fantasy hand-painted illustration
- THICK BLACK OUTLINES on every item (3-5px stroke, essential for sharp cropping)
- Each item centered in its cell with some padding
- Dark/black background per cell OR consistent solid dark background for the whole sheet
- Warm golden/amber highlights, rich saturated colors
- Small but readable detail — clean at 256x256 pixels
- No text, no labels, no borders between cells
- Consistent lighting: warm light from upper-left

Items (left to right, top to bottom):
${itemDescriptions}

Make sure the grid is perfectly aligned — each of the 16 items must be in its own distinct area with no overlap.`;

  console.error('[Generator] Sending prompt to Gemini...');
  console.error(`[Generator] Sheet size: ${SHEET_SIZE}x${SHEET_SIZE}`);

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '1:1', imageSize: '1K' } as any,
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

  if (!(imagePart as any)?.inlineData?.data) {
    throw new Error('Gemini did not return an image');
  }

  const rawBuffer = Buffer.from((imagePart as any).inlineData.data, 'base64');

  // 强制转为 PNG
  return await sharp(rawBuffer).png().toBuffer();
}

// ── Sharp 切分 ────────────────────────────────────────────────────────────────

async function splitSheet(
  sheetBuffer: Buffer,
  items: typeof BATCHES[0],
  outputDir: string,
  sheetPath: string
): Promise<void> {
  fs.mkdirSync(outputDir, { recursive: true });

  // 保存原始图表供检查
  fs.writeFileSync(sheetPath, sheetBuffer);
  console.error(`[Splitter] Sheet saved: ${sheetPath}`);

  const meta = await sharp(sheetBuffer).metadata();
  const sheetW = meta.width ?? SHEET_SIZE;
  const sheetH = meta.height ?? SHEET_SIZE;
  const cellW = Math.floor(sheetW / COLS);
  const cellH = Math.floor(sheetH / ROWS);

  console.error(`[Splitter] Sheet: ${sheetW}x${sheetH}, Cell: ${cellW}x${cellH}`);

  for (let i = 0; i < items.length; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const left = col * cellW;
    const top = row * cellH;

    const outputPath = path.join(outputDir, `${items[i].id}.png`);

    await sharp(sheetBuffer)
      .extract({ left, top, width: cellW, height: cellH })
      .resize(CELL, CELL, { fit: 'cover' })
      .png()
      .toFile(outputPath);

    console.error(`[Splitter] ${i + 1}/16 → ${items[i].id}.png`);
  }
}

// ── 主流程 ────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const batchArg = parseInt(process.argv[2] ?? '1', 10);
  if (batchArg < 1 || batchArg > BATCHES.length) {
    throw new Error(`Invalid batch number. Use 1 or 2.`);
  }

  const items = BATCHES[batchArg - 1];
  const outputDir = path.join(__dirname, 'images', 'dota2relics', 'relics');
  const sheetDir = path.join(__dirname, 'images', 'generated_versions');
  fs.mkdirSync(sheetDir, { recursive: true });
  const sheetPath = path.join(sheetDir, `relic-sheet-batch${batchArg}.png`);

  console.error(`[Main] Batch ${batchArg}: ${items.length} items`);
  console.error(`[Main] Output: ${outputDir}`);

  const sheetBuffer = await generateSheet(items, apiKey);
  await splitSheet(sheetBuffer, items, outputDir, sheetPath);

  console.error(`[Main] Done! ${items.length} icons saved to ${outputDir}`);
  console.log(JSON.stringify({ success: true, batch: batchArg, count: items.length, sheetPath }));
}

main().catch(err => {
  console.error('[Main] ERROR:', err.message);
  process.exit(1);
});
