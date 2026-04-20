using BaseLib.Abstracts;
using BaseLib.Utils;
using BookWitch.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace BookWitch.Scripts.Cards;

[Pool(typeof(BookWitchCardPool))]
public class KnowledgeShield : CustomCardModel
{
    public override string PortraitPath => "res://bookwitch/cards/knowledgeshield.png";

    public KnowledgeShield() : base(1, CardType.Skill, CardRarity.Common, TargetType.Self) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CreatureCmd.GainBlock(Owner.Creature, 5, ValueProp.Move, cardPlay);
    }

    protected override void OnUpgrade() { }
}
