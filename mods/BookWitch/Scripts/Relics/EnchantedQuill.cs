using BaseLib.Abstracts;
using BaseLib.Utils;
using BookWitch.Scripts.Pools;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace BookWitch.Scripts.Relics;

[Pool(typeof(BookWitchRelicPool))]
public class EnchantedQuill : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Common;
    public override string PackedIconPath => "res://bookwitch/relics/enchantedquill.png";
    protected override string PackedIconOutlinePath => PackedIconPath;
    protected override string BigIconPath => PackedIconPath;

    public override async Task AfterCardDrawn(PlayerChoiceContext ctx, CardModel card, bool fromHandDraw)
    {
    }
}
