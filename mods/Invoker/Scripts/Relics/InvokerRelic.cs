using BaseLib.Abstracts;
using MegaCrit.Sts2.Core.Entities.Relics;

namespace Invoker.Scripts.Relics;

/// <summary>
/// Base class for all Invoker relics. Automatically derives icon paths from the relic's Id.
/// </summary>
public abstract class InvokerRelic : CustomRelicModel
{
    /// <summary>
    /// Icon path: res://images/invoker/relics/{lowercase Id.Entry}.png
    /// </summary>
    public override string PackedIconPath => $"res://images/invoker/relics/{Id.Entry.ToLowerInvariant()}.png";

    protected override string PackedIconOutlinePath => PackedIconPath;
    protected override string BigIconPath => PackedIconPath;
}
