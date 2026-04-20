using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Powers;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 临时力量 — 本回合攻击伤害 +Amount。玩家回合结束时移除。
/// </summary>
public class TempStrengthPower : PowerModel
{
    public override PowerType Type => PowerType.Buff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    public override decimal ModifyDamageAdditive(Creature? target, decimal amount, ValueProp props, Creature? dealer, CardModel? cardSource)
    {
        if (Owner != dealer) return 0m;
        if (!props.HasFlag(ValueProp.Move) || props.HasFlag(ValueProp.Unpowered)) return 0m;
        return Amount;
    }

    public override async Task AfterTurnEnd(PlayerChoiceContext ctx, CombatSide side)
    {
        if (side != CombatSide.Player) return;
        await PowerCmd.Remove(this);
    }
}
