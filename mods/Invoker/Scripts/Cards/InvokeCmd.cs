using Invoker.Scripts.Orbs;
using Invoker.Scripts.Relics;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using System.Linq;

namespace Invoker.Scripts.Cards;

/// <summary>
/// Reusable Invoke mechanic. Reads current orb queue and adds the matching spell to hand.
/// Other cards that trigger Invoke should call InvokeCmd.Execute().
/// </summary>
public static class InvokeCmd
{
    /// <summary>
    /// Performs the Invoke effect for the given card owner.
    /// Respects Aghanim's Scepter (adds 2 copies instead of 1).
    /// </summary>
    public static async Task Execute(PlayerChoiceContext ctx, CardModel source)
    {
        var owner = source.Owner;
        var orbs = owner.PlayerCombatState!.OrbQueue.Orbs;
        int q = orbs.Count(o => o is QuasOrb);
        int w = orbs.Count(o => o is WexOrb);
        int e = orbs.Count(o => o is ExortOrb);

        var canonical = InvokeTable.Lookup(q, w, e);
        if (canonical == null)
        {
            Entry.Log.Warn($"InvokeCmd: no spell for q={q} w={w} e={e}");
            return;
        }

        int copies = owner.Relics.Any(r => r is AghanimsScepter) ? 2 : 1;
        for (int i = 0; i < copies; i++)
        {
            await AddSpellToHand(source.CombatState!, canonical, owner);
        }
    }

    /// <summary>
    /// Adds a single spell card to hand with Retain and scroll-slot FIFO enforcement.
    /// Shared logic used by InvokeCmd.Execute and Aghanim's Fragment.
    /// </summary>
    public static async Task AddSpellToHand(CombatState combatState, CardModel canonical, Player owner)
    {
        // Scroll slot FIFO: enforce a max of 2 spell cards in hand.
        var hand = PileType.Hand.GetPile(owner);
        var scrollsInHand = hand.Cards.OfType<SpellCardBase>().ToList();
        if (scrollsInHand.Count >= 2)
        {
            var oldest = scrollsInHand.First();
            await CardCmd.Exhaust(new BlockingPlayerChoiceContext(), oldest);
        }

        var card = combatState.CreateCard(canonical, owner);
        CardCmd.ApplyKeyword(card, CardKeyword.Retain);
        await CardPileCmd.AddGeneratedCardToCombat(card, PileType.Hand, addedByPlayer: true);
    }
}
