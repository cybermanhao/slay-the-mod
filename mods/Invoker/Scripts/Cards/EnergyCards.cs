using System;
using System.Linq;
using BaseLib.Utils;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Localization.DynamicVars;

namespace Invoker.Scripts.Cards;

// ═══════════════════════════════════════════════════
// 能量卡 — Energy Cards
// ═══════════════════════════════════════════════════

/// <summary>
/// 原初之炎 — Common Skill: 消耗。获得 1 [energy]。召唤 1 个随机元素球。
/// Upgrade: 获得 2 [energy]。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class PrimalSparkCard : InvokerCard
{
    protected override string ImageFileName => "primal_spark";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new EnergyVar(1)];
    public override IEnumerable<CardKeyword> CanonicalKeywords => [CardKeyword.Exhaust];

    public PrimalSparkCard() : base(0, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await PlayerCmd.GainEnergy(DynamicVars.Energy.IntValue, Owner);
        switch (Random.Shared.Next(3))
        {
            case 0: await OrbCmd.Channel<QuasOrb>(ctx, Owner); break;
            case 1: await OrbCmd.Channel<WexOrb>(ctx, Owner); break;
            default: await OrbCmd.Channel<ExortOrb>(ctx, Owner); break;
        }
    }

    protected override void OnUpgrade() => DynamicVars.Energy.UpgradeValueBy(1m);
}

/// <summary>
/// 法球放电 — Uncommon Skill: 消耗。获得等于法球槽中法球数量的 [energy]（最多 3）。
/// Upgrade: 不再消耗。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class OrbDischargeCard : InvokerCard
{
    protected override string ImageFileName => "orb_discharge";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [CardKeyword.Exhaust];

    public OrbDischargeCard() : base(0, CardType.Skill, CardRarity.Uncommon, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int orbCount = Owner.PlayerCombatState!.OrbQueue.Orbs.Count;
        if (orbCount > 0)
            await PlayerCmd.GainEnergy(Math.Min(orbCount, 3), Owner);
    }

    protected override void OnUpgrade() => RemoveKeyword(CardKeyword.Exhaust);
}

/// <summary>
/// 奥能导管 — Uncommon Skill: 获得等于你法球槽中不同元素球种类数量的 [energy]（0-3）。
/// Upgrade: 费用降为 0。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class ArcaneConduitCard : InvokerCard
{
    protected override string ImageFileName => "arcane_conduit";

    public ArcaneConduitCard() : base(1, CardType.Skill, CardRarity.Uncommon, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int distinct = Owner.PlayerCombatState!.OrbQueue.Orbs
            .Select(o => o.GetType())
            .Distinct()
            .Count();
        if (distinct > 0)
            await PlayerCmd.GainEnergy(distinct, Owner);
    }

    protected override void OnUpgrade() => EnergyCost.UpgradeBy(-1);
}

/// <summary>
/// 祈唤冲势 — Rare Skill: 消耗。获得 3 [energy]。抽 2 张牌。
/// Upgrade: 获得 4 [energy]。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class InvokeRushCard : InvokerCard
{
    protected override string ImageFileName => "invoke_rush";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new EnergyVar(3), new CardsVar(2)];
    public override IEnumerable<CardKeyword> CanonicalKeywords => [CardKeyword.Exhaust];

    public InvokeRushCard() : base(0, CardType.Skill, CardRarity.Rare, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await PlayerCmd.GainEnergy(DynamicVars.Energy.IntValue, Owner);
        await CardPileCmd.Draw(ctx, (int)DynamicVars.Cards.BaseValue, Owner);
    }

    protected override void OnUpgrade() => DynamicVars.Energy.UpgradeValueBy(1m);
}
