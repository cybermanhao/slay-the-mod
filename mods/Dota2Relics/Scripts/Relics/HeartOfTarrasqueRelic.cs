using System.Collections.Generic;
using System.Threading.Tasks;
using BaseLib.Utils;
using DotaRelics.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Rooms;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// 塔撒吉的心脏 — Rare. 获得时最大生命值 +20。战斗胜利后，恢复 4 HP。
/// </summary>
[Pool(typeof(Dota2RelicPool))]
public class HeartOfTarrasqueRelic : Dota2Relic
{
    public override RelicRarity Rarity => RelicRarity.Rare;
    public override bool HasUponPickupEffect => true;

    protected override IEnumerable<DynamicVar> CanonicalVars => [new MaxHpVar(20m), new HealVar(4m)];

    public override async Task AfterObtained()
    {
        Flash();
        await CreatureCmd.GainMaxHp(Owner.Creature, DynamicVars.MaxHp.BaseValue);
    }

    public override async Task AfterCombatVictory(CombatRoom _)
    {
        if (!Owner.Creature.IsDead)
        {
            Flash();
            await CreatureCmd.Heal(Owner.Creature, DynamicVars.Heal.BaseValue);
        }
    }
}
