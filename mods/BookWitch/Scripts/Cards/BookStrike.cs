using BaseLib.Abstracts;
using BaseLib.Utils;
using BookWitch.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace BookWitch.Scripts.Cards;

[Pool(typeof(BookWitchCardPool))]
public class BookStrike : CustomCardModel
{
    public override string PortraitPath => "res://bookwitch/cards/bookstrike.png";

    public BookStrike() : base(1, CardType.Attack, CardRarity.Common, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(6)
            .FromCard(this)
            .Targeting(cardPlay.Target)
            .WithHitFx("vfx/vfx_attack_slash")
            .Execute(ctx);
    }

    protected override void OnUpgrade() { }
}
