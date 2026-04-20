using Invoker.Scripts.Cards;
using Invoker.Scripts.Orbs;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

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
            ModelDb.Card<SummonOrbCard>(),
            ModelDb.Card<SummonWexCard>(),
            ModelDb.Card<SummonExortCard>(),
        };
        var chosen = await CardSelectCmd.FromChooseACardScreen(ctx, choices, owner, canSkip: false);
        if (chosen != null)
            CardCmd.PreviewCardPileAdd(await CardPileCmd.Add(chosen, PileType.Deck));
    }

    /// <summary>
    /// Called each turn start: choose 1 orb to channel.
    /// </summary>
    public static async Task ChooseOrb(PlayerChoiceContext ctx, Player owner)
    {
        var combat = owner.Creature.CombatState!;
        var choices = new List<CardModel>
        {
            combat.CreateCard(ModelDb.Card<SummonOrbCard>(), owner),
            combat.CreateCard(ModelDb.Card<SummonWexCard>(), owner),
            combat.CreateCard(ModelDb.Card<SummonExortCard>(), owner),
        };

        var chosen = await CardSelectCmd.FromChooseACardScreen(ctx, choices, owner, canSkip: false);

        var blockCtx = new BlockingPlayerChoiceContext();
        if (chosen is SummonOrbCard)
            await OrbCmd.Channel<QuasOrb>(blockCtx, owner);
        else if (chosen is SummonWexCard)
            await OrbCmd.Channel<WexOrb>(blockCtx, owner);
        else if (chosen is SummonExortCard)
            await OrbCmd.Channel<ExortOrb>(blockCtx, owner);
    }
}
