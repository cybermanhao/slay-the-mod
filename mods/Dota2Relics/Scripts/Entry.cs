using Godot.Bridge;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;

namespace DotaRelics.Scripts;

[ModInitializer("Init")]
public class Entry
{
    internal const string ModId = "DOTA_RELICS";
    internal static readonly Logger Log = new(ModId, LogType.Generic);

    public static void Init()
    {
        ScriptManagerBridge.LookupScriptsInAssembly(typeof(Entry).Assembly);
        Log.Info("Dota2RelicsMod initialized!");
    }
}
