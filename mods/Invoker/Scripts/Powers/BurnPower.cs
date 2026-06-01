using System.Collections.Generic;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Powers;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 灼伤：每敌方回合结束时造成等同于层数的伤害，然后层数-1。
/// 通用火焰 DoT debuff，混沌陨石、超震声波等多张牌使用。
/// </summary>
public class BurnPower : InvokerPower
{
    public override PowerType Type => PowerType.Debuff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    public override async Task AfterSideTurnEnd(PlayerChoiceContext ctx, CombatSide side, IEnumerable<Creature> participants)
    {
        if (side != CombatSide.Enemy) return;
        if (!Owner.IsAlive) return;

        await CreatureCmd.Damage(ctx, Owner, Amount, ValueProp.Unpowered, null, null);
        await PowerCmd.TickDownDuration(this);
    }
}
