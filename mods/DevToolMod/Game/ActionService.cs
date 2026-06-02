using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.GameActions;
using MegaCrit.Sts2.Core.Nodes;
using MegaCrit.Sts2.Core.Runs;
using MegaCrit.Sts2.Core.Nodes.Screens.CharacterSelect;
using MegaCrit.Sts2.Core.Nodes.Screens.MainMenu;
using MegaCrit.Sts2.Core.Nodes.Screens.Map;
using MegaCrit.Sts2.Core.Nodes.Screens.ScreenContext;
using MegaCrit.Sts2.Core.Nodes.Screens.CardSelection;
using MegaCrit.Sts2.Core.Nodes.Cards.Holders;
using MegaCrit.Sts2.Core.Nodes.CommonUi;
using MegaCrit.Sts2.Core.Nodes.Events;
using MegaCrit.Sts2.Core.Nodes.Rooms;
using Godot;

namespace DevToolMod.Game;

public class ActionResult
{
    public string action { get; init; } = "";
    public string status { get; init; } = "";
    public bool stable { get; init; }
    public string message { get; init; } = "";
}

public class ActionRequest
{
    public string? action { get; set; }
    public int? card_index { get; set; }
    public int? target_index { get; set; }
    public int? option_index { get; set; }
}

/// <summary>
/// Executes game actions. All methods must be called from the game thread.
/// </summary>
public static class ActionService
{
    public static Task<ActionResult> ExecuteAsync(ActionRequest request)
    {
        return (request.action?.Trim().ToLowerInvariant()) switch
        {
            "end_turn" => EndTurnAsync(),
            "play_card" => PlayCardAsync(request.card_index ?? 0, request.target_index),
            "open_character_select" => OpenCharacterSelectAsync(),
            "select_character" => SelectCharacterAsync(request.option_index),
            "continue_run" => ContinueRunAsync(),
            "embark" => EmbarkAsync(),
            "choose_map_node" => ChooseMapNodeAsync(request.option_index),
            "choose_event_option" => ChooseEventOptionAsync(request.option_index),
            "proceed" => ProceedAsync(),
            "select_card" => SelectCardAsync(request.option_index),
            _ => Task.FromResult(new ActionResult
            {
                action = request.action ?? "",
                status = "error",
                stable = false,
                message = $"Unknown action '{request.action}'. Supported: end_turn, play_card, open_character_select, select_character, embark, choose_map_node, choose_event_option, proceed, select_card"
            })
        };
    }

    private static async Task<ActionResult> EndTurnAsync()
    {
        var combatState = CombatManager.Instance.DebugOnlyGetState();
        if (combatState == null || !CombatManager.Instance.IsInProgress ||
            combatState.CurrentSide != CombatSide.Player)
        {
            return new ActionResult
            {
                action = "end_turn",
                status = "error",
                stable = false,
                message = "Not in player turn phase"
            };
        }

        var player = combatState.Players.FirstOrDefault();
        if (player == null)
            return new ActionResult { action = "end_turn", status = "error", stable = false, message = "No player found" };

        var roundNumber = combatState.RoundNumber;
        RunManager.Instance.ActionQueueSynchronizer.RequestEnqueue(new EndPlayerTurnAction(player, roundNumber));

        var stable = await WaitForConditionAsync(
            () => combatState.CurrentSide != CombatSide.Player ||
                  (CombatManager.Instance.DebugOnlyGetState()?.RoundNumber ?? 0) != roundNumber,
            TimeSpan.FromSeconds(5));

        return new ActionResult
        {
            action = "end_turn",
            status = stable ? "completed" : "pending",
            stable = stable,
            message = stable ? "Turn ended." : "End turn queued but still transitioning."
        };
    }

