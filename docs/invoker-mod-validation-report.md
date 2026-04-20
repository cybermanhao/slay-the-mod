# Invoker Mod 源码与文档验证报告

> 生成时间：2026-04-20
> 验证范围：Invoker Mod 全部 C# 源码 + STS2 参考源码（BaseLib / decompiled_src / tutorials）
> 重点：召唤物机制、核心 API 可用性、设计文档有效性

---

## 1. 执行摘要

| 维度 | 结论 |
|------|------|
| **核心 API** | 全部可用 ✅ `OnUpgrade`、`DamageCmd`、`PowerCmd`、`CardPileCmd`、`EnergyCost.SetThisTurn` 等均有效 |
| **召唤物机制** | 完全可行 ✅ `PlayerCmd.AddPet`、`DieForYouPower`、宠物作为 `Creature` 实例均经源码证实 |
| **设计文档有效性** | ⚠️ **严重问题**：`DESIGN.md` 中 10/10 个法术的效果描述与现有代码实现不符；文档中部分数值/机制在代码中完全未体现 |
| **代码健康度** | 结构完整（orb 队列、invoke 管道、scroll slot FIFO、command stone、本地化），但法术实现几乎全是占位逻辑 |

**核心结论**：Invoker Mod 的**基础设施和框架是健全的**，但**法术效果实现（`SpellCards.cs`）是大量未对齐设计文档的占位代码**。当前代码无法提供 DESIGN.md 所描述的游戏体验。需要大规模重写 `SpellCards.cs` 和 `CommonCards.cs` 才能对齐设计。

---

## 2. 核心 API 验证结果

基于 `reference/decompiled_src/` 和 `reference/BaseLib-StS2/` 源码逐条验证。

| # | API / 模式 | 结论 | 源码依据 |
|---|-----------|------|---------|
| 1 | `protected override void OnUpgrade()` | ✅ 有效 | `CardModel.cs:1297` 声明为 `protected virtual void`；`UpgradeInternal()` 调用它 |
| 2 | `CardKeyword.Retain` | ✅ 有效 | `CardKeyword.cs` 枚举包含 `Retain`；`CardCmd.ApplyKeyword` 存在 |
| 3 | `DamageCmd.Attack(...).FromCard().Targeting*()` | ✅ 有效 | `AttackCommand.cs` 完整实现 `.Targeting`、`.TargetingAllOpponents`、`.TargetingRandomOpponents`、`.FromCard` |
| 4 | `PowerCmd.Apply<T>(target, amount, applier, cardSource)` | ✅ 有效 | `PowerCmd.cs:16` 有单目标与多目标两个重载 |
| 5 | `CardPileCmd.AddGeneratedCardToCombat(card, pile, addedByPlayer)` | ✅ 有效 | `CardPileCmd.cs:172` 完整签名与 vanilla 使用一致 |
| 6 | `EnergyCost.SetThisTurn(0)` | ✅ 有效 | `CardEnergyCost.cs:119` 实现；vanilla `Flatten.cs` 也使用 |
| 7 | `AfterCardEnteredCombat(CardModel)` | ✅ 有效 | `AbstractModel.cs:191` 声明；`CardPileCmd.cs:438` 在卡片进入战斗堆时触发 |
| 8 | `TargetType.AllEnemies / AnyEnemy / None / RandomEnemy` | ✅ 有效 | `TargetType.cs` 枚举完整包含 |
| 9 | `CardPileCmd.Add(card, PileType.Exhaust)` | ✅ 可用，但有更好做法 | 功能上可行，但建议用 `CardCmd.Exhaust(ctx, card)` 以保留历史记录和触发 `AfterCardExhausted` hooks |
| 10 | `IsEnhanced()` | ⚠️ **自定义方法** | 不在任何基础类中；是 `SpellCardBase` 自己实现的 helper |

### 2.1 升级机制（OnUpgrade）的正确用法

代码中 `CommonCards.cs` 的升级写法是**正确的**范式：

```csharp
protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(3m);
```

但 `InvokeCard.cs` 的升级写法是**反模式**：

```csharp
// ❌ 坏做法：用 bool 字段标记升级状态，在 OnPlay 中做分支
private bool _upgraded;
protected override void OnUpgrade() => _upgraded = true;
```

**正确做法**：升级应通过 `DynamicVars` 或修改卡牌的固有属性（费用、关键词）来实现。`OnUpgrade()` 只在卡牌被升级时调用一次（如 Smith 事件或战斗内升级效果），之后卡牌的 `CurrentUpgradeLevel` 会递增。用 `DynamicVars.Damage.UpgradeValueBy()` 或 `EnergyCost.UpgradeValueBy(-1)` 才是可持续的做法。

