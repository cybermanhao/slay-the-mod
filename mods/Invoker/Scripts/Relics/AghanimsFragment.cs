using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Cards;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Relics;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;

namespace Invoker.Scripts.Relics;

/// <summary>
/// Aghanim's Fragment (Shard) — Uncommon relic.
/// At the start of each player turn, 25% chance to add a random Invoker spell card to hand.
/// This random card is not affected by Aghanim's Scepter.
/// </summary>
[Pool(typeof(InvokerRelicPool))]
public class AghanimsFragment : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Uncommon;
    public override string PackedIconPath => $"res://images/invoker/relics/{Id.Entry.ToLowerInvariant()}.png";
    protected override string PackedIconOutlinePath => PackedIconPath;
    protected override string BigIconPath => PackedIconPath;

    private static CardModel[]? _spellPool;

    private static CardModel[] SpellPool => _spellPool ??=
    [
        ModelDb.Card<ColdSnapCard>(),
        ModelDb.Card<GhostWalkCard>(),
        ModelDb.Card<IceWallCard>(),
        ModelDb.Card<TornadoCard>(),
        ModelDb.Card<DeafeningBlastCard>(),
        ModelDb.Card<EMPCard>(),
        ModelDb.Card<AlacrityCard>(),
        ModelDb.Card<ChaosMeteorCard>(),
        ModelDb.Card<ForgeSpiritCard>(),
        ModelDb.Card<SunStrikeCard>(),
    ];

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext choiceContext, Player player)
    {
        var rng = Owner.RunState.Rng.CombatCardGeneration;
        if (rng.NextFloat() >= 0.25f)
            return;

        var canonical = rng.NextItem(SpellPool);
        if (canonical == null)
            return;

        Flash();
        var card = Owner.Creature.CombatState.CreateCard(canonical, Owner);
        await CardPileCmd.AddGeneratedCardToCombat(card, PileType.Hand, addedByPlayer: true);
    }
}
