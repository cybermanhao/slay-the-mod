using Godot.Bridge;
using HarmonyLib;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;

namespace Invoker.Scripts;

[ModInitializer("Init")]
public class Entry
{
    internal const string ModId = "INVOKER";
    internal static readonly Logger Log = new(ModId, LogType.Generic);

    public static void Init()
    {
        ScriptManagerBridge.LookupScriptsInAssembly(typeof(Entry).Assembly);
        new Harmony("com.invoker.mod").PatchAll(typeof(Entry).Assembly);
        Log.Info("InvokerMod initialized!");
    }
}
