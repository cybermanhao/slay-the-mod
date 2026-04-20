using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;

namespace Invoker.Scripts.Orbs;

/// <summary>
/// Quas (Q) orb — passive display only.
/// No channeled effect or evoke effect; purely tracks Q count for InvokeTable.
/// </summary>
public class QuasOrb : OrbModel
{
    // Required abstract properties — these orbs are display-only, values are 0
    public override decimal PassiveVal => 0m;
    public override decimal EvokeVal => 0m;
    public override Color DarkenedColor => new Color(0.2f, 0.5f, 0.9f); // ice blue

    // No passive trigger (called at turn end by the orb system)
    public override Task Passive(PlayerChoiceContext choiceContext, Creature? target)
        => Task.CompletedTask;

    // No evoke effect (called when orb is evicted from full queue)
    public override Task<IEnumerable<Creature>> Evoke(PlayerChoiceContext playerChoiceContext)
        => Task.FromResult((IEnumerable<Creature>)Array.Empty<Creature>());
}
