# Invoker Mod 实现正确性验证报告

> 验证基准：**代码即设计意图**（`DESIGN.md` 视为过时参考）
> 验证方法：将 Invoker Mod 代码与 STS2 官方源码（`decompiled_src`、`BaseLib`）逐条比对
> 生成时间：2026-04-20

---

## 1. 总体结论

Invoker Mod 的**框架层实现正确且稳固**：Entry 初始化、orb 队列、Invoke 管道、scroll slot FIFO、Command Stone 系统、自定义关键词、本地化、Harmony Patch 均无明显问题。

**问题集中在法术层（`SpellCards.cs` + 自定义 Powers）**：存在多个 API 误用、反模式、以及明显的功能缺失（全部法术缺少升级）。

| 类别 | 严重程度 | 数量 |
|------|---------|------|
| 🔴 功能缺陷 / 明显 Bug | 高 | 4 |
| 🟡 API 误用 / 反模式 | 中 | 5 |
| 🟢 建议优化 | 低 | 3 |

---

## 2. 召唤物机制验证（Forge Spirit 完整链路）

**结论：结构正确，但存在语义级隐患。**

### 2.1 召唤链路

```
ForgeSpiritCard.OnPlay
  → ModelDb.Monster<ForgeSpiritMonster>().ToMutable()
  → CombatState.CreateCreature(spirit, Owner.Creature.Side, null)
  → PlayerCmd.AddPet(pet, Owner)
  → PowerCmd.Apply<ForgeSpiritPower>(pet, hp, Owner.Creature, this)
  → PowerCmd.Apply<DieForYouPower>(pet, 1, Owner.Creature, this)
```

**验证结果**：
- `PlayerCmd.AddPet` 官方签名与调用方式完全匹配 ✅
- `DieForYouPower` 是官方 Power，替主人承伤机制经源码证实 ✅
- `ForgeSpiritMonster` 的 dummy `MoveStateMachine` 与官方 `Osty`/`Byrdpip` 模式一致 ✅

### 2.2 ForgeSpiritPower 的隐患

```csharp
// 隐患 1：Power 挂在宠物身上，但 applier 是玩家
await PowerCmd.Apply<ForgeSpiritPower>(pet, hp, Owner.Creature, this);
```

`ForgeSpiritPower` 的 `Amount = hp`（6 或 12），但代码中的实际效果（伤害 5 + 脆弱 1）**完全不使用 `Amount`**。`Amount` 的唯一用途是在 `AfterApplied` 中推算 `DecayPerTurn`：

```csharp
GetInternalData<Data>().DecayPerTurn = Amount >= 12 ? 4 : 3;
```

这导致 `ForgeSpiritPower` 本质上是一个 `PowerStackType.Single` 更合适（因为它的效果不随 `Amount` 缩放）。当前设为 `Counter` 会造成视觉误导（玩家看到精灵头上有"12"层数，但实际效果与层数无关）。

**建议**：改为 `Single`，用内部 Data 存储 `DecayPerTurn`，与 `Amount` 解耦。

### 2.3 自损时机

```csharp
public override async Task AfterTurnEnd(PlayerChoiceContext ctx, CombatSide side)
{
    if (side != CombatSide.Player) return;  // 只在玩家回合结束时自损
```

这与注释"每玩家回合结束"一致。但 `DecayPerTurn = 3`（或 4）意味着：
- 6 HP → 2 个玩家回合后死亡
- 12 HP → 3 个玩家回合后死亡

如果设计意图是"持续数个玩家回合的宠物"，这个数值是合理的。但如果意图是"持续数个完整回合（含敌我）"，则当前实现会让宠物在敌人回合中"免费存活"，可能过强。

### 2.4 DieForYouPower 的叠加问题

每次打出 `ForgeSpiritCard` 都会给新宠物施加 `DieForYouPower`。如果有多个宠物，`DieForYouPower` 的 `ModifyUnblockedDamageTarget` 会按**hook 调用顺序**决定哪个宠物承伤。通常是最新施加的宠物。这不是 bug，但需要知晓。

---

## 3. 自定义 Power 逐一验证

### 3.1 ColdSnapPower — 受击减力量

```csharp
public override async Task AfterDamageReceived(...)
{
    if (target != Owner) return;
    if (result.TotalDamage <= 0) return;
    await PowerCmd.Apply<StrengthPower>(Owner, -1m, dealer, cardSource);
}
```

**问题：过度触发**

