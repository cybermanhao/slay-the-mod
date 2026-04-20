using Godot;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Nodes.Debug;

namespace DevToolMod.Console;

/// <summary>
/// Provides console command execution capability
/// </summary>
public class ConsoleService
{
    private const string LogPrefix = "[ConsoleService] ";

    /// <summary>
    /// Execute a console command string (e.g., "heal 10", "gold 100")
    /// </summary>
    public ConsoleResult ExecuteCommand(string command)
    {
        if (string.IsNullOrWhiteSpace(command))
        {
            return new ConsoleResult(false, "Empty command");
        }

        try
        {
            var devConsole = NDevConsole.Instance;
            // ProcessNetCommand returns Task, but we use GetAwaiter().GetResult() for sync execution
            var task = devConsole.ProcessNetCommand(null, command);
            task.GetAwaiter().GetResult();

            // Check result via task.Exception or assume success if no exception thrown
            if (task.IsFaulted && task.Exception != null)
            {
                var ex = task.Exception.GetBaseException();
                GD.PrintErr($"{LogPrefix}Command failed: {command} - {ex.Message}");
                return new ConsoleResult(false, ex.Message);
            }

            GD.Print($"{LogPrefix}Executed: {command}");
            return new ConsoleResult(true, "Command executed");
        }
        catch (Exception ex)
        {
            GD.PrintErr($"{LogPrefix}Error executing '{command}': {ex.Message}");
            return new ConsoleResult(false, ex.Message);
        }
    }

    /// <summary>
    /// Execute a console command with arguments
    /// </summary>
    public ConsoleResult Execute(string cmdName, params string[] args)
    {
        var command = args.Length > 0
            ? $"{cmdName} {string.Join(" ", args)}"
            : cmdName;
        return ExecuteCommand(command);
    }

    /// <summary>
    /// Get list of available console commands
    /// </summary>
    public List<string> GetAvailableCommands()
    {
        var commands = new List<string>();
        try
        {
            // Common commands based on game code inspection:
            commands.AddRange(new[]
            {
                "heal", "gold", "energy", "draw", "block",
                "card", "kill", "damage", "fight", "travel",
                "act", "stars", "unlock", "upgrade", "godmode",
                "getlogs"
            });
        }
        catch (Exception ex)
        {
            GD.PrintErr($"{LogPrefix}Error getting commands: {ex.Message}");
        }
        return commands;
    }
}

public class ConsoleResult
{
    public bool Success { get; }
    public string Message { get; }
    public string? Error => Success ? null : Message;

    public ConsoleResult(bool success, string message)
    {
        Success = success;
        Message = message;
    }
}
