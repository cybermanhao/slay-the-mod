using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BaseLib.Utils;
using DotaRelics.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Rooms;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models.Powers;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 希瓦的护卫 — Rare. 每 3 回合开始时，对所有敌人施加 2 层虚弱。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class ShivasGuardRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Rare;
    public override bool ShowCounter => true;

    private int _turns;
    private const int Threshold = 3;

    public override int DisplayAmount => Threshold - (_turns % Threshold);

    protected override IEnumerable<DynamicVar> CanonicalVars => [new PowerVar<WeakPower>(2m)];
    protected override IEnumerable<IHoverTip> ExtraHoverTips => [HoverTipFactory.FromPower<WeakPower>()];

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        if (player != Owner) return;
        _turns++;
        Status = DisplayAmount == 1 ? RelicStatus.Active : RelicStatus.Normal;
        if (_turns % Threshold != 0) return;
        var enemies = Owner.Creature.CombatState.HittableEnemies;
        if (enemies.Count == 0) return;
        Flash();
        await PowerCmd.Apply<WeakPower>(ctx, enemies, DynamicVars["WeakPower"].BaseValue, Owner.Creature, null);
    }

    public override Task AfterCombatEnd(CombatRoom _)
    {
        _turns = 0;
        Status = RelicStatus.Normal;
        return Task.CompletedTask;
    }
}
