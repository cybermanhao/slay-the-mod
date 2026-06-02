using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BaseLib.Utils;
using DotaRelics.Scripts.Pools;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Combat.History.Entries;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Rooms;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 刷新球 — Rare. 战斗中首次消耗一张牌后，获得 2 能量。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class RefresherOrbRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Rare;

    protected override IEnumerable<DynamicVar> CanonicalVars => [new EnergyVar(2)];
    protected override IEnumerable<IHoverTip> ExtraHoverTips => [HoverTipFactory.ForEnergy(this), HoverTipFactory.FromKeyword(CardKeyword.Exhaust)];

    private bool _triggered;

    public override async Task AfterCardPlayed(PlayerChoiceContext context, CardPlay cardPlay)
    {
        if (cardPlay.Card.Owner != Owner) return;
        if (_triggered) return;
        bool exhaustedThisPlay = CombatManager.Instance.History.Entries
            .OfType<CardExhaustedEntry>()
            .Any(e => e.HappenedThisTurn(Owner.Creature.CombatState) && e.Card.Owner == Owner);
        if (!exhaustedThisPlay) return;
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