---

## 3. 召唤物机制验证（重点）

### 3.1 总体结论：完全可行 ✅

通过阅读 `reference/decompiled_src/Slay the Spire 2/src/Core/Commands/PlayerCmd.cs`、`Creature.cs`、`PlayerCombatState.cs`、`DieForYouPower.cs` 以及 `Osty.cs` / `Byrdpip.cs` 等官方宠物实现，确认召唤物系统是 STS2 的一等公民机制。

### 3.2 关键 API 验证

**`PlayerCmd.AddPet`** — 存在两个重载：

```csharp
// 泛型重载：自动从 MonsterModel 创建 Creature
public static async Task<Creature> AddPet<T>(Player player) where T : MonsterModel

// 非泛型重载：接受已实例化的 Creature（必须先加入 CombatState）
public static async Task AddPet(Creature pet, Player player)
```

**`DieForYouPower`** — 官方实现，通过 `ModifyUnblockedDamageTarget` 将指向主人的伤害重定向到宠物：

```csharp
public override Creature ModifyUnblockedDamageTarget(Creature target, decimal _, ValueProp props, Creature? __)
{
    if (target != base.Owner.PetOwner?.Creature) return target;
    if (base.Owner.IsDead) return target;
    if (!props.IsPoweredAttack()) return target;
    return base.Owner; // 重定向到宠物自身
}
```

### 3.3 Forge Spirit 实现分析

当前 `ForgeSpiritMonster.cs` + `ForgeSpiritPower.cs` 的实现**结构上是正确的**，但**效果与设计文档不符**。

| 方面 | 当前实现 | DESIGN.md 要求 | 是否可调整 |
|------|---------|----------------|-----------|
| 召唤方式 | `PlayerCmd.AddPet` + `CombatState.CreateCreature` | 相同 | ✅ 无需改 |
| 伤害时机 | 玩家回合开始（`AfterPlayerTurnStart`） | 敌方回合结束（`AfterTurnEnd` + `side == CombatSide.Enemy`） | ✅ 改 hook 即可 |
| 伤害目标 | 随机单个敌人 | 全体敌人（AOE） | ✅ 改循环即可 |
| 生命衰减 | 每玩家回合结束自损 3-4 HP | 3/5 回合后自动消失（timed power） | ⚠️ 两种设计均可行，但当前代码使用自损而非定时消失 |
| 替主人承伤 | `DieForYouPower` | 相同 | ✅ 正确 |

**建议**：DESIGN.md 描述的 "3 回合后自动消失" 可用两种方法实现：

1. **Power 计数器法**（推荐，与 DESIGN.md 一致）：
   ```csharp
   public override async Task AfterTurnEnd(PlayerChoiceContext ctx, CombatSide side)
   {
       if (side == CombatSide.Enemy)
       {
           await CreatureCmd.Damage(...).TargetingAllOpponents(...);
           await PowerCmd.ReduceAmount(this, 1); // 回合数 -1
           if (Amount <= 0) await PowerCmd.Remove(this);
       }
   }
   ```

2. **当前自损法**：保留现有实现，但需把伤害目标从随机单体改为 AOE。

### 3.4 召唤物系统的已知限制

| 限制 | 说明 | 对 Invoker 的影响 |
|------|------|------------------|
| `PetOwner` 只能写一次 | 宠物不能更换主人 | 无影响 |
| 宠物必须先加入 `CombatState` | 调用 `AddPet(Creature, Player)` 前需 `CreateCreature` | 当前代码已正确处理 |
| 宠物不自动行动 | `Creature.TakeTurn()` 只给 `CombatSide.Enemy` 调用 | 无影响，Forge Spirit 是被动触发 |
| 需要 dummy move state machine | `MonsterModel.GenerateMoveStateMachine()` 是 abstract | 当前代码已正确处理（`MoveState` + `HiddenIntent`） |
| `BaseLib` 无宠物封装 | 必须直接调用底层 API | 当前代码已正确处理 |

---

## 4. 设计文档 vs 代码实现对比

### 4.1 10 个 Invoke 法术逐一核对

这是**最严重的不一致区域**。`SpellCards.cs` 中的实现与 `DESIGN.md` 的数值/效果几乎完全错位。

