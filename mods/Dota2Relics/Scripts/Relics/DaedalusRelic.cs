using System.Collections.Generic;
using System.Threading.Tasks;
using BaseLib.Utils;
using DotaRelics.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models.Powers;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 代达罗斯 — Uncommon. 战斗开始时，获得 3 层力量。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class DaedalusRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Uncommon;

    protected override IEnumerable<DynamicVar> CanonicalVars => [new PowerVar<StrengthPower>(3m)];
    protected override IEnumerable<IHoverTip> ExtraHoverTips => [HoverTipFactory.FromPower<StrengthPower>()];

    public override async Task BeforeCombatStart()
    {
        var ctx = new BlockingPlayerChoiceContext();
        Flash();
        await PowerCmd.Apply<StrengthPower>(ctx, new[] { Owner.Creature }, DynamicVars["StrengthPower"].BaseValue, Owner.Creature, null);
    }
}
