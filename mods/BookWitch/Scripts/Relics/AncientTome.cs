using BaseLib.Abstracts;
using BaseLib.Utils;
using BookWitch.Scripts.Pools;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.Models;

namespace BookWitch.Scripts.Relics;

[Pool(typeof(BookWitchRelicPool))]
public class AncientTome : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Starter;
    public override string PackedIconPath => "res://bookwitch/relics/ancienttome.png";
    protected override string PackedIconOutlinePath => PackedIconPath;
    protected override string BigIconPath => PackedIconPath;

    public override async Task BeforeCombatStart()
    {
    }
}
