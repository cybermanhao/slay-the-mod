using Godot;
using Invoker.Scripts.Orbs;
using MegaCrit.Sts2.Core.Assets;
using MegaCrit.Sts2.Core.Helpers;
using MegaCrit.Sts2.Core.Models;

/// <summary>
/// Creates orb visuals by reusing original game particle scenes,
/// replacing the SpineSkeleton with our custom static PNG.
/// </summary>
public static class OrbVisualEffects
{
    private static readonly Dictionary<Type, (string SceneName, string IconPath)> OrbConfig = new()
    {
        [typeof(QuasOrb)]  = ("orbs/orb_visuals/frost_orb",     "res://images/orbs/quas_orb.png"),
        [typeof(WexOrb)]   = ("orbs/orb_visuals/lightning_orb", "res://images/orbs/wex_orb.png"),
        [typeof(ExortOrb)] = ("orbs/orb_visuals/dark_orb",      "res://images/orbs/exort_orb.png"),
    };

    public static Node2D CreateVisual(OrbModel orb)
    {
        var (sceneName, iconPath) = OrbConfig[orb.GetType()];

        // 实例化原版 orb 场景（含粒子特效）
        var packed = PreloadManager.Cache.GetScene(SceneHelper.GetScenePath(sceneName));
        var root = packed.Instantiate<Node2D>(PackedScene.GenEditState.Disabled);

        // 移除 SpineSkeleton，换成静态 PNG
        root.GetNodeOrNull<Node>("SpineSkeleton")?.QueueFree();

        var texture = PreloadManager.Cache.GetCompressedTexture2D(iconPath);
        var sprite = new Sprite2D
        {
            Texture = texture,
            Scale = new Vector2(0.5f, 0.5f),
        };
        root.AddChild(sprite);
        root.MoveChild(sprite, 0); // 放到最底层，让粒子渲染在上方

        return root;
    }
}
