using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

using MegaCrit.Sts2.Core.Entities.Powers;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 幽灵漫步：下一个玩家回合中，攻击牌费用变为 99（无法打出）。
    /// </summary>
public class GhostWalkPower : InvokerPower
{
    private class Data { public bool IsActive; }

    public override PowerType Type => PowerType.Debuff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    protected override object InitInternalData() => new Data();

    public override Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        if (player.Creature != Owner) return Task.CompletedTask;
        GetInternalData<Data>().IsActive = true;
        return Task.CompletedTask;
    }

    public override bool TryModifyEnergyCostInCombat(CardModel card, decimal originalCost, out decimal modifiedCost)
    {
        modifiedCost = originalCost;
        if (!GetInternalData<Data>().IsActive) return false;
        if (card.Owner?.Creature != Owner) return false;
        if (card.Type != CardType.Attack) return false;
        modifiedCost = 99;
        return true;
    }

    public override async Task AfterSideTurnEnd(PlayerChoiceContext ctx, CombatSide side, IEnumerable<Creature> participants)
    {
        if (side != CombatSide.Player) return;
        if (!GetInternalData<Data>().IsActive) return;
        await PowerCmd.Remove(this);
    }
}
