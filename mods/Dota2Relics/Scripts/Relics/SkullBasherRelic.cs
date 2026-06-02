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
using MegaCrit.Sts2.Core.Models.Powers;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 颅击 — Uncommon. 每次打出攻击牌后，对目标施加 1 层虚弱。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class SkullBasherRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Uncommon;

    protected override IEnumerable<DynamicVar> CanonicalVars => [new PowerVar<WeakPower>(1m)];
    protected override IEnumerable<IHoverTip> ExtraHoverTips => [HoverTipFactory.FromPower<WeakPower>()];

    public override async Task AfterCardPlayed(PlayerChoiceContext context, CardPlay cardPlay)
    {
        if (cardPlay.Card.Owner != Owner) return;
        if (cardPlay.Card.Type != CardType.Attack) return;
        if (cardPlay.Target == null) return;
        Flash();
        await PowerCmd.Apply<WeakPower>(context, new[] { cardPlay.Target! }, DynamicVars["WeakPower"].BaseValue, Owner.Creature, null);
    }
}
