using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using DotaRelics.Scripts.Pools;
using Godot.Bridge;
using HarmonyLib;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.RelicPools;

namespace DotaRelics.Scripts;

[ModInitializer("Init")]
public class Entry
{
    internal const string ModId = "DOTA_RELICS";
    internal static readonly Logger Log = new(ModId, LogType.Generic);

    public static void Init()
    {
        ScriptManagerBridge.LookupScriptsInAssembly(typeof(Entry).Assembly);
        new Harmony("com.dota2relics.mod").PatchAll(typeof(Entry).Assembly);

        // Reset the AllRelics cache so it recomputes (with patched AllRelicPools) on next access
        var field = typeof(ModelDb).GetField("_allRelics", BindingFlags.NonPublic | BindingFlags.Static);
        field?.SetValue(null, null);
        Log.Info($"Dota2RelicsMod initialized!");
    }
}

[HarmonyPatch]
public static class AllRelicPoolsPatch
{
    static System.Reflection.MethodBase TargetMethod() =>
        AccessTools.PropertyGetter(typeof(ModelDb), "AllRelicPools");

    [HarmonyPostfix]
    public static void Postfix(ref IEnumerable<RelicPoolModel> __result)
    {
        try
        {
            bool poolExists = ModelDb.Contains(typeof(Dota2RelicPool));
            Entry.Log.Info($"[AllRelicPools postfix] Dota2RelicPool in ModelDb: {poolExists}");
            if (poolExists)
            {
                var pool = ModelDb.RelicPool<Dota2RelicPool>();
                int relicCount = pool.AllRelics.Count();
                Entry.Log.Info($"[AllRelicPools postfix] Pool relics: {relicCount}");
                __result = __result.Append(pool);
            }
        }
        catch (Exception e)
        {
            Entry.Log.Info($"[AllRelicPools postfix] ERROR: {e.Message}");
        }
    }
}
