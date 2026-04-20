# Art Director Agent 实施计划

## 目标

将 Art Director 功能集成到 `sts2-asset-generator` Skill，作为艺术方向引擎。

## 资产规格

| 类型 | 尺寸 | 比例 |
|------|------|------|
| Card Portrait | 1000×760 | 1.316:1 |
| Relic Icon | 256×256 | 1:1 |
| Power Icon | 256×256 | 1:1 |

## 文件结构

```
skills/sts2-asset-generator/
├── scripts/
│   ├── art-director/
│   │   ├── index.ts           # 主入口，Mode A/B 选择
│   │   ├── analyzer.ts         # 分析原游戏素材
│   │   ├── prompt-designer.ts # 设计 Gemini prompt
│   │   ├── generator.ts       # 调用 Gemini 生成
│   │   ├── post-processor.ts  # Sharp 后处理
│   │   ├── evaluator.ts       # 评估生成结果
│   │   └── types.ts          # 类型定义
│   ├── art-director.ts        # Mode A 快速流水线入口
│   └── art-director-loop.ts   # Mode B 反思循环入口
├── references/
│   └── asset-specs.json       # 资产规格定义
└── SKILL.md
```

## 任务

### Task 1: 类型定义

**文件:** Create: `scripts/art-director/types.ts`

```typescript
export type AssetType = 'card_portrait' | 'relic_icon' | 'power_icon' | 'character_portrait';
export type WorkMode = 'fast_pipeline' | 'reflection_loop';
export type CharacterClass = 'ironclad' | 'silent' | 'defect' | 'necrobinder' | 'regent' | 'custom';

export interface AssetSpec {
  width: number;
  height: number;
  aspectRatio: string;
}

export interface StyleHints {
  character?: string;
  colorPalette?: {
    primary: string;
    secondary: string;
    accent: string;
    shadows?: string;
    highlights?: string;
  };
  lighting?: string;
  composition?: string;
  portraitPrompt?: string;
  modifiers?: {
    mustInclude?: string[];
    avoid?: string[];
  };
}

export interface GenerateRequest {
  assetType: AssetType;
  character: CharacterClass;
  name: string;
  description: string;
  rarity?: string;
  styleHints?: StyleHints;
  imageSize?: '512px' | '1K' | '2K' | '4K';
}

export interface GenerateResult {
  success: boolean;
  asset?: {
    path: string;
    dimensions: { width: number; height: number };
    promptHash: string;
  };
  iterations?: number;
  mode: WorkMode;
  error?: string;
}

export const ASSET_SPECS: Record<AssetType, AssetSpec> = {
  card_portrait: { width: 1000, height: 760, aspectRatio: '1.316:1' },
  relic_icon: { width: 256, height: 256, aspectRatio: '1:1' },
  power_icon: { width: 256, height: 256, aspectRatio: '1:1' },
  character_portrait: { width: 1000, height: 760, aspectRatio: '1.316:1' },
};
```

### Task 2: 分析器 (analyzer.ts)

**文件:** Create: `scripts/art-director/analyzer.ts`

功能：
- 读取原游戏素材 (PNG 格式)
- 每次最多传 6 张图给 Gemini 分析
- 输出风格特征

```typescript
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import fs from 'fs';
import path from 'path';

const REFERENCE_PATH = 'C:/code/slay-the-mod/reference/decompiled_src/Slay the Spire 2/images/packed/card_portraits';

const CHARACTER_ASSETS = {
  ironclad: ['strike_ironclad.png', 'defend_ironclad.png', 'bash.png'],
  silent: ['strike_silent.png', 'defend_silent.png', 'neutral_strike.png'],
  defect: ['strike_defect.png', 'defend_defect.png', 'zap.png'],
  necrobinder: ['strike_necrobinder.png', 'defend_necrobinder.png'],
  regent: ['strike_regent.png', 'defend_regent.png'],
};

export async function analyzeCharacterStyle(
  character: string,
  apiKey: string
): Promise<any> {
  const ai = new GoogleGenAI({ apiKey });
  const assets = CHARACTER_ASSETS[character as keyof typeof CHARACTER_ASSETS] || [];

  // 读取最多 6 张图片
  const imageParts = assets.slice(0, 6).map(file => {
    const buf = fs.readFileSync(path.join(REFERENCE_PATH, character, file));
    return { inlineData: { mimeType: 'image/png', data: buf.toString('base64') } };
  });

  const textPart = {
    text: `分析这些 STS2 卡牌的画风特征，返回 JSON：
    {
      "colorPalette": { "primary": "", "secondary": "", "accent": "" },
      "lighting": "",
      "subjectStyle": "",
      "composition": "",
      "mood": "",
      "portraitPrompt": "生成该风格卡牌的英文提示词"
    }`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [...imageParts, textPart] }],
    config: { responseModalities: ['TEXT'] },
  });

  return JSON.parse(response.text?.match(/\{[\s\S]*\}/)?.[0] || '{}');
}
```

