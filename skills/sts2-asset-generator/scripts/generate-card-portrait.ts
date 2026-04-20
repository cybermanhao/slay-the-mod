#!/usr/bin/env tsx
/**
 * 生成 STS2 卡牌立绘
 * 用法:
 *   pnpm tsx skills/sts2-asset-generator/scripts/generate-card-portrait.ts \
 *     --name "Shadow Cloak" \
 *     --type power \
 *     --character silent \
 *     --rarity rare \
 *     --description "Gain 3 Dexterity..." \
 *     --style-hints '{"portraitPrompt": "..."}' \
 *     --output ./generated/cards/
 *
 * 输出: JSON 格式的生成结果 + PNG 图片
 */
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
let name = '';
let cardType = 'attack';
let character = 'ironclad';
let rarity = 'common';
let description = '';
let styleHints = '';
let output = './generated/cards/';
let imageSize = '1K';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--name' && args[i + 1]) name = args[++i];
  else if (args[i] === '--type' && args[i + 1]) cardType = args[++i];
  else if (args[i] === '--character' && args[i + 1]) character = args[++i];
  else if (args[i] === '--rarity' && args[i + 1]) rarity = args[++i];
  else if (args[i] === '--description' && args[i + 1]) description = args[++i];
  else if (args[i] === '--style-hints' && args[i + 1]) styleHints = args[++i];
  else if (args[i] === '--output' && args[i + 1]) output = args[++i];
  else if (args[i] === '--image-size' && args[i + 1]) imageSize = args[++i];
}

if (!name) {
  console.error('Usage: generate-card-portrait.ts --name <name> --type <type> --character <character> --rarity <rarity> --description <desc> [--style-hints <json>] [--output <dir>] [--image-size 1K|2K]');
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// 角色色系
const characterColors: Record<string, { primary: string; secondary: string; accent: string }> = {
  ironclad: { primary: '深红色', secondary: '橙色', accent: '金色' },
  silent: { primary: '紫色', secondary: '绿色', accent: '银色' },
  defect: { primary: '青色', secondary: '蓝色', accent: '白色' },
  neow: { primary: '粉色', secondary: '金色', accent: '白色' },
};

// 类型色
const typeColors: Record<string, string> = {
  attack: '深红色',
  skill: '翠绿色',
  power: '宝蓝色',
};

// 稀有度色
const rarityColors: Record<string, string> = {
  common: '钢蓝色',
  uncommon: '森林绿色',
  rare: '古金色',
  special: '深紫色',
};

async function main() {
  const charColor = characterColors[character] || characterColors.ironclad;
  const typeColor = typeColors[cardType] || typeColors.attack;
  const rarityColor = rarityColors[rarity] || rarityColors.common;

  // 解析 style hints
  let hints: any = {};
  if (styleHints) {
    try {
      hints = JSON.parse(styleHints);
    } catch (e) {
      console.error('Invalid style-hints JSON:', e);
    }
  }

  const portraitPrompt = hints.portraitPrompt || `STS2 art style, ${character} character, ${cardType} card illustration, dark fantasy, painterly style, rich saturation, dramatic rim lighting, ${charColor.primary} and ${charColor.secondary} color scheme, ${rarityColor} rarity styling, mystical atmosphere, clean linework, digital illustration`;

  const fullPrompt = `${portraitPrompt}

Card Details:
- Name: ${name}
- Type: ${cardType}
- Effect: ${description}

Generate ONLY the character portrait/illustration area (the main artwork), NOT the card frame. The portrait should be centered and suitable for placement in a card frame.`;

  console.error('Generating portrait with prompt:', fullPrompt.substring(0, 100) + '...');

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '2:3',
        imageSize: imageSize as '512px' | '1K' | '2K' | '4K',
      },
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

  if (!imagePart?.inlineData?.data) {
    console.error('Gemini did not return an image');
    process.exit(1);
  }

  // 保存图片
  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const filename = `${safeName}_portrait.png`;
  const outPath = path.join(output, filename);

  fs.mkdirSync(output, { recursive: true });

  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
  await sharp(imageBuffer).png().toFile(outPath);

  const result = {
    success: true,
    asset: {
      path: outPath,
      filename,
      name,
      character,
      type: cardType,
      rarity,
      imageSize,
      styleHints: hints,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
