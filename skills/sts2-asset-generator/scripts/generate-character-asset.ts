#!/usr/bin/env tsx
/**
 * 生成 Invoker 角色资产
 *
 * 运行:
 *   cd C:/code/slay-the-mod/packages/sts2-mcp-server
 *   NODE_PATH="$(pwd)/node_modules" pnpm tsx ../../skills/sts2-asset-generator/scripts/generate-character-asset.ts
 *   NODE_PATH="$(pwd)/node_modules" pnpm tsx ... --asset battle-sprite|char-select|icon|marker|all
 *   NODE_PATH="$(pwd)/node_modules" pnpm tsx ... --variants 3
 *
 * 前置: 先运行 analyze-sts2-style.ts 生成 style-hints.json
 *
 * 输出目录: mods/Invoker/images/generated_versions/{asset}/
 * 最终路径: mods/Invoker/images/{charui|invoker}/...
 */
import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { Part } from '@google/genai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

config({ path: 'C:/code/slay-the-mod/.env', override: true });

// ── 路径 ─────────────────────────────────────────────────────
const HINTS_JSON   = 'C:/code/slay-the-mod/skills/sts2-asset-generator/style-hints.json';
const OUT_BASE     = 'C:/code/slay-the-mod/mods/Invoker/images';
const VERSIONS_DIR = `${OUT_BASE}/generated_versions`;

// ── CLI ──────────────────────────────────────────────────────
const argv = process.argv.slice(2);
let assetType = 'all';
let variants  = 3;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--asset'    && argv[i+1]) assetType = argv[++i];
  if (argv[i] === '--variants' && argv[i+1]) variants  = parseInt(argv[++i]);
}

// ── 祈求者角色描述 ─────────────────────────────────────────────
const INVOKER_DESC = `Invoker character: golden long flowing hair (not tied back), subtle elven facial features (mostly human), gold and white plate armor with large ornate shoulder pauldrons, deep purple/violet robe flowing behind. NO elemental orbs anywhere.`;

// ── 资产规格 ─────────────────────────────────────────────────
// Gemini 1K 各比例实际输出尺寸:
//   3:4  → ~768×1024
//   2:3  → ~683×1024
//   1:1  → ~1024×1024
// 512px:
//   3:4  → ~384×512
//   1:1  → ~512×512

interface AssetSpec {
  label:        string;
  geminiRatio:  string;
  geminiSize:   '512px' | '1K';
  finalPath:    string;
  finalW:       number;
  finalH:       number;
  sharpFit:     'cover' | 'contain' | 'inside';
  // 是否用 grid 模式（一次生成多个变体排列在一张图里）
  gridMode:     boolean;
  gridCols:     number;
  gridRows:     number;
  compositionHint: string;
}

const SPECS: Record<string, AssetSpec> = {
  'battle-sprite': {
    label:           '战斗立绘',
    geminiRatio:     '3:4',
    geminiSize:      '1K',    // ~768×1024
    finalPath:       `${OUT_BASE}/invoker/battle_sprite.png`,
    finalW:          896,
    finalH:          1200,
    sharpFit:        'cover',
    gridMode:        false,
    gridCols:        1,
    gridRows:        1,
    compositionHint: 'Full body portrait. Character fills 80% of frame width. Head leaves 5% space at top, feet near bottom edge. Side-facing right.',
  },
  'char-select': {
    label:           '角色选择立绘',
    geminiRatio:     '2:3',
    geminiSize:      '1K',    // ~683×1024
    finalPath:       `${OUT_BASE}/charui/char_select_invoker.png`,
    finalW:          848,
    finalH:          1264,
    sharpFit:        'cover',
    gridMode:        false,
    gridCols:        1,
    gridRows:        1,
    compositionHint: 'Close-up portrait: head in upper quarter, large shoulder pauldrons spread to frame edges, cropped at mid-chest. Slightly upward camera angle.',
  },
  'icon': {
    label:           '角色图标',
    geminiRatio:     '1:1',
    geminiSize:      '512px', // ~512×512, grid=2×2 → 4个变体
    finalPath:       `${OUT_BASE}/charui/character_icon_invoker.png`,
    finalW:          88,
    finalH:          88,
    sharpFit:        'cover',
    gridMode:        true,
    gridCols:        2,
    gridRows:        2,
    compositionHint: 'Face close-up, centered, simple dark background. Bold strokes, high contrast. Suitable for 88x88 icon at tiny size.',
  },
  'marker': {
    label:           '地图标记',
    geminiRatio:     '1:1',
    geminiSize:      '512px', // grid=2×2 → 4个变体
    finalPath:       `${OUT_BASE}/charui/map_marker_invoker.png`,
    finalW:          49,
    finalH:          64,
    sharpFit:        'contain',
    gridMode:        true,
    gridCols:        2,
    gridRows:        2,
    compositionHint: 'Simplified full-body silhouette icon. Extremely bold outlines, minimal detail, very high contrast. Must be recognizable at 49x64 pixels. Dark background.',
  },
};

