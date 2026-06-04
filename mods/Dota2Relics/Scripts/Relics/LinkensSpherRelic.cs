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
using MegaCrit.Sts2.Core.ValueProps;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 林肯法球 — Rare. 每回合开始时，获得 5 点格挡。
/// ID: DOTARELICS-LINKENS_SPHER_RELIC (class name drives ID, keep as-is)
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class LinkensSpherRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Rare;

    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(5m, ValueProp.Unpowered)];
    protected override IEnumerable<IHoverTip> ExtraHoverTips => [HoverTipFactory.Static(StaticHoverTip.Block)];

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        if (player != Owner) return;
        Flash();
        await CreatureCmd.GainBlock(Owner.Creature, DynamicVars.Block, null);
    }
}
