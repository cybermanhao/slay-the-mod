using BaseLib.Utils;
using Invoker.Scripts.Cards;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Combat;

using MegaCrit.Sts2.Core.Entities.Relics;

namespace Invoker.Scripts.Relics;

/// <summary>
/// ❄️ Quas Command Stone �?starts with QQQ. Each turn, choose 1 orb to channel. Enhances QQ* spells.
/// </summary>
[Pool(typeof(InvokerRelicPool))]
public class QuasCommandStone : InvokerRelic
{
    public override RelicRarity Rarity => RelicRarity.Starter;

    public static bool Enhances(int q, int w, int e) =>
        (q == 3 && w == 0 && e == 0) ||
        (q == 2 && w == 1 && e == 0) ||
        (q == 2 && w == 0 && e == 1);

    public override async Task BeforeCombatStart()
    {
        var ctx = new BlockingPlayerChoiceContext();
        await OrbCmd.Channel<QuasOrb>(ctx, Owner);
        await OrbCmd.Channel<QuasOrb>(ctx, Owner);
        await OrbCmd.Channel<QuasOrb>(ctx, Owner);
        TurnSummonTracker.Reset(null);
    }

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        if (player != Owner) return;
        TurnSummonTracker.Reset((CombatState?)player.Creature.CombatState);
        Flash();
        await CommandStoneHelper.AddSummonCardToHand(ctx, Owner);
    }
}
