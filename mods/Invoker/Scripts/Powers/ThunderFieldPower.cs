using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

using MegaCrit.Sts2.Core.Entities.Powers;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 雷场：每个玩家回合结束时对随机敌人造成 Amount 点伤害。永久能力。
    /// </summary>
public class ThunderFieldPower : InvokerPower
{
    public override PowerType Type => PowerType.Buff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    public override async Task AfterSideTurnEnd(PlayerChoiceContext ctx, CombatSide side, IEnumerable<Creature> participants)
    {
        if (side == CombatSide.Enemy) return;
        Flash();
        var target = Owner.Player!.RunState.Rng.CombatTargets.NextItem(CombatState.HittableEnemies);
        if (target != null)
            await CreatureCmd.Damage(ctx, target, Amount, ValueProp.Unpowered, Owner, null);
    }
}
