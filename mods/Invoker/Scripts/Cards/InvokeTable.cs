using Invoker.Scripts;
using MegaCrit.Sts2.Core.Models;

namespace Invoker.Scripts.Cards;

/// <summary>
/// Maps (q, w, e) orb counts to the canonical spell card they produce.
/// All 10 Invoker combinations are covered; returns null for invalid totals.
/// </summary>
public static class InvokeTable
{
    private static readonly Dictionary<(int q, int w, int e), Func<CardModel>> _table = new()
    {
        // QQQ — 急速冷却 (Cold Snap)
        { (3, 0, 0), () => ModelDb.Card<ColdSnapCard>() },
        // QQW — 幽灵漫步 (Ghost Walk)
        { (2, 1, 0), () => ModelDb.Card<GhostWalkCard>() },
        // QQE — 寒冰之墙 (Ice Wall)
        { (2, 0, 1), () => ModelDb.Card<IceWallCard>() },
        // QWW — 强袭飓风 (Tornado)
        { (1, 2, 0), () => ModelDb.Card<TornadoCard>() },
        // QWE — 超强声波 (Deafening Blast)
        { (1, 1, 1), () => ModelDb.Card<DeafeningBlastCard>() },
        // WWW — 电磁脉冲 (EMP)
        { (0, 3, 0), () => ModelDb.Card<EMPCard>() },
        // WWE — 灵动迅捷 (Alacrity)
        { (0, 2, 1), () => ModelDb.Card<AlacrityCard>() },
        // WEE — 混沌陨石 (Chaos Meteor)
        { (0, 1, 2), () => ModelDb.Card<ChaosMeteorCard>() },
        // QEE — 熔炉精灵 (Forge Spirit)
        { (1, 0, 2), () => ModelDb.Card<ForgeSpiritCard>() },
        // EEE — 阳炎之击 (Sun Strike)
        { (0, 0, 3), () => ModelDb.Card<SunStrikeCard>() },
    };

    /// <summary>
    /// Returns the canonical spell card for the given (q, w, e) combination,
    /// or null if the total is not 3 or the combination is unrecognized.
    /// </summary>
    public static CardModel? Lookup(int q, int w, int e)
    {
        if (q + w + e != 3)
        {
            Entry.Log.Warn($"InvokeTable.Lookup: invalid total q={q} w={w} e={e} (expected 3)");
            return null;
        }

        if (_table.TryGetValue((q, w, e), out var factory))
            return factory();

        Entry.Log.Warn($"InvokeTable.Lookup: unrecognized combination q={q} w={w} e={e}");
        return null;
    }
}
