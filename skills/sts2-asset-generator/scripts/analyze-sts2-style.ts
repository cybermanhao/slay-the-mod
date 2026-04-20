#!/usr/bin/env tsx
/**
 * 分析 STS2 实际角色图 → 反推画风提示词
 *
 * 运行:
 *   cd C:/code/slay-the-mod/packages/sts2-mcp-server
 *   NODE_PATH="$(pwd)/node_modules" pnpm tsx ../../skills/sts2-asset-generator/scripts/analyze-sts2-style.ts
 *
 * 输出: skills/sts2-asset-generator/style-hints.json
 */
import { config } from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type { Part } from '@google/genai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

config({ path: 'C:/code/slay-the-mod/.env', override: true });

const REF_DIR = 'C:/code/slay-the-mod/reference/decompiled_src/Slay the Spire 2/animations';
const OUT_JSON = 'C:/code/slay-the-mod/skills/sts2-asset-generator/style-hints.json';

// 参考图: 角色立绘 (压缩到 512px 再上传)
const REFS = [
  `${REF_DIR}/character_select/silent/characterselect_silent.png`,
  `${REF_DIR}/character_select/ironclad/characterselect_ironclad.png`,
  `${REF_DIR}/character_select/regent/characterselect_regent.png`,
];

async function compress(imgPath: string, maxPx = 512): Promise<{ data: string; label: string }> {
  const buf = await sharp(imgPath)
    .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  return { data: buf.toString('base64'), label: path.basename(imgPath) };
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('GEMINI_API_KEY 未设置'); process.exit(1); }
  const ai = new GoogleGenAI({ apiKey });

  console.log('压缩参考图...');
  const refs = await Promise.all(
    REFS.filter(p => fs.existsSync(p)).map(p => compress(p))
  );
  console.log(`加载了 ${refs.length} 张参考图`);

  const parts: Part[] = [];
  for (const ref of refs) {
    parts.push({ inlineData: { data: ref.data, mimeType: 'image/jpeg' } });
    parts.push({ text: `[参考: ${ref.label}]` });
  }

  parts.push({ text: `你是游戏美术提示词专家。以上是 Slay the Spire 2 的角色立绘。
请仔细分析这些图片的画风，反推出用于 AI 图像生成的提示词 hints。

重点分析:
- 笔触风格 (笔触可见度、边缘处理)
- 光照风格 (主光方向、rim light 特征)
- 色彩风格 (饱和度、对比度、暗部颜色)
- 背景处理 (深色程度、渐变方式)
- 线稿特征 (粗细、颜色)
- 整体质感 (写实度、材质细腻程度)

输出 JSON，只输出 JSON：
{
  "battleSprite": {
    "stylePrompt": "用于生成全身战斗立绘的画风提示词（英文，100字内）",
    "lighting": "光照关键词（英文）",
    "background": "背景描述（英文）",
    "avoidTerms": ["需要避免的词"]
  },
  "charSelect": {
    "stylePrompt": "用于生成角色选择近景立绘的画风提示词（英文，100字内）",
    "lighting": "光照关键词",
    "background": "背景描述",
    "avoidTerms": ["需要避免的词"]
  },
  "icon": {
    "stylePrompt": "用于生成小图标的画风提示词（英文，60字内，强调高对比简洁）",
    "avoidTerms": ["需要避免的词"]
  },
  "sharedTerms": ["所有资产共用的画风关键词（英文）"]
}` });

  console.log('请求 Gemini 分析...');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['TEXT'] },
  });

  const text = (response.text ?? '').trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) { console.error('未返回 JSON:\n', text); process.exit(1); }

  const hints = JSON.parse(m[0]);
  fs.writeFileSync(OUT_JSON, JSON.stringify(hints, null, 2), 'utf-8');

  console.log('\n画风分析完成，已保存到:', OUT_JSON);
  console.log('\nbattleSprite.stylePrompt:');
  console.log(' ', hints.battleSprite?.stylePrompt);
  console.log('\nsharedTerms:', hints.sharedTerms?.join(', '));
}

main().catch(e => { console.error(e); process.exit(1); });
