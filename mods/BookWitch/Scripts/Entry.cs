using Godot.Bridge;
using HarmonyLib;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;

namespace BookWitch.Scripts;

[ModInitializer("Init")]
public class Entry
{
    internal const string ModId = "BOOKWITCH";
    internal static readonly Logger Log = new(ModId, LogType.Generic);

    public static void Init()
    {
        ScriptManagerBridge.LookupScriptsInAssembly(typeof(Entry).Assembly);
        new Harmony("com.bookwitch.mod").PatchAll(typeof(Entry).Assembly);
        Log.Info("BookWitch mod initialized!");
    }
}
