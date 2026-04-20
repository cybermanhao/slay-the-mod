# 小智（Ash）角色设计文档

**日期**：2026-03-17
**游戏**：杀戮尖塔 2
**状态**：待实现

---

## 一、角色概述

小智是一名神奇宝贝大师，携带三只宝可梦参与冒险。

**核心差异化机制**：
- 玩家本体没有 HP，敌人攻击目标是**当前在场宝可梦**
- 三只宝可梦全部昏厥 = 游戏失败
- 卡牌效果根据在场宝可梦动态变化

---

## 二、宝可梦系统

### 2.1 三只宝可梦（固定）

| 物种（Species） | 进化链（EvolutionStage 0→1→2） | 进化等级 | 定位 |
|----------------|-------------------------------|----------|------|
| Bulbasaur | 妙蛙种子→妙蛙草（Lv16）→妙蛙花（Lv32） | 16 / 32 | 持续伤害/毒 |
| Charmander | 小火龙→火恐龙（Lv16）→喷火龙（Lv36） | 16 / 36 | 爆发伤害 |
| Squirtle | 杰尼龟→卡咪龟（Lv16）→水箭龟（Lv36） | 16 / 36 | 防御反击 |

**注意**：`PokemonSpecies` 枚举只有 3 个值（`Bulbasaur / Charmander / Squirtle`），进化形态完全由 `EvolutionStage`（0/1/2）表达，不另建枚举。所有卡牌分支和限定条件均基于 `Species` 判断，天然覆盖全进化链。

### 2.2 宝可梦数据结构

每只宝可梦独立维护以下属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| HP / MaxHP | int | 独立血量 |
| 力量（Strength） | int | 提升技能伤害（同尖塔机制） |
| 敏捷（Agility） | int | 提升格挡值 |
| EXP | int | 当前经验值 |
| Level | int | 当前等级（初始1） |
| EvolutionStage | int | 进化阶段 0/1/2 |
| IsFainted | bool | 是否昏厥 |

### 2.3 经验与升级

- **战斗结算**：每场战斗结束，**战斗结束时处于上场位置**的宝可梦获得 `楼层数 × 10` 经验
- **经验糖果**：作为药水存在，使用后立即给予当前在场宝可梦固定经验值（MVP后实现）
- **升级**：经验满后自动升级，升级提升力量/敏捷（每级 +1，按物种倾向：Bulbasaur↑敏捷，Charmander↑力量，Squirtle↑敏捷/力量交替）
- **进化**：达到进化等级时 MaxHP 增加，属性全面提升，当前 HP 按比例换算：`newHp = floor(currentHp / oldMaxHp * newMaxHp)`，最低保留 1

### 2.4 昏厥与复活规则

- **昏厥**：HP 降至 0，标记为 `PendingFaint = true`（不在伤害钩子中立即处理，见 §4.3）
- **换精灵时机**：在当次攻击动画结束后的安全异步节点触发换精灵选择 UI
- **后备定义**：以**战斗结束时是否处于上场位置**为准。中途昏厥并被换下的宝可梦算"后备"
- **复活**：下场战斗 `BeforeCombatStart` 时，昏厥宝可梦以 **1 HP** 复活
- **后备回血**：每场战斗结束，不在上场位置的宝可梦回复 **10 HP**（含中途昏厥换下的）
- **失败条件**：同一场战斗中三只宝可梦全部昏厥

---

## 三、卡牌系统

### 3.1 通用训练师卡

| 卡牌 | 费用 | 效果 |
|------|------|------|
| 换精灵 | 1 | 切换在场宝可梦（选择一只存活的后备宝可梦上场） |
| 坚持住 | 1 | 给当前宝可梦增加格挡（值受敏捷加成） |

### 3.2 自适应卡（根据在场宝可梦触发不同效果）

#### 精灵技（1费）

| 在场宝可梦 | 效果 |
|------------|------|
| 妙蛙系 | 寄生种子：对敌人施加持续中毒/流血效果 |
| 小火龙系 | 火焰冲击：造成高额单体伤害 |
| 杰尼龟系 | 水枪防御：先给宝可梦加格挡，下回合自动攻击 |

#### 必杀技（2费）

