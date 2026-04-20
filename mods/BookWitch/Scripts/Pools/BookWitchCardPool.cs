using Godot;
using BaseLib.Abstracts;
using BaseLib.Utils;
using MegaCrit.Sts2.Core.Helpers;

namespace BookWitch.Scripts.Pools;

public class BookWitchCardPool : CustomCardPoolModel
{
    public override string Title => "bookwitch";
    public override string EnergyColorName => "purple";
    public override Color DeckEntryCardColor => new Color(0.5f, 0.3f, 0.8f);
    public override bool IsColorless => false;

    public override string BigEnergyIconPath => ImageHelper.GetImagePath("ui/energy/orb_energy.png");
    public override string TextEnergyIconPath => ImageHelper.GetImagePath("ui/energy/orb_energy_icon.png");
}