    private static async Task<ActionResult> PlayCardAsync(int cardIndex, int? targetIndex)
    {
        var combatState = CombatManager.Instance.DebugOnlyGetState();
        if (combatState == null || !CombatManager.Instance.IsInProgress ||
            combatState.CurrentSide != CombatSide.Player)
        {
            return new ActionResult
            {
                action = "play_card",
                status = "error",
                stable = false,
                message = "Not in player turn phase"
            };
        }

        var player = combatState.Players.FirstOrDefault();
        var hand = player?.PlayerCombatState?.Hand.Cards.ToList();
        if (hand == null)
            return new ActionResult { action = "play_card", status = "error", stable = false, message = "Hand unavailable" };

        if (cardIndex < 0 || cardIndex >= hand.Count)
        {
            return new ActionResult
            {
                action = "play_card",
                status = "error",
                stable = false,
                message = $"card_index {cardIndex} out of range (hand has {hand.Count} cards)"
            };
        }

        var card = hand[cardIndex];
        var cardId = card.Id.Entry;

        // Resolve target: state.Enemies contains Creature objects directly
        Creature? target = null;
        if (targetIndex.HasValue && combatState.Enemies.Count > 0)
        {
            var idx = System.Math.Clamp(targetIndex.Value, 0, combatState.Enemies.Count - 1);
            target = combatState.Enemies[idx];
        }

        if (!card.TryManualPlay(target))
        {
            return new ActionResult
            {
                action = "play_card",
                status = "error",
                stable = false,
                message = $"Cannot play '{cardId}' — needs target, insufficient energy, or wrong state"
            };
        }

        // Wait for card to leave hand (animation settles)
        var originalCount = hand.Count;
        var stable = await WaitForConditionAsync(() =>
        {
            var currentHand = combatState.Players.FirstOrDefault()?.PlayerCombatState?.Hand.Cards;
            return currentHand == null ||
                   currentHand.Count != originalCount ||
                   !currentHand.Contains(card);
        }, TimeSpan.FromSeconds(5));

        return new ActionResult
        {
            action = "play_card",
            status = stable ? "completed" : "pending",
            stable = stable,
            message = stable ? $"Card '{cardId}' played." : "Card play queued but still animating."
        };
    }

    private static async Task<ActionResult> OpenCharacterSelectAsync()
    {
        var currentScreen = ActiveScreenContext.Instance.GetCurrentScreen();
        if (currentScreen is not NMainMenu mainMenu)
        {
            return new ActionResult
            {
                action = "open_character_select",
                status = "error",
                stable = false,
                message = "Not on main menu"
            };
        }

        var characterSelectScreen = mainMenu.SubmenuStack.GetSubmenuType<NCharacterSelectScreen>();
        characterSelectScreen.InitializeSingleplayer();
        mainMenu.SubmenuStack.Push(characterSelectScreen);

        var stable = await WaitForConditionAsync(
            () => ActiveScreenContext.Instance.GetCurrentScreen() is NCharacterSelectScreen,
            TimeSpan.FromSeconds(10));

        return new ActionResult
        {
            action = "open_character_select",
            status = stable ? "completed" : "pending",
            stable = stable,
            message = stable ? "Character select opened." : "Still transitioning to character select."
        };
    }

    private static async Task<ActionResult> SelectCharacterAsync(int? optionIndex)
    {
        if (optionIndex == null)
            return new ActionResult { action = "select_character", status = "error", stable = false, message = "option_index required" };

        var currentScreen = ActiveScreenContext.Instance.GetCurrentScreen();
        if (currentScreen is not NCharacterSelectScreen characterSelectScreen)
        {
            return new ActionResult
            {
                action = "select_character",
                status = "error",
                stable = false,
                message = "Not on character select screen"
            };
        }

        var buttons = FindDescendants<NCharacterSelectButton>((Node)characterSelectScreen)
            .Where(b => GodotObject.IsInstanceValid(b))
            .OrderBy(b => b.GlobalPosition.Y)
            .ThenBy(b => b.GlobalPosition.X)
            .ToList();

        if (optionIndex < 0 || optionIndex >= buttons.Count)
        {
            return new ActionResult
            {
                action = "select_character",
                status = "error",
                stable = false,
                message = $"option_index {optionIndex} out of range (found {buttons.Count} character buttons)"
            };
        }

        var button = buttons[optionIndex.Value];
        if (button.IsLocked)
        {
            return new ActionResult
            {
                action = "select_character",
                status = "error",
                stable = false,
                message = $"Character at index {optionIndex} is locked"
            };
        }

        var previousCharId = characterSelectScreen.Lobby.LocalPlayer.character.Id.Entry;
        var targetCharId = button.Character.Id.Entry;
        button.Select();

        var stable = await WaitForConditionAsync(
            () => characterSelectScreen.Lobby.LocalPlayer.character.Id.Entry == targetCharId,
            TimeSpan.FromSeconds(5));

        return new ActionResult
        {
            action = "select_character",
            status = stable ? "completed" : "pending",
            stable = stable,
            message = stable ? $"Selected character '{targetCharId}'." : "Character selection still transitioning."
        };
    }

