using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Entities.Powers;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 冰甲 — 每回合开始获得 Amount 点格挡。永久能力。
/// </summary>
public class FrostShellPower : PowerModel
{
    public override PowerType Type => PowerType.Buff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        if (player != Owner.Player) return;
        Flash();
        await CreatureCmd.GainBlock(Owner, Amount, ValueProp.Unpowered, null);
    }
}
