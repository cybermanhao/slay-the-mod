# STS2 画风分析参考

## 整体风格

- **类型**: Dark fantasy card game illustration
- **风格**: Painterly, rich saturation, deep shadows
- **氛围**: Gothic/dungeon fantasy, mystical, dramatic lighting

## 角色色系

| Character | Primary | Secondary | Accent | Description |
|-----------|---------|-----------|--------|-------------|
| Ironclad | #8B0000 (深红) | #CD853F (橙) | #FFD700 (金) | 战士，粗犷，火焰/铁锈感 |
| Silent | #4B0082 (紫) | #228B22 (绿) | #C0C0C0 (银) | 刺客，神秘，毒药/暗影感 |
| Defect | #00CED1 (青) | #4169E1 (蓝) | #FFFFFF (白) | 机械，能量，冰冻/电子感 |
| Neow | #FF69B4 (粉) | #FFD700 (金) | #FFFFFF (白) | 神秘，魔法，祝福/诅咒感 |

## 卡牌类型色

| Type | Color | Hex | Visual |
|------|-------|-----|--------|
| Attack | Crimson red | #DC143C | 攻击，伤害，战斗 |
| Skill | Emerald green | #50C878 | 技能，魔法，策略 |
| Power | Royal blue | #4169E1 | 力量，强化，持久 |

## 稀有度色

| Rarity | Color | Hex | Border |
|--------|-------|-----|--------|
| Common | Steel blue | #4682B4 | 简单边框 |
| Uncommon | Forest green | #228B22 | 装饰边框 |
| Rare | Antique gold | #DAA520 | 华丽金边框 |
| Special | Deep purple | #800080 | 独特边框 |

## 光照风格

- **Rim Lighting**: 边缘光常见，勾勒轮廓
- **Backlighting**: 背光为主，制造神秘感
- **Side Lighting**: 侧光强调形态
- **Color Lighting**: 光源带有角色色

## 构图特征

- **人物**: 居中或三分构图
- **立绘区域**: 约占卡牌 60-70%
- **背景**: 半透明/模糊，或纯色渐变
- **视角**: 略微仰视或俯视，营造张力

## 质量要求

- 高对比度，暗部不死黑
- 清晰边缘，插画感强
- 无照片写实感，保持手绘质感
- 8K/4K 输出，PNG 格式

## Prompt 关键词

### Must Include
- STS2 art style
- dark fantasy
- painterly style
- dramatic rim lighting
- digital illustration

### Avoid
- realistic
- photographic
- smooth gradients
- anime style
- cartoon

## 卡框说明

生成的只是 **立绘 (Portrait)**，卡框需要另外叠加：

```
┌─────────────────┐
│   [立绘区域]     │  ← AI 生成
│                 │
├─────────────────┤
│  卡名 / 费用     │  ← 游戏 UI
│  效果描述        │
│  稀有度 / 类型   │
└─────────────────┘
```

立绘比例建议: 2:3 (对应卡牌比例)
