using System.Reflection;
using Godot;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Context;
using MegaCrit.Sts2.Core.DevConsole;
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
/// Calls the underlying DevConsole directly to get the real CmdResult.
/// Must be called from the game thread.
/// </summary>
public class ConsoleService
{
    private const string LogPrefix = "[ConsoleService] ";

    // Cached reflection access to NDevConsole._devConsole (DevConsole instance)
    private static readonly FieldInfo? _devConsoleField =
        typeof(NDevConsole).GetField("_devConsole", BindingFlags.NonPublic | BindingFlags.Instance);

    private static readonly MethodInfo? _processNetCommandMethod =
        typeof(DevConsole).GetMethod("ProcessNetCommand", BindingFlags.Public | BindingFlags.Instance);

    public ConsoleResult ExecuteCommand(string command)
    {
        if (string.IsNullOrWhiteSpace(command))
            return new ConsoleResult(false, "Empty command");

        try
        {
            var player = LocalContext.GetMe(CombatManager.Instance?.DebugOnlyGetState())
                      ?? LocalContext.GetMe(RunManager.Instance?.DebugOnlyGetState());

            if (player == null)
                return new ConsoleResult(false, "No active player found (not in combat or run)");

            // Call the inner DevConsole directly to get the real CmdResult
            if (_devConsoleField != null && _processNetCommandMethod != null)
            {
                var devConsole = _devConsoleField.GetValue(NDevConsole.Instance);
                if (devConsole != null)
                {
                    var cmdResult = (CmdResult)_processNetCommandMethod.Invoke(devConsole, [player, command])!;
                    GD.Print($"{LogPrefix}Executed '{command}': success={cmdResult.success} msg={cmdResult.msg}");
                    return new ConsoleResult(cmdResult.success, cmdResult.msg);
                }
            }

            // Fallback: call via NDevConsole (no result info)
            _ = NDevConsole.Instance.ProcessNetCommand(player, command);
            GD.Print($"{LogPrefix}Executed (fallback): {command}");
            return new ConsoleResult(true, "Command executed");
        }
        catch (Exception ex)
        {
            GD.PrintErr($"{LogPrefix}Error executing '{command}': {ex.Message}");
            return new ConsoleResult(false, ex.Message);
        }
    }

    // Keep async wrapper for compatibility
    public Task<ConsoleResult> ExecuteCommandAsync(string command) =>
        Task.FromResult(ExecuteCommand(command));

    public List<string> GetAvailableCommands() =>
    [
        "heal", "gold", "energy", "draw", "block",
        "card", "kill", "damage", "fight", "travel",
        "act", "stars", "unlock", "upgrade", "godmode", "getlogs"
    ];
}
