using MegaCrit.Sts2.Core.Helpers;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.MonsterMoves.Intents;
using MegaCrit.Sts2.Core.MonsterMoves.MonsterMoveStateMachine;

namespace Invoker.Scripts.Monsters;

/// <summary>
/// 熔炉精灵召唤物实体。行为逻辑由 ForgeSpiritPower 处理。
/// 视觉暂用 Osty 场景占位。
/// </summary>
public sealed class ForgeSpiritMonster : MonsterModel
{
    public int InitialHp { get; set; } = 6;

    public override int MinInitialHp => InitialHp;
    public override int MaxInitialHp => InitialHp;

    public override bool HasDeathSfx => false;
    public override bool ShouldFadeAfterDeath => true;

    // 暂时借用 Osty 的视觉场景
    protected override string VisualsPath => SceneHelper.GetScenePath("creature_visuals/osty");

    protected override MonsterMoveStateMachine GenerateMoveStateMachine()
    {
        var idle = new MoveState("IDLE", _ => Task.CompletedTask, new HiddenIntent());
        idle.FollowUpState = idle;
        return new MonsterMoveStateMachine(new[] { idle }, idle);
    }
}
