# STS2 核心机制探索

## 卡牌关键词

| 关键词 | 描述 | 代码使用 |
|--------|------|----------|
| **Exhaust** | 打出后移除直到战斗结束 | `AddKeyword(CardKeyword.Exhaust)` |
| **Ethereal** | 回合结束若在手牌中则消耗 | 系统自动处理 |
| **Innate** | 每次战斗开始时在手牌中 | 系统自动处理 |
| **Retain** | 保留的卡牌不会在回合结束时丢弃 | `AddKeyword(CardKeyword.Retain)` |
| **Sly** | 在回合结束前从手牌丢弃则免费触发 | 系统自动处理 |
| **Eternal** | 不能从牌组中移除或转化 | 系统自动处理 |
| **Unplayable** | 无法打出的卡牌 | 系统自动处理 |

## 卡牌关键词实现示例

```csharp
// 添加关键词
public class MyCard : CustomCardModel
{
    public MyCard() : base(1, CardType.Attack, CardRarity.Uncommon, TargetType.AnyEnemy)
    {
        AddKeyword(CardKeyword.Exhaust);      // 消耗
        AddKeyword(CardKeyword.Retain);     // 保留
        AddKeyword(CardKeyword.Innate);     // 固有
    }
}
```

## 战斗状态效果

| 效果 | 描述 |
|------|------|
| **Vulnerable** | 受到的伤害+50% |
| **Weak** | 造成的伤害-25% |
| **Frail** | 受到的伤害+25% |
| **Regenerate** | 每回合回复生命 |
| **Plated Armor** | 每回合获得护甲 |

## Hover 提示系统 (Tooltip)

游戏使用 `IHoverTip` 接口实现悬停提示。

### 核心接口

```csharp
public interface IHoverTip
{
    string Id { get; }
    bool IsSmart { get; }
    bool IsDebuff { get; }
    bool IsInstanced { get; }
    AbstractModel? CanonicalModel { get; }
}
```

### HoverTipFactory 工厂类

| 方法 | 用途 |
|------|------|
| `FromKeyword(CardKeyword)` | 从关键词创建提示 |
| `FromPower<T>()` | 从 Power 创建提示 |
| `FromCard<T>()` | 从卡牌创建提示 |
| `FromRelic<T>()` | 从遗物创建提示 |
| `FromOrb<T>()` | 从球创建提示 |
| `Static(StaticHoverTip, vars)` | 创建静态提示 |

### StaticHoverTip 枚举 (内置静态提示)

| 值 | 用途 |
|----|------|
| Channeling | 充能 |
| Evoke | 触发 |
| Block | 护甲 |
| Energy | 能量 |
| Stun | 眩晕 |
| SummonStatic/Dynamic | 召唤 |
| Transform |  transform |
| CardReward | 卡牌奖励 |

### 关键词 Hover 提示生成

```csharp
// CardKeywordExtensions.cs
public static LocString GetTitle(this CardKeyword keyword)
    => new LocString("card_keywords", keyword.GetLocKeyPrefix() + ".title");

public static LocString GetDescription(this CardKeyword keyword)
    => new LocString("card_keywords", keyword.GetLocKeyPrefix() + ".description");
```

本地化路径: `LocString("card_keywords", "exhaust.title")`

### 悬停显示机制 (你说的"递归解释")

Creature 类的 `HoverTips` 属性收集所有 powers 的 hover tips：

```csharp
public IEnumerable<IHoverTip> HoverTips
{
    get
    {
        List<IHoverTip> list = new List<IHoverTip>();
        foreach (var power in Powers)
        {
            IEnumerable<IHoverTip> hoverTips = power.HoverTips;
            foreach (IHoverTip item in hoverTips)
                list.Add(item);
        }
        return IHoverTip.RemoveDupes(list); // 去重
    }
}
```

**递归解释**: 当 hover 显示卡牌/power 时，系统会收集所有相关 IHoverTip 并合并显示。如：
- 一张卡有关键词 "Exhaust" → 显示 Exhaust 的 hover
- 一个生物有 power "Vulnerable" → 显示 Vulnerable 的 hover
- 多个同类去重，保留最相关的

## 待探索机制

### 1. 费用相关
- [ ] 0 cost 机制
- [ ] X cost（可变费用）
- [ ] 能量获取/消耗

### 2. 目标相关
- [ ] SingleEnemy / AllEnemies / RandomEnemy
- [ ] Self 目标
- [ ] 条件目标

### 3. 抽牌相关
- [ ] Drawpile 操作
- [ ] Discardpile 操作
- [ ] Exhaustpile 操作

### 4. 遗物触发
- [ ] OnBattleStart
- [ ] OnCardPlayed
- [ ] OnTurnStart / OnTurnEnd
- [ ] OnAttacked / OnDamaged

### 5. 特殊机制
- [ ] Block（护甲）
- [ ] Artifact（免疫负面效果）
- [ ] Lock（锁定效果）
- [ ] Powers 堆叠

## 优先级探索计划

| 优先级 | 机制 | 理由 |
|--------|------|------|
| P1 | **Retain** | Invoker 的 Invoke 卡需要保留在手牌 |
| P2 | **Exhaust** | 很多法术需要消耗 |
| P3 | **Innate** | 核心机制 |
| P4 | **Vulnerable/Weak** | 最常用的战斗效果 |
| P5 | **能量机制** | 卡牌费用系统 |