### Task 3: Prompt 设计器 (prompt-designer.ts)

**文件:** Create: `scripts/art-director/prompt-designer.ts`

功能：
- 根据资产类型、角色、描述设计 prompt
- 结合分析结果和手动输入

```typescript
import { StyleHints } from './types';

const CHARACTER_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  ironclad: { primary: '#8B0000 (深红)', secondary: '#CD853F (橙)', accent: '#FFD700 (金)' },
  silent: { primary: '#4B0082 (紫)', secondary: '#228B22 (绿)', accent: '#C0C0C0 (银)' },
  defect: { primary: '#00CED1 (青)', secondary: '#4169E1 (蓝)', accent: '#FFFFFF (白)' },
  // ... others
};

const TYPE_COLORS: Record<string, { color: string; hex: string }> = {
  attack: { color: 'Crimson Red', hex: '#DC143C' },
  skill: { color: 'Emerald Green', hex: '#50C878' },
  power: { color: 'Royal Blue', hex: '#4169E1' },
};

export function designPrompt(
  name: string,
  assetType: string,
  character: string,
  description: string,
  rarity: string,
  existingHints?: StyleHints
): string {
  const charColor = CHARACTER_COLORS[character] || CHARACTER_COLORS.defect;
  const typeColor = TYPE_COLORS[assetType] || TYPE_COLORS.attack;

  const basePrompt = existingHints?.portraitPrompt || `STS2 art style, ${character} character, ${assetType} illustration, dark fantasy, painterly style, dramatic rim lighting`;

  return `${basePrompt}

Subject Details:
- Name: ${name}
- Description: ${description}
- Color scheme: ${charColor.primary}, ${typeColor.color} (${typeColor.hex})
- Rarity: ${rarity}

Generate ONLY the portrait/illustration area, NOT the card frame.`;
}
```

### Task 4: 生成器 (generator.ts)

**文件:** Create: `scripts/art-director/generator.ts`

功能：
- 调用 Gemini 生成图片
- 支持不同资产类型的 aspectRatio

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ASSET_SPECS, AssetType } from './types';

const ASPECT_RATIO_MAP: Record<AssetType, string> = {
  card_portrait: '2:3',
  relic_icon: '1:1',
  power_icon: '1:1',
  character_portrait: '2:3',
};

export async function generateAsset(
  prompt: string,
  assetType: AssetType,
  imageSize: '512px' | '1K' | '2K' | '4K' = '1K',
  apiKey: string
): Promise<Buffer> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-preview' });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      // @ts-ignore - Gemini API types
      imageConfig: {
        aspectRatio: ASPECT_RATIO_MAP[assetType],
        imageSize,
      },
    },
  });

  const imagePart = result.response.candidates?.[0]?.content?.parts?.find(
    (p: any) => p.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image returned from Gemini');
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}
```

### Task 5: 后处理器 (post-processor.ts)

**文件:** Create: `scripts/art-director/post-processor.ts`

功能：
- Sharp 裁剪到精确尺寸
- PNG 格式输出

```typescript
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ASSET_SPECS, AssetType } from './types';

