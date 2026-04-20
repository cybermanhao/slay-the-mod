using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Cards;

/// <summary>
/// Summon Quas (Q) — 0-cost starter. Channels a Quas orb; gains block scaling with Q count.
/// Block = 8 + 4×(Quas orbs already in queue before channeling).
/// Once per turn per orb type.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SummonOrbCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/summon_quas.png";

    public SummonOrbCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.None)
    {
    }

    protected override async Task OnPlay(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
        if (TurnSummonTracker.HasSummoned(OrbSummonType.Quas))
            return;

        int quasCount = Owner.PlayerCombatState!.OrbQueue.Orbs.Count(o => o is QuasOrb);
        decimal blockAmount = 8m + 4m * quasCount;

        await OrbCmd.Channel<QuasOrb>(choiceContext, Owner);
        await CreatureCmd.GainBlock(Owner.Creature, blockAmount, ValueProp.Move, cardPlay);

        TurnSummonTracker.MarkSummoned(OrbSummonType.Quas);
    }
}

/// <summary>
/// Summon Wex (W) — 0-cost starter. Channels a Wex orb; deals 5 damage to a random enemy.
/// Once per turn per orb type.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SummonWexCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/summon_wex.png";

    public SummonWexCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.None)
    {
    }

    protected override async Task OnPlay(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
        if (TurnSummonTracker.HasSummoned(OrbSummonType.Wex))
            return;

        await OrbCmd.Channel<WexOrb>(choiceContext, Owner);
        await DamageCmd.Attack(5m).FromCard(this).TargetingRandomOpponents(CombatState!).Execute(choiceContext);

        TurnSummonTracker.MarkSummoned(OrbSummonType.Wex);
    }
}

/// <summary>
/// Summon Exort (E) — 0-cost starter. Channels an Exort orb; deals 3 damage to all enemies.
/// Once per turn per orb type.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SummonExortCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/summon_exort.png";

    public SummonExortCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.AllEnemies)
    {
    }

    protected override async Task OnPlay(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
        if (TurnSummonTracker.HasSummoned(OrbSummonType.Exort))
            return;

        await OrbCmd.Channel<ExortOrb>(choiceContext, Owner);
        await DamageCmd.Attack(3m).FromCard(this).TargetingAllOpponents(CombatState!).Execute(choiceContext);

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
            if (!TurnSummonTracker.HasSummoned(OrbSummonType.Quas))
            {
                int quasCount = Owner.PlayerCombatState!.OrbQueue.Orbs.Count(o => o is QuasOrb);
                await OrbCmd.Channel<QuasOrb>(choiceContext, Owner);
                await CreatureCmd.GainBlock(Owner.Creature, 8m + 4m * quasCount, ValueProp.Move, cardPlay);
                TurnSummonTracker.MarkSummoned(OrbSummonType.Quas);
            }
        }
        else if (chosen is SummonWexCard)
        {
            if (!TurnSummonTracker.HasSummoned(OrbSummonType.Wex))
            {
                await OrbCmd.Channel<WexOrb>(choiceContext, Owner);
                await DamageCmd.Attack(5m).FromCard(this).TargetingRandomOpponents(CombatState!).Execute(choiceContext);
                TurnSummonTracker.MarkSummoned(OrbSummonType.Wex);
            }
        }
        else if (chosen is SummonExortCard)
        {
            if (!TurnSummonTracker.HasSummoned(OrbSummonType.Exort))
            {
                await OrbCmd.Channel<ExortOrb>(choiceContext, Owner);
                await DamageCmd.Attack(3m).FromCard(this).TargetingAllOpponents(CombatState!).Execute(choiceContext);
                TurnSummonTracker.MarkSummoned(OrbSummonType.Exort);
            }
        }
    }

    protected override void OnUpgrade() => AddKeyword(CardKeyword.Retain);
}
