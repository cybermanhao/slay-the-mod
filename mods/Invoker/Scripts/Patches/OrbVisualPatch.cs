using Godot;
using HarmonyLib;
using Invoker.Scripts.Orbs;
using MegaCrit.Sts2.Core.Assets;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Nodes.Orbs;

namespace Invoker.Scripts.Patches;

/// <summary>
/// Harmony patch: redirect CreateSprite() for our custom orbs to
/// enhanced visuals with Spine skeleton animation + GPU particle effects,
/// reusing the game's original orb art assets (frost/lightning/plasma).
/// </summary>
[HarmonyPatch(typeof(OrbModel), nameof(OrbModel.CreateSprite))]
public static class OrbCreateSpritePatch
{
    [HarmonyPrefix]
    public static bool Prefix(OrbModel __instance, ref Node2D __result)
    {
        if (__instance is not (QuasOrb or WexOrb or ExortOrb))
            return true; // Not one of our orbs

        __result = OrbVisualEffects.CreateVisual(__instance);
        return false; // Skip original
    }
}

/// <summary>
/// Harmony patch: use custom icon for our orbs.
/// </summary>
[HarmonyPatch(typeof(OrbModel), nameof(OrbModel.Icon), MethodType.Getter)]
public static class OrbIconPatch
{
    private static readonly Dictionary<Type, string> CustomIcons = new()
    {
        [typeof(QuasOrb)]  = "res://images/orbs/quas_orb.png",
        [typeof(WexOrb)]   = "res://images/orbs/wex_orb.png",
        [typeof(ExortOrb)] = "res://images/orbs/exort_orb.png",
    };

    [HarmonyPrefix]
    public static bool Prefix(OrbModel __instance, ref CompressedTexture2D __result)
    {
        if (!CustomIcons.TryGetValue(__instance.GetType(), out var iconPath))
            return true; // Not one of our orbs

        __result = PreloadManager.Cache.GetCompressedTexture2D(iconPath);
        return false; // Skip original
    }
}

/// <summary>
/// Harmony patch: hide numbers on custom orbs
/// </summary>
[HarmonyPatch(typeof(NOrb), nameof(NOrb.UpdateVisuals))]
public static class NOrbUpdateVisualsPatch
{
    [HarmonyPostfix]
    public static void Postfix(NOrb __instance)
    {
        if (__instance.Model is QuasOrb or WexOrb or ExortOrb && __instance.IsNodeReady())
        {
            __instance.GetNode<Control>("%PassiveAmount").Visible = false;
            __instance.GetNode<Control>("%EvokeAmount").Visible = false;
        }
    }
}
