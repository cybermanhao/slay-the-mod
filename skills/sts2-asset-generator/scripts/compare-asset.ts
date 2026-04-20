#!/usr/bin/env tsx
/**
 * 对比生成结果 vs STS2 画风参考，输出评分 + 改进建议
 * 用法:
 *   pnpm tsx skills/sts2-asset-generator/scripts/compare-asset.ts \
 *     --generated ./generated/cards/shadow_cloak_portrait.png \
 *     --character silent \
 *     --card-type power \
 *     --reference-path ./reference
 *
 * 输出: JSON 格式的评分 + 改进建议
 */
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import sharp from 'sharp';
import fs from 'fs';

const args = process.argv.slice(2);
let generatedPath = '';
let character = 'ironclad';
let cardType = 'attack';
let referencePath = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--generated' && args[i + 1]) generatedPath = args[++i];
  else if (args[i] === '--character' && args[i + 1]) character = args[++i];
  else if (args[i] === '--card-type' && args[i + 1]) cardType = args[++i];
  else if (args[i] === '--reference-path' && args[i + 1]) referencePath = args[++i];
}

if (!generatedPath) {
  console.error('Usage: compare-asset.ts --generated <path> --character <char> --card-type <type> [--reference-path <dir>]');
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

if (!fs.existsSync(generatedPath)) {
  console.error(`Generated file not found: ${generatedPath}`);
  process.exit(1);
}

async function toBase64(imagePath: string, maxPx = 1024): Promise<string> {
  const buf = await sharp(imagePath)
    .resize(maxPx, maxPx, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  return buf.toString('base64');
}

async function main() {
  const ai = new GoogleGenAI({ apiKey });

  // 读取生成的图片
  const generatedB64 = await toBase64(generatedPath, 1024);

  // 角色和类型描述
  const charDescriptions: Record<string, string> = {
    ironclad: '深红色/橙色主调，Ironclad 角色，战士风格',
    silent: '紫色/绿色主调，Silent 角色，刺客风格',
    defect: '青色/蓝色主调，Defect 角色，机械风格',
    neow: '粉色/金色主调，Neow 角色，神秘风格',
  };

  const typeDescriptions: Record<string, string> = {
    attack: '攻击类型 - 深红色调，战斗姿态',
    skill: '技能类型 - 翠绿色调，魔法效果',
    power: '力量类型 - 宝蓝色调，能力强化',
  };

  const charDesc = charDescriptions[character] || charDescriptions.ironclad;
  const typeDesc = typeDescriptions[cardType] || typeDescriptions.attack;

  const parts: any[] = [
    { inlineData: { mimeType: 'image/png', data: generatedB64 } },
    {
      text: `这是 STS2 (Slay the Spire 2) 风格卡牌立绘生成结果。

目标风格: ${charDesc}, ${typeDesc}

请分析这张生成图片，输出 JSON：

{
  "converged": boolean,  // 是否已经收敛到可接受的质量
  "scores": {
    "styleConsistency": number,    // 风格一致性 (1-5)
    "characterMatch": number,     // 角色匹配度 (1-5)
    "colorScheme": number,        // 色彩方案 (1-5)
    "overall": number            // 整体评分 (1-5)
  },
  "issues": string[],            // 发现的问题列表
  "suggestions": string[],       // 改进建议列表
  "improvedHints": {             // 改进后的 hints
    "portraitPrompt": "改进后的完整提示词"
  }
}

评分标准:
- 4.0+ 表示可接受，无需强制修改
- 3.0-4.0 表示有改进空间
- < 3.0 表示需要显著改进

只输出 JSON，不要其他文字。`
    },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: ['TEXT'],
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });

  const text = (response.text ?? '').trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error('模型未返回有效 JSON');
    console.error(text);
    process.exit(1);
  }

  try {
    const json = JSON.parse(jsonMatch[0]);
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('JSON 解析失败:', e);
    console.error(text);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
