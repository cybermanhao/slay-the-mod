# 祈求者（Invoker）角色设计文档

**日期**：2026-03-17
**游戏**：杀戮尖塔 2
**目标**：技术验证 Mod（学习 BaseLib、法球系统、关键词 Hover、i18n）

---

## 一、角色概述

祈求者是一名来自 Dota 2 的智力英雄，核心机制是管理3个球槽，通过 `元素祈求` 读取当前球组合生成对应技能。

**学习目标**：
- BaseLib 的 `CustomCardModel`、`CustomRelicModel`、`[Pool]` 属性
- Defect 法球系统（`OrbModel` / `OrbCmd`）复用
- 关键词悬浮 Hover 与递归引用（`keywords.json`）
- i18n 本地化（`cards.json` / `relics.json`）

---

## 二、球槽系统

### 2.1 三种法球

| 球 | 英文 | 即时效果（打出召唤球卡时） |
|----|------|--------------------------|
| Q 冰魂 | Quas | 获得格挡（基础8，每多一个Q+4） |
| W 雷魂 | Wex | 对随机敌人造成伤害（基础5） |
| E 炎魂 | Exort | 对全体敌人造成伤害（基础3） |

### 2.2 球槽规则

- **固定3槽**，不可扩展（由命石初始化）
- **FIFO 队列**：新球入队，最老的球被推出
- **被动读取**：法球无 ChanneledEffect / EvokeEffect，仅用于状态显示与 Invoke 读取

### 2.3 实现方式

复用 `OrbModel`，**显式 override** 禁用默认触发效果：

```csharp
public class QuasOrb : OrbModel
{
    public override async Task ChanneledEffect(PlayerChoiceContext ctx) { }  // 无持续被动
    public override async Task EvokeEffect(PlayerChoiceContext ctx) { }      // 无弹出效果
}
```

`OrbSlotVar` 锁定为 3，在命石的 `BeforeCombatStart` 钩子中**先设置球槽数量，再添加初始球**（顺序不可颠倒，否则 `OrbCmd.Add` 行为未定义）：

```csharp
// 命石 BeforeCombatStart 中的执行顺序：
// 1. 设置球槽数量
// player.OrbSlotVar = 3;  // 待 Spike 验证具体 API
// 2. 再添加初始球（以寒霜命石为例）
// await OrbCmd.Add<QuasOrb>().Execute(ctx);  // ×3
```

> ⚠️ **Spike 前置验证**：`OrbSlotVar` 是否可以被 Mod 设置为固定值是整个机制的前提，必须在步骤 2 Spike 中验证。备选方案：若无法控制球槽数，改用 `PowerModel` 内部维护一个 `Queue<OrbType>(3)` 自行管理，仅借用法球视觉显示。

---

## 三、起始卡牌

### 3.1 召唤球（0费，起始卡×3）

打出时选择一种球（Q/W/E），推入队列（最老的被推出），并触发即时效果。

每回合每种球只能召唤一次（由 `TurnSummonTracker` 标记）。`TurnSummonTracker` 是 `SummonOrbCard` 内的静态 `HashSet<OrbType>`，在以下两处清空：
- 命石的 `BeforeCombatStart` 钩子（战斗开始时，防止跨战斗脏数据）
- 命石的 `AfterPlayerTurnStart` 钩子（每回合开始时重置）

命石自动召唤的球**不消耗**该回合限额，玩家仍可在同回合打出相同类型的召唤球卡。

### 3.2 元素祈求（0费，起始卡×1）

读取当前3个球槽的 Q/W/E 数量，查 `InvokeTable` 生成对应1费技能卡，加入手牌。若球槽数量之和不等于3（如 Spike 失败导致球槽未正确初始化），`InvokeTable` 返回 `null`，`InvokeCard` 跳过生成并在日志中输出警告，不产生任何卡牌。

持有阿哈利姆神杖时：生成2张相同技能卡。

### 3.3 初始卡组

```
召唤球 ×3
元素祈求 ×1
打击（Strike） ×4
防御（Defend） ×4
```

---

## 四、命石系统（起始遗物三选一）

| 命石 | 初始球槽 | 共同效果 | 专属强化 |
|------|----------|----------|----------|
| ❄️ 寒霜命石 | QQQ | 每回合开始**自动**召唤1个本命石属性的球（Q/W/E对应命石类型），无需玩家操作 | 强化 QQQ（急速冷却）/ QQW（幽灵漫步）/ QQE（寒冰之墙） |
| ⚡ 风暴命石 | WWW | 同上（自动召唤W） | 强化 QWW（强袭飓风）/ WWW（电磁脉冲）/ WWE（灵动迅捷） |
| 🔥 烈焰命石 | EEE | 同上（自动召唤E） | 强化 QEE（熔炉精灵）/ WEE（混沌陨石）/ EEE（阳炎之击） |

> **MVP 简化**：命石"每回合额外召唤"为**自动触发**（在 `AfterPlayerTurnStart` 中直接调用 `OrbCmd.Add<对应Orb>()`），不弹出选择 UI。这简化了实现并降低 BaseLib UI 学习成本。后续版本可改为玩家选择。

