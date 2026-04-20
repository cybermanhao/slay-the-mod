using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Entities.Powers;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Powers;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Powers;

/// <summary>
/// 熔炉精灵 Power — 应用到熔炉精灵 Creature 身上（Owner = 精灵）。
/// Amount = 初始 HP，用于推算 DecayPerTurn（>=12 → 4，否则 3）。
/// 每玩家回合开始：攻击随机敌人 5 点 + 1 层脆弱。
/// 每玩家回合结束：精灵损失 DecayPerTurn HP（不可格挡）。
/// </summary>
public class ForgeSpiritPower : PowerModel
{
    private class Data { public int DecayPerTurn; }

    public override PowerType Type => PowerType.Buff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    protected override object InitInternalData() => new Data();

    public override Task AfterApplied(Creature? applier, CardModel? cardSource)
    {
        GetInternalData<Data>().DecayPerTurn = Amount >= 12 ? 4 : 3;
        return Task.CompletedTask;
    }

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        // Owner = 精灵 Creature；只响应精灵主人的回合
        if (Owner.PetOwner != player) return;
        if (!Owner.IsAlive) return;

        var enemies = CombatState!.HittableEnemies;
        if (enemies.Count == 0) return;

        var target = enemies[(int)GD.RandRange(0, enemies.Count - 1)];
        await CreatureCmd.Damage(ctx, target, 5m, ValueProp.Unpowered, Owner, null);
        await PowerCmd.Apply<VulnerablePower>(target, 1, Owner, null);
    }

    public override async Task AfterTurnEnd(PlayerChoiceContext ctx, CombatSide side)
    {
        if (side != CombatSide.Player) return;
        if (!Owner.IsAlive) return;
        var data = GetInternalData<Data>();
        await CreatureCmd.Damage(ctx, Owner, data.DecayPerTurn,
            ValueProp.Unpowered | ValueProp.Unblockable, null, null);
    }
}
