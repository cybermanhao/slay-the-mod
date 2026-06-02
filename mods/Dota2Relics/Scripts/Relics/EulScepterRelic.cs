using System.Collections.Generic;
using System.Threading.Tasks;
using BaseLib.Utils;
using DotaRelics.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Rooms;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 尤尔的神秘法杖 — Uncommon. 每 3 回合开始时，获得 1 额外能量。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class EulScepterRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Uncommon;
    public override bool ShowCounter => true;

    protected override IEnumerable<DynamicVar> CanonicalVars => [new EnergyVar(1), new DynamicVar("Turns", 3m)];
    protected override IEnumerable<IHoverTip> ExtraHoverTips => [HoverTipFactory.ForEnergy(this)];

    private int _turnCount;

    public override int DisplayAmount => 3 - (_turnCount % 3);

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        if (player != Owner) return;
        _turnCount++;
        Status = DisplayAmount == 1 ? RelicStatus.Active : RelicStatus.Normal;
        if (_turnCount % 3 == 0)
        {
            Flash();
            await PlayerCmd.GainEnergy(DynamicVars.Energy.IntValue, Owner);
        }
    }

    public override Task AfterCombatEnd(CombatRoom _)
    {
        Status = RelicStatus.Normal;
        return Task.CompletedTask;
    }
}