| 组合 | 法术 | DESIGN.md 要求 | 代码现状 | 状态 |
|------|------|---------------|---------|------|
| **QQQ** | Cold Snap | 1费，单体 **6** 伤 + **2** 脆弱；升级 **9+3**；增强 **9+3** | 1费 Skill，挂 `ColdSnapPower`（受击时减 1 力量，玩家回合结束移除）。**无伤害，无脆弱。** | ❌ 完全不同 |
| **QQW** | Ghost Walk | 1费，获得 **12** 格挡 + 全敌 **1** 虚弱；升级 **16+2**；增强 **16+2** | 2费 Skill，挂 `Intangible` + `GhostWalkPower`（攻击牌费用变 99）。**无格挡，无虚弱。** | ❌ 完全不同 |
| **QQE** | Ice Wall | 2费，AOE **8** 伤 + 全敌 **2** 脆弱；升级→**1费**，8+2；增强 **12+3** | 1费 Attack，AOE **4** 伤 + **1** 虚弱，增强 **7+2**。费用和数值全错。 | ❌ |
| **QWW** | Tornado | 2费，AOE **10** 伤 + **清除全敌人工制品** + 抽 **1**；升级 14+抽2；增强 16+抽2 | 1费 Attack，AOE **10** 伤 + 抽 **1**，增强 **14**。无人工制品清除，费用错。 | ❌ |
| **QWE** | Deafening Blast | 2费，AOE **12** 伤 + 全敌 **2** 虚弱；升级 16+3；不可增强 | 1费 Attack，AOE **12** 伤 + **1** 虚弱。费用和虚弱层数错。 | ❌ |
| **WWW** | EMP | 2费，AOE **18** 伤 + **清除全敌格挡**；升级 24；增强 24 | 1费 Attack，AOE **20-26** 伤。**无格挡清除**，费用错。 | ❌ |
| **WWE** | Alacrity | 1费，获得 **2** 能量 + 抽 **2**；升级→**0费**；增强 **3** 能量 + 抽2 | 0费 Skill，抽 **1-2** + `TempStrength` **3-5**。**无能量获得。** | ❌ |
| **WEE** | Chaos Meteor | 2费，AOE **16** 伤 + 能力：2 回合每回合 5 AOE；升级 20+3 回合；增强 22+3 | 2费 Attack，**单体** **10-14** + 随机 5 次递减伤害。**完全不是 AOE power。** | ❌ 完全不同 |
| **QEE** | Forge Spirit | 1费，能力：**3** 回合，敌方回合结束伤全体 **4**；升级 **5** 回合；增强 **5** 回合 | 召唤 `ForgeSpiritMonster` 宠物，玩家回合开始随机单体 5 伤 + 1 脆弱，每回合自损 3-4 HP。**不是定时 power，是宠物。** | ❌ 完全不同 |
| **EEE** | Sun Strike | 2费，单体 **30** 伤；升级 **40**；增强 **40** | 3费 Attack，单体随机 **25-38** 伤。费用和随机性错。 | ❌ |

**结论**：10/10 法术的实现与设计文档不符。其中 **4 个（Cold Snap、Ghost Walk、Chaos Meteor、Forge Spirit）是完全不同的机制**，其余 6 个是数值/费用/目标类型错误。

### 4.2 普通卡（CommonCards.cs）核对

`CommonCards.cs` 中定义了 20+ 张卡牌，这些卡牌**没有出现在 DESIGN.md 中**。DESIGN.md 只描述了起始套牌（4 Strike + 4 Defend + Invoke + Summon）和 11 个 Invoke 法术。

**现状**：`CommonCards.cs` 是一套完整的原创卡牌池（冰/雷/火三系 + 稀有牌），数值和机制自行设计，与 DESIGN.md 无关。这本身不是问题，但意味着文档和代码之间存在**两套独立的设计体系**。

**潜在问题**：如果项目目标是严格复刻 DESIGN.md 的 Invoker 体验，则 `CommonCards.cs` 中的大部分卡牌可能需要被替换或重新设计。

### 4.3 起始套牌核对

| 项目 | DESIGN.md | 代码（`InvokerCharacter.cs`） | 状态 |
|------|-----------|------------------------------|------|
| Strike | 4x，6伤/1费，升级+3 | 4x `StrikeInvokerCard`，6伤/1费，升级+3 | ✅ |
| Defend | 4x，5格挡/1费，升级+3 | 4x `DefendInvokerCard`，5格挡/1费，升级+3 | ✅ |
| Invoke | 1x，0费，升级后抽1 | 1x `InvokeCard`，0费，升级后**复制自身** | ❌ |
| Summon | 1x，0费选球 | 1x `SummonCard`（三合一选择器） | ✅ |
| 起始遗物 | 玩家自选 Command Stone | **硬编码 QuasCommandStone** | ❌ |