`AfterDamageReceived` 会在**任何来源的伤害**时触发，包括：
- 玩家的攻击牌
- 其他 Power 的伤害（如 `ThunderFieldPower`、`BurningHeartPower`）
- 环境伤害
- 宠物（Forge Spirit）的攻击

如果玩家一回合内对带 ColdSnap 的敌人造成 5 次伤害，敌人力量会 -5。这与 Dota 中"受攻击时触发"的语义一致，但在 STS2 中可能过于强力。

**源码对比**：官方 `FlameBarrierPower` 使用 `props.IsPoweredAttack()` 过滤只响应攻击牌伤害。如果 ColdSnap 的意图也是"只在受到攻击伤害时触发"，应加入此过滤：

```csharp
if (!props.IsPoweredAttack()) return;  // 建议添加
```

**次要问题**：`StrengthPower(-1)` 会让敌人永久减力量（跨回合累积）。ColdSnapPower 本身在玩家回合结束时移除，但减了的力量不会恢复。这是设计意图吗？

### 3.2 GhostWalkPower — 攻击牌费用变 99

```csharp
public override bool TryModifyEnergyCostInCombat(CardModel card, decimal originalCost, out decimal modifiedCost)
{
    modifiedCost = originalCost;
    if (!GetInternalData<Data>().IsActive) return false;
    if (card.Owner?.Creature != Owner) return false;
    if (card.Type != CardType.Attack) return false;
    modifiedCost = 99;
    return true;
}
```

**实现正确**，API 使用与官方一致 ✅

**潜在设计问题**：结合 `IntangiblePower`（伤害上限为 1），Ghost Walk 实际上是"一回合无敌且不能攻击"。如果设计意图只是"规避伤害"，那么 `IntangiblePower` 是过度设计——玩家本就不能攻击，不需要再叠加无敌。但这不是实现错误。

### 3.3 TempStrengthPower — 临时力量

```csharp
public override decimal ModifyDamageAdditive(Creature? target, decimal amount, ValueProp props, Creature? dealer, CardModel? cardSource)
{
    if (Owner != dealer) return 0m;
    if (!props.HasFlag(ValueProp.Move) || props.HasFlag(ValueProp.Unpowered)) return 0m;
    return Amount;
}
```

**实现正确**，只给 `Move` 类型的攻击加伤，不给 `Unpowered` 加伤 ✅

**与官方模式对比**：官方 `TemporaryStrengthPower` 在回合结束时会 `Apply<StrengthPower>(owner, -Amount, ...)` 来扣回基础力量。`TempStrengthPower` 只 `Remove` 自己，不扣回 `StrengthPower`。这避免了与真正的 `StrengthPower` 冲突，是一种更干净的做法。

### 3.4 ThunderFieldPower — 回合结束随机伤害

```csharp
public override async Task AfterTurnEnd(PlayerChoiceContext ctx, CombatSide side)
{
    if (side == CombatSide.Enemy) return;
    var target = Owner.Player.RunState.Rng.CombatTargets.NextItem(CombatState.HittableEnemies);
```

**实现正确** ✅。注意 `side == CombatSide.Enemy` 时 `return`，即只在**玩家回合结束**时触发。

### 3.5 BurningHeartPower — 敌方回合结束 AOE

```csharp
public override async Task AfterTurnEnd(PlayerChoiceContext ctx, CombatSide side)
{
    if (side != CombatSide.Enemy) return;
    await CreatureCmd.Damage(ctx, CombatState!.HittableEnemies, Amount, ValueProp.Unpowered, Owner, null);
}
```

**实现正确** ✅。`CreatureCmd.Damage` 的 `IEnumerable<Creature>` 重载经源码确认存在。

### 3.6 FrostShellPower — 回合开始获得格挡

```csharp
public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
{
    if (player != Owner.Player) return;
```

**实现正确** ✅。`Owner.Player` 获取该 Creature 所属 Player 的方式正确。

---

## 4. 法术卡（SpellCards.cs）问题清单

### 🔴 问题 1：全部 10 个法术缺少 `OnUpgrade()`

**影响**：所有法术卡在 Smith 事件或升级效果中**无法升级**。

**官方模式**：
```csharp
protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(3m);
// 或
protected override void OnUpgrade() => EnergyCost.UpgradeBy(-1);
```

**每个法术需要补的升级**：

