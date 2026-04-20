using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Powers;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 烈焰之心 — 每个敌方回合结束时对全体敌人造成 Amount 点伤害。永久能力。
/// </summary>
public class BurningHeartPower : PowerModel
{
    public override PowerType Type => PowerType.Buff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    public override async Task AfterTurnEnd(PlayerChoiceContext ctx, CombatSide side)
    {
        if (side != CombatSide.Enemy) return;
        Flash();
        await CreatureCmd.Damage(ctx, CombatState!.HittableEnemies, Amount, ValueProp.Unpowered, Owner, null);
    }
}
