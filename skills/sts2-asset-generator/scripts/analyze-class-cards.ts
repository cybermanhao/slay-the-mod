#!/usr/bin/env tsx
/**
 * 用 Gemini 分析 STS2 各职业基础攻击/防御卡的画风
 * 输出: JSON 格式的画风分析 + 提示词快照
 */
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import * as crypto from 'crypto';

const args = process.argv.slice(2);
let character = 'ironclad';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--character' && args[i + 1]) character = args[++i];
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

// 角色色系配置
const characterColors: Record<string, { primary: string; secondary: string; accent: string; description: string }> = {
  ironclad: {
    primary: '深红色 #8B0000',
    secondary: '橙色 #CD853F',
    accent: '金色 #FFD700',
    description: '战士，粗犷，火焰/铁锈/肌肉感'
  },
  silent: {
    primary: '紫色 #4B0082',
    secondary: '绿色 #228B22',
    accent: '银色 #C0C0C0',
    description: '刺客，神秘，毒药/暗影/灵巧感'
  },
  defect: {
    primary: '青色 #00CED1',
    secondary: '蓝色 #4169E1',
    accent: '白色 #FFFFFF',
    description: '机械，能量，冰冻/电子/科技感'
  },
  neow: {
    primary: '粉色 #FF69B4',
    secondary: '金色 #FFD700',
    accent: '白色 #FFFFFF',
    description: '神秘，魔法，祝福/诅咒/神圣感'
  },
};

// 攻击/防御卡配置
const cardTypes = [
  { type: 'strike', name: '攻击', prompt: 'basic attack card' },
  { type: 'defend', name: '防御', prompt: 'basic defend/block card' }
];

async function main() {
  const ai = new GoogleGenAI({ apiKey });
  const charColor = characterColors[character] || characterColors.ironclad;

  // 分析攻击卡和防御卡
  const results: Record<string, any> = {};

  for (const cardType of cardTypes) {
    const prompt = `你是 STS2 (Slay the Spire 2) 画风专家。

请分析 ${character} 职业的基础${cardType.name}卡（如 Strike/Defend）的画风特征。

角色色彩配置：
- 主色: ${charColor.primary}
- 副色: ${charColor.secondary}
- 点缀色: ${charColor.accent}
- 角色描述: ${charColor.description}

请输出 JSON 格式的画风分析：

{
  "character": "${character}",
  "cardType": "${cardType.type}",
  "cardName": "${character} 的基础${cardType.name}卡名称建议",
  "styleDescription": "整体画风描述",
  "colorPalette": {
    "primary": "主色调",
    "secondary": "副色调",
    "accent": "点缀色"
  },
  "lighting": "光照风格",
  "composition": "构图特点",
  "subjectDescription": "画面主体描述（人物姿态、动作、武器/防具）",
  "portraitPrompt": "生成卡牌立绘的完整英文提示词",
  "modifiers": {
    "mustInclude": ["必须包含的关键词"],
    "avoid": ["需要避免的关键词"]
  }
}

只输出 JSON。`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['TEXT'],
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });

    const text = (response.text ?? '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const json = JSON.parse(jsonMatch[0]);
        // 生成提示词快照 (hash)
        const promptHash = crypto.createHash('sha256')
          .update(json.portraitPrompt)
          .digest('hex')
          .substring(0, 16);

        results[cardType.type] = {
          ...json,
          promptHash,
          generatedAt: new Date().toISOString()
        };
      } catch (e) {
        console.error(`Failed to parse ${cardType.type}:`, e);
      }
    }
  }

  // 输出结果
  console.log(JSON.stringify({
    character,
    characterColor: charColor,
    cards: results
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
