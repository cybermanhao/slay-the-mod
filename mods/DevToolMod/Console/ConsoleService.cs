using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.Nodes.Debug;
using MegaCrit.Sts2.Core.Runs;

namespace DevToolMod.Console;

public class ConsoleResult
{
    public bool Success { get; }
    public string Message { get; }

    public ConsoleResult(bool success, string message)
    {
        Success = success;
        Message = message;
    }
}

/// <summary>
/// Calls NDevConsole.ProcessNetCommand directly — no GameAction queue required.
/// Must be called from the game thread.
/// </summary>
public class ConsoleService
{
    private const string LogPrefix = "[ConsoleService] ";

    public async Task<ConsoleResult> ExecuteCommandAsync(string command)
    {
        if (string.IsNullOrWhiteSpace(command))
            return new ConsoleResult(false, "Empty command");

        try
        {
            var player = LocalContext.GetMe(CombatManager.Instance?.DebugOnlyGetState())
                      ?? LocalContext.GetMe(RunManager.Instance?.DebugOnlyGetState());

            if (player == null)
                return new ConsoleResult(false, "No active player found (not in combat or run)");

            await NDevConsole.Instance.ProcessNetCommand(player, command);

            GD.Print($"{LogPrefix}Executed: {command}");
            return new ConsoleResult(true, "Command executed");
        }
        catch (Exception ex)
        {
            GD.PrintErr($"{LogPrefix}Error executing '{command}': {ex.Message}");
            return new ConsoleResult(false, ex.Message);
        }
    }

    public List<string> GetAvailableCommands() =>
    [
        "heal", "gold", "energy", "draw", "block",
        "card", "kill", "damage", "fight", "travel",
        "act", "stars", "unlock", "upgrade", "godmode", "getlogs"
    ];
}
