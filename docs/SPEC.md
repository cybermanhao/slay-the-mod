# STS2 Mod Agent 架构规格说明书

**版本**: 1.0  
**日期**: 2025-03-17  
**状态**: 草稿

---

## 1. 项目概述

### 1.1 目标

创建一个可集成到任意Agent系统的 **STS2 Mod开发工具**，具备：

- **可视化编辑器** - 卡牌/遗物属性编辑、实时预览
- **MCP工具层** - 代码生成、文件操作、项目构建
- **Skill知识库** - STS2 API、BaseLib、Hook系统
- **双Agent架构** - Supervisor + Worker 模式的任务执行

### 1.2 核心价值

- 用户通过自然语言描述需求，Agent自动完成Mod开发
- 生成的代码符合BaseLib规范，可直接编译运行
- 支持可视化编辑 + 代码生成混合工作流

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           External Agent                                 │
│                    (任意Agent: ChatGPT, Claude, 自研)                    │
│                                                                         
│   "创建一个包含3张攻击牌和2张遗物的mod"                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        ModAgent Protocol (API)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  - understand(query) → TaskSpec                                 │   │
│  │  - execute(tool, args) → Result                                │   │
│  │  - getProjectState() → State                                    │   │
│  │  - reset()                                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  Supervisor     │   │     Worker       │   │    UI Editor     │
│  Agent          │   │     Pool         │   │    (可选)        │
│                 │   │                  │   │                  │
│ - 理解需求      │   │ - CodeGen Worker │   │ - 可视化编辑     │
│ - 分解任务      │   │ - FileOps Worker │   │ - 实时预览       │
│ - 分发 Worker   │   │ - Builder Worker │   │ - 属性编辑       │
│ - 汇总结果      │   │                  │   │                  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
          │                         │
          └─────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           MCP Server                                    │
│                                                                         
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  CodeGen Tools           │  FileOps Tools    │  Build Tools    │   │
│  │  ├─ generate_card        │  ├─ create_project│  ├─ build      │   │
│  │  ├─ generate_relic      │  ├─ write_file    │  ├─ export     │   │
│  │  ├─ generate_power      │  ├─ read_file     │  └─ validate   │   │
│  │  └─ generate_mod        │  └─ copy_template │                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             Skill                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  - STS2 Core API (CardModel, RelicModel, PowerModel)            │   │
│  │  - BaseLib API ([Pool], CustomCardModel, Hooks)                 │   │
│  │  - 常用卡牌/遗物脚本模板                                         │   │
│  │  - Hook类型列表与用法                                           │   │
│  │  - 本地化格式 (cards.json, relics.json)                         │   │
│  │  - 调试技巧与日志                                               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责 | 技术栈 | 位置 |
|-----|------|-------|------|
| **ModAgent Protocol** | 标准化接口，兼容任意Agent | TypeScript | `packages/mod-agent-protocol/` |
| **Supervisor Agent** | 任务理解、分解、调度 | TypeScript | `packages/mod-agent-protocol/src/supervisor.ts` |
| **Worker Pool** | 具体执行者 | TypeScript | `packages/mod-agent-protocol/src/workers/` |
| **MCP Server** | 工具能力封装 | TypeScript | `packages/sts2-mcp-server/` |
| **Skill** | 知识库 | Markdown | `.agents/skills/slay-the-spire-2-modding/` |
| **UI Editor** | 可视化编辑 (可选) | React + Tauri | `slay-the-mod/visualize/` |

---

## 3. 数据模型

### 3.1 核心类型定义