| 在场宝可梦 | 效果 |
|------------|------|
| 妙蛙系 | 太阳光束：蓄力1回合后造成大量伤害 |
| 小火龙系 | 喷射火焰：连续造成3次伤害 |
| 杰尼龟系 | 水炮：造成伤害并清除敌人所有格挡 |

### 3.3 限定卡（仅特定宝可梦在场可打出）

| 卡牌 | 限定条件 | 费用 | 效果 |
|------|----------|------|------|
| 藤鞭 | 妙蛙系在场 | 1 | 打两次低伤害 |
| 火花 | 小火龙系在场 | 1 | 伤害 + 眩晕敌人1回合 |
| 缩壳 | 杰尼龟系在场 | 1 | 大量格挡 + 格挡期间反伤 |

---

## 四、技术实现方案

### 4.0 MVP 前置验证（Spike）

**实现任何功能前必须先完成此步骤。**

核心机制的可行性依赖一个未经验证的假设：`PowerModel.BeforeDamageReceived` 的 `DamageResult` 参数是引用类型且可修改（将伤害值置零）。

**验证方式**：
1. 用 ILSpy 打开 `sts2.dll`，找到 `PowerModel` 类，查看 `BeforeDamageReceived` 的真实方法签名
2. 确认 `DamageResult` 是 class（引用）还是 struct（值类型）
3. 写一个最简测试 Power，尝试在钩子中将伤害修改为 0，运行游戏验证效果

**备选方案（若 BeforeDamageReceived 无法置零）**：改用 Harmony Prefix Patch 拦截伤害执行方法（`DoDamage` 或 `DamageBlockInternal`）。

---

### 4.1 整体方案：PowerModel 钩子 + 少量 Harmony Patch

**核心思路**：在战斗开始时给小智施加一个持久的 `PokemonTrainerPower`，利用游戏内置的 `PowerModel` 钩子系统接管伤害逻辑和回合事件。仅对无法通过钩子覆盖的逻辑（如强制换精灵流程）使用 Harmony Patch。

**多人模式**：MVP 不支持多人，`PokemonState` 绑定到 `Player` 实例（而非静态类），为后续多人支持预留实例化路径。

**选择 PowerModel 而非纯 Harmony 的理由**：
- `BeforeDamageReceived` 钩子天然支持拦截伤害，无需破坏原始调用链
- `AfterPlayerTurnStart` / `AfterTurnEnd` / `AfterCombatEnd` 等钩子覆盖所有需要的时机
- 更符合游戏架构，与其他 Mod 兼容性更好

### 4.2 状态管理

`PokemonState` 是绑定到 `Player` 实例的对象（非静态），由 `PokemonTrainerPower` 持有，通过 `Power` 的生命周期与战斗绑定，跨战斗持久化由 Mod 存档系统负责（MVP 阶段暂存内存）。

```
PokemonState（实例类，绑定到 Player）
├── ActiveIndex: int            // 当前在场宝可梦下标（0/1/2）
├── Team: PokemonData[3]        // 三只宝可梦数据
│   └── PokemonData：
│       ├── Species: PokemonSpecies  // Bulbasaur / Charmander / Squirtle（3个值）
│       ├── HP / MaxHP: int
│       ├── Strength: int            // 影响技能伤害
│       ├── Agility: int             // 影响格挡值
│       ├── EXP / Level: int
│       ├── EvolutionStage: int      // 0/1/2（进化阶段，独立于 Species）
│       ├── IsFainted: bool          // 本场战斗是否昏厥
│       └── PendingFaint: bool       // 待处理的昏厥（等待安全时机执行换精灵）
├── IsInBattle: bool
└── 方法：Switch() / TriggerFaint() / HealBenched() / AddExp() / CheckLevelUp()
```

### 4.3 PokemonTrainerPower（核心）

战斗开始时通过 `BeforeCombatStart` 自动施加，永不过期。持有 `PokemonState` 实例引用。

