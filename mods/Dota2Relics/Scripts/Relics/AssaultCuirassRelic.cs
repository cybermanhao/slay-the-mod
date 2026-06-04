using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BaseLib.Utils;
using DotaRelics.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.HoverTips;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models.Powers;
using MegaCrit.Sts2.Core.ValueProps;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 突击胸甲 — Rare. 战斗开始时，获得 8 点格挡，并对所有敌人施加 2 层虚弱。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class AssaultCuirassRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Rare;

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new BlockVar(8m, ValueProp.Unpowered),
        new PowerVar<WeakPower>(2m),
    ];
    protected override IEnumerable<IHoverTip> ExtraHoverTips => [
        HoverTipFactory.Static(StaticHoverTip.Block),
        HoverTipFactory.FromPower<WeakPower>(),
    ];

    public override async Task BeforeCombatStart()
    {
        var ctx = new BlockingPlayerChoiceContext();
        var enemies = Owner.Creature.CombatState.HittableEnemies;
        Flash();
        await CreatureCmd.GainBlock(Owner.Creature, DynamicVars.Block, null);
        if (enemies.Count > 0)
            await PowerCmd.Apply<WeakPower>(ctx, enemies, DynamicVars["WeakPower"].BaseValue, Owner.Creature, null);
    }
}