| 法术 | 建议升级方向 |
|------|-------------|
| ColdSnap | `DynamicVars.Damage.UpgradeValueBy(3m)` + 脆弱层数 +1（需改 Power） |
| GhostWalk | `EnergyCost.UpgradeBy(-1)`（2→1 费） |
| IceWall | `DynamicVars.Damage.UpgradeValueBy(4m)` + 虚弱层数 +1 |
| Tornado | `DynamicVars.Damage.UpgradeValueBy(4m)` + 抽牌数 +1（需改逻辑） |
| DeafeningBlast | `DynamicVars.Damage.UpgradeValueBy(4m)` + 虚弱层数 +1 |
| EMP | `DynamicVars.Damage.UpgradeValueBy(6m)` |
| Alacrity | `DynamicVars.Draw.UpgradeValueBy(1)` + `DynamicVars.Strength.UpgradeValueBy(2)` |
| ChaosMeteor | 主伤害 +4，chain 数组提升（需重构） |
| ForgeSpirit | 宠物 HP +6（即 `InitialHp` 升级） |
| SunStrike | 固定伤害提升（需重构，见问题 3） |

### 🔴 问题 2：ColdSnapCard 的 `EnergyCost.SetThisTurn(0)` 是临时减费

```csharp
public override Task AfterCardEnteredCombat(CardModel card)
{
    if (card == this && IsEnhanced())
        EnergyCost.SetThisTurn(0);  // ❌ 只在当前回合有效
    return Task.CompletedTask;
}
```

**问题**：`SetThisTurn(0)` 添加的 `LocalCostModifier` 在**回合结束时过期**。如果这张卡被 `Retain` 保留到下一回合，费用会恢复为 1。

**官方模式**：永久减费用 `UpgradeBy(-1)` 或 `SetCustomBaseCost(0)`：

```csharp
// InfernalBlade.cs 官方实现
protected override void OnUpgrade()
{
    base.EnergyCost.UpgradeBy(-1);  // 永久从 1 降到 0
}
```

**但 ColdSnap 的特殊性**：它的费用变化不是由"升级"触发，而是由"enhanced"（Command Stone）触发。`IsEnhanced()` 在运行时动态判断，不能在构造函数中设定。

**建议方案**：

方案 A（推荐）：在构造函数中固定费用，用升级系统处理 enhanced 变体。即做两张卡：`ColdSnapCard`（1 费）和 `ColdSnapCardEnhanced`（0 费），`InvokeTable` 根据 `IsEnhanced()` 返回不同卡。

方案 B：在 `AfterCardEnteredCombat` 中使用 `SetThisCombat(0)`（本战斗内有效），而非 `SetThisTurn(0)`。

方案 C：用 `EnergyCost.AddThisCombat(-1)` 作为永久战斗内减费。

### 🔴 问题 3：SunStrikeCard 的随机伤害是反模式

```csharp
decimal dmg = IsEnhanced()
    ? (decimal)GD.RandRange(30, 50)
    : (decimal)GD.RandRange(25, 38);
```

**问题**：
1. 没有任何官方卡牌在 `OnPlay` 中使用 RNG 计算伤害。所有官方卡都使用固定的 `DamageVar`。
2. 卡牌预览（hover tooltip）会显示一个固定值（或 `DamageVar.BaseValue`），但打出时的实际伤害是随机的，导致**预览与实际不符**。
3. `GD.RandRange` 在 Godot 中每次调用都重新随机，不可控、不可测试。

**建议**：改为固定伤害，或用 `DynamicVar` + 升级系统：

```csharp
// 推荐：固定伤害 + 升级
protected override IEnumerable<DynamicVar> CanonicalVars =>
    [new DamageVar(30m, ValueProp.Move)];

protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(10m);
```

如果一定要随机性，建议用 `CalculatedDamageVar`（如官方 `Conflagration`），让伤害基于战斗状态（而非纯 RNG）。

### 🟡 问题 4：ChaosMeteorCard 的链式伤害实现低效

```csharp
foreach (int d in chain)
    await DamageCmd.Attack(d).FromCard(this).TargetingRandomOpponents(CombatState!).Execute(ctx);
```

每次 `DamageCmd.Attack(...).Execute()` 都是一次完整的攻击流程（动画、VFX、声音、hook）。5 次独立调用意味着 5 套完整动画，可能过于冗长。

**建议**：如果设计意图是"连续随机弹射伤害"，当前实现是合理的（类似 Chain Lightning）。但如果意图是"一个大伤害 + 小范围溅射"，应考虑用单次 `DamageCmd.Attack` 配合 `CalculatedDamageVar`。

