using Godot;
using BaseLib.Abstracts;
using BaseLib.Utils;

namespace Invoker.Scripts.Pools;

public class InvokerCardPool : CustomCardPoolModel
{
    public override string Title => "invoker";
    public override string EnergyColorName => "defect"; // placeholder — reuse Defect energy icon
    public override Color DeckEntryCardColor => new Color(0.2f, 0.6f, 0.9f); // icy blue
    public override bool IsColorless => false;
}
