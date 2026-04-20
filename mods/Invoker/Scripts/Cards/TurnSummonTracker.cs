using Invoker.Scripts.Cards;
using MegaCrit.Sts2.Core.Combat;

/// <summary>
/// Tracks which orb types the player has already summoned this turn via SummonOrbCard.
/// Automatically resets when the combat round changes, and can be explicitly reset
/// by relics (e.g. Command Stones) at combat start / turn start.
/// </summary>
public static class TurnSummonTracker
{
    private static readonly HashSet<OrbSummonType> _summonedThisTurn = new();
    private static CombatState? _lastCombat;
    private static int _lastRound = -1;

    public static bool HasSummoned(OrbSummonType type, CombatState combatState)
    {
        int round = combatState.RoundNumber;
        if (combatState != _lastCombat || round != _lastRound)
        {
            _summonedThisTurn.Clear();
            _lastCombat = combatState;
            _lastRound = round;
        }
        return _summonedThisTurn.Contains(type);
    }

    public static void MarkSummoned(OrbSummonType type) => _summonedThisTurn.Add(type);

    public static void Reset(CombatState? combatState = null)
    {
        _summonedThisTurn.Clear();
        _lastCombat = combatState;
        _lastRound = combatState?.RoundNumber ?? 0;
    }
}

public enum OrbSummonType
{
    Quas,
    Wex,
    Exort,
}