**强化效果**：见第五节技能表中"命石强化"列。

---

## 五、10个召唤技能

所有技能均为**1费**，由`元素祈求`生成，加入手牌。升级版通过牌库升级获得。

| 组合 | 技能名 | 基础效果 | 命石强化 |
|------|--------|----------|----------|
| QQQ | 急速冷却 Cold Snap | 对目标施加3层**脆弱** + 造成4点伤害 | +2层脆弱 |
| QQW | 幽灵漫步 Ghost Walk | 获得16格挡 + 对全体敌人施加1层**虚弱** | 格挡×1.5 |
| QQE | 寒冰之墙 Ice Wall | 对全体敌人施加2层**脆弱** + 造成4点AOE伤害 | +2层脆弱 |
| QWW | 强袭飓风 Tornado | 对全体敌人造成10点伤害（MVP简化版；"移除敌人正面Buff"效果因 API 未知推迟到后续版本） | 无强化 |
| QWE | 超强声波 Deafening Blast | 对全体敌人造成12点伤害 + 1层**虚弱** | 无强化 |
| WWW | 电磁脉冲 EMP | 对全体敌人造成20点伤害（MVP简化版；后续版本实现"清除格挡+造成等量伤害"，需 Spike 确认读写敌人 Block 的 API） | 额外+6伤害 |
| WWE | 灵动迅捷 Alacrity | 获得+2能量，抽2张牌 | +1额外能量 |
| WEE | 混沌陨石 Chaos Meteor | 对全体敌人造成20点伤害 | 伤害×1.5 |
| QEE | 熔炉精灵 Forge Spirit | 施加 `ForgeSpiritPower`（Decrement类型）：持续3回合，每回合在 `AfterTurnEnd`（敌方回合后）对全体敌人造成3点伤害，每次触发后层数-1至0时移除 | 初始层数改为5 |
| EEE | 阳炎之击 Sun Strike | 对单体造成36点伤害 | +12伤害 |

> **QWE（超强声波）** 三元素各一，无命石主属性，不受任何命石强化。

---

## 六、遗物

### 6.1 阿哈利姆的神杖（Aghanim's Scepter）
- **稀有度**：Rare
- **效果**：打出`元素祈求`时，同时生成2张对应技能卡加入手牌（而非1张）
- **原版参考**：Invoker 可同时持有2个已召唤技能

### 6.2 魔晶（Aghanim's Shard）
- **稀有度**：Uncommon
- **效果**：每回合开始时，25%概率自动将1张随机召唤技能卡加入手牌（10张中随机选1张）
- **与神杖的交互**：魔晶添加的技能卡**不受神杖影响**（神杖只加倍 `InvokeCard` 打出时的生成数量）
- **原版参考**：解锁大陨星（随机释放多个技能）

---

## 七、关键词 Hover 系统

### 7.1 keywords.json 结构

BaseLib 注册的关键词，key 格式与卡牌/遗物一致，使用 `{MODID}-{KEYWORD_ID}.{field}`：

```json
{
  "INVOKER-QUAS.name": "冰魂",
  "INVOKER-QUAS.description": "放入球槽时获得格挡。持有越多冰魂，冰系技能效果越强。",

  "INVOKER-WEX.name": "雷魂",
  "INVOKER-WEX.description": "放入球槽时对随机敌人造成伤害。",

  "INVOKER-EXORT.name": "炎魂",
  "INVOKER-EXORT.description": "放入球槽时对所有敌人造成少量伤害。",

  "INVOKER-INVOKE.name": "元素祈求",
  "INVOKER-INVOKE.description": "读取当前球槽中[INVOKER-QUAS]冰魂[/INVOKER-QUAS]、[INVOKER-WEX]雷魂[/INVOKER-WEX]、[INVOKER-EXORT]炎魂[/INVOKER-EXORT]的数量组合，生成对应的召唤技能。"
}
```

> ⚠️ **Spike 验证**：keywords.json 的 key 前缀格式（是否需要 `INVOKER-`）需要在步骤 8 i18n 实现时对照 BaseLib 源码确认。若前缀不需要，去掉 `INVOKER-` 即可。卡牌描述中的 Hover tag（如 `[INVOKER-QUAS]...[/INVOKER-QUAS]`）必须与 key 前缀保持一致。

### 7.2 卡牌描述引用示例

```json
"INVOKER-COLD_SNAP.description": "对目标施加{Damage:diff()}层[脆弱]。\n当前球槽：[INVOKER-QUAS]Q[/INVOKER-QUAS][INVOKER-QUAS]Q[/INVOKER-QUAS][INVOKER-QUAS]Q[/INVOKER-QUAS]"
```

游戏会自动在 Hover 时展开关键词说明，并递归渲染引用的子关键词。

---

## 八、i18n 文件结构

```
InvokerMod/
├── localization/
│   ├── zhs/
│   │   ├── cards.json        # 卡牌名称与描述
│   │   ├── relics.json       # 遗物名称与描述
│   │   ├── characters.json   # 角色文本
│   │   └── keywords.json     # 关键词悬浮说明
│   └── en/
│       ├── cards.json
│       ├── relics.json
│       ├── characters.json
│       └── keywords.json
```