    private static async Task<ActionResult> EmbarkAsync()
    {
        var currentScreen = ActiveScreenContext.Instance.GetCurrentScreen();
        if (currentScreen is not NCharacterSelectScreen characterSelectScreen)
        {
            return new ActionResult
            {
                action = "embark",
                status = "error",
                stable = false,
                message = "Not on character select screen"
            };
        }

        var embarkButton = characterSelectScreen.GetNodeOrNull<NConfirmButton>("ConfirmButton");
        if (embarkButton == null || !embarkButton.IsEnabled)
        {
            return new ActionResult
            {
                action = "embark",
                status = "error",
                stable = false,
                message = "Embark button not available"
            };
        }

        embarkButton.ForceClick();

        var stable = await WaitForConditionAsync(
            () =>
            {
                var screen = ActiveScreenContext.Instance.GetCurrentScreen();
                return !ReferenceEquals(screen, characterSelectScreen) && screen != null;
            },
            TimeSpan.FromSeconds(10));

        return new ActionResult
        {
            action = "embark",
            status = stable ? "completed" : "pending",
            stable = stable,
            message = stable ? "Embarked." : "Embark clicked but still transitioning."
        };
    }

    private static async Task<ActionResult> ContinueRunAsync()
    {
        var currentScreen = ActiveScreenContext.Instance.GetCurrentScreen();
        if (currentScreen is not NMainMenu mainMenu)
            return new ActionResult { action = "continue_run", status = "error", stable = false, message = "Not on main menu" };

        var continueButton = mainMenu.GetNodeOrNull<NMainMenuTextButton>("MainMenuTextButtons/ContinueButton");
        if (continueButton == null || !GodotObject.IsInstanceValid(continueButton))
            return new ActionResult { action = "continue_run", status = "error", stable = false, message = "No continue button found (no active run)" };

        continueButton.ForceClick();
        var stable = await WaitForConditionAsync(
            () => ActiveScreenContext.Instance.GetCurrentScreen() is not NMainMenu,
            TimeSpan.FromSeconds(15));

        return new ActionResult
        {
            action = "continue_run",
            status = stable ? "completed" : "pending",
            stable = stable,
            message = stable ? "Run continued." : "Continue clicked but still transitioning."
        };
    }

    private static async Task<ActionResult> ChooseMapNodeAsync(int? optionIndex)
    {
        if (optionIndex == null)
            return new ActionResult { action = "choose_map_node", status = "error", stable = false, message = "option_index required" };

        var currentScreen = ActiveScreenContext.Instance.GetCurrentScreen();
        var runState = RunManager.Instance.DebugOnlyGetState();

        // Map is accessible from NMapScreen OR NMapRoom (same map, different context)
        var mapScreen = currentScreen as NMapScreen ?? NMapScreen.Instance;
        if (mapScreen == null || !GodotObject.IsInstanceValid(mapScreen) ||
            !mapScreen.IsVisibleInTree() || currentScreen is not (NMapScreen or NMapRoom))
        {
            return new ActionResult
            {
                action = "choose_map_node",
                status = "error",
                stable = false,
                message = "Not on map screen (must be NMapScreen or NMapRoom with map visible)"
            };
        }

        var availableNodes = FindDescendants<NMapPoint>(mapScreen)
            .Where(n => GodotObject.IsInstanceValid(n) && n.IsEnabled)
            .OrderBy(n => n.Point.coord.row)
            .ThenBy(n => n.Point.coord.col)
            .ToList();

        if (optionIndex < 0 || optionIndex >= availableNodes.Count)
        {
            return new ActionResult
            {
                action = "choose_map_node",
                status = "error",
                stable = false,
                message = $"option_index {optionIndex} out of range (found {availableNodes.Count} available nodes)"
            };
        }

        var selectedNode = availableNodes[optionIndex.Value];
        var roomEntered = false;
        void OnRoomEntered() { roomEntered = true; }
        RunManager.Instance.RoomEntered += OnRoomEntered;
        try
        {
            selectedNode.ForceClick();
            var stable = await WaitForConditionAsync(
                () => roomEntered || CombatManager.Instance.IsInProgress,
                TimeSpan.FromSeconds(10));

            return new ActionResult
            {
                action = "choose_map_node",
                status = stable ? "completed" : "pending",
                stable = stable,
                message = stable ? "Map node selected." : "Map node clicked but still transitioning."
            };
        }
        finally
        {
            RunManager.Instance.RoomEntered -= OnRoomEntered;
        }
    }

