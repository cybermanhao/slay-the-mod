using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace Invoker.Scripts.Orbs;

/// <summary>
/// Wex (W) orb — passive display only.
/// No channeled effect or evoke effect; purely tracks W count for InvokeTable.
/// </summary>
public class WexOrb : OrbModel
{
    public override decimal PassiveVal => 0m;
    public override decimal EvokeVal => 0m;
    public override Color DarkenedColor => new Color(0.7f, 0.5f, 0.9f); // lightning purple

    public override Task Passive(PlayerChoiceContext choiceContext, Creature? target)
        => Task.CompletedTask;

    public override Task<IEnumerable<Creature>> Evoke(PlayerChoiceContext playerChoiceContext)
        => Task.FromResult((IEnumerable<Creature>)Array.Empty<Creature>());
}
