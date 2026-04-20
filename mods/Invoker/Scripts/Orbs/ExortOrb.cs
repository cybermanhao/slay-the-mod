using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace Invoker.Scripts.Orbs;

/// <summary>
/// Exort (E) orb — passive display only.
/// No channeled effect or evoke effect; purely tracks E count for InvokeTable.
/// </summary>
public class ExortOrb : OrbModel
{
    public override decimal PassiveVal => 0m;
    public override decimal EvokeVal => 0m;
    public override Color DarkenedColor => new Color(0.9f, 0.4f, 0.1f); // fire orange

    public override Task Passive(PlayerChoiceContext choiceContext, Creature? target)
        => Task.CompletedTask;

    public override Task<IEnumerable<Creature>> Evoke(PlayerChoiceContext playerChoiceContext)
        => Task.FromResult((IEnumerable<Creature>)Array.Empty<Creature>());
}
