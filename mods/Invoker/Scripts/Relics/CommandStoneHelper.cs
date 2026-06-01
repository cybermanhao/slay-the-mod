using Invoker.Scripts.Cards;
using Invoker.Scripts.Orbs;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

using MegaCrit.Sts2.Core.Entities.Relics;

namespace Invoker.Scripts.Relics;

/// <summary>
/// Shared logic for all Command Stones.
/// </summary>
public static class CommandStoneHelper
{
    /// <summary>
    /// Called on run start: show 3 summon cards, add chosen one to deck.
    /// </summary>
    public static async Task ChooseStarterSummon(Player owner)
    {
        var ctx = new BlockingPlayerChoiceContext();
        var choices = new List<CardModel>
        {
            ModelDb.Card<SummonQuasCard>(),
            ModelDb.Card<SummonWexCard>(),
            ModelDb.Card<SummonExortCard>(),
        };
        var chosen = await CardSelectCmd.FromChooseACardScreen(ctx, choices, owner, canSkip: false);
        if (chosen != null)
            CardCmd.PreviewCardPileAdd(await CardPileCmd.Add(chosen, PileType.Deck));
    }

    /// <summary>
    /// Called each turn start: add an Ethereal SummonCard to hand.
    /// The player plays it manually to choose and channel an orb.
    /// </summary>
    public static async Task AddSummonCardToHand(PlayerChoiceContext ctx, Player owner)
    {
        var combat = owner.Creature.CombatState!;
        await InvokeCmd.AddSpellToHand((CombatState)combat, ModelDb.Card<SummonCard>(), owner, ethereal: true);
    }
}
