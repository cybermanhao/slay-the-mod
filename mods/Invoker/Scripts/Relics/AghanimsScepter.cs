using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Entities.Relics;

namespace Invoker.Scripts.Relics;

/// <summary>
/// Aghanim's Scepter — Rare relic.
/// When InvokeCard is played, generate 2 spell cards instead of 1.
/// InvokeCard checks Owner.Relics for this relic directly.
/// </summary>
[Pool(typeof(InvokerRelicPool))]
public class AghanimsScepter : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Rare;
    public override string PackedIconPath => $"res://images/invoker/relics/{Id.Entry.ToLowerInvariant()}.png";
    protected override string PackedIconOutlinePath => PackedIconPath;
    protected override string BigIconPath => PackedIconPath;
}