// ── 初始化 ───────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY 未设置'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });

// ── 加载 style hints ─────────────────────────────────────────
function loadHints(): any {
  if (!fs.existsSync(HINTS_JSON)) {
    console.warn('[警告] style-hints.json 不存在，使用默认画风描述');
    console.warn('  提示: 先运行 analyze-sts2-style.ts 生成更准确的提示词');
    return {
      battleSprite: { stylePrompt: 'hand-painted digital illustration, semi-realistic, dark fantasy, visible brushwork, strong outlines, dramatic rim lighting, rich color saturation' },
      charSelect:   { stylePrompt: 'hand-painted digital character portrait, semi-realistic, dark fantasy, strong rim lighting, painterly texture' },
      icon:         { stylePrompt: 'game icon art, bold graphic style, high contrast, dark background' },
      sharedTerms:  ['dark fantasy', 'painterly', 'digital illustration', 'not photorealistic', 'not flat cartoon'],
    };
  }
  return JSON.parse(fs.readFileSync(HINTS_JSON, 'utf-8'));
}

// ── 构建提示词 ───────────────────────────────────────────────
function buildPrompt(spec: AssetSpec, hints: any): string {
  const shared = (hints.sharedTerms ?? []).join(', ');

  if (spec.gridMode) {
    const assetKey = spec.label.includes('图标') ? 'icon' : 'icon';
    const iconStyle = hints.icon?.stylePrompt ?? 'bold game icon, high contrast';
    return `Generate a ${spec.gridCols}x${spec.gridRows} grid of ${spec.gridCols * spec.gridRows} different variations.
Each cell is separated by a thin white line border.
Each variation: ${INVOKER_DESC}
${spec.compositionHint}
Style per cell: ${iconStyle}. ${shared}.
Make each variation slightly different in expression/angle/lighting. Label-free, no text.`;
  }

  const assetHints = spec.label.includes('战斗') ? hints.battleSprite : hints.charSelect;
  const stylePrompt = assetHints?.stylePrompt ?? 'hand-painted dark fantasy illustration';
  const lighting    = assetHints?.lighting ?? 'dramatic rim lighting';
  const background  = assetHints?.background ?? 'dark gradient background';

  return `${stylePrompt}. ${shared}.
Subject: ${INVOKER_DESC}
Composition: ${spec.compositionHint}
Lighting: ${lighting}
Background: ${background}
No text, no UI elements, no card frames.`;
}

// ── 生成单张图片 ─────────────────────────────────────────────
async function generateOne(prompt: string, spec: AssetSpec, seed: number): Promise<Buffer> {
  const parts: Part[] = [{ text: `${prompt}\n[seed: ${seed}]` }];

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: [{ role: 'user', parts }],
    config: {
      seed,
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: spec.geminiRatio as any,
        imageSize:   spec.geminiSize as any,
      },
    },
  });

  const imgPart = (response.candidates?.[0]?.content?.parts ?? [])
    .find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imgPart?.inlineData?.data) throw new Error('Gemini 未返回图片');

  return Buffer.from(imgPart.inlineData.data, 'base64');
}