```typescript
// 任务规范
interface TaskSpec {
  id: string;
  query: string;
  subtasks: Subtask[];
  context?: Record<string, unknown>;
}

interface Subtask {
  id: string;
  type: 'card' | 'relic' | 'power' | 'project' | 'build';
  action: string;
  input: CardInput | RelicInput | PowerInput | ProjectInput;
  dependsOn: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: Result;
}

// 卡牌输入
interface CardInput {
  id: string;
  name: Record<'en' | 'zh' | 'ja', string>;
  description: Record<'en' | 'zh' | 'ja', string>;
  cost: number;
  type: CardType;
  rarity: CardRarity;
  targetType: TargetType;
  effects: CardEffect[];
  pool: CardPoolType[];
  imagePath?: string;
  upgraded?: boolean;
  upgradedDescription?: Record<'en' | 'zh' | 'ja', string>;
}

interface CardEffect {
  id: string;
  action: EffectAction;
  value: number;
  target: 'enemy' | 'self' | 'allEnemies' | 'randomEnemy';
  powerType?: string;
}

type EffectAction = 
  | 'damage' | 'block' | 'draw' | 'heal' | 'energy' 
  | 'applyPower' | 'discard' | 'exhaust' | 'gainGold'
  | 'channel' | 'evoke' | 'summon' | 'star' | 'forge';

// 遗物输入
interface RelicInput {
  id: string;
  name: Record<'en' | 'zh' | 'ja', string>;
  description: Record<'en' | 'zh' | 'ja', string>;
  flavorText?: Record<'en' | 'zh' | 'ja', string>;
  rarity: RelicRarity;
  hooks: HookType[];
  pool: RelicPoolType;
}

type HookType = 
  | 'OnPlayerTurnStart' | 'OnPlayerTurnEnd'
  | 'OnEnemyTurnStart' | 'OnEnemyTurnEnd'
  | 'AfterCardPlayed' | 'AfterCardDrawn' | 'AfterCardDiscarded'
  | 'AfterCombatStart' | 'AfterCombatEnd'
  | 'OnMonsterDeath' | 'OnPlayerDamaged';

// 项目输入
interface ProjectInput {
  name: string;
  author: string;
  description?: string;
  cards: CardInput[];
  relics: RelicInput[];
  powers: PowerInput[];
}

// 执行结果
interface Result {
  success: boolean;
  output?: string;
  error?: string;
  artifacts?: GeneratedFile[];
}

interface GeneratedFile {
  path: string;
  content: string;
}
```

### 3.2 项目状态

```typescript
interface ProjectState {
  project: ProjectInput;
  files: Map<string, string>;  // path → content
  buildStatus: 'idle' | 'building' | 'success' | 'failed';
  lastError?: string;
}
```

---

## 4. MCP 工具定义

### 4.1 代码生成工具

```typescript
// 生成卡牌代码
interface GenerateCardTool {
  name: "generate_card";
  description: "生成STS2卡牌C#代码";
  inputSchema: {
    type: "object";
    properties: {
      card: CardInput;
      namespace: { type: "string" };
      useBaseLib: { type: "boolean"; default: true };
    };
    required: ["card", "namespace"];
  };
  outputSchema: {
    type: "object";
    properties: {
      code: { type: "string" };
      filePath: { type: "string" };
    };
  };
}

// 生成遗物代码
interface GenerateRelicTool {
  name: "generate_relic";
  description: "生成STS2遗物C#代码";
  inputSchema: {
    type: "object";
    properties: {
      relic: RelicInput;
      namespace: { type: "string" };
    };
    required: ["relic", "namespace"];
  };
}

// 生成Power代码
interface GeneratePowerTool {
  name: "generate_power";
  description: "生成STS2能力C#代码";
  inputSchema: {
    type: "object";
    properties: {
      power: PowerInput;
      namespace: { type: "string" };
    };
    required: ["power", "namespace"];
  };
}

// 生成完整Mod
interface GenerateModTool {
  name: "generate_mod";
  description: "生成完整STS2 Mod项目结构";
  inputSchema: {
    type: "object";
    properties: {
      project: ProjectInput;
      outputDir: { type: "string" };
      includeLocalization: { type: "boolean"; default: true };
    };
    required: ["project", "outputDir"];
  };
}
```

### 4.2 文件操作工具

```typescript
interface CreateProjectTool {
  name: "create_project";
  description: "创建STS2 Mod项目目录结构";
  inputSchema: {
    type: "object";
    properties: {
      name: { type: "string" };
      author: { type: "string" };
      outputDir: { type: "string" };
    };
    required: ["name", "author", "outputDir"];
  };
}

interface WriteFileTool {
  name: "write_file";
  description: "写入文件到项目目录";
  inputSchema: {
    type: "object";
    properties: {
      path: { type: "string" };
      content: { type: "string" };
    };
    required: ["path", "content"];
  };
}

interface ReadFileTool {
  name: "read_file";
  description: "读取项目文件";
  inputSchema: {
    type: "object";
    properties: {
      path: { type: "string" };
    };
    required: ["path"];
  };
}

interface ListTemplatesTool {
  name: "list_templates";
  description: "列出可用的卡牌/遗物模板";
  inputSchema: {
    type: "object";
    properties: {
      type: { type: "string"; enum: ["card", "relic", "power"] };
      character?: { type: "string" };
    };
  };
}
```

### 4.3 构建工具

