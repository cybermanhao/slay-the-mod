# STS2 技术机制参考 — Invoker Mod 专用

> 本文档记录 Invoker Mod 开发中涉及的 STS2 + BaseLib 关键技术点，供后续维护和扩展参考。

---

## 目录

1. [自定义关键词注册](#自定义关键词注册)
2. [DynamicVar 系统](#dynamicvar-系统)
3. [卡牌生命周期钩子](#卡牌生命周期钩子)
4. [Power 系统](#power-系统)
5. [费用修改机制](#费用修改机制)
6. [宠物（Pet）系统](#宠物pet系统)
7. [球（Orb）系统](#球orb系统)
8. [Harmony Patch](#harmony-patch)
9. [常用 API 速查](#常用-api-速查)

---

## 自定义关键词注册

BaseLib 提供 `[CustomEnum]` 属性自动注册自定义 `CardKeyword`：

```csharp
public static class InvokerKeywords
{
    [CustomEnum]
    public static CardKeyword Scroll;   // ID: INVOKER-SCROLL

    [CustomEnum]
    public static CardKeyword Invoke;   // ID: INVOKER-INVOKE
}
```

- 内部 ID 格式：`INVOKER-{fieldName}`（大写）
- 本地化 key：`INVOKER-SCROLL.title` / `INVOKER-SCROLL.description`
- 注册时机：`Entry.Init()` 中 `ScriptManagerBridge.LookupScriptsInAssembly()` 自动扫描

---

## DynamicVar 系统

### 定义 CanonicalVars

```csharp
protected override IEnumerable<DynamicVar> CanonicalVars =>
    [new DamageVar(10m, ValueProp.Move), new CardsVar(1)];
```

### 内置变量类型

| 类型 | 用途 | 访问方式 |
|------|------|----------|
| `DamageVar` | 伤害数值 | `DynamicVars.Damage` |
| `BlockVar` | 格挡数值 | `DynamicVars.Block` |
| `CardsVar` | 抽牌数量 | `DynamicVars.Cards` |
| `PowerVar<T>` | Power 层数 | `DynamicVars.Vulnerable` / `DynamicVars.Weak` 等 |

### 自定义键值变量

```csharp
protected override IEnumerable<DynamicVar> CanonicalVars =>
    [new DynamicVar("SpiritHp", 6m)];

// 访问
int hp = (int)DynamicVars["SpiritHp"].BaseValue;

// 升级
protected override void OnUpgrade() => DynamicVars["SpiritHp"].UpgradeValueBy(6);
```

### 升级语义

```csharp
// 增加基础值（永久）
DynamicVars.Damage.UpgradeValueBy(4m);

// 减少费用（永久）
EnergyCost.UpgradeBy(-1);

// 本战斗内费用修改
EnergyCost.SetThisCombat(0);

// 本回合内费用修改
EnergyCost.SetThisTurn(0);
```

---

## 卡牌生命周期钩子

### 打出时

```csharp
protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
{
    // ctx: 玩家选择上下文
    // cardPlay: 包含目标等信息
}
```

### 进入战斗时

```csharp
public override Task AfterCardEnteredCombat(CardModel card)
{
    // 可用于根据状态动态修改费用等
    if (card == this && IsEnhanced())
        EnergyCost.SetThisCombat(0);
    return Task.CompletedTask;
}
```

### 升级时

```csharp
protected override void OnUpgrade()
{
    // 修改 DynamicVars 或添加关键词
}
```

---

## Power 系统

### 基础结构

```csharp
public class MyPower : PowerModel
{
    public override PowerType Type => PowerType.Buff;      // Buff / Debuff
    public override PowerStackType StackType => PowerStackType.Counter; // Single / Counter
    public override bool ShouldReceiveCombatHooks => true;  // 必须设为 true 才能接收钩子

    // 回合结束触发
    public override async Task AfterTurnEnd(PlayerChoiceContext ctx, CombatSide side)
    {
        if (side != CombatSide.Player) return;
        await PowerCmd.Remove(this);  // 自我移除
    }
}
```

### 伤害加成钩子

```csharp
public override decimal ModifyDamageAdditive(Creature? target, decimal amount, ValueProp props, Creature? dealer, CardModel? cardSource)
{
    if (Owner != dealer) return 0m;
    if (!props.HasFlag(ValueProp.Move) || props.HasFlag(ValueProp.Unpowered)) return 0m;
    return Amount;
}
```

### 费用修改钩子

```csharp
public override bool TryModifyEnergyCostInCombat(CardModel card, decimal originalCost, out decimal modifiedCost)
{
    modifiedCost = originalCost;
    if (card.Type != CardType.Attack) return false;
    modifiedCost = 99;
    return true;
}
```

### 内部数据存储

用于 Power 需要存储额外状态（非 Amount）的场景：

```csharp
public class ForgeSpiritPower : PowerModel
{
    private class Data { public int DecayPerTurn; }

    protected override object InitInternalData() => new Data();

    public override Task AfterApplied(Creature? applier, CardModel? cardSource)
    {
        GetInternalData<Data>().DecayPerTurn = 3;
        return Task.CompletedTask;
    }
}
```

---

## 费用修改机制

### 三种费用修改方式对比

| 方式 | 方法 | 持续时间 | 适用场景 |
|------|------|----------|----------|
| **永久升级** | `EnergyCost.UpgradeBy(n)` | 永久 | `OnUpgrade()` 中修改基础费用 |
| **本战斗** | `EnergyCost.SetThisCombat(n)` | 当前战斗 | 增强效果（如 Cold Snap 石头增强变 0费） |
| **本回合** | `EnergyCost.SetThisTurn(n)` | 当前回合 | 临时减费（不推荐与 Retain 共用） |

### 注意事项

- `SetThisTurn(0)` 在 Retain 牌上会导致**下回合费用恢复为原值**，与玩家预期不符
- `SetThisCombat(0)` 配合 Retain 可以让牌在整个战斗中保持 0费

---

## 宠物（Pet）系统

### 创建宠物

```csharp
// 1. 创建 MonsterModel（ToMutable 获取可变副本）
var spirit = (ForgeSpiritMonster)ModelDb.Monster<ForgeSpiritMonster>().ToMutable();
spirit.InitialHp = hp;

// 2. 在战斗中创建 Creature
var pet = CombatState!.CreateCreature(spirit, Owner.Creature.Side, null);

// 3. 添加为玩家的宠物
await PlayerCmd.AddPet(pet, Owner);

// 4. （可选）添加 DieForYouPower 让宠物替主人承伤
await PowerCmd.Apply<DieForYouPower>(pet, 1, Owner.Creature, this);
```

### 宠物行为驱动

宠物的行为通过挂在它自己身上的 `PowerModel` 实现（如 `ForgeSpiritPower`）：

```csharp
public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
{
    // Owner 是宠物 Creature，PetOwner 是玩家
    if (Owner.PetOwner != player) return;
    if (!Owner.IsAlive) return;
    // ... 执行攻击等逻辑
}
```

---

## 球（Orb）系统

### 自定义 Orb

```csharp
public class QuasOrb : OrbModel
{
    public override decimal PassiveVal => 0m;   // 被动数值（展示用）
    public override decimal EvokeVal => 0m;     // 触发数值（展示用）
    public override Color DarkenedColor => new Color(0.2f, 0.5f, 0.9f);

    public override Task Passive(PlayerChoiceContext choiceContext, Creature? target)
        => Task.CompletedTask;  // 回合结束触发（当前为空）

    public override Task<IEnumerable<Creature>> Evoke(PlayerChoiceContext playerChoiceContext)
        => Task.FromResult((IEnumerable<Creature>)Array.Empty<Creature>());  // 被挤出时触发（当前为空）
}
```

### Channel 球

```csharp
await OrbCmd.Channel<QuasOrb>(ctx, owner);
```

### 读取当前球队列

```csharp
var orbs = owner.PlayerCombatState!.OrbQueue.Orbs;
int q = orbs.Count(o => o is QuasOrb);
int w = orbs.Count(o => o is WexOrb);
int e = orbs.Count(o => o is ExortOrb);
```

---

## Harmony Patch

### Entry 初始化

```csharp
public static void Init()
{
    ScriptManagerBridge.LookupScriptsInAssembly(typeof(Entry).Assembly);
    new Harmony("com.invoker.mod").PatchAll(typeof(Entry).Assembly);
}
```

当前项目中没有显式定义 Harmony Patch 类（所有逻辑通过 BaseLib 的抽象类和 STS2 钩子实现）。

---

## 常用 API 速查

### 伤害

```csharp
// 单体伤害
await DamageCmd.Attack(dmg).FromCard(this).Targeting(target).Execute(ctx);

// AOE 伤害
await DamageCmd.Attack(dmg).FromCard(this).TargetingAllOpponents(combatState).Execute(ctx);

// 随机目标伤害
await DamageCmd.Attack(dmg).FromCard(this).TargetingRandomOpponents(combatState).Execute(ctx);

// 多目标伤害（如 BurningHeartPower）
await CreatureCmd.Damage(ctx, enemies, amount, ValueProp.Unpowered, Owner, null);
```

### 格挡

```csharp
await CreatureCmd.GainBlock(Owner.Creature, amount, ValueProp.Move, cardPlay);
```

### Power

```csharp
// 施加 Power
await PowerCmd.Apply<WeakPower>(target, 1, Owner.Creature, this);

// 移除自身
await PowerCmd.Remove(this);
```

### 抽牌

```csharp
await CardPileCmd.Draw(ctx, count, Owner);
```

### 生成卡牌到手牌

```csharp
var card = combatState.CreateCard(canonical, owner);
CardCmd.ApplyKeyword(card, CardKeyword.Retain);
await CardPileCmd.AddGeneratedCardToCombat(card, PileType.Hand, addedByPlayer: true);
```

### Exhaust 卡牌

```csharp
await CardCmd.Exhaust(new BlockingPlayerChoiceContext(), card);
```

### 选择界面

```csharp
var choices = new List<CardModel> { card1, card2, card3 };
var chosen = await CardSelectCmd.FromChooseACardScreen(ctx, choices, owner, canSkip: false);
```

---

## 命名约定

| 类型 | 命名模式 | 示例 |
|------|----------|------|
| 卡牌类 | `{Name}Card` | `ColdSnapCard`, `SummonOrbCard` |
| Power 类 | `{Name}Power` | `ColdSnapPower`, `GhostWalkPower` |
| 遗物类 | `{Name}` | `AghanimsScepter`, `QuasCommandStone` |
| Monster 类 | `{Name}Monster` | `ForgeSpiritMonster` |
| 本地化 key | `INVOKER-{UPPER_SNAKE}.title` | `INVOKER-COLD_SNAP_CARD.title` |
| Power 本地化 key | `{UPPER_SNAKE}_POWER.title` | `COLD_SNAP_POWER.title` |
