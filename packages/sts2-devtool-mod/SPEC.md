# STS2 DevTool Mod - 完整设计

## 项目定位

轻量级 Mod，提供游戏状态读取和动作执行能力，专注于 MCP/Agent 集成。

## 核心特性

1. **轻量级** - 只做状态读写，不包含 AI 逻辑
2. **插件化** - 按需加载功能模块
3. **MCP 优先** - 专为 MCP Server 设计
4. **开发者友好** - 内置调试面板、日志开关

## 与 STS2-Agent 对比

| 特性 | STS2-Agent | DevTool |
|------|-----------|---------|
| 代码行数 | ~10000+ | ~2000 |
| HTTP 端点 | 10+ | 5 (核心) |
| AI 决策 | ✅ | ❌ |
| 插件系统 | ❌ | ✅ |
| MCP 客户端 | 外部 | 内置 |
| 依赖 | 多 | 少 |

---

## 文件结构

```
sts2-devtool-mod/
├── sts2-devtool-mod.csproj
├── DevTool.json                    # Mod 元信息
├── ModInfo.cfg                     # Steam Mod 配置
│
├── src/
│   ├── DevToolMod.cs               # 主 Mod 入口
│   │
│   ├── Config/
│   │   └── DevToolConfig.cs        # 配置类
│   │
│   ├── Api/
│   │   ├── HttpServer.cs           # HTTP 服务器
│   │   ├── Router.cs               # 请求路由
│   │   └── Handlers/               # API 处理器
│   │       ├── HealthHandler.cs
│   │       ├── StateHandler.cs
│   │       ├── EventsHandler.cs
│   │       ├── ActionHandler.cs
│   │       └── StreamHandler.cs    # SSE
│   │
│   ├── Plugins/
│   │   ├── IDevToolPlugin.cs       # 插件接口
│   │   ├── StatePlugin.cs          # 状态收集
│   │   ├── EventPlugin.cs          # 事件收集
│   │   ├── ActionPlugin.cs         # 动作执行（可选）
│   │   └── DebugPlugin.cs          # 调试面板
│   │
│   ├── Models/
│   │   ├── GameState.cs            # 状态模型
│   │   ├── GameEvent.cs            # 事件模型
│   │   ├── Player.cs
│   │   ├── Enemy.cs
│   │   ├── Card.cs
│   │   └── Action.cs
│   │
│   ├── Hooks/
│   │   ├── PlayerHooks.cs         # 玩家 Hook
│   │   ├── CombatHooks.cs          # 战斗 Hook
│   │   └── CardHooks.cs            # 卡牌 Hook
│   │
│   ├── Mcp/
│   │   ├── McpClient.cs            # MCP 客户端
│   │   ├── McpTools.cs             # MCP 工具注册
│   │   └── McpConnection.cs        # 连接管理
│   │
│   └── Utils/
│       ├── JsonHelper.cs           # JSON 工具
│       ├── Logger.cs               # 日志
│       └── HotkeyManager.cs        # 热键
│
├── resources/
│   ├── icons/
│   │   └── icon.png
│   └── ui/
│       └── debug_panel.tscn        # 调试面板（可选）
│
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## API 设计

### 端点总览

| Method | Path | 说明 | 优先级 |
|--------|------|------|--------|
| GET | `/health` | 健康检查 | P0 |
| GET | `/state` | 实时状态快照 | P0 |
| GET | `/events` | 历史事件列表 | P1 |
| GET | `/stream` | SSE 实时事件流 | P1 |
| POST | `/action` | 执行游戏动作 | P2 |
| GET | `/config` | 获取/修改配置 | P3 |

### 1. 健康检查

```http
GET /health
```

```json
{
  "ok": true,
  "mod": {
    "version": "1.0.0",
    "name": "STS2 DevTool"
  },
  "game": {
    "version": "1.0.0",
    "running": true,
    "inGame": true,
    "scene": "combat"
  },
  "server": {
    "port": 9888,
    "uptime": 3600,
    "eventsCount": 150
  }
}
```

### 2. 游戏状态

```http
GET /state
```

```json
{
  "timestamp": 1700000000,
  "combat": {
    "inCombat": true,
    "turn": 3,
    "playerTurn": true,
    "floor": 5,
    "act": 1,
    "room": "combat",
    "roomIndex": 3
  },
  "player": {
    "hp": 72,
    "maxHp": 80,
    "energy": 2,
    "maxEnergy": 3,
    "block": 5,
    "gold": 150
  },
  "hand": [
    {
      "id": "Strike",
      "nameKey": "STRIKE_NAME",
      "cost": 1,
      "type": "attack",
      "rarity": "common",
      "upgraded": false
    }
  ],
  "drawPile": [
    { "id": "Defend", "nameKey": "DEFEND_NAME", "cost": 1, "type": "skill" }
  ],
  "discardPile": [],
  "exhaustPile": [],
  "orbs": [
    {
      "id": "Lightning",
      "type": "lightning",
      "channeled": 1,
      "evoked": 0
    }
  ],
  "relics": [
    { "id": "BurningBlood", "count": 6 }
  ],
  "powers": [
    { "id": "Strength", "amount": 2 }
  ],
  "potions": [
    { "id": "HealthPotion", "uses": 1 }
  ],
  "enemies": [
    {
      "id": "Slime",
      "nameKey": "SLIME_NAME",
      "intent": "attack",
      "intentValue": 8,
      "hp": 28,
      "maxHp": 30,
      "block": 0,
      "isDead": false
    }
  ]
}
```

### 3. 历史事件

```http
GET /events?limit=20&offset=0&types=card_played,damage
```

```json
{
  "events": [
    {
      "id": "evt_001",
      "timestamp": 1700000125,
      "type": "card_drawn",
      "data": {
        "card": { "id": "Strike" }
      }
    },
    {
      "id": "evt_002",
      "timestamp": 1700000130,
      "type": "card_played",
      "data": {
        "card": { "id": "Strike" },
        "target": { "id": "Slime" },
        "damage": 6
      }
    },
    {
      "id": "evt_003",
      "timestamp": 1700000135,
      "type": "enemy_intent",
      "data": {
        "enemy": { "id": "Slime" },
        "intent": "attack",
        "value": 8
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

### 4. SSE 实时流

```http
GET /stream?types=card_played,enemy_intent
```

```sse
event: connected
data: {"type":"connected","serverTime":1700000000}

event: card_played
data: {"id":"evt_001","timestamp":1700000125,"type":"card_played","data":{"card":{"id":"Strike"},"target":{"id":"Slime"},"damage":6}}

event: enemy_intent
data: {"id":"evt_002","timestamp":1700000135,"type":"enemy_intent","data":{"enemy":{"id":"Slime"},"intent":"attack","value":8}}

event: turn_end
data: {"id":"evt_003","timestamp":1700000140,"type":"turn_end","data":{"turn":3}}
```

### 5. 执行动作

```http
POST /action
Content-Type: application/json
```

```json
{
  "action": "play_card",
  "cardId": "Strike",
  "targetIndex": 0
}
```

```json
{
  "ok": true,
  "actionId": "action_001",
  "result": "success",
  "state": {
    "energy": 2,
    "handSize": 2
  }
}
```

#### 动作类型

| action | 参数 | 说明 |
|--------|------|------|
| `play_card` | `cardId`, `targetIndex?` | 打牌 |
| `end_turn` | - | 结束回合 |
| `use_potion` | `potionId`, `targetIndex?` | 使用药水 |
| `confirm` | - | 确认选择 |
| `cancel` | - | 取消选择 |

---

## 事件类型定义

### 事件分类

```
Combat Events (战斗)
  - combat_start
  - combat_end
  - turn_start
  - turn_end

Card Events (卡牌)
  - card_drawn
  - card_played
  - card_discarded
  - card_exhausted
  - card_will_be_played (before)

Damage Events (伤害)
  - damage_dealt
  - damage_taken
  - enemy_intent

Resource Events (资源)
  - energy_changed
  - hp_changed
  - block_gained
  - block_broken
  - gold_changed

Orb Events (充能球)
  - orb_channeled
  - orb_evoked
  - orb_passive

Relic Events (遗物)
  - relic_gained
  - relic_lost
  - relic_triggered

Power Events (能力)
  - power_gained
  - power_lost
  - power_updated
```

### 事件格式

```json
{
  "id": "evt_xxx",
  "timestamp": 1700000000,
  "type": "card_played",
  "combat": { "turn": 3 },
  "data": {
    "card": { "id": "Strike" },
    "target": { "id": "Slime" },
    "damage": 6
  },
  "debug": {
    "stackTrace": "..."
  }
}
```

---

## 插件系统

### 插件接口

```csharp
public interface IDevToolPlugin
{
    string Name { get; }
    Version Version { get; }
    bool Enabled { get; set; }

    void OnLoad();
    void OnEnable();
    void OnDisable();
    void OnUnload();
}
```

### 内置插件

```csharp
// 配置启用哪些插件
public class DevToolConfig
{
    public bool EnableStatePlugin = true;
    public bool EnableEventPlugin = true;
    public bool EnableActionPlugin = false;  // 默认关闭
    public bool EnableDebugPlugin = false;
    public bool EnableMcpClient = false;
}
```

### 第三方扩展

```csharp
// 第三方可以添加自己的插件
public class MyCustomPlugin : IDevToolPlugin
{
    public string Name => "My Custom Plugin";
    public void OnLoad() { /* 初始化 */ }
    public void OnCardPlayed(CardModel card) { /* 自定义逻辑 */ }
}
```

---

## MCP 客户端（可选）

### 配置

```json
{
  "DevTool": {
    "mcp": {
      "enabled": false,
      "serverUrl": "http://localhost:3000",
      "autoReconnect": true,
      "syncInterval": 1000
    }
  }
}
```

### 能力

```csharp
// 自动同步状态到 MCP
public class McpClient
{
    // 状态变化时推送
    Task OnStateChanged(GameState state);

    // 事件推送
    Task OnEvent(GameEvent evt);

    // 工具调用
    Task<T> CallTool<T>(string name, object args);
}
```

---

## 配置系统

### 默认配置

```json
{
  "DevTool": {
    "enabled": true,
    "port": 9888,
    "allowExternal": false,
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:*"]
    },
    "logging": {
      "enabled": true,
      "level": "info",
      "logEvents": false
    },
    "plugins": {
      "state": true,
      "events": true,
      "actions": false,
      "debug": false
    },
    "mcp": {
      "enabled": false,
      "url": "http://localhost:3000"
    },
    "hotkey": {
      "debugPanel": "F9"
    }
  }
}
```

### 运行时修改

```http
GET /config
POST /config
```

---

## 依赖

```xml
<Project>
  <ItemGroup>
    <PackageReference Include="BaseLib-StS2" Version="*" />
    <PackageReference Include="Microsoft.AspNetCore.Http" Version="2.2.0" />
    <!-- 可选 -->
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>
</Project>
```

---

## 开发计划

### Phase 1: 核心 (MVP)
- [ ] HTTP Server 基础
- [ ] /health, /state 端点
- [ ] 基础状态收集 Hook

### Phase 2: 事件系统
- [ ] /events 端点
- [ ] /stream SSE
- [ ] 完整事件收集

### Phase 3: 动作执行
- [ ] /action 端点
- [ ] 动作验证
- [ ] 安全检查

### Phase 4: 增强
- [ ] MCP 客户端
- [ ] 调试面板
- [ ] 插件系统
