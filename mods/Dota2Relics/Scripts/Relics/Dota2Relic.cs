using BaseLib.Abstracts;

namespace DotaRelics.Scripts.Relics;

/// <summary>
/// Base class for all Dota2 relics. Icon paths: res://images/dota2relics/relics/{lowercase id}.png
/// </summary>
public abstract class Dota2Relic : CustomRelicModel
{
    public override string PackedIconPath => $"res://images/dota2relics/relics/{Id.Entry.ToLowerInvariant()}.png";
    protected override string PackedIconOutlinePath => PackedIconPath;
    protected override string BigIconPath => PackedIconPath;
}
