using System.Threading;
using Godot;

namespace DevToolMod;

/// <summary>
/// Dispatches work to the game's main thread via captured SynchronizationContext.
/// Must be initialized in _Ready() before HTTP requests arrive.
/// </summary>
internal static class GameThread
{
    private static SynchronizationContext? _syncContext;
    private static int _threadId;

    public static void Initialize()
    {
        _syncContext = SynchronizationContext.Current;
        _threadId = System.Environment.CurrentManagedThreadId;
        GD.Print($"[DevToolMod] GameThread captured on thread {_threadId}");
    }

    /// <summary>Dispatch synchronous work to the game thread.</summary>
    public static Task<T> InvokeAsync<T>(Func<T> action)
    {
        if (_syncContext == null)
            throw new InvalidOperationException("GameThread.Initialize() has not been called.");

        // Already on game thread — run directly.
        if (System.Environment.CurrentManagedThreadId == _threadId)
            return Task.FromResult(action());

        var tcs = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
        _syncContext.Post(_ =>
        {
            try { tcs.TrySetResult(action()); }
            catch (Exception ex) { tcs.TrySetException(ex); }
        }, null);
        return tcs.Task;
    }

    /// <summary>Dispatch async work to the game thread.</summary>
    public static Task<T> InvokeAsync<T>(Func<Task<T>> action)
    {
        if (_syncContext == null)
            throw new InvalidOperationException("GameThread.Initialize() has not been called.");

        if (System.Environment.CurrentManagedThreadId == _threadId)
            return action();

        var tcs = new TaskCompletionSource<T>(TaskCreationOptions.RunContinuationsAsynchronously);
        _syncContext.Post(_ => _ = RunCoreAsync(action, tcs), null);
        return tcs.Task;
    }

    private static async Task RunCoreAsync<T>(Func<Task<T>> action, TaskCompletionSource<T> tcs)
    {
        try { tcs.TrySetResult(await action().ConfigureAwait(false)); }
        catch (Exception ex) { tcs.TrySetException(ex); }
    }
}
