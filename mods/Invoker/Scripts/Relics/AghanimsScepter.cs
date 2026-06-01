using BaseLib.Utils;
using Invoker.Scripts.Pools;

using MegaCrit.Sts2.Core.Entities.Relics;

namespace Invoker.Scripts.Relics;

/// <summary>
/// Aghanim's Scepter â€?Rare relic.
/// When InvokeCard is played, generate 2 spell cards instead of 1.
/// InvokeCard checks Owner.Relics for this relic directly.
/// </summary>
[Pool(typeof(InvokerRelicPool))]
public class AghanimsScepter : InvokerRelic
{
    public override RelicRarity Rarity => RelicRarity.Rare;
}