```csharp
public class PokemonTrainerPower : PowerModel
{
    // ⚠️ 需 Spike 验证：DamageResult 是否可修改
    // 拦截打到玩家的伤害 → 重定向到宝可梦（仅设标志，不在此处发起 UI）
    public override async Task BeforeDamageReceived(
        PlayerChoiceContext ctx, DamageResult damageResult)
    {
        // 将伤害量扣在宝可梦 HP 上
        // 将 damageResult 的伤害值置零（阻止原始 HP 扣减）
        // 若宝可梦 HP <= 0：设置 PendingFaint = true，不在此处 await 任何 UI
    }

    // 每回合开始：处理待昏厥换精灵 + 结算延迟效果
    public override async Task AfterPlayerTurnStart(
        PlayerChoiceContext ctx, Player player)
    {
        // 若有 PendingFaint：await 换精灵选择 UI（此处是安全的异步节点）
        // 若全部昏厥：触发失败
        // 结算杰尼龟"下回合攻击"延迟效果
        // 将宝可梦力量/敏捷同步到玩家力量/敏捷状态（用于卡牌数值计算）
    }

    // 每回合结束：结算持续效果
    public override async Task AfterTurnEnd(
        PlayerChoiceContext ctx, CombatSide side)
    {
        // 若是玩家回合结束：
        //   结算寄生种子持续伤害（妙蛙系）
        //   结算蓄力中的必杀技（妙蛙系太阳光束）
    }

    // 战斗结束结算（同时监听胜利和非胜利结束）
    public override async Task AfterCombatVictory(PlayerChoiceContext ctx)
        => await OnCombatEnd(ctx);

    public override async Task AfterCombatEnd(PlayerChoiceContext ctx)
        => await OnCombatEnd(ctx);

    private async Task OnCombatEnd(PlayerChoiceContext ctx)
    {
        // 后备宝可梦（含中途昏厥换下的）各 +10 HP
        // 战斗结束时在场宝可梦获得经验（楼层 × 10）
        // 检查升级/进化（按比例换算 HP）
        // 昏厥宝可梦重置为"下场1HP复活"状态
    }

    // 战斗开始：昏厥宝可梦1HP复活
    public override async Task BeforeCombatStart(PlayerChoiceContext ctx)
    {
        // 将上场战斗昏厥的宝可梦 HP 设为 1，IsFainted = false
    }
}
```

### 4.4 伤害重定向逻辑（修订版）

昏厥处理分两步，避免在伤害钩子中发起 UI 交互：

```
【步骤1 - BeforeDamageReceived】
    ↓
目标是当前玩家？
    ↓ 是
当前宝可梦 HP -= 伤害量
原伤害置零（玩家 HP 不变）
    ↓
宝可梦 HP <= 0？
    ├── 否：结束
    └── 是：PendingFaint = true（标记，不处理 UI）

【步骤2 - AfterPlayerTurnStart（下回合开始时）】
    ↓
PendingFaint == true？
    ├── 否：继续
    └── 是：PendingFaint = false
            还有存活宝可梦？
            ├── 是：await 换精灵选择 UI
            └── 否：触发游戏失败
```

**注意**：昏厥后玩家在当前回合剩余时间内仍可出牌，但宝可梦 HP 已为 0。可考虑在昏厥瞬间立即禁止出牌直到换精灵完成（通过 `AreCardActionsAllowed` patch 实现）。

### 4.5 自适应卡牌实现

```csharp
public abstract class AdaptivePokemonCard : AshCardModel
{
    protected override async Task OnPlay(
        PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        // Species 只有3个值，天然覆盖全进化链
        await PokemonState.Active.Species switch
        {
            PokemonSpecies.Bulbasaur  => OnPlayBulbasaur(ctx, cardPlay),
            PokemonSpecies.Charmander => OnPlayCharmander(ctx, cardPlay),
            PokemonSpecies.Squirtle   => OnPlaySquirtle(ctx, cardPlay),
            _ => Task.CompletedTask
        };
    }

    protected abstract Task OnPlayBulbasaur(PlayerChoiceContext ctx, CardPlay cardPlay);
    protected abstract Task OnPlayCharmander(PlayerChoiceContext ctx, CardPlay cardPlay);
    protected abstract Task OnPlaySquirtle(PlayerChoiceContext ctx, CardPlay cardPlay);
}
```

### 4.6 限定卡打出条件

```csharp
public class VineWhipCard : AshCardModel
{
    // Species = Bulbasaur 即代表全进化链（妙蛙种子/草/花）
    public override UnplayableReason GetUnplayableReason(...)
    {
        if (PokemonState.Active?.Species is not PokemonSpecies.Bulbasaur)
            return UnplayableReason.Custom;
        return base.GetUnplayableReason(...);
    }
}
```