    private static async Task<ActionResult> ChooseEventOptionAsync(int? optionIndex)
    {
        if (optionIndex == null)
            return new ActionResult { action = "choose_event_option", status = "error", stable = false, message = "option_index required" };

        var eventModel = RunManager.Instance.EventSynchronizer.GetLocalEvent();
        if (eventModel == null)
            return new ActionResult { action = "choose_event_option", status = "error", stable = false, message = "No active event" };

        // Finished event: only option 0 is valid (proceed/leave)
        if (eventModel.IsFinished)
        {
            if (optionIndex != 0)
                return new ActionResult { action = "choose_event_option", status = "error", stable = false, message = "Event is finished — only option_index 0 (leave) is valid" };

            await NEventRoom.Proceed();
            var stable = await WaitForConditionAsync(
                () => RunManager.Instance.EventSynchronizer.GetLocalEvent() == null ||
                      ActiveScreenContext.Instance.GetCurrentScreen() is not NEventRoom,
                TimeSpan.FromSeconds(10));

            return new ActionResult
            {
                action = "choose_event_option",
                status = stable ? "completed" : "pending",
                stable = stable,
                message = stable ? "Event proceeded (left event room)." : "Proceed called but still transitioning."
            };
        }

        // Non-finished event: choose an option
        var options = eventModel.CurrentOptions;
        if (optionIndex < 0 || optionIndex >= options.Count)
            return new ActionResult
            {
                action = "choose_event_option",
                status = "error",
                stable = false,
                message = $"option_index {optionIndex} out of range (found {options.Count} options)"
            };

        if (options[optionIndex.Value].IsLocked)
            return new ActionResult { action = "choose_event_option", status = "error", stable = false, message = $"Option {optionIndex} is locked" };

        var signatureBefore = eventModel.CurrentOptions.Count;
        RunManager.Instance.EventSynchronizer.ChooseLocalOption(optionIndex.Value);

        var stableOption = await WaitForConditionAsync(
            () => eventModel.IsFinished || eventModel.CurrentOptions.Count != signatureBefore ||
                  RunManager.Instance.EventSynchronizer.GetLocalEvent() == null,
            TimeSpan.FromSeconds(10));

        return new ActionResult
        {
            action = "choose_event_option",
            status = stableOption ? "completed" : "pending",
            stable = stableOption,
            message = stableOption ? $"Chose event option {optionIndex}." : "Option chosen but still transitioning."
        };
    }

    private static async Task<ActionResult> ProceedAsync()
    {
        var currentScreen = ActiveScreenContext.Instance.GetCurrentScreen();
        if (currentScreen == null)
        {
            return new ActionResult { action = "proceed", status = "error", stable = false, message = "No active screen" };
        }

        var proceedButton = FindDescendants<NProceedButton>((Node)currentScreen)
            .FirstOrDefault(b => GodotObject.IsInstanceValid(b) && b.IsEnabled && b.IsVisibleInTree());

        if (proceedButton == null)
        {
            return new ActionResult
            {
                action = "proceed",
                status = "error",
                stable = false,
                message = "No proceed button found on current screen"
            };
        }

        var previousScreen = currentScreen;
        proceedButton.ForceClick();

        var stable = await WaitForConditionAsync(
            () => !ReferenceEquals(ActiveScreenContext.Instance.GetCurrentScreen(), previousScreen),
            TimeSpan.FromSeconds(10));

        return new ActionResult
        {
            action = "proceed",
            status = stable ? "completed" : "pending",
            stable = stable,
            message = stable ? "Proceeded." : "Proceed clicked but still transitioning."
        };
    }

