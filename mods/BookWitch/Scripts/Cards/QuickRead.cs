using BaseLib.Abstracts;
using BaseLib.Utils;
using BookWitch.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace BookWitch.Scripts.Cards;

[Pool(typeof(BookWitchCardPool))]
public class QuickRead : CustomCardModel
{
    public override string PortraitPath => "res://bookwitch/cards/quickread.png";

    public QuickRead() : base(0, CardType.Skill, CardRarity.Common, TargetType.Self) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CardPileCmd.Draw(ctx, 1, Owner);
    }

    protected override void OnUpgrade() { }
}