### 🟡 问题 5：IceWallCard / TornadoCard / EMPCard 等费用与效果类型

这些卡的费用和伤害值与 DESIGN.md 不同，但既然 DESIGN.md 已过时，以代码为准。需要确认的是：**当前费用是否符合游戏平衡？**

| 卡 | 当前费用 | 效果 | 评估 |
|---|---------|------|------|
| IceWall | 1 | AOE 4-7 伤 + 1-2 虚弱 | 1 费 AOE + debuff 在 STS2 中略强（参考 vanilla：Thunderclap 1 费 AOE 4 + 1 脆弱）|
| Tornado | 1 | AOE 10-14 伤 + 抽 1 | 1 费 AOE 10+ 抽 1 过强（参考：Cleave 1 费 AOE 8，无抽牌）|
| EMP | 1 | AOE 20-26 伤 | 1 费 AOE 20 严重过强（参考：Bludgeon 3 费单体 32）|
| DeafeningBlast | 1 | AOE 12 + 1 虚弱 | 1 费 AOE 12 + debuff 略强 |
| GhostWalk | 2 | Intangible + 攻击牌禁打 | 2 费 Intangible（参考：Ghostly 1 费 Ethereal Intangible）费用合理，效果强力 |

**这不是实现错误，而是平衡问题**。如果当前数值就是设计目标，建议在实际游戏中测试后调整。

---

## 5. 其他系统问题

### 🔴 Bug 1：Aghanim's Fragment 绕过 Invoke 核心逻辑

```csharp
// AghanimsFragment.cs
var card = Owner.Creature.CombatState.CreateCard(canonical, Owner);
await CardPileCmd.AddGeneratedCardToCombat(card, PileType.Hand, addedByPlayer: true);
```

**问题**：直接生成到手牌，跳过了：
- `Retain` 关键词添加
- Scroll slot FIFO 限制（手牌中可有无限法术）
- 升级/增强逻辑

**修复**：应调用 `InvokeCmd.Execute`，或至少复制 `InvokeCmd` 中的后续处理逻辑。

### 🔴 Bug 2：InvokeCard 升级导致无限递归

```csharp
// InvokeCard.cs
private bool _upgraded;
protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
{
    await InvokeCmd.Execute(ctx, this);
    if (_upgraded)
    {
        var copy = Owner.Creature.CombatState.CreateCard(ModelDb.Card<InvokeCard>(), Owner);
        await CardPileCmd.AddGeneratedCardToCombat(copy, PileType.Hand, addedByPlayer: true);
    }
}
```

**问题**：
1. `bool _upgraded` 不会随 `CreateCard` 复制传递。新生成的 copy 的 `_upgraded = false`，所以不会无限复制。
2. 但 `CreateCard` 生成的是**未升级**的 `InvokeCard`。如果设计意图是"升级后抽 1 张"，当前实现完全偏离。
3. `bool _upgraded` 是反模式：如果卡牌被复制（如 `Dolly's Mirror`），复制体不会继承 `_upgraded`；如果卡牌被降级（某些敌人效果），`_upgraded` 不会变回 false。

**修复建议**：
```csharp
protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
{
    await InvokeCmd.Execute(ctx, this);
    if (CurrentUpgradeLevel > 0)
        await CardPileCmd.Draw(ctx, 1, Owner);
}
```

### 🟡 Bug 3：TurnSummonTracker 重置依赖 Command Stone

```csharp
// 只在 Quas/Wex/ExortCommandStone 中调用 Reset()
public override async Task BeforeCombatStart() { TurnSummonTracker.Reset(); }
public override async Task AfterPlayerTurnStart(...) { TurnSummonTracker.Reset(); }
```

**问题**：如果玩家通过事件/交易失去了 Command Stone，`TurnSummonTracker` 永远不会重置，`SummonCard` 将永久不可用。

**修复**：在 `InvokerCharacter` 或全局 combat hook 中重置，不依赖特定遗物：

```csharp
// 建议在 InvokerCharacter 中添加
public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
{
    TurnSummonTracker.Reset();
}
```

### 🟡 问题 4：Command Stone 的免费 orb 不触发 Summon 卡副作用

`CommandStoneHelper.ChooseOrb` 选择后直接 `OrbCmd.Channel<T>()`，不执行 summon 卡的格挡/伤害效果。这与注释"选择1个球追加"一致，但如果设计意图是让免费球也附带效果，需要改。

