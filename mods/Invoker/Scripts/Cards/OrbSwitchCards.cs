using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Keywords;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using Invoker.Scripts.Powers;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Cards;

// ═══════════════════════════════════════════════════
// 普通 — 基础切球卡
// ═══════════════════════════════════════════════════

/// <summary>
/// 烈焰打击 — Common Attack: 造成 7 伤害，切入一个 Exort。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class FlameStrikeCard : InvokerCard
{
    protected override string ImageFileName => "flame_burst";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(7m, ValueProp.Move)];
    public FlameStrikeCard() : base(1, CardType.Attack, CardRarity.Common, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
        await OrbCmd.Channel<ExortOrb>(ctx, Owner);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(3m);
}

/// <summary>
/// 雷思敏捷 — Common Skill: 抽 3 张牌，切入一个 Wex。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SwiftThunderCard : InvokerCard
{
    protected override string ImageFileName => "swift_mind";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new CardsVar(3)];
    public SwiftThunderCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CardPileCmd.Draw(ctx, (int)DynamicVars.Cards.BaseValue, Owner);
        await OrbCmd.Channel<WexOrb>(ctx, Owner);
    }

    protected override void OnUpgrade() => EnergyCost.UpgradeBy(-1);
}

/// <summary>
/// 寒冰护盾 — Common Skill: 获得 9 格挡，切入一个 Quas。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class IceShieldCard : InvokerCard
{
    protected override string ImageFileName => "ice_armor";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(9m, ValueProp.Move)];
    public IceShieldCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CreatureCmd.GainBlock(Owner.Creature, DynamicVars.Block.BaseValue, ValueProp.Move, cardPlay);
        await OrbCmd.Channel<QuasOrb>(ctx, Owner);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(4m);
}

// ═══════════════════════════════════════════════════
// 普通/罕见 — 固定切球 + Invoke
// ═══════════════════════════════════════════════════

/// <summary>
/// 冰脉祈唤 — Common Skill: 切入一个 Quas，进行一次祈唤。
/// 切球在祈唤之前，使新队列状态参与 Invoke。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class QuasInvokeCard : InvokerCard
{
    protected override string ImageFileName => "invoke";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke];
    public QuasInvokeCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await OrbCmd.Channel<QuasOrb>(ctx, Owner);
        await InvokeCmd.Execute(ctx, this);
    }

    protected override void OnUpgrade() => EnergyCost.UpgradeBy(-1);
}

/// <summary>
/// 雷鸣祈唤 — Uncommon Attack: 造成 5 伤害，切入一个 Wex，进行一次祈唤。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class WexInvokeCard : InvokerCard
{
    protected override string ImageFileName => "thunder_strike";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke];
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(5m, ValueProp.Move)];
    public WexInvokeCard() : base(1, CardType.Attack, CardRarity.Uncommon, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
        await OrbCmd.Channel<WexOrb>(ctx, Owner);
        await InvokeCmd.Execute(ctx, this);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(3m);
}

/// <summary>
/// 炎核祈唤 — Uncommon Skill: 对所有敌人造成 4 伤害，切入一个 Exort，进行一次祈唤。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class ExortInvokeCard : InvokerCard
{
    protected override string ImageFileName => "fireball";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke];
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(4m, ValueProp.Move)];
    public ExortInvokeCard() : base(1, CardType.Skill, CardRarity.Uncommon, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
        await OrbCmd.Channel<ExortOrb>(ctx, Owner);
        await InvokeCmd.Execute(ctx, this);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(2m);
}

// ═══════════════════════════════════════════════════
// 罕见/稀有 — 自选切球 & 终局
// ═══════════════════════════════════════════════════

/// <summary>
/// 元素调谐 — Uncommon Skill: 自选切入一个球，切入两次。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class ElementalTuneCard : InvokerCard
{
    protected override string ImageFileName => "invoke";
    public ElementalTuneCard() : base(1, CardType.Skill, CardRarity.Uncommon, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await InvokeCmd.ChannelChosenOrb(ctx, this, count: 2);
    }

    protected override void OnUpgrade() => AddKeyword(CardKeyword.Retain);
}

/// <summary>
/// 天命一击 — Rare Attack: 造成 11 伤害，进行一次祈唤。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class FateStrikeCard : InvokerCard
{
    protected override string ImageFileName => "strike_invoker";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke];
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(11m, ValueProp.Move)];
    public FateStrikeCard() : base(1, CardType.Attack, CardRarity.Rare, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
        await InvokeCmd.Execute(ctx, this);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(4m);
}

/// <summary>
/// 自选祈唤 — Rare Skill: 自选切入一个球，进行一次祈唤，抽 1 张牌。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class OrbInvokeCard : InvokerCard
{
    protected override string ImageFileName => "invoke";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke];
    public OrbInvokeCard() : base(1, CardType.Skill, CardRarity.Rare, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await InvokeCmd.ChannelChosenOrb(ctx, this, count: 1);
        await InvokeCmd.Execute(ctx, this);
        await CardPileCmd.Draw(ctx, 1, Owner);
    }

    protected override void OnUpgrade() => EnergyCost.UpgradeBy(-1);
}
