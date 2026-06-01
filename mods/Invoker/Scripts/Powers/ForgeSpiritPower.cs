using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Powers;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Monsters;
using MegaCrit.Sts2.Core.Nodes.Combat;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.ValueProps;
using Invoker.Scripts.Monsters;

namespace Invoker.Scripts.Powers;

public class ForgeSpiritPower : InvokerPower
{
    public override PowerType Type => PowerType.Buff;
    public override PowerStackType StackType => PowerStackType.Counter;
    public override bool ShouldReceiveCombatHooks => true;

    private int _attackDamage = 5;

    public override async Task AfterApplied(Creature? applier, CardModel? cardSource)
    {
        var monster = Owner.Monster as ForgeSpiritMonster;
        _attackDamage = monster?.AttackDamage ?? 5;

        // Use OstyScaleToSize to position the spirit next to the player.
        // This uses hardcoded Osty.MinOffset/MaxOffset instead of Bounds.Size
        // (which is 0 before layout completes), so it works reliably.
        var tree = (SceneTree)Engine.GetMainLoop();
        await tree.ToSignal(tree, SceneTree.SignalName.ProcessFrame);

        var room = NCombatRoom.Instance;
        if (room == null) return;
        var spiritNode = room.GetCreatureNode(Owner);
        if (spiritNode == null || !GodotObject.IsInstanceValid(spiritNode)) return;

        // Index among non-Osty pets of this player (for stacking multiple spirits)
        var player = Owner.PetOwner;
        if (player == null) return;
        var nonOstyPets = player.Creature.Pets
            .Where(p => p.IsAlive && p.Monster is not Osty)
            .ToList();
        int petIndex = nonOstyPets.IndexOf(Owner);

        // Base position: same as OstyScaleToSize but offset right for each extra spirit
        var playerNode = room.GetCreatureNode(player.Creature);
        if (playerNode == null || !GodotObject.IsInstanceValid(playerNode)) return;
        var baseOffset = NCreature.GetOstyOffsetFromPlayer(Owner);
        var extraOffset = new Vector2(petIndex * 80f, 0f);
        spiritNode.Position = playerNode.Position + baseOffset + extraOffset;
    }

    public override async Task AfterSideTurnEnd(PlayerChoiceContext ctx, CombatSide side, IEnumerable<Creature> participants)
    {
        if (side != CombatSide.Player) return;
        if (!Owner.IsAlive) return;
        if (Owner.PetOwner == null) return;

        var enemies = CombatState!.HittableEnemies;
        if (enemies.Count > 0)
        {
            var target = enemies[(int)GD.RandRange(0, enemies.Count - 1)];
            await CreatureCmd.Damage(ctx, target, _attackDamage, ValueProp.Unpowered, Owner, null);
            if (target.IsAlive)
                await PowerCmd.Apply<ScorchedPower>(ctx, new[] { target }, 1m, Owner, null);
        }

        if (Amount <= 1)
            await CreatureCmd.Damage(ctx, Owner, 99999, ValueProp.Unpowered | ValueProp.Unblockable, null, null);
        else
            await PowerCmd.TickDownDuration(this);
    }
}