---

## 6. API 使用正误对照表

| API / 模式 | 使用者 | 用法 | 正误 | 说明 |
|-----------|--------|------|------|------|
| `DamageCmd.Attack(...).FromCard().Targeting*().Execute()` | 大量卡牌 | 标准 builder 模式 | ✅ 正确 | 与官方完全一致 |
| `PowerCmd.Apply<T>(target, amount, applier, cardSource)` | 大量卡牌 | 标准调用 | ✅ 正确 | 签名完全匹配 |
| `CreatureCmd.GainBlock(...)` | Defend 等 | 标准调用 | ✅ 正确 | |
| `CardPileCmd.Draw(ctx, n, Owner)` | 大量卡牌 | 标准调用 | ✅ 正确 | |
| `EnergyCost.SetThisTurn(0)` | ColdSnapCard | 在 `AfterCardEnteredCombat` 中调用 | ⚠️ 错误 | 应为 `SetThisCombat(0)` 或 `UpgradeBy(-1)` |
| `GD.RandRange` 计算伤害 | SunStrikeCard | 在 `OnPlay` 中随机 | ❌ 反模式 | 官方无此做法，预览与实际不符 |
| `bool _upgraded` 字段 | InvokeCard | 在 `OnPlay` 中分支 | ❌ 反模式 | 应用 `CurrentUpgradeLevel` 或 `DynamicVars` |
| `CardPileCmd.AddGeneratedCardToCombat` | AghanimsFragment | 直接生成法术 | ❌ Bug | 跳过 Retain 和 scroll slot 限制 |
| `CreatureCmd.Damage(ctx, enemies, amount, ...)` | BurningHeartPower | AOE 伤害 | ✅ 正确 | 官方 overload 存在 |
| `TryModifyEnergyCostInCombat` | GhostWalkPower | 修改攻击牌费用 | ✅ 正确 | 官方模式匹配 |
| `AfterDamageReceived` | ColdSnapPower | 受击触发 | ✅ 可用 | 但缺少 `IsPoweredAttack()` 过滤 |
| `OrbCmd.Channel<T>` | Summon 卡 / Command Stone | 追加 orb | ✅ 正确 | |

---

## 7. 修复优先级建议

| 优先级 | 任务 | 影响 |
|--------|------|------|
| **P0** | 给全部 10 个法术添加 `OnUpgrade()` | 核心玩法缺失 |
| **P0** | 修复 `AghanimsFragment` 绕过 InvokeCmd | 游戏逻辑异常 |
| **P0** | 修复 `SunStrikeCard` 随机伤害为固定值 | 反模式，预览错误 |
| **P1** | 修复 `ColdSnapCard` `SetThisTurn(0)` → `SetThisCombat(0)` 或重构 enhanced 费用逻辑 | Enhanced 卡牌跨回合失效 |
| **P1** | 修复 `InvokeCard` 升级逻辑（`bool _upgraded` → `CurrentUpgradeLevel`）| 升级不可靠 |
| **P1** | 修复 `TurnSummonTracker` 重置依赖 | 边缘情况锁死 |
| **P2** | 给 `ColdSnapPower` 加 `IsPoweredAttack()` 过滤 | 防止过度触发 |
| **P2** | 重构 `ForgeSpiritPower` 为 `PowerStackType.Single` | 消除视觉误导 |
| **P2** | 审视法术费用/数值平衡 | 部分法术（EMP、Tornado）可能过强 |

---

## 8. 附录：关键源码引用

### EnergyCost 永久减费（官方 InfernalBlade）
```csharp
protected override void OnUpgrade()
{
    base.EnergyCost.UpgradeBy(-1);  // 永久降低 base cost
}
```

### StrengthPower 允许负值
```csharp
public sealed class StrengthPower : PowerModel
{
    public override bool AllowNegative => true;
    // ...
}
```

### IntangiblePower（伤害上限为 1）
```csharp
public override decimal ModifyHpLostAfterOsty(Creature target, decimal amount, ...)
{
    if (target != base.Owner) return amount;
    return Math.Min(GetDamageCap(dealer), amount);  // 默认 cap = 1
}
```

### Counter Power 的叠加行为
```csharp
// PowerCmd.Apply<T>
if (powerModel.IsInstanced || !target.HasPower<T>())
    // 创建新实例
else
    // 已存在 → ModifyAmount 叠加到现有 Amount
```
