using System.Collections.Generic;
using System.Threading.Tasks;
using BaseLib.Utils;
using DotaRelics.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Rooms;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models.Powers;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 维斯法杖 — Rare. 每次战斗中，首次打出技能牌后，对目标施加 2 层虚弱和 2 层易伤。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class ScytheOfVyseRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Rare;

    private bool _activated;

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new PowerVar<WeakPower>(2m),
        new PowerVar<VulnerablePower>(2m),
    ];
    protected override IEnumerable<IHoverTip> ExtraHoverTips => [
        HoverTipFactory.FromPower<WeakPower>(),
        HoverTipFactory.FromPower<VulnerablePower>(),
    ];

    public override async Task AfterCardPlayed(PlayerChoiceContext context, CardPlay cardPlay)
    {
        if (cardPlay.Card.Owner != Owner) return;
        if (cardPlay.Card.Type != CardType.Skill) return;
        if (cardPlay.Target == null) return;
        if (_activated) return;
        _activated = true;
        Flash();
        await PowerCmd.Apply<WeakPower>(context, new[] { cardPlay.Target! }, DynamicVars["WeakPower"].BaseValue, Owner.Creature, null);
        await PowerCmd.Apply<VulnerablePower>(context, new[] { cardPlay.Target! }, DynamicVars["VulnerablePower"].BaseValue, Owner.Creature, null);
    }

    public override Task AfterCombatEnd(CombatRoom _)
    {
        _activated = false;
        return Task.CompletedTask;
    }
}
