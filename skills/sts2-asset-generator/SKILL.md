---
name: sts2-asset-generator
description: "Generate STS2 (Slay the Spire 2) character assets using Gemini AI. Analyzes STS2 art style from game files, generates multiple variants, human selects the best. Use when creating character battle sprites, select portraits, icons, or map markers for STS2 mods. Requires project `.env` with GEMINI_API_KEY configured."
---

# STS2 Asset Generator

Generate STS2 character assets using Gemini AI with human-in-the-loop selection.

## When to Use This Skill

- Creating character battle sprites (battle-sprite)
- Creating character select portraits (char-select)
- Creating character icons (icon)
- Creating map markers (marker)
- Batch generating asset variants for human review

## Workflow

```
分析画风 → 生成变体 → 人工选择 → 部署到 mod
```

**每轮：**
1. 分析 STS2 画风（首轮）
2. 生成多个变体（所有变体都保存）
3. 展示变体路径，人工选择编号
4. 复制到 mod 目标路径

## 使用脚本

从 `packages/sts2-mcp-server` 目录执行，使用项目 `.env`（`GEMINI_API_KEY`）：

```bash
cd packages/sts2-mcp-server
NODE_PATH="$(pwd)/node_modules" pnpm tsx \
  ../../skills/sts2-asset-generator/scripts/analyze-sts2-style.ts
```

```bash
cd packages/sts2-mcp-server
NODE_PATH="$(pwd)/node_modules" pnpm tsx \
  ../../skills/sts2-asset-generator/scripts/generate-character-asset.ts \
  --asset all --variants 3
```

## 资产规格

| 资产 | 比例 | 输出尺寸 | 说明 |
|------|------|---------|------|
| battle-sprite | 3:4 | 896×1200 | 战斗立绘，cover 裁切 |
| char-select | 2:3 | 848×1264 | 选角界面头像，cover 裁切 |
| icon | 1:1 (2×2网格) | 88×88/个 | 角色图标，cover 裁切 |
| marker | 1:1 (2×2网格) | 49×64/个 | 地图标记，contain 留边 |

## 变体生成规则

- `generate-character-asset.ts --variants N`：生成 N 组变体（每组 4 个 asset）
- 所有变体保存到 `mods/{ModName}/images/generated_versions/{asset}/`
- 文件名格式：`invoker_battle_sprite_v{组}_{序号}.png`
- 人工选择后，复制到最终路径

## 输出路径

```
mods/{ModName}/images/
├── generated_versions/          # 所有变体（保留）
├── invoker/                    # 最终资产
│   └── battle_sprite.png       # 896×1200
├── charui/
│   ├── char_select_invoker.png # 848×1264
│   └── character_icon_invoker.png  # 88×88
└── charui/
    └── map_marker_invoker.png  # 49×64
```

## 依赖

- **API Key**: 项目根目录 `.env` 中的 `GEMINI_API_KEY`
- **Node 模块**: `packages/sts2-mcp-server/node_modules`
- **Sharp**: 图片后处理（resize、greyscale）
- **@google/genai**: Gemini API 调用

## 已知限制

- 角色立绘生成不含背景移除，需手动处理（见下方后处理）

## 背景移除（手动）

战斗立绘和图标如需透明背景，在 `packages/sts2-mcp-server` 目录执行：

```bash
cd packages/sts2-mcp-server
# 1. Gemini 去背景（输出白色背景）
# 2. Sharp luma key 提取透明区域
node -e "
const sharp = require('sharp');
const path = process.argv[1];
const out = process.argv[2];
sharp(path)
  .removeAlpha()
  .raw()
  .toBuffer({resolveWithObject: true})
  .then(({data, info}) => {
    const alpha = Buffer.alloc(info.width * info.height, 255);
    for (let i = 0; i < data.length / 3; i++) {
      const r = data[i*3], g = data[i*3+1], b = data[i*3+2];
      if (r > 240 && g > 240 && b > 240) alpha[i] = 0;
    }
    return sharp(data, {raw: {width: info.width, height: info.height, channels: 3}})
      .pipelineAlpha(alpha)
      .png()
      .toFile(out);
  });
" input.png output.png
```

## Greyscale 版本（未激活状态）

用 Sharp 转为灰度：

```bash
node -e "
const sharp = require('sharp');
sharp(process.argv[1])
  .grayscale()
  .toFile(process.argv[2]);
" input.png output_greyscale.png
```