```typescript
interface BuildModTool {
  name: "build_mod";
  description: "编译STS2 Mod DLL";
  inputSchema: {
    type: "object";
    properties: {
      projectDir: { type: "string" };
      configuration: { type: "string"; enum: ["Debug", "Release"]; default: "Release" };
    };
    required: ["projectDir"];
  };
}

interface ExportModTool {
  name: "export_mod";
  description: "导出Mod为PCK文件";
  inputSchema: {
    type: "object";
    properties: {
      projectDir: { type: "string" };
      platform: { type: "string"; enum: ["Windows", "Linux", "macOS"]; default: "Windows" };
    };
    required: ["projectDir"];
  };
}
```

---

## 5. Agent 工作流

### 5.1 Supervisor 工作流程

```
1. 接收用户请求
      │
      ▼
2. 解析需求 → TaskSpec
      │
      ▼
3. 分解为Subtasks
      │
      ▼
4. 对每个Subtask:
      │  4.1 选择合适的Worker
      │  4.2 分发任务
      │  4.3 收集结果
      │  4.4 检查依赖
      ▼
5. 汇总结果
      │
      ▼
6. 检查完成条件
      │  ✓ 完成 → 返回结果
      │  ✗ 未完成 → 继续执行
      ▼
7. 返回最终输出
```

### 5.2 Worker 类型

| Worker | 职责 | 调用的MCP工具 |
|--------|------|---------------|
| **CodeGen Worker** | 生成代码 | generate_card, generate_relic, generate_power |
| **FileOps Worker** | 文件操作 | create_project, write_file, copy_template |
| **Builder Worker** | 编译构建 | build_mod, export_mod |
| **Localization Worker** | 本地化 | generate_localization |

### 5.3 任务示例

**输入**: "创建一个Ironclad用的攻击牌，造成8点伤害，升级后12点"

**执行流程**:

```
Supervisor
│
├─→ [Subtask 1] 创建卡牌: Ironclad攻击牌
│   └─→ CodeGen Worker
│       └─→ generate_card({
│           name: {en: "Strike"},
│           cost: 1,
│           type: "Attack",
│           effects: [{action: "damage", value: 8, target: "enemy"}],
│           upgraded: {value: 4},  // 8+4=12
│           pool: ["Ironclad"]
│         })
│
├─→ [Subtask 2] 生成本地化
│   └─→ Localization Worker
│       └─→ generate_localization(...)
│
├─→ [Subtask 3] 写入文件
│   └─→ FileOps Worker
│       └─→ write_file("Scripts/Cards/Strike.cs", code)
│
└─→ 汇总 → 返回生成的文件列表
```

---

## 6. Skill 知识库

### 6.1 内容结构

```
slay-the-spire-2-modding/
├── SKILL.md                    # 主文件
├── REFERENCES.md               # 参考资料
│
├── templates/
│   ├── card_template.cs       # 卡牌模板
│   ├── relic_template.cs      # 遗物模板
│   ├── power_template.cs      # Power模板
│   └── mod_manifest.json      # 清单模板
│
├── examples/
│   ├── ironclad_attack.cs     # 攻击牌示例
│   ├── silent_skill.cs        # 技能牌示例
│   ├── defect_power.cs        # 能力牌示例
│   └── common_relic.cs         # 遗物示例
│
└── data/
    ├── vanilla_cards.json     # 原版卡牌数据
    ├── vanilla_relics.json     # 原版遗物数据
    ├── hooks.json             # Hook类型列表
    └── keywords.json          # 关键词数据
```

### 6.2 关键内容

- **BaseLib API**: `[Pool]` 属性, `CustomCardModel`, `BasePower`
- **Hook系统**: 30+种触发器类型
- **DynamicVar**: 伤害/格挡等动态变量
- **本地化**: JSON格式, 多语言支持
- **调试**: GD.Print, 日志位置

---

## 7. 集成方式

### 7.1 作为独立Agent

```typescript
import { ModAgent } from '@sts2-mod-agent/core';

const agent = new ModAgent({
  llmConfig: {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY
  },
  projectDir: './my-mod'
});

const result = await agent.execute(
  "创建3张攻击牌和2张遗物"
);
```

### 7.2 集成到现有Chat系统

```typescript
// 复用LeoChat的TaskLoop
import { TaskLoop } from '@ai-chatbox/mcp-core';
import { ModAgentProtocol } from '@sts2-mod-agent/protocol';

const taskLoop = new TaskLoop({
  llmConfig: { /* ... */ },
  mcpTools: ModAgentProtocol.getMCPTools()
});

taskLoop.start("创建一个mod");
```

