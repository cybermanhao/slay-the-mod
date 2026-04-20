# Invoker Mod — 机制与实现文档

> **版本**：以代码为准（`feature/invoker` 分支）  
> **免责声明**：本文档描述的是**实际代码行为**，而非原始设计愿景。若与早期设计文档冲突，以代码和本文件为准。

---

## 目录

1. [核心架构](#核心架构)
2. [Orb 系统](#orb-系统)
3. [Invoke 系统](#invoke-系统)
4. [Scroll（卷轴）机制](#scroll卷轴机制)
5. [Command Stone 增强](#command-stone-增强)
6. [卡牌目录](#卡牌目录)
7. [Power 目录](#power-目录)
8. [遗物目录](#遗物目录)
9. [角色配置](#角色配置)
10. [技术细节](#技术细节)
11. [已知问题与注意事项](#已知问题与注意事项)

---

## 核心架构

```
Entry.cs ──→ Init()
                │
                ├── ScriptManagerBridge.LookupScriptsInAssembly()  // 自动注册所有 ModelDb 类型
                ├── Harmony.PatchAll()                              // 应用所有 Harmony patch
                │
                ▼
    ┌─────────────────┬─────────────────┬─────────────────┐
    ▼                 ▼                 ▼                 ▼
InvokerCharacter  InvokerCardPool   InvokerRelicPool  InvokerPotionPool
    │
    ├── StartingDeck: [SummonCard, InvokeCard, 4×Strike, 4×Defend]
    └── StartingRelics: [QuasCommandStone]
```

### 自定义关键词

通过 BaseLib 的 `[CustomEnum]` 属性注册：

| 关键词 | 内部 ID | 用途 |
|--------|---------|------|
| **Scroll** | `INVOKER-SCROLL` | 标记所有 Invoke 生成的法术牌，配合 FIFO 机制 |
| **Invoke** | `INVOKER-INVOKE` | 标记触发 Invoke 效果的卡牌（如 Runic Strike, Catalyst） |

---

## Orb 系统

### 三种球

| 球 | 类名 | 颜色 | 作用 |
|----|------|------|------|
| **Quas (Q)** | `QuasOrb` | 冰蓝 (0.2, 0.5, 0.9) | 纯展示，无被动/evoke效果 |
| **Wex (W)** | `WexOrb` | 紫电 (0.7, 0.5, 0.9) | 纯展示，无被动/evoke效果 |
| **Exort (E)** | `ExortOrb` | 火橙 (0.9, 0.4, 0.1) | 纯展示，无被动/evoke效果 |

> **注意**：当前实现中，三种球**完全没有被动效果或触发效果**。它们仅通过 `PlayerCombatState.OrbQueue.Orbs` 中的类型计数来驱动 `InvokeTable` 查表和部分卡牌（如 IceArmorCard）的加成。

### 球的添加方式

1. **Summon 系列卡牌**（`SummonCard`、`SummonOrbCard`、`SummonWexCard`、`SummonExortCard`）：打出后直接 `OrbCmd.Channel<T>()`
2. **Command Stone**（每回合开始）：`CommandStoneHelper.ChooseOrb()` 弹出三选一界面

### 每回合召唤限制

`TurnSummonTracker` 确保**每种球每回合只能召唤一次**（通过 `OrbSummonType` 枚举）。该状态按 `CombatState` + `RoundNumber` 自动重置，Command Stone 在回合开始时也会显式重置。

---

## Invoke 系统

### 流程

```
InvokeCard.OnPlay()
    └── InvokeCmd.Execute(ctx, source)
            ├── 读取 Owner.PlayerCombatState.OrbQueue.Orbs
            ├── 统计 Q/W/E 数量
            ├── InvokeTable.Lookup(q, w, e) → 返回 canonical CardModel
            ├── 检查 AghanimsScepter → copies = 1 或 2
            └── 循环 copies 次调用 AddSpellToHand()
```

### InvokeTable 映射

| Q | W | E | 法术 | 类名 | 费用 | 类型 | 目标 |
|---|---|---|------|------|------|------|------|
| 3 | 0 | 0 | Cold Snap | `ColdSnapCard` | 1 | Skill | AnyEnemy |
| 2 | 1 | 0 | Ghost Walk | `GhostWalkCard` | 2 | Skill | None |
| 2 | 0 | 1 | Ice Wall | `IceWallCard` | 1 | Attack | AllEnemies |
| 1 | 2 | 0 | Tornado | `TornadoCard` | 1 | Attack | AllEnemies |
| 1 | 1 | 1 | Deafening Blast | `DeafeningBlastCard` | 1 | Attack | AllEnemies |
| 0 | 3 | 0 | EMP | `EMPCard` | 1 | Attack | AllEnemies |
| 0 | 2 | 1 | Alacrity | `AlacrityCard` | 0 | Skill | None |
| 0 | 1 | 2 | Chaos Meteor | `ChaosMeteorCard` | 2 | Attack | AnyEnemy |
| 1 | 0 | 2 | Forge Spirit | `ForgeSpiritCard` | 1 | Skill | None |
| 0 | 0 | 3 | Sun Strike | `SunStrikeCard` | 3 | Attack | AnyEnemy |

> 若总和不等于 3，或组合不在表中，返回 `null` 并记录警告。

### AddSpellToHand 逻辑

```csharp
1. 获取手牌中所有 SpellCardBase（Scroll 牌）
2. 若数量 ≥ 2，exhaust 最早加入的那张（FIFO）
3. combatState.CreateCard(canonical, owner) 创建实例
4. ApplyKeyword(card, CardKeyword.Retain)  // 回合结束不丢弃
5. AddGeneratedCardToCombat(card, PileType.Hand)
```

---

## Scroll（卷轴）机制

### 规则

- 所有 `SpellCardBase` 子类自带 `Scroll` + `Exhaust` 关键词
- **手牌中最多同时存在 2 张 Scroll**
- 第 3 张加入时，最早的那张被 **Exhaust**（不是丢弃）
- 新加入的 Scroll 自带 **Retain**（通过 `AddSpellToHand` 中的 `ApplyKeyword` 添加）

### 关键实现

- 限制逻辑：`InvokeCmd.AddSpellToHand()` 第 51-58 行
- 关键词定义：`InvokerKeywords.Scroll`（`[CustomEnum]` 注册）

---

## Command Stone 增强

### 三种石头

| 石头 | 起始球 | 增强条件 | 增强逻辑 |
|------|--------|----------|----------|
| **Quas Command Stone** | QQQ | `q >= 2`（QQ*）| `Enhances(q,w,e)` 静态方法 |
| **Wex Command Stone** | WWW | `w >= 2`（W**）| `Enhances(q,w,e)` 静态方法 |
| **Exort Command Stone** | EEE | `e >= 2`（**E）| `Enhances(q,w,e)` 静态方法 |

### 增强触发方式

`SpellCardBase.IsEnhanced()` 检查玩家装备的 Command Stone，若石头类型与法术的 `(SpellQ, SpellW, SpellE)` 匹配，则返回 `true`。

各法术的增强效果：

| 法术 | 增强效果 |
|------|----------|
| Cold Snap | 费用变为 `SetThisCombat(0)`（本战斗免费） |
| Ghost Walk | 无代码增强（仅基础版 2→1 费通过 OnUpgrade） |
| Ice Wall | 伤害 +3，Weak +1 |
| Tornado | 伤害 +4，抽牌 +1 |
| Deafening Blast | **无增强**（三元素无对应石头） |
| EMP | 伤害 +6 |
| Alacrity | 抽牌 +1，TempStrength +2 |
| Chaos Meteor | 主伤害 +4，链式伤害数组整体 +1 |
| Forge Spirit | Spirit HP +6（即初始 6 → 12，decay 3 → 4） |
| Sun Strike | 伤害 +10 |

---

## 卡牌目录

### 起始套牌（10张）

| 张数 | 卡牌 | 代码类 | 费用 | 说明 |
|------|------|--------|------|------|
| 1 | Summon Orb | `SummonCard` | 0 | 三选一：Q/W/E |
| 1 | Invoke | `InvokeCard` | 0 | 核心机制，升级后额外给一张 Invoke |
| 4 | Strike | `StrikeInvokerCard` | 1 | 6伤 → 升级 9伤 |
| 4 | Defend | `DefendInvokerCard` | 1 | 5格挡 → 升级 8格挡 |

### Invoke 法术牌（10张）

全部继承 `SpellCardBase`（自带 Scroll + Exhaust + Retain）。

#### Cold Snap (QQQ)
- **效果**：对目标施加 `ColdSnapPower`，Amount = 1（升级后 2）
- **Power**：敌人每次受到攻击伤害时，失去 Amount 点 Strength；玩家回合结束时移除
- **增强**：费用变 0（`SetThisCombat`）

#### Ghost Walk (QQW)
- **效果**：获得 1 层 Intangible + 1 层 GhostWalkPower
- **GhostWalkPower**：下回合中，攻击牌费用变为 99（通过 `TryModifyEnergyCostInCombat`）
- **升级**：费用 2 → 1

#### Ice Wall (QQE)
- **效果**：全体伤害 4（升级 8）+ 全体 Weak 1（升级 2）
- **增强**：伤害 +3，Weak +1

#### Tornado (QWW)
- **效果**：全体伤害 10（升级 14）+ 抽 1 张（升级 2）
- **增强**：伤害 +4，抽牌 +1

#### Deafening Blast (QWE)
- **效果**：全体伤害 12（升级 16）+ 全体 Weak 1（升级 2）
- **增强**：无（三元素组合无对应石头）

#### EMP (WWW)
- **效果**：全体伤害 20（升级 26）
- **增强**：伤害 +6

#### Alacrity (WWE)
- **效果**：抽 1 张（升级 2）+ 获得 `TempStrengthPower` 3（升级 5），回合结束移除
- **费用**：0
- **增强**：抽牌 +1，TempStrength +2

#### Chaos Meteor (WEE)
- **效果**：主目标伤害 10（升级 14）+ 5次链式随机伤害
- **链式伤害**：基础 `[5,4,3,2,1]`，增强 `[6,5,4,3,2]`，升级后整体 +1/+2
- **增强**：主伤害 +4，链式数组整体 +1

#### Forge Spirit (QEE)
- **效果**：召唤 Forge Spirit（宠物）
  - 基础 HP 6（升级 12）
  - 每玩家回合开始：攻击随机敌人 5 + 施加 1 Vulnerable
  - 每玩家回合结束：自损 3 HP（升级后 HP≥12 时自损 4）
- **机制**：精灵身上挂 `ForgeSpiritPower`（驱动行为）+ `DieForYouPower`（替主人承伤）
- **增强**：HP +6

#### Sun Strike (EEE)
- **效果**：单体伤害 28（升级 38）
- **费用**：3
- **增强**：伤害 +10

### 普通卡池（Common Cards）

#### 冰系（Quas 主题）
| 卡牌 | 费用 | 效果 | 升级 |
|------|------|------|------|
| Ice Armor | 1 | 获得 10 格挡；若有 Quas 球额外 +4 | 格挡 +4 |
| Ice Spike | 1 | 造成 8 伤害 + 1 Vulnerable | 伤+4，Vulnerable+1 |
| Frost Wind | 1 | 获得 8 格挡 + 抽 1 | 格挡+4，抽牌+1 |
| Freeze | 2 | 获得 20 格挡，Exhaust | 格挡+8 |
| Frost Shell | 1 | Power：每回合开始获得 3 格挡 | 格挡+2 |

#### 雷系（Wex 主题）
| 卡牌 | 费用 | 效果 | 升级 |
|------|------|------|------|
| Thunder Strike | 1 | 造成 10 伤害；若有 Wex 球对随机敌人再造成 10 | 伤+4 |
| Chain Lightning | 2 | 全体 6 伤害 + 抽 1 | 伤+2，抽牌+1 |
| Swift Mind | 1 | 抽 2 | 抽牌+1 |
| Wind Stab | 0 | 造成 5 伤害 | 伤+3 |
| Thunder Field | 1 | Power：玩家回合结束对随机敌人造成 1 伤害 | 伤害+1 |

#### 炎系（Exort 主题）
| 卡牌 | 费用 | 效果 | 升级 |
|------|------|------|------|
| Fireball | 1 | 全体 6 伤害；若有 Exort 球额外 +3 | 伤+3 |
| Flame Burst | 2 | 造成 20 伤害，Exhaust | 伤+8 |
| Scorch | 1 | 造成 10 伤害 | 伤+4 |
| Flame Shield | 1 | 获得 8 格挡 + 对随机敌人造成 4 伤害 | 格挡+4 |
| Burning Heart | 1 | Power：敌方回合结束对全体敌人造成 2 伤害 | 伤害+1 |

#### 稀有卡（Rare）
| 卡牌 | 费用 | 效果 | 升级 |
|------|------|------|------|
| Void Surge | 2 | 造成 8 + 4×(球总数) 伤害 | 基础伤+4 |
| Elemental Ward | 1 | 每种不同球类型获得 8 格挡（最少 8） | 格挡+4 |
| Arcane Recall | 0 | Invoke 两次，Exhaust | 无 |

#### Invoke 联动卡
| 卡牌 | 费用 | 效果 | 升级 |
|------|------|------|------|
| Runic Strike | 1 | 造成 8 伤害 + Invoke | 伤+4 |
| Catalyst | 1 | 抽 2 + Invoke | 抽牌+1 |
| Spell Weave | 1 | 获得 7 格挡 + Invoke | 格挡+3 |

---

## Power 目录

| Power | 类型 | 堆叠 | 触发时机 | 效果 |
|-------|------|------|----------|------|
| **ColdSnapPower** | Debuff | Counter | `AfterDamageReceived`（仅攻击伤害） | 每次受伤失去 Amount Strength；玩家回合结束移除 |
| **GhostWalkPower** | Buff | Counter | `TryModifyEnergyCostInCombat` + `AfterTurnEnd` | 下回合攻击牌费用=99；玩家回合结束移除 |
| **TempStrengthPower** | Buff | Counter | `ModifyDamageAdditive` + `AfterTurnEnd` | 攻击伤害 +Amount（仅 powered 攻击）；回合结束移除 |
| **ForgeSpiritPower** | Buff | Single | `AfterPlayerTurnStart` + `AfterTurnEnd` | 精灵每回合攻击随机敌人 5 + Vulnerable；自损 DecayPerTurn HP |
| **FrostShellPower** | Buff | Counter | `AfterPlayerTurnStart` | 每回合开始获得 Amount 格挡 |
| **ThunderFieldPower** | Buff | Counter | `AfterTurnEnd`（玩家侧） | 玩家回合结束对随机敌人造成 Amount 伤害 |
| **BurningHeartPower** | Buff | Counter | `AfterTurnEnd`（敌方侧） | 敌方回合结束对全体敌人造成 Amount 伤害 |

### Forge Spirit 宠物机制

```
ForgeSpiritCard.OnPlay()
    ├── 创建 ForgeSpiritMonster（ToMutable 复制）
    ├── 设置 InitialHp 和 DecayPerTurn
    ├── CombatState.CreateCreature(spirit, 玩家侧, null) → pet Creature
    ├── PlayerCmd.AddPet(pet, Owner)              // 将精灵添加为宠物
    ├── PowerCmd.Apply<ForgeSpiritPower>(pet, 1)  // 挂在精灵身上驱动行为
    └── PowerCmd.Apply<DieForYouPower>(pet, 1)    // 同 Osty 机制，替主人承伤
```

**ForgeSpiritPower** 的 Owner 是**精灵本身**（不是玩家），因此：
- `AfterPlayerTurnStart` 中检查 `Owner.PetOwner != player` 来确认归属
- 伤害来源是精灵（`CreatureCmd.Damage(..., Owner, null)`）
- 自损也是精灵自身（`CreatureCmd.Damage(ctx, Owner, ...)`）

---

## 遗物目录

| 遗物 | 稀有度 | 触发时机 | 效果 |
|------|--------|----------|------|
| **Quas Command Stone** | Starter | `BeforeCombatStart` + `AfterPlayerTurnStart` | 战斗开始给 QQQ；每回合开始选择 1 球；增强 QQ* 法术 |
| **Wex Command Stone** | Starter | `BeforeCombatStart` + `AfterPlayerTurnStart` | 战斗开始给 WWW；每回合开始选择 1 球；增强 W** 法术 |
| **Exort Command Stone** | Starter | `BeforeCombatStart` + `AfterPlayerTurnStart` | 战斗开始给 EEE；每回合开始选择 1 球；增强 **E 法术 |
| **Aghanim's Scepter** | Rare | 被动（InvokeCmd 检查） | Invoke 生成 2 张法术（而非 1 张） |
| **Aghanim's Fragment** | Uncommon | `AfterPlayerTurnStart` | 25% 概率随机获得 1 张 Invoke 法术（不享受 Scepter 翻倍） |

---

## 角色配置

`InvokerCharacter` 继承 `PlaceholderCharacterModel`：

| 属性 | 值 |
|------|-----|
| 起始 HP | 75 |
| 起始金币 | 99 |
| 球槽数 | 3（`BaseOrbSlotCount`） |
| 起始套牌 | 10 张（见上文） |
| 起始遗物 | Quas Command Stone |
| 能量图标 | 复用 Defect（蓝色科技风格） |
| 名字颜色 | 冰蓝 (0.4, 0.7, 1.0) |

---

## 技术细节

### 动态变量（DynamicVar）

所有卡牌通过 `CanonicalVars` 定义数值模板，运行时通过 `DynamicVars` 访问：

```csharp
protected override IEnumerable<DynamicVar> CanonicalVars =>
    [new DamageVar(10m, ValueProp.Move), new CardsVar(1)];

protected override void OnUpgrade()
{
    DynamicVars.Damage.UpgradeValueBy(4m);
    DynamicVars.Cards.UpgradeValueBy(1);
}
```

内置类型：`DamageVar`, `BlockVar`, `CardsVar`, `PowerVar<T>` 等。  
自定义键值：`new DynamicVar("SpiritHp", 6m)`，通过 `DynamicVars["SpiritHp"]` 访问。

### 伤害属性（ValueProp）

| 属性 | 含义 |
|------|------|
| `ValueProp.Move` | 正常攻击伤害（受力量、虚弱等影响） |
| `ValueProp.Unpowered` | 不受力量影响（如 Power 造成的固定伤害） |
| `ValueProp.Unblockable` | 无视格挡 |

### 文件组织

```
Scripts/
├── Cards/
│   ├── CommonCards.cs          // 普通/稀有卡池
│   ├── InvokeCard.cs           // 0费 Invoke 启动器
│   ├── InvokeCmd.cs            // Invoke 核心逻辑
│   ├── InvokeTable.cs          // 10种法术映射表
│   ├── SpellCardBase.cs        // 法术基类（Scroll + Exhaust）
│   ├── SpellCards.cs           // 10种法术实现
│   ├── SummonOrbCard.cs        // 召唤球 + 三合一 SummonCard
│   └── TurnSummonTracker.cs    // 每回合召唤限制
├── Characters/
│   └── InvokerCharacter.cs     // 角色定义
├── Keywords/
│   └── InvokerKeywords.cs      // Scroll / Invoke 自定义关键词
├── Monsters/
│   └── ForgeSpiritMonster.cs   // 熔炉精灵宠物实体
├── Orbs/
│   ├── QuasOrb.cs
│   ├── WexOrb.cs
│   └── ExortOrb.cs
├── Pools/
│   ├── InvokerCardPool.cs
│   ├── InvokerPotionPool.cs
│   └── InvokerRelicPool.cs
├── Powers/
│   ├── ColdSnapPower.cs
│   ├── ForgeSpiritPower.cs
│   ├── GhostWalkPower.cs
│   ├── FrostShellPower.cs
│   ├── ThunderFieldPower.cs
│   ├── BurningHeartPower.cs
│   └── TempStrengthPower.cs
├── Relics/
│   ├── AghanimsFragment.cs
│   ├── AghanimsScepter.cs
│   ├── CommandStoneHelper.cs
│   ├── ExortCommandStone.cs
│   ├── QuasCommandStone.cs
│   └── WexCommandStone.cs
└── Entry.cs
```

---

## 已知问题与注意事项

### 1. SummonCard 数值同步问题

`SummonCard`（三合一）打出时，通过 `ModelDb.Card<SummonOrbCard>().DynamicVars.Block.BaseValue` 获取基础值。这**永远返回 canonical（未升级）值**。如果玩家在商店升级了 `SummonOrbCard`，`SummonCard` 不会受益。

### 2. Forge Spirit 视觉占位

`ForgeSpiritMonster.VisualsPath` 借用 `creature_visuals/osty`，需要替换为专属 Spine 动画。

### 3. 球无被动效果

`QuasOrb` / `WexOrb` / `ExortOrb` 的 `Passive()` 和 `Evoke()` 均为空实现。原版 Defect 的球有被动和触发效果，Invoker 的球目前仅作"状态计数器"。

### 4. Command Stone 选择逻辑

`CommandStoneHelper.ChooseOrb()` 创建临时卡牌实例用于 UI 选择，选择后**再次**执行 `OrbCmd.Channel`，而不是复用临时实例的效果。这意味着如果临时实例被某些效果修改（如费用变化），不会反映到实际 channel 行为中。

### 5. Aghanim's Scepter 与 Fragment 的交互

- **Scepter** 影响的是 `InvokeCmd.Execute()` 中的 `copies` 变量（仅 InvokeCard 触发）
- **Fragment** 直接调用 `InvokeCmd.AddSpellToHand()`，绕过 `copies` 检查，因此 Fragment 生成的法术**永远只有 1 张**，不受 Scepter 影响

### 6. 伤害数值平衡（待调整）

以下卡牌的数值在原始设计中可能偏高/偏低，需游戏内测试验证：

| 卡牌 | 当前数值 | 备注 |
|------|----------|------|
| EMP | 1费 AOE 20 | 作为 1费卡，AOE 20 可能过强 |
| Tornado | 1费 AOE 10 + 抽1 | 效率极高 |
| Sun Strike | 3费单体 28 | 相比 Ironclad 的 Heavy Blade 可能偏弱 |
| Alacrity | 0费抽1 + 3 TempStr | 0费效率极高 |
| Chaos Meteor | 2费主10 + 链式[5,4,3,2,1]=25总计 | 总伤害 35 可能过高 |

### 7. 本地化文本

当前 `en` 和 `zhs` 本地化已覆盖所有卡牌、Power 和关键词。但 spell 卡牌的 `upgrade_description` 与 `description` 相同（因为数值通过 `{Damage:diff()}` 等动态变量自动展示差异）。
