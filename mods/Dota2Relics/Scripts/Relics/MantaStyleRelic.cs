using System.Collections.Generic;
using System.Threading.Tasks;
using BaseLib.Utils;
using DotaRelics.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Rooms;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization.DynamicVars;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 曼陀罗 — Uncommon. 每打出 3 张非攻击牌，获得 1 [energy]。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class MantaStyleRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Uncommon;
    public override bool ShowCounter => true;

    protected override IEnumerable<DynamicVar> CanonicalVars => [new EnergyVar(1)];

    private int _counter;
    private const int Threshold = 3;

    public override int DisplayAmount => Threshold - (_counter % Threshold);

    public override async Task AfterCardPlayed(PlayerChoiceContext context, CardPlay cardPlay)
    {
        if (cardPlay.Card.Owner != Owner) return;
        if (cardPlay.Card.Type == CardType.Attack) return;
        _counter++;
        Status = DisplayAmount == 1 ? RelicStatus.Active : RelicStatus.Normal;
        if (_counter % Threshold != 0) return;
        Flash();
        await PlayerCmd.GainEnergy(DynamicVars.Energy.IntValue, Owner);
    }

    public override Task AfterCombatEnd(CombatRoom _)
    {
        _counter = 0;
        Status = RelicStatus.Normal;
        return Task.CompletedTask;
    }
}