// ── Sharp 后处理: 单张图 → 目标尺寸 ──────────────────────────
async function postProcess(buf: Buffer, spec: AssetSpec, outPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(buf)
    .resize(spec.finalW, spec.finalH, { fit: spec.sharpFit, position: 'top' })
    .png()
    .toFile(outPath);
}

// ── Sharp 后处理: Grid → 裁切多张 ────────────────────────────
async function extractGrid(buf: Buffer, spec: AssetSpec, versionDir: string, variantIdx: number): Promise<void> {
  const meta = await sharp(buf).metadata();
  const imgW = meta.width!;
  const imgH = meta.height!;
  const cellW = Math.floor(imgW / spec.gridCols);
  const cellH = Math.floor(imgH / spec.gridRows);

  fs.mkdirSync(versionDir, { recursive: true });

  let cellNum = 0;
  for (let row = 0; row < spec.gridRows; row++) {
    for (let col = 0; col < spec.gridCols; col++) {
      const outPath = path.join(versionDir, `variant${variantIdx}_cell${cellNum}.png`);
      await sharp(buf)
        .extract({ left: col * cellW, top: row * cellH, width: cellW, height: cellH })
        .resize(spec.finalW, spec.finalH, { fit: spec.sharpFit })
        .png()
        .toFile(outPath);
      console.log(`    裁切 cell${cellNum} → ${path.basename(outPath)}`);
      cellNum++;
    }
  }

  // 同时保存 grid 原图供参考
  const gridPath = path.join(versionDir, `variant${variantIdx}_grid.png`);
  await sharp(buf).png().toFile(gridPath);
}

// ── 生成单个资产类型 ─────────────────────────────────────────
async function generateAsset(key: string, hints: any): Promise<void> {
  const spec = SPECS[key];
  const prompt = buildPrompt(spec, hints);
  const versionDir = path.join(VERSIONS_DIR, key);
  fs.mkdirSync(versionDir, { recursive: true });

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`[${spec.label}] ${spec.geminiRatio} @ ${spec.geminiSize} | grid=${spec.gridMode}`);
  console.log(`目标尺寸: ${spec.finalW}×${spec.finalH}`);

  const count = spec.gridMode ? Math.ceil(variants / (spec.gridCols * spec.gridRows)) : variants;

  for (let i = 1; i <= count; i++) {
    const seed = Math.floor(Math.random() * 99999);
    process.stdout.write(`  变体 ${i}/${count} (seed=${seed})... `);

    const buf = await generateOne(prompt, spec, seed);
    console.log('完成');

    if (spec.gridMode) {
      // 保存原始 grid + 裁切出各 cell
      await extractGrid(buf, spec, versionDir, i);
    } else {
      // 保存原始生成图
      const rawPath = path.join(versionDir, `variant${i}_raw.png`);
      await sharp(buf).png().toFile(rawPath);
      // 保存后处理版本
      const processedPath = path.join(versionDir, `variant${i}.png`);
      await postProcess(buf, spec, processedPath);
      console.log(`    已保存: variant${i}.png (${spec.finalW}×${spec.finalH})`);
    }

    if (i < count) await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n  所有变体保存在: ${versionDir}`);
  console.log(`  人工选择后覆盖: ${spec.finalPath}`);
}

// ── 主函数 ───────────────────────────────────────────────────
async function main() {
  console.log('STS2 Invoker 资产生成器');
  console.log(`模式: ${assetType} | 每类 ${variants} 个变体`);

  const hints = loadHints();

  const targets = assetType === 'all'
    ? Object.keys(SPECS)
    : [assetType];

  for (const key of targets) {
    if (!SPECS[key]) {
      console.error(`未知资产类型: ${key}，可用: ${Object.keys(SPECS).join(' | ')} | all`);
      continue;
    }
    await generateAsset(key, hints);
  }

  console.log('\n\n生成完成！');
  console.log('查看所有变体:', VERSIONS_DIR);
  console.log('选好后手动复制到对应正式路径。');
}

main().catch(e => { console.error(e); process.exit(1); });
