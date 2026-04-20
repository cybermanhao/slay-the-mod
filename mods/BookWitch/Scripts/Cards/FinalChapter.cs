using BaseLib.Abstracts;
using BaseLib.Utils;
using BookWitch.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace BookWitch.Scripts.Cards;

[Pool(typeof(BookWitchCardPool))]
public class FinalChapter : CustomCardModel
{
    public override string PortraitPath => "res://bookwitch/cards/finalchapter.png";

    public FinalChapter() : base(3, CardType.Attack, CardRarity.Rare, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(15)
            .FromCard(this)
            .Targeting(cardPlay.Target)
            .WithHitFx("vfx/vfx_attack_slash")
            .Execute(ctx);

        // Exhaust - add to exhaust pile (CardPileCmd.Exhaust doesn't exist in current API)
        // await CardPileCmd.Exhaust(ctx, 1, Owner);
    }

    protected override void OnUpgrade() { }
}