### 7.3 MCP协议调用

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_card",
    "arguments": {
      "card": {
        "id": "strike_ironclad",
        "name": { "en": "Strike" },
        "cost": 1,
        "type": "Attack",
        "effects": [{ "action": "damage", "value": 6, "target": "enemy" }]
      },
      "namespace": "MyMod"
    }
  }
}
```

---

## 8. 路线图

### Phase 1: 核心能力 (MVP)

- [ ] MCP Server 基础实现
- [ ] 代码生成工具 (card, relic, power)
- [ ] Skill 知识库完善
- [ ] 基本Agent Loop

### Phase 2: 扩展功能

- [ ] 项目构建工具
- [ ] 本地化生成
- [ ] Supervisor + Worker 双Agent
- [ ] UI Editor 集成

### Phase 3: 高级功能

- [ ] 复杂卡牌效果支持
- [ ] Hook自动生成
- [ ] 多角色支持
- [ ] 验证与测试

---

## 9. 文件结构

```
sts2-mod-agent/
├── package.json
├── tsconfig.json
│
├── packages/
│   ├── mod-agent-protocol/     # 核心协议与Agent
│   │   ├── src/
│   │   │   ├── index.ts        # 导出
│   │   │   ├── protocol.ts     # 接口定义
│   │   │   ├── supervisor.ts   # Supervisor Agent
│   │   │   ├── workers/        # Worker实现
│   │   │   │   ├── code-gen.ts
│   │   │   │   ├── file-ops.ts
│   │   │   │   └── builder.ts
│   │   │   └── task-loop.ts    # 复用LeoChat
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── sts2-mcp-server/       # MCP Server
│   │   ├── src/
│   │   │   ├── index.ts        # 入口
│   │   │   ├── tools/          # 工具实现
│   │   │   │   ├── code-gen.ts
│   │   │   │   ├── file-ops.ts
│   │   │   │   └── builder.ts
│   │   │   ├── templates/      # 模板
│   │   │   └── types.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mod-agent-ui/           # 可选UI编辑器
│       └── (复用 visualize/)
│
├── .agents/
│   └── skills/
│       └── slay-the-spire-2-modding/
│           ├── SKILL.md
│           └── references/
│
└── README.md
```

---

## 10. 依赖关系

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  },
  "peerDependencies": {
    // 可选: 复用LeoChat的TaskLoop
    "@ai-chatbox/mcp-core": "workspace:*"
  }
}
```

---

## 11. 验收标准

### 功能验收

- [ ] MCP Server 可正常启动并响应工具调用
- [ ] generate_card 生成有效的BaseLib代码
- [ ] generate_mod 生成完整的项目结构
- [ ] Skill 包含完整的STS2 API参考

### Agent验收

- [ ] Supervisor 能理解自然语言需求
- [ ] 能正确分解并分发任务
- [ ] 能汇总Worker结果并返回

### 集成验收

- [ ] 可通过MCP协议调用
- [ ] 可集成到LeoChat
- [ ] 生成的代码可编译运行

---

## 附录

### A. Hook类型列表

| Hook | 触发时机 |
|------|---------|
| OnPlayerTurnStart | 玩家回合开始 |
| OnPlayerTurnEnd | 玩家回合结束 |
| OnEnemyTurnStart | 敌人回合开始 |
| OnEnemyTurnEnd | 敌人回合结束 |
| AfterCardPlayed | 卡牌打出后 |
| AfterCardDrawn | 抽卡后 |
| AfterCardDiscarded | 弃卡后 |
| AfterCombatStart | 战斗开始 |
| AfterCombatEnd | 战斗结束 |
| OnPlayerDamaged | 玩家受伤 |
| OnMonsterDeath | 怪物死亡 |

### B. 效果类型

| 类型 | 说明 |
|------|------|
| damage | 伤害 |
| block | 格挡 |
| draw | 抽牌 |
| heal | 治疗 |
| energy | 能量 |
| applyPower | 施加能力 |
| discard | 弃牌 |
| exhaust | 消耗 |
| gainGold | 获得金币 |
| channel | 充能球 |
| evoke | 触发充能球 |
| summon | 召唤 |
| forge | 献祭 |

### C. 卡牌池

| 池 | 类名 |
|----|------|
| 铁甲战士 | IroncladCardPool |
| 沉默刺客 | SilentCardPool |
| 缺陷者 | DefectCardPool |
| 王权者 | RegentCardPool |
| 死灵绑定者 | NecrobinderCardPool |
| 无色 | ColorlessCardPool |
| 状态 | StatusCardPool |
| 诅咒 | CurseCardPool |