**起始遗物问题**：`CommandStoneHelper.ChooseStarterSummon()` 方法存在但**从未被调用**，是死代码。当前玩家无法选择 Wex 或 Exort 作为起始 stone。

### 4.4 升级机制核对

| 项目 | DESIGN.md 要求 | 代码现状 | 状态 |
|------|---------------|---------|------|
| Invoke 升级 | 抽 1 张牌 | 复制自身到手中 | ❌ |
| Summon 升级 | Q→12+4Q, W→8伤, E→5 AOE | 三合一 `SummonCard` 获得 `Retain`，**单卡无升级** | ❌ |
| 法术升级 | 见 DESIGN.md 数值表 | **全部未实现** `OnUpgrade` | ❌ |

所有 `SpellCardBase` 子类（10 个法术）都**没有重写 `OnUpgrade()`**，意味着它们目前无法被升级。

---

## 5. 已知 Bug 与脆弱性

### 🔴 Bug 1：Aghanim's Fragment 绕过核心机制

`AghanimsFragment.cs` 在 `AfterPlayerTurnStart` 中直接调用：

```csharp
var card = Owner.Creature.CombatState.CreateCard(canonical, Owner);
await CardPileCmd.AddGeneratedCardToCombat(card, PileType.Hand, addedByPlayer: true);
```

**问题**：这条路径**完全绕过了 `InvokeCmd.Execute`**，导致 Fragment 生成的法术：
- 不应用 `Retain` 关键词
- 不遵守 scroll slot FIFO 限制（手牌中可以有超过 2 张法术）
- 不经过增强检查

**修复建议**：Fragment 应调用 `InvokeCmd.Execute`，或至少手动执行相同的后续处理（Retain、scroll slot 限制）。

### 🟡 Bug 2：TurnSummonTracker 重置依赖

`TurnSummonTracker.Reset()` 只被 `CommandStone` 遗物在 `BeforeCombatStart` 和 `AfterPlayerTurnStart` 中调用。如果玩家通过某种方式**失去了 Command Stone**（例如通过特殊事件），`TurnSummonTracker` 将永远不会重置，导致召唤卡永久无法使用。

**修复建议**：将 `Reset()` 逻辑移到 `InvokerCharacter` 或一个全局 combat hook 中。

### 🟡 Bug 3：InvokeCard 升级反模式

`InvokeCard` 使用 `bool _upgraded` 字段在 `OnPlay` 中做分支判断。这会导致：
- 如果卡牌被复制（如 `Dolly's Mirror`），`_upgraded` 状态不会正确传递
- 如果卡牌被降级（某些敌人效果），`_upgraded` 不会变回 false

**修复建议**：改用 `DynamicVars` 或检查 `CurrentUpgradeLevel`：
```csharp
protected override async Task OnPlay(...)
{
    await InvokeCmd.Execute(ctx, this);
    if (CurrentUpgradeLevel > 0)
        await CardPileCmd.Draw(ctx, 1, Owner); // 升级后抽 1 张
}
```

### 🟡 Bug 4：ForgeSpiritPower 的 `AfterTurnEnd` 逻辑错误

当前 `ForgeSpiritPower.AfterTurnEnd`：
```csharp
if (side != CombatSide.Player) return;
```

这表示它只在**玩家回合结束**时触发自损。但 `ForgeSpiritPower` 的注释说 "每玩家回合结束"。如果设计意图是"敌方回合结束"，则条件应为 `side == CombatSide.Enemy`。

实际上这个实现是自洽的（宠物在玩家回合结束时掉血），但需要确认设计意图。

### 🟡 Bug 5：SpellCardBase 费用固定为 1

`SpellCardBase` 的构造函数默认 `cost = 1`：
```csharp
protected SpellCardBase(..., int cost = 1) : base(cost, ...)
```

但多个法术在 DESIGN.md 中费用不是 1（Ghost Walk=1, Ice Wall=2, Tornado=2, EMP=2, Alacrity=1, Chaos Meteor=2, Sun Strike=2）。当前代码中部分子类通过 `: base(..., cost: 2)` 覆盖了，但大部分的费用是错的。

---

## 6. 文档中不可实现或需调整的部分

### 6.1 完全不可实现

