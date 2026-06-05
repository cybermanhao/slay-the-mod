namespace Invoker.Scripts.MiniGame;

public record MiniGameResult(IReadOnlyList<(int TargetIndex, decimal Accuracy)> Hits)
{
    public static MiniGameResult Miss => new([]);

    public bool AnyHit => Hits.Count > 0;

    /// <summary>Best single-target accuracy, for result label display.</summary>
    public decimal BestAccuracy => Hits.Count == 0 ? 0m : Hits.Max(h => h.Accuracy);
}