所有字符串键格式：`{MODID}-{ID}.{field}`，例如：
```
INVOKER-COLD_SNAP.title
INVOKER-COLD_SNAP.description
INVOKER-AGHANIMS_SCEPTER.title
INVOKER-AGHANIMS_SCEPTER.description
INVOKER-AGHANIMS_SCEPTER.flavor
```

### 8.1 characters.json 示例

```json
{
  "INVOKER-INVOKER_CHARACTER.title": "祈求者",
  "INVOKER-INVOKER_CHARACTER.description": "掌控冰、雷、炎三种元素的魔法英雄。",
  "INVOKER-INVOKER_CHARACTER.pronounSubject": "他",
  "INVOKER-INVOKER_CHARACTER.pronounObject": "他",
  "INVOKER-INVOKER_CHARACTER.pronounPossessive": "他的",
  "INVOKER-INVOKER_CHARACTER.possessiveAdjective": "他的"
}
```

### 8.2 Spike 检查项

- `{Damage:diff()}` 动态变量插值与 `[INVOKER-QUAS]...[/INVOKER-QUAS]` 关键词 hover tag 是否可在同一 description 字段中共存，需在步骤 8 实现时验证。

---

## 九、文件结构

```
Scripts/
├── Entry.cs
├── Characters/
│   └── InvokerCharacter.cs          # PlaceholderCharacterModel
├── Pools/
│   ├── InvokerCardPool.cs
│   └── InvokerRelicPool.cs
├── Orbs/
│   ├── QuasOrb.cs
│   ├── WexOrb.cs
│   └── ExortOrb.cs
├── Powers/
│   └── ForgeSpiritPower.cs      # Decrement能力：每回合结束对全体敌人造成3点伤害
├── Cards/
│   ├── InvokerCardModel.cs          # 抽象基类
│   ├── SummonOrbCard.cs             # 召唤一个球
│   ├── InvokeCard.cs                # 元素祈求
│   ├── InvokeTable.cs               # 静态查找表 (q,w,e)→CardType
│   └── Spells/
│       ├── ColdSnapCard.cs          # QQQ 急速冷却
│       ├── GhostWalkCard.cs         # QQW 幽灵漫步
│       ├── IceWallCard.cs           # QQE 寒冰之墙
│       ├── TornadoCard.cs           # QWW 强袭飓风
│       ├── DeafeningBlastCard.cs    # QWE 超强声波
│       ├── EmpCard.cs               # WWW 电磁脉冲
│       ├── AlacrityCard.cs          # WWE 灵动迅捷
│       ├── ChaosMeteorCard.cs       # WEE 混沌陨石
│       ├── ForgeSpiritCard.cs       # QEE 熔炉精灵
│       └── SunStrikeCard.cs         # EEE 阳炎之击
└── Relics/
    ├── QuasCommandStone.cs
    ├── WexCommandStone.cs
    ├── ExortCommandStone.cs
    ├── AghanimsScepter.cs
    └── AghanimsFragment.cs
```

---

## 十、美术资源

### 10.1 卡图来源

Dota 2 官网技能图标（`img.dota2.com.cn`），MVP 阶段直接使用，后期可替换为原创美术。

| 技能 | 图标文件名 |
|------|-----------|
| 冰魂 Q | `invoker_quas.png` |
| 雷魂 W | `invoker_wex.png` |
| 炎魂 E | `invoker_exort.png` |
| 元素祈求 | `invoker_invoke.png` |
| 冰封打击 | `invoker_cold_snap.png` |
| 幽灵行走 | `invoker_ghost_walk.png` |
| 冰墙 | `invoker_ice_wall.png` |
| 电磁脉冲 | `invoker_emp.png` |
| 龙卷风 | `invoker_tornado.png` |
| 迅捷 | `invoker_alacrity.png` |
| 震耳欲聋 | `invoker_deafening_blast.png` |
| 熔炉之魂 | `invoker_forge_spirit.png` |
| 混沌陨石 | `invoker_chaos_meteor.png` |
| 太阳打击 | `invoker_sun_strike.png` |

### 10.2 角色图

祈求者人物 PNG 已放置于 `assets/` 目录。

---

## 十一、MVP 实现顺序

1. 项目搭建（Godot + .NET SDK + BaseLib 引用）
2. Spike：验证自定义 `OrbModel` 可注册并显示
3. 三种法球（QuasOrb / WexOrb / ExortOrb）
4. 三块命石（初始球槽 + 每回合额外召唤）
5. `SummonOrbCard`（召唤球 + 即时效果）
6. `InvokeCard` + `InvokeTable`（核心 Invoke 机制）
7. 10张技能卡（先做 EEE 太阳打击验证流程，再补全）
8. i18n + 关键词 Hover（zhs + en 双语）
9. 两件遗物（神杖 + 魔晶）
10. 完善数值 + 命石强化逻辑
