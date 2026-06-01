using MegaCrit.Sts2.Core.Helpers;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.MonsterMoves.Intents;
using MegaCrit.Sts2.Core.MonsterMoves.MonsterMoveStateMachine;

namespace Invoker.Scripts.Monsters;

public sealed class ForgeSpiritMonster : MonsterModel
{
    public int InitialHp    { get; set; } = 6;
    public int TurnsRemaining { get; set; } = 3;
    public int AttackDamage { get; set; } = 5;

    public override int MinInitialHp => InitialHp;
    public override int MaxInitialHp => InitialHp;

    public override bool HasDeathSfx => false;
    public override bool ShouldFadeAfterDeath => true;

    protected override string VisualsPath => SceneHelper.GetScenePath("creature_visuals/osty");

    protected override MonsterMoveStateMachine GenerateMoveStateMachine()
    {
        var idle = new MoveState("IDLE", _ => Task.CompletedTask, new HiddenIntent());
        idle.FollowUpState = idle;
        return new MonsterMoveStateMachine(new[] { idle }, idle);
    }
}
