using Godot;
using MegaCrit.Sts2.Core.Modding;
using DevToolMod.Server;

namespace DevToolMod;

public partial class DevToolModNode : Node
{
    private DevToolHttpServer? _server;
    private const int DefaultPort = 18432;

    public override void _Ready()
    {
        GD.Print("[DevToolMod] Starting DevToolMod v0.1.0...");

        // Must be called before HTTP server starts — captures game main thread context
        GameThread.Initialize();

        _server = new DevToolHttpServer();
        AddChild(_server);
        _server.Start(DefaultPort);

        GD.Print($"[DevToolMod] HTTP Server listening on http://127.0.0.1:{DefaultPort}");
    }

    public override void _ExitTree()
    {
        GD.Print("[DevToolMod] Shutting down...");
        _server?.Stop();
        base._ExitTree();
    }
}

[ModInitializer("Init")]
public static class ModMain
{
    public static void Init()
    {
        GD.Print("[DevToolMod] ModMain.Init called");

        // Get SceneTree via Engine
        var mainLoop = Engine.GetMainLoop();
        if (mainLoop is Godot.SceneTree sceneTree && sceneTree.Root != null)
        {
            var node = new DevToolModNode();
            // Use call_deferred because scene tree is still being set up during initialization
            sceneTree.Root.CallDeferred("add_child", node);
            GD.Print("[DevToolMod] DevToolMod node added to scene tree (deferred)");
        }
        else
        {
            GD.PrintErr("[DevToolMod] Failed to get SceneTree.Root");
        }
    }
}
