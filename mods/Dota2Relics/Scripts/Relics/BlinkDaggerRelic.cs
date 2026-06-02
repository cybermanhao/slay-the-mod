using System.Collections.Generic;
using System.Threading.Tasks;
using BaseLib.Utils;
using DotaRelics.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Rooms;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 闪烁匕首 — Uncommon. 战斗中首次打出技能牌时，获得 1 能量。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class BlinkDaggerRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Uncommon;

    protected override IEnumerable<DynamicVar> CanonicalVars => [new EnergyVar(1)];
    protected override IEnumerable<IHoverTip> ExtraHoverTips => [HoverTipFactory.ForEnergy(this)];

    private bool _triggered;

    public override async Task AfterCardPlayed(PlayerChoiceContext context, CardPlay cardPlay)
    {
        if (cardPlay.Card.Owner != Owner) return;
        if (_triggered) return;
        if (cardPlay.Card.Type != CardType.Skill) return;
        _triggered = true;
        Flash();
        await PlayerCmd.GainEnergy(DynamicVars.Energy.IntValue, Owner);
    }

    public override Task AfterCombatEnd(CombatRoom _)
    {
        _triggered = false;
        Status = RelicStatus.Normal;
        return Task.CompletedTask;
    }
}