### 4.7 玩家 HP 处理策略（MVP 前置决定）

小智本体没有实际 HP，但框架要求 `StartingHp` 必须存在。方案：

- `StartingHp = 9999`（实际不会被扣到）
- `PokemonTrainerPower.BeforeDamageReceived` 确保所有打玩家的伤害被重定向，玩家本体 HP 永远不变
- HP 栏：MVP 阶段暂时保留原版 HP 栏（显示 9999），后续替换为宝可梦 HP 显示

### 4.8 遗物/药水/事件与 HP 兼容问题

游戏中大量遗物、药水、事件依赖玩家 HP 逻辑。小智 HP 固定 9999 会导致行为异常。

| 类型 | 处理方式 |
|------|----------|
| 治疗类（鬼火壶等） | Patch `AfterHpChanged`，重定向为治疗当前宝可梦 HP |
| HP 上限增加（圣甲虫蛋等） | Patch `AfterModifyingHpLostBeforeOsty` 等，重定向到宝可梦 MaxHP |
| 基于 HP 百分比的效果 | MVP 阶段标注为已知问题，暂不处理 |
| 死亡相关遗物（白兽等） | `DisableDeathCheckPatch` 阻止原版死亡判定干扰昏厥逻辑 |

### 4.9 文件结构

**MVP 文件：**
```
Scripts/
├── Entry.cs
├── Characters/AshCharacter.cs
├── Pools/AshCardPool.cs / AshRelicPool.cs / AshPotionPool.cs
├── Pokemon/
│   ├── PokemonData.cs
│   ├── PokemonSpecies.cs          # enum：3个值
│   ├── PokemonState.cs            # 实例类，绑定 Player
│   └── PokemonEvolution.cs
├── Powers/PokemonTrainerPower.cs  # 核心：伤害拦截 + 所有回合钩子
├── Cards/
│   ├── AshCardModel.cs
│   ├── AdaptivePokemonCard.cs
│   ├── SwitchPokemonCard.cs
│   ├── HoldOnCard.cs
│   └── PokemonMoveCard.cs
└── Patches/
    ├── HpRedirectPatch.cs         # 治疗/HP事件重定向（遗物/药水兼容）
    └── DisableDeathCheckPatch.cs  # 阻止原版死亡判定
```

**完整版新增文件（MVP 后迭代）：**
```
Scripts/
├── Cards/
│   ├── UltimateMoveCard.cs
│   ├── VineWhipCard.cs / EmberCard.cs / WithdrawCard.cs
│   └── ExpCandyPotion.cs
└── UI/PokemonHpDisplay.cs
```

---

## 五、第一版实现范围（MVP）

**前置（编码前必做）**：Spike 验证 `BeforeDamageReceived` 是否可置零伤害（§4.0）

1. 搭建人物框架（AshCharacter + 三池子，`StartingHp = 9999`）
2. PokemonData / PokemonState / PokemonSpecies 核心数据层
3. PokemonTrainerPower（伤害拦截 + 回合钩子）
4. DisableDeathCheckPatch（阻止原版死亡判定）
5. 昏厥（PendingFaint）/ 换精灵流程 / 全灭失败
6. HpRedirectPatch（治疗/HP事件基本兼容）
7. 换精灵卡 + 坚持住卡
8. 精灵技（自适应三分支）
9. 战斗结算：后备回血 + 经验获取 + 升级检查

**暂不实现（后续迭代）**：
- 进化动画/视觉
- 必杀技 / 限定卡（藤鞭/火花/缩壳）
- 经验糖果药水
- 自定义人物立绘/能量表盘/宝可梦 HP 显示 UI

---

## 六、已知限制

- **多人不支持**：MVP 不实现多人，`PokemonState` 已预留实例化路径
- **HP 百分比遗物行为异常**：如腐蚀、基于 HP 触发类遗物，MVP 阶段不修复
- **逃跑不给经验**：有意为之，与 `AfterCombatVictory` 范围一致
- **经验只给在场宝可梦**：可能导致后备等级滞后，MVP 后评估是否需要分配机制