export async function postProcess(
  imageBuffer: Buffer,
  outputPath: string,
  assetType: AssetType
): Promise<{ path: string; dimensions: { width: number; height: number }; promptHash: string }> {
  const spec = ASSET_SPECS[assetType];

  // 读取图片获取原始尺寸
  const metadata = await sharp(imageBuffer).metadata();
  const origWidth = metadata.width || 0;
  const origHeight = metadata.height || 0;

  // 计算裁剪区域（居中裁剪）
  const targetRatio = spec.width / spec.height;
  const origRatio = origWidth / origHeight;

  let cropWidth: number, cropHeight: number, left: number, top: number;

  if (origRatio > targetRatio) {
    // 图片更宽，裁剪左右
    cropHeight = origHeight;
    cropWidth = Math.round(origHeight * targetRatio);
    left = Math.round((origWidth - cropWidth) / 2);
    top = 0;
  } else {
    // 图片更高，裁剪上下
    cropWidth = origWidth;
    cropHeight = Math.round(origWidth / targetRatio);
    left = 0;
    top = Math.round((origHeight - cropHeight) / 2);
  }

  // 裁剪并调整到目标尺寸
  await sharp(imageBuffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(spec.width, spec.height)
    .png({ quality: 100 })
    .toFile(outputPath);

  // 计算 prompt hash（用于追溯）
  const hash = crypto.createHash('sha256').update(outputPath).digest('hex').substring(0, 16);

  return {
    path: outputPath,
    dimensions: { width: spec.width, height: spec.height },
    promptHash: hash,
  };
}
```

### Task 6: Mode A 入口 (art-director.ts)

**文件:** Create: `scripts/art-director.ts`

```typescript
#!/usr/bin/env tsx
/**
 * Art Director - Mode A: 快速流水线
 * 用法:
 *   tsx scripts/art-director.ts \
 *     --type card_portrait \
 *     --character invoker \
 *     --name "Invoke Strike" \
 *     --description "三元素能量投射攻击" \
 *     --rarity basic \
 *     --output ./mods/Invoker/images/invoker/cards/
 */
import { analyzeCharacterStyle } from './art-director/analyzer';
import { designPrompt } from './art-director/prompt-designer';
import { generateAsset } from './art-director/generator';
import { postProcess } from './art-director/post-processor';
import { ASSET_SPECS } from './art-director/types';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const args = process.argv.slice(2);
let type = 'card_portrait', character = 'defect', name = '', description = '', rarity = 'common', output = './output/';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) type = args[++i];
  else if (args[i] === '--character' && args[i + 1]) character = args[++i];
  else if (args[i] === '--name' && args[i + 1]) name = args[++i];
  else if (args[i] === '--description' && args[i + 1]) description = args[++i];
  else if (args[i] === '--rarity' && args[i + 1]) rarity = args[++i];
  else if (args[i] === '--output' && args[i + 1]) output = args[++i];
}

if (!name) { console.error('Usage: art-director.ts --type <type> --character <char> --name <name> --description <desc>'); process.exit(1); }
if (!process.env.GEMINI_API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

async function main() {
  console.error('[ArtDirector] Mode A: Fast Pipeline');

  // 1. 分析原素材
  console.error('[1/4] Analyzing source assets...');
  const styleHints = await analyzeCharacterStyle(character, process.env.GEMINI_API_KEY!);

  // 2. 设计 prompt
  console.error('[2/4] Designing prompt...');
  const prompt = designPrompt(name, type, character, description, rarity, styleHints);

  // 3. 生成
  console.error('[3/4] Generating...');
  const imageBuffer = await generateAsset(prompt, type, '1K', process.env.GEMINI_API_KEY!);

  // 4. 后处理
  console.error('[4/4] Post-processing...');
  fs.mkdirSync(output, { recursive: true });
  const filename = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.png';
  const result = await postProcess(imageBuffer, path.join(output, filename), type);

  console.log(JSON.stringify({
    success: true,
    asset: { ...result, filename },
    mode: 'fast_pipeline',
  }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
```

### Task 7: Mode B 入口 (art-director-loop.ts)

**文件:** Create: `scripts/art-director-loop.ts`

类似 Mode A，但支持人类确认 prompt 和迭代评估。

### Task 8: 更新 SKILL.md

添加 Art Director 使用说明到 `sts2-asset-generator/SKILL.md`

## 执行顺序

1. `types.ts` - 类型定义
2. `analyzer.ts` - 分析器
3. `prompt-designer.ts` - Prompt 设计
4. `generator.ts` - 生成器
5. `post-processor.ts` - 后处理器
6. `art-director.ts` - Mode A 入口
7. `art-director-loop.ts` - Mode B 入口
8. 更新 `SKILL.md`

是否按此计划执行？
