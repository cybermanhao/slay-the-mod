using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Cards;

/// <summary>
/// Summon Quas (Q) — 0-cost starter. Channels a Quas orb; gains block scaling with Q count.
/// Block = base + 4×(Quas orbs already in queue before channeling).
/// Once per turn per orb type.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SummonOrbCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/summon_quas.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(8m, ValueProp.Move)];

    public SummonOrbCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.None)
    {
    }

    protected override async Task OnPlay(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
        var combatState = CombatState!;
        if (TurnSummonTracker.HasSummoned(OrbSummonType.Quas, combatState))
            return;

        int quasCount = Owner.PlayerCombatState!.OrbQueue.Orbs.Count(o => o is QuasOrb);
        decimal blockAmount = DynamicVars.Block.BaseValue + 4m * quasCount;

        await OrbCmd.Channel<QuasOrb>(choiceContext, Owner);
        await CreatureCmd.GainBlock(Owner.Creature, blockAmount, ValueProp.Move, cardPlay);

        TurnSummonTracker.MarkSummoned(OrbSummonType.Quas);
    }

    /// <summary>
    /// Shared effect logic used by SummonCard (the 3-in-1 starter).
    /// </summary>
    public static async Task PlayQuasEffect(PlayerChoiceContext ctx, CardPlay cardPlay, Player owner, CombatState combatState, decimal blockBase)
    {
        if (TurnSummonTracker.HasSummoned(OrbSummonType.Quas, combatState))
            return;

        int quasCount = owner.PlayerCombatState!.OrbQueue.Orbs.Count(o => o is QuasOrb);
        await OrbCmd.Channel<QuasOrb>(ctx, owner);
        await CreatureCmd.GainBlock(owner.Creature, blockBase + 4m * quasCount, ValueProp.Move, cardPlay);
        TurnSummonTracker.MarkSummoned(OrbSummonType.Quas);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(4m);
}

/// <summary>
/// Summon Wex (W) — 0-cost starter. Channels a Wex orb; deals damage to a random enemy.
/// Once per turn per orb type.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SummonWexCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/summon_wex.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(5m, ValueProp.Move)];

    public SummonWexCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.None)
    {
    }

    protected override async Task OnPlay(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
        var combatState = CombatState!;
        if (TurnSummonTracker.HasSummoned(OrbSummonType.Wex, combatState))
            return;

        await OrbCmd.Channel<WexOrb>(choiceContext, Owner);
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).TargetingRandomOpponents(combatState).Execute(choiceContext);

        TurnSummonTracker.MarkSummoned(OrbSummonType.Wex);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(3m);

    /// <summary>
    /// Shared effect logic used by SummonCard (the 3-in-1 starter).
    /// </summary>
    public static async Task PlayWexEffect(PlayerChoiceContext ctx, Player owner, CombatState combatState, decimal damage, CardModel source)
    {
        if (TurnSummonTracker.HasSummoned(OrbSummonType.Wex, combatState))
            return;

        await OrbCmd.Channel<WexOrb>(ctx, owner);
        await DamageCmd.Attack(damage).FromCard(source).TargetingRandomOpponents(combatState).Execute(ctx);
        TurnSummonTracker.MarkSummoned(OrbSummonType.Wex);
    }
}

/// <summary>
/// Summon Exort (E) — 0-cost starter. Channels an Exort orb; deals damage to all enemies.
/// Once per turn per orb type.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SummonExortCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/summon_exort.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(3m, ValueProp.Move)];

    public SummonExortCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.AllEnemies)
    {
    }

    protected override async Task OnPlay(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
        var combatState = CombatState!;
        if (TurnSummonTracker.HasSummoned(OrbSummonType.Exort, combatState))
            return;

        await OrbCmd.Channel<ExortOrb>(choiceContext, Owner);
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).TargetingAllOpponents(combatState).Execute(choiceContext);

        TurnSummonTracker.MarkSummoned(OrbSummonType.Exort);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(2m);

    /// <summary>
    /// Shared effect logic used by SummonCard (the 3-in-1 starter).
    /// </summary>
    public static async Task PlayExortEffect(PlayerChoiceContext ctx, Player owner, CombatState combatState, decimal damage, CardModel source)
    {
        if (TurnSummonTracker.HasSummoned(OrbSummonType.Exort, combatState))
            return;

        await OrbCmd.Channel<ExortOrb>(ctx, owner);
        await DamageCmd.Attack(damage).FromCard(source).TargetingAllOpponents(combatState).Execute(ctx);
        TurnSummonTracker.MarkSummoned(OrbSummonType.Exort);
    }
}

/// <summary>
/// 三合一召唤牌 — 打出时选择冰/雷/火，执行对应效果。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SummonCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/summon_quas.png";

    public SummonCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
        var choices = new List<CardModel>
        {
            CombatState!.CreateCard(ModelDb.Card<SummonOrbCard>(), Owner),
            CombatState!.CreateCard(ModelDb.Card<SummonWexCard>(), Owner),
            CombatState!.CreateCard(ModelDb.Card<SummonExortCard>(), Owner),
        };
        var chosen = await CardSelectCmd.FromChooseACardScreen(choiceContext, choices, Owner, canSkip: false);

        if (chosen is SummonOrbCard)
        {
            decimal blockBase = ModelDb.Card<SummonOrbCard>().DynamicVars.Block.BaseValue;
            await SummonOrbCard.PlayQuasEffect(choiceContext, cardPlay, Owner, CombatState!, blockBase);
        }
        else if (chosen is SummonWexCard)
        {
            decimal dmg = ModelDb.Card<SummonWexCard>().DynamicVars.Damage.BaseValue;
            await SummonWexCard.PlayWexEffect(choiceContext, Owner, CombatState!, dmg, this);
        }
        else if (chosen is SummonExortCard)
        {
            decimal dmg = ModelDb.Card<SummonExortCard>().DynamicVars.Damage.BaseValue;
            await SummonExortCard.PlayExortEffect(choiceContext, Owner, CombatState!, dmg, this);
        }
    }

    protected override void OnUpgrade() => AddKeyword(CardKeyword.Retain);
}
