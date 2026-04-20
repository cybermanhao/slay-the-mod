using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Cards;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;

namespace Invoker.Scripts.Relics;

/// <summary>
/// ⚡ Wex Command Stone — starts with WWW. Each turn, choose 1 orb to channel. Enhances W** spells.
/// </summary>
[Pool(typeof(InvokerRelicPool))]
public class WexCommandStone : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Starter;
    public override string PackedIconPath => $"res://images/invoker/relics/{Id.Entry.ToLowerInvariant()}.png";
    protected override string PackedIconOutlinePath => PackedIconPath;
    protected override string BigIconPath => PackedIconPath;

    public static bool Enhances(int q, int w, int e) =>
        (q == 1 && w == 2 && e == 0) ||
        (q == 0 && w == 3 && e == 0) ||
        (q == 0 && w == 2 && e == 1);

    public override async Task BeforeCombatStart()
    {
        var ctx = new BlockingPlayerChoiceContext();
        await OrbCmd.Channel<WexOrb>(ctx, Owner);
        await OrbCmd.Channel<WexOrb>(ctx, Owner);
        await OrbCmd.Channel<WexOrb>(ctx, Owner);
        TurnSummonTracker.Reset(null);
    }

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        if (player != Owner) return;
        TurnSummonTracker.Reset(player.Creature.CombatState);
        Flash();
        await CommandStoneHelper.ChooseOrb(ctx, Owner);
    }
}
