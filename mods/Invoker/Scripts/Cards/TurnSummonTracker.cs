namespace Invoker.Scripts.Cards;

/// <summary>
/// Tracks which orb types the player has already summoned this turn via SummonOrbCard.
/// Cleared at combat start (BeforeCombatStart) and at each player turn start (AfterPlayerTurnStart).
/// Command stone auto-summon does NOT add to this tracker.
/// </summary>
public static class TurnSummonTracker
{
    private static readonly HashSet<OrbSummonType> _summonedThisTurn = new();

    public static bool HasSummoned(OrbSummonType type) => _summonedThisTurn.Contains(type);

    public static void MarkSummoned(OrbSummonType type) => _summonedThisTurn.Add(type);

    public static void Reset() => _summonedThisTurn.Clear();
}

public enum OrbSummonType
{
    Quas,
    Wex,
    Exort,
}