    private static Task<ActionResult> SelectCardAsync(int? optionIndex)
    {
        var tree = Engine.GetMainLoop() as Godot.SceneTree;
        if (tree == null)
            return Task.FromResult(new ActionResult { action = "select_card", status = "error", stable = false, message = "No scene tree" });

        // Handle NChooseACardSelectionScreen (orb selection, combat card choice)
        var chooseScreen = FindDescendants<NChooseACardSelectionScreen>(tree.Root).FirstOrDefault();
        if (chooseScreen != null && GodotObject.IsInstanceValid(chooseScreen))
        {
            var holders = FindDescendants<NCardHolder>(chooseScreen);
            int idx = optionIndex ?? 0;
            if (idx < 0 || idx >= holders.Count)
                return Task.FromResult(new ActionResult { action = "select_card", status = "error", stable = false, message = $"option_index {idx} out of range (0..{holders.Count - 1})" });

            holders[idx].EmitSignal(NCardHolder.SignalName.Pressed, holders[idx]);
            return Task.FromResult(new ActionResult { action = "select_card", status = "completed", stable = true, message = $"Selected card {idx} on NChooseACardSelectionScreen." });
        }

        // Handle NDeckCardSelectScreen (smith, transform, upgrade from deck)
        var deckScreen = FindDescendants<NDeckCardSelectScreen>(tree.Root).FirstOrDefault();
        if (deckScreen != null && GodotObject.IsInstanceValid(deckScreen))
        {
            var holders = FindDescendants<NGridCardHolder>(deckScreen);
            int idx = optionIndex ?? 0;
            if (idx < 0 || idx >= holders.Count)
                return Task.FromResult(new ActionResult { action = "select_card", status = "error", stable = false, message = $"option_index {idx} out of range (0..{holders.Count - 1})" });

            holders[idx].EmitSignal(NCardHolder.SignalName.Pressed, holders[idx]);
            return Task.FromResult(new ActionResult { action = "select_card", status = "completed", stable = true, message = $"Selected card {idx} on NDeckCardSelectScreen." });
        }

        return Task.FromResult(new ActionResult { action = "select_card", status = "error", stable = false, message = "No card selection screen found (NChooseACardSelectionScreen / NDeckCardSelectScreen)." });
    }

    /// <summary>
    /// Polls condition once per ProcessFrame until true or timeout.
    /// Falls back to Task.Delay polling if NGame is unavailable.
    /// </summary>
    private static async Task<bool> WaitForConditionAsync(Func<bool> condition, TimeSpan timeout)
    {
        if (condition()) return true;

        var game = NGame.Instance;
        var deadline = System.DateTime.UtcNow + timeout;

        if (game != null)
        {
            while (System.DateTime.UtcNow < deadline)
            {
                await game.ToSignal(game.GetTree(), Godot.SceneTree.SignalName.ProcessFrame);
                if (condition()) return true;
            }
        }
        else
        {
            while (System.DateTime.UtcNow < deadline)
            {
                await Task.Delay(50);
                if (condition()) return true;
            }
        }

        return condition();
    }

    private static List<T> FindDescendants<T>(Node root) where T : Node
    {
        var found = new List<T>();
        FindDescendantsRecursive(root, found);
        return found;
    }

    private static void FindDescendantsRecursive<T>(Node node, List<T> found) where T : Node
    {
        if (!GodotObject.IsInstanceValid(node)) return;
        if (node is T typed) found.Add(typed);
        foreach (var child in node.GetChildren())
            FindDescendantsRecursive(child, found);
    }
}
