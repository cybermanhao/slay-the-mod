# STS2 Mod Visualizer - 规格文档

> 杀戮尖塔2 可视化 Mod 制作工具

## 1. 项目概述

**项目名称**: STS2 Mod Visualizer  
**项目类型**: 桌面应用 (Tauri + React + TypeScript)  
**核心功能**: 可视化创建卡牌、遗物、角色 Mod，导出为 Godot 可加载的 mod 文件夹  
**目标用户**: 
- 无技术背景玩家（简单模式）
- 有开发背景的 Modder（开发者模式）

---

## 2. UI/UX 规格

### 2.1 窗口结构

- **主窗口**: 1200x800 最小尺寸，可调整大小
- **布局**: 侧边栏 + 主内容区 + 预览面板（三栏）

```
┌──────────────────────────────────────────────────────────────┐
│  标题栏 (Native)                                             │
├────────┬─────────────────────────────────────┬───────────────┤
│        │                                     │               │
│ 侧边栏  │         主编辑区                    │   预览面板    │
│ 240px  │         (弹性)                       │    320px     │
│        │                                     │               │
│ - 项目  │  - 卡牌列表/编辑表单                 │  - 卡牌样式   │
│ - 卡牌  │  - 角色配置                          │  - 遗物样式   │
│ - 遗物  │  - BaseLib 可视化选项                │  - 角色预览   │
│ - 角色  │                                     │               │
│ - 导出  │                                     │               │
│        │                                     │               │
├────────┴─────────────────────────────────────┴───────────────┤
│  状态栏: 项目名 | 保存状态 | 语言                               │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 视觉设计

**配色方案** (参考 STS2 风格):
- Primary: `#1a1a2e` (深蓝黑 - 背景)
- Secondary: `#16213e` (深蓝 - 侧边栏)
- Accent: `#e94560` (珊瑚红 - 强调)
- Card Attack: `#ff6b6b`
- Card Skill: `#4ecdc4`
- Card Power: `#ffd93d`
- Text Primary: `#eaeaea`
- Text Secondary: `#a0a0a0`
- Border: `#2d2d44`

**字体**:
- 标题: Inter, 18px, font-weight: 600
- 正文: Inter, 14px, font-weight: 400
- 卡牌描述: 12px

**间距**:
- 组件间距: 16px
- 内边距: 12px
- 列表项: 8px

### 2.3 组件

| 组件 | 状态 | 行为 |
|------|------|------|
| 侧边栏菜单项 | default / hover / active | hover 背景变亮，active 有左边框强调 |
| 按钮 Primary | default / hover / active / disabled | hover 上移 2px，active 下沉 |
| 输入框 | default / focus / error | focus 边框变 accent 色 |
| 卡牌列表项 | default / hover / selected | hover 背景高亮，selected 有边框 |
| 预览卡牌 | - | 实时渲染 STS2 风格卡牌 |

---

## 3. 功能规格

### 3.1 项目管理

- **新建项目**: 输入项目名、作者名、选择语言
- **打开项目**: 从 .json 文件加载
- **保存项目**: 持久化到本地文件
- **最近项目**: 记录最近 5 个项目

### 3.2 卡牌编辑器

**字段**:
| 字段 | 类型 | 说明 |
|------|------|------|
| ID | string | 唯一标识，如 `MY_STRIKE` |
| 名称 | i18n | { en, zh, ja } |
| 费用 | number | 能量消耗 |
| 类型 | enum | Attack / Skill / Power / Status / Curse |
| 稀有度 | enum | Common / Uncommon / Rare / Special |
| 目标 | enum | AnyEnemy / RandomEnemy / AllEnemies / Self |
| 描述 | i18n | 支持 `{Damage}`, `{Block}`, `{Draw}` 等变量 |
| 数值 | DynamicVar[] | 伤害/格挡/抽牌等数值定义 |
| 图片 | file | 上传卡图 (可选) |

**BaseLib 可视化选项** (简单模式):
- 效果选择器：回合开始抽牌、造成伤害时触发等
- 自动生成对应的钩子代码

**开发者模式**:
- 显示生成的 C# 代码
- 可手动编辑 `OnPlay` 方法

### 3.3 角色编辑器

**字段**:
| 字段 | 类型 |
|------|------|
| ID | string |
| 名称 | i18n |
| 描述 | i18n |
| 初始 HP | number |
| 起始遗物 | Relic[] |
| 起始卡组 | Card[] |
| 卡牌池 | CardPool |
| 遗物池 | RelicPool |
| 药水 | PotionPool |
| 视觉资源 | images (可选) |

### 3.4 导出功能

**导出结构**:
```
{project_name}/
├── mod_manifest.json
├── Scripts/
│   ├── Entry.cs
│   ├── Cards/
│   │   └── {CardId}.cs
│   ├── Relics/
│   │   └── {RelicId}.cs
│   └── Characters/
│       └── {CharacterId}.cs
├── images/
│   ├── cards/
│   └── relics/
└── localization/
    ├── en/
    │   ├── cards.json
    │   ├── relics.json
    │   └── characters.json
    ├── zh/
    └── ja/
```

### 3.5 AI 图片生成

- 用户配置 Gemini API Key（开发阶段从 .env 注入）
- 根据卡牌/遗物名称生成描述，调用 Gemini 生成图片
- 支持批量生成

---

## 4. 数据模型

```typescript
interface ModProject {
  id: string;
  name: string;
  author: string;
  version: string;
  locale: 'en' | 'zh' | 'ja';
  cards: Card[];
  relics: Relic[];
  character?: CharacterConfig;
  createdAt: string;
  updatedAt: string;
}

interface Card {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  cost: number;
  type: CardType;
  rarity: CardRarity;
  targetType: TargetType;
  vars: DynamicVar[];
  imagePath?: string;
}

interface Relic {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  rarity: RelicRarity;
  hooks: RelicHook[];
  imagePath?: string;
}

interface CharacterConfig {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  startingHp: number;
  startingRelicIds: string[];
  startingCardIds: string[];
  cardPoolId: string;
  relicPoolId: string;
}
```

---

## 5. 验收标准

### 功能验收
- [ ] 可以创建新项目并保存为 .json
- [ ] 可以打开已有 .json 项目
- [ ] 可以添加/编辑/删除卡牌
- [ ] 可以添加/编辑/删除遗物
- [ ] 可以配置角色（卡组、遗物池）
- [ ] 预览面板实时显示卡牌样式
- [ ] 可以导出为完整的 mod 文件夹结构
- [ ] 支持中英日三语言

### 视觉验收
- [ ] 侧边栏正确显示菜单结构
- [ ] 卡牌预览符合 STS2 风格
- [ ] 颜色与规格一致
- [ ] 响应式布局正常

### 技术验收
- [ ] Tauri 打包后可在 Windows 运行
- [ ] 项目文件正确序列化为 JSON
- [ ] 导出的 C# 代码符合 BaseLib 规范