经过源码验证，**DESIGN.md 中没有任何机制被证明是完全不可实现的**。所有描述的效果（伤害、格挡、脆弱、虚弱、能量、抽牌、清除格挡、清除人工制品、召唤宠物、定时 power、费用变化）都有对应的 STS2 API。

### 6.2 需要调整或补充的设计

| 设计点 | 问题 | 建议 |
|--------|------|------|
| **毁天灭地（Cataclysm）** | 未实现，且需要 Aghanim's Scepter 替换 EEE→Sun Strike 的逻辑 | 在 `InvokeTable.Lookup` 中检查 `AghanimsScepter`，若存在且 q=0,w=0,e=3 则返回 `CataclysmCard` |
| **法术增强（IsEnhanced）与升级（OnUpgrade）并存** | 设计文档说"升级不影响石头增强逻辑"，但当前 `IsEnhanced()` 只检查 command stone，不检查 `CurrentUpgradeLevel` | 确认设计：升级和增强是独立维度，代码中应保持分离。升级用 `OnUpgrade()` + `DynamicVars`，增强用 `IsEnhanced()` |
| **人工制品清除（Tornado）** | DESIGN.md 要求"清除全敌人工制品"，需确认 API | `ArtifactPower` 存在，`PowerCmd.Remove<ArtifactPower>(enemy)` 或遍历 enemies 移除 Artifact 即可 |
| **格挡清除（EMP）** | DESIGN.md 要求"清除全敌格挡"，需确认 API | `Creature.Block` 属性存在，可用 `CreatureCmd.SetBlock(enemy, 0)` 或 `CreatureCmd.GainBlock(enemy, -enemy.Block)` |
| **SummonCard 升级** | 设计说每张单卡应有数值升级，但代码中三合一选择器获得 Retain | 统一设计：要么三合一保留 Retain + 单卡也加数值，要么三合一的 Retain 就是升级效果 |

---

## 7. 建议的后续开发优先级

基于验证结果，建议按以下顺序修复：

| 优先级 | 任务 | 理由 |
|--------|------|------|
| **P0** | 重写 `SpellCards.cs`（10 个法术对齐 DESIGN.md） | 核心体验，当前完全不匹配 |
| **P0** | 为所有法术添加 `OnUpgrade()` | 升级是 STS2 核心循环，当前完全缺失 |
| **P1** | 修复 `AghanimsFragment` 绕过 InvokeCmd | 会导致游戏逻辑异常（无限法术、无 Retain） |
| **P1** | 实现 `CataclysmCard` + Scepter 替换逻辑 | DESIGN.md 中的关键后期内容 |
| **P1** | 修复 `InvokeCard` 升级效果（抽 1 而非复制） | 与设计文档不符 |
| **P2** | 修复 `TurnSummonTracker` 重置依赖 | 边缘情况 bug |
| **P2** | 对齐 `CommonCards.cs` 与 DESIGN.md 的卡牌池 | 如果 DESIGN.md 是权威设计规范，需统一 |
| **P3** | 优化 `ForgeSpiritPower`（AOE 伤害 + 定时消失 vs 宠物自损） | 两种设计均可行，需明确方向 |

---

## 8. 附录：关键源码引用

### PlayerCmd.AddPet
```csharp
// decompiled_src/Core/Commands/PlayerCmd.cs
public static async Task<Creature> AddPet<T>(Player player) where T : MonsterModel
{
    Creature pet = player.Creature.CombatState.CreateCreature(
        (T)ModelDb.Monster<T>().ToMutable(), player.Creature.Side, null);
    await AddPet(pet, player);
    return pet;
}

public static async Task AddPet(Creature pet, Player player)
{
    if (pet.CombatState == null)
        throw new InvalidOperationException("Pet must already be added to a combat state.");
    player.PlayerCombatState.AddPetInternal(pet);
    await CreatureCmd.Add(pet);
}
```

### DieForYouPower
```csharp
// decompiled_src/Core/Models/Powers/DieForYouPower.cs
public override Creature ModifyUnblockedDamageTarget(Creature target, decimal _, ValueProp props, Creature? __)
{
    if (target != base.Owner.PetOwner?.Creature) return target;
    if (base.Owner.IsDead) return target;
    if (!props.IsPoweredAttack()) return target;
    return base.Owner;
}
```

### OnUpgrade 调用链
```csharp
// decompiled_src/Core/Models/CardModel.cs
public void UpgradeInternal()
{
    AssertMutable();
    CurrentUpgradeLevel++;
    OnUpgrade();
    DynamicVars.RecalculateForUpgradeOrEnchant();
    this.Upgraded?.Invoke();
}
```
