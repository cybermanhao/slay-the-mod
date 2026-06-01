using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;
using MegaCrit.Sts2.Core.Entities.Powers;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 急速冷却 aura（施加在敌人身上）：
/// 每次该敌人受到任意伤害时，叠加 Amount 层冻结。
/// 与灼伤 DoT 协同：灼伤每回合触发 → 冷却读取 → 自动叠冻结。
/// 玩家回合结束时移除。
/// </summary>
public class ColdSnapPower : InvokerPower
{
    public override PowerType Type => PowerType.Debuff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    public override async Task AfterDamageReceived(
        PlayerChoiceContext ctx, Creature target, DamageResult result,
        ValueProp props, Creature? dealer, CardModel? cardSource)
    {
        if (target != Owner) return;
        if (result.TotalDamage <= 0) return;
        Flash();
        await PowerCmd.Apply<FrozenPower>(ctx, new[] { Owner }, Amount, dealer, cardSource);
    }

    public override async Task AfterSideTurnEnd(PlayerChoiceContext ctx, CombatSide side, IEnumerable<Creature> participants)
    {
        if (side != CombatSide.Player) return;
        await PowerCmd.Remove(this);
    }
}
