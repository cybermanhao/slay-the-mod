using System.Text.Json;
using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Nodes.Rewards;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using MegaCrit.Sts2.Core.Nodes.Screens;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;
using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Nodes.Screens.ScreenContext;
using MegaCrit.Sts2.Core.Runs;

namespace DevToolMod.Game;

/// <summary>
/// Simplified game state reader
/// </summary>
public class GameStateService
{
    public GameStatePayload BuildStatePayload()
    {
        var payload = new GameStatePayload
        {
            Version = 6,
            AgentViewVersion = 1
        };

        try
        {
            payload.Screen = GetCurrentScreen();
            payload.InCombat = CombatManager.Instance.IsInProgress;

            if (payload.InCombat)
            {
                payload.Combat = GetCombatInfo();
            }

            payload.Run = GetRunInfo();
            payload.AvailableActions = GetAvailableActions();
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[GameStateService] Error: {ex.Message}");
        }

        return payload;
    }

    private string GetCurrentScreen()
    {
        try
        {
            var screen = ActiveScreenContext.Instance.GetCurrentScreen();
            if (screen == null) return "unknown";
            return screen.GetType().Name;
        }
        catch
        {
            return "unknown";
        }
    }

    private CombatPayload GetCombatInfo()
    {
        var combat = new CombatPayload();
        try
        {
            var state = CombatManager.Instance.DebugOnlyGetState();
            if (state != null)
            {
                combat.Turn = state.RoundNumber;
                combat.Player = GetPlayerPayload(state);
                combat.Enemies = GetEnemyPayloads(state);
                combat.Hand = GetHandCards(state);
                combat.Orbs = GetOrbs(state);
            }
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[GameStateService] Combat info error: {ex.Message}");
        }
        return combat;
    }

    private PlayerPayload? GetPlayerPayload(CombatState state)
    {
        var player = state.Players.FirstOrDefault();
        if (player == null) return null;

        var playerCombat = player.PlayerCombatState;
        if (playerCombat == null) return null;

        return new PlayerPayload
        {
            Health = player.Creature.CurrentHp,
            MaxHealth = player.Creature.MaxHp,
            Block = player.Creature.Block,
            Energy = playerCombat.Energy,
            MaxEnergy = playerCombat.MaxEnergy
        };
    }

    private List<EnemyPayload> GetEnemyPayloads(CombatState state)
    {
        var enemies = new List<EnemyPayload>();
        for (int i = 0; i < state.Enemies.Count; i++)
        {
            var enemy = state.Enemies[i];
            enemies.Add(new EnemyPayload
            {
                Index = i,
                Id = enemy.Monster.Id.Entry,
                Health = enemy.CurrentHp,
                MaxHealth = enemy.MaxHp,
                Block = enemy.Block
            });
        }
        return enemies;
    }

    private List<CardPayload> GetHandCards(CombatState state)
    {
        var hand = new List<CardPayload>();
        var player = state.Players.FirstOrDefault();
        if (player?.PlayerCombatState == null) return hand;

        var handPile = player.PlayerCombatState.Hand;
        for (int i = 0; i < handPile.Cards.Count; i++)
        {
            var card = handPile.Cards[i];
            hand.Add(new CardPayload
            {
                Index = i,
                CardId = card.Id.Entry,
                Name = card.Title,
                Cost = card.EnergyCost.GetResolved()
            });
        }
        return hand;
    }

    private List<OrbPayload> GetOrbs(CombatState state)
    {
        var orbs = new List<OrbPayload>();
        var player = state.Players.FirstOrDefault();
        if (player?.PlayerCombatState == null) return orbs;

        foreach (var orb in player.PlayerCombatState.OrbQueue.Orbs)
        {
            orbs.Add(new OrbPayload
            {
                Type = orb.Id.Entry,
                PassiveAmount = (int)orb.PassiveVal,
                EvokeAmount = (int)orb.EvokeVal
            });
        }
        return orbs;
    }

    private RunPayload GetRunInfo()
    {
        var run = new RunPayload();
        try
        {
            var state = RunManager.Instance.DebugOnlyGetState();
            if (state != null)
            {
                run.Act = state.CurrentActIndex + 1; // 0-indexed to 1-indexed
                run.Floor = state.TotalFloor;
                run.Gold = 0; // Gold not directly available
            }
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[GameStateService] Run info error: {ex.Message}");
        }
        return run;
    }

    private System.Collections.Generic.List<string> GetAvailableActions()
    {
        var actions = new System.Collections.Generic.List<string>();
        try
        {
            if (CombatManager.Instance.IsInProgress)
            {
                actions.Add("end_turn");
                actions.Add("play_card");
                return actions;
            }

            var screen = ActiveScreenContext.Instance.GetCurrentScreen();
            switch (screen)
            {
                case NRewardsScreen:
                    actions.Add("select_card");   // click a card reward to open card selection
                    actions.Add("proceed");        // skip / take gold only and proceed
                    break;
                case NSimpleCardSelectScreen:
                case NDeckCardSelectScreen:
                    actions.Add("select_card");   // index into the card grid
                    break;
                case NMapScreen:
                case NMapRoom:
                    actions.Add("choose_map_node");
                    break;
                case NMainMenu:
                    actions.Add("open_character_select");
                    actions.Add("continue_run");
                    break;
                case NEventRoom:
                    actions.Add("choose_event_option");
                    actions.Add("proceed");
                    break;
                default:
                    // Unknown screen — report both for fallback attempts
                    actions.Add("proceed");
                    actions.Add("choose_map_node");
                    break;
            }
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[GameStateService] Actions error: {ex.Message}");
        }
        return actions;
    }
}

public class GameStatePayload
{
    public int Version { get; set; } = 6;
    public int AgentViewVersion { get; set; } = 1;
    public string Screen { get; set; } = "unknown";
    public bool InCombat { get; set; }
    public CombatPayload? Combat { get; set; }
    public RunPayload? Run { get; set; }
    public System.Collections.Generic.List<string> AvailableActions { get; set; } = new();
}

public class CombatPayload
{
    public int Turn { get; set; }
    public PlayerPayload? Player { get; set; }
    public System.Collections.Generic.List<EnemyPayload> Enemies { get; set; } = new();
    public System.Collections.Generic.List<CardPayload> Hand { get; set; } = new();
    public System.Collections.Generic.List<OrbPayload> Orbs { get; set; } = new();
}

public class PlayerPayload
{
    public int Health { get; set; }
    public int MaxHealth { get; set; }
    public int Block { get; set; }
    public int Energy { get; set; }
    public int MaxEnergy { get; set; }
}

public class EnemyPayload
{
    public int Index { get; set; }
    public string Id { get; set; } = "";
    public int Health { get; set; }
    public int MaxHealth { get; set; }
    public int Block { get; set; }
}

public class CardPayload
{
    public int Index { get; set; }
    public string CardId { get; set; } = "";
    public string Name { get; set; } = "";
    public int Cost { get; set; }
}

public class OrbPayload
{
    public string Type { get; set; } = "";
    public int PassiveAmount { get; set; }
    public int EvokeAmount { get; set; }
}

public class RunPayload
{
    public int Act { get; set; }
    public int Floor { get; set; }
    public int Gold { get; set; }
}
