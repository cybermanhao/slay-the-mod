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
            await AddSpellToHand((CombatState)source.CombatState!, canonical, owner);
        }
    }

    /// <summary>
    /// Adds a single spell card to hand with Retain and scroll-slot FIFO enforcement.
    /// Pass ethereal=true for Command Stone generated summon cards (they vanish at turn end if unplayed).
    /// </summary>
    public static async Task AddSpellToHand(CombatState combatState, CardModel canonical, Player owner, bool ethereal = false)
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
        if (!ethereal) CardCmd.ApplyKeyword(card, CardKeyword.Retain);
        if (ethereal)  CardCmd.ApplyKeyword(card, CardKeyword.Ethereal);
        await CardPileCmd.AddGeneratedCardToCombat(card, PileType.Hand, owner);
    }

    /// <summary>
    /// Shows Quas/Wex/Exort choice screen, then channels the chosen orb <paramref name="count"/> times.
    /// Follows the same choice pattern as SummonCard.
    /// </summary>
    public static async Task ChannelChosenOrb(PlayerChoiceContext ctx, CardModel source, int count = 1)
    {
        var combat = (CombatState)source.CombatState!;
        var choices = new List<CardModel>
        {
            combat.CreateCard(ModelDb.Card<SummonQuasCard>(), source.Owner),
            combat.CreateCard(ModelDb.Card<SummonWexCard>(), source.Owner),
            combat.CreateCard(ModelDb.Card<SummonExortCard>(), source.Owner),
        };
        var chosen = await CardSelectCmd.FromChooseACardScreen(ctx, choices, source.Owner, canSkip: false);
        if (chosen == null) { Entry.Log.Warn("ChannelChosenOrb: no card chosen"); return; }

        for (int i = 0; i < count; i++)
        {
            if (chosen is SummonQuasCard)
                await OrbCmd.Channel<QuasOrb>(ctx, source.Owner);
            else if (chosen is SummonWexCard)
                await OrbCmd.Channel<WexOrb>(ctx, source.Owner);
            else if (chosen is SummonExortCard)
                await OrbCmd.Channel<ExortOrb>(ctx, source.Owner);
        }
    }
}
