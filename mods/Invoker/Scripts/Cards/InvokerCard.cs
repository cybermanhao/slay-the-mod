using BaseLib.Abstracts;
using BaseLib.Extensions;
using MegaCrit.Sts2.Core.Entities.Cards;

namespace Invoker.Scripts.Cards;

/// <summary>
/// Base class for all Invoker cards. Provides automatic portrait path resolution
/// from the card's Id.Entry (e.g. INVOKER-COLD_SNAP_CARD → cold_snap.png).
/// Subclasses may override <see cref="ImageFileName"/> or <see cref="PortraitPath"/>
/// when the image name does not follow the default convention.
/// </summary>
public abstract class InvokerCard : CustomCardModel
{
    protected InvokerCard(int canonicalEnergyCost, CardType type, CardRarity rarity, TargetType targetType)
        : base(canonicalEnergyCost, type, rarity, targetType)
    {
    }

    /// <summary>
    /// Image file name without path or extension. Defaults to the Id.Entry suffix
    /// with prefix removed, lowercased, and "_card" stripped.
    /// </summary>
    protected virtual string ImageFileName =>
        Id.Entry.RemovePrefix().ToLowerInvariant().Replace("_card", "");

    public override string PortraitPath =>
        $"res://images/invoker/cards/{ImageFileName}.png";
}
