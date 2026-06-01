using Godot;
using BaseLib.Abstracts;
using MegaCrit.Sts2.Core.Entities.Powers;

namespace Invoker.Scripts.Powers;

/// <summary>
/// Base class for all Invoker powers. Provides icon paths with fallback to default power icon.
/// </summary>
public abstract class InvokerPower : CustomPowerModel
{
    /// <summary>
    /// Override to change the image file name. Defaults to lowercase Id.Entry.
    /// </summary>
    protected virtual string ImageName => Id.Entry.ToLowerInvariant();

    public override string? CustomPackedIconPath
    {
        get
        {
            var path = $"res://images/invoker/powers/{ImageName}.png";
            return ResourceLoader.Exists(path) ? path : null;
        }
    }

    public override string? CustomBigIconPath
    {
        get
        {
            var path = $"res://images/invoker/powers/{ImageName}.png";
            return ResourceLoader.Exists(path) ? path : null;
        }
    }
}
