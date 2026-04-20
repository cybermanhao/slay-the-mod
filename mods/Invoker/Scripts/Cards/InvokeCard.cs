using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Keywords;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace Invoker.Scripts.Cards;

/// <summary>
/// Invoke — 0-cost starter card. Reads current orb queue and adds the matching spell to hand.
/// With Aghanim's Scepter, adds 2 copies. See InvokeCmd for reusable logic.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class InvokeCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/invoke.png";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke];

    private bool _upgraded;

    public InvokeCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await InvokeCmd.Execute(ctx, this);
        if (_upgraded)
        {
            var copy = Owner.Creature.CombatState.CreateCard(ModelDb.Card<InvokeCard>(), Owner);
            await CardPileCmd.AddGeneratedCardToCombat(copy, PileType.Hand, addedByPlayer: true);
        }
    }

    protected override void OnUpgrade() => _upgraded = true;
}
