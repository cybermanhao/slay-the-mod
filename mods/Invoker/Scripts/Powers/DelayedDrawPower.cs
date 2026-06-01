using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Entities.Powers;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 余波抽牌：下回合开始时抽 Amount 张牌，然后移除自身。
/// 由超震声波等牌施加给玩家。
/// </summary>
public class DelayedDrawPower : InvokerPower
{
    public override PowerType Type => PowerType.Buff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        if (player.Creature != Owner) return;
        await CardPileCmd.Draw(ctx, (int)Amount, player);
        await PowerCmd.Remove(this);
    }
}
