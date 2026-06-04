using System.Collections.Specialized;
using System.Net;
using System.Text;
using System.Text.Json;
using Godot;
using DevToolMod.Game;
using DevToolMod.Console;
using DevToolMod.SceneTree;
using MegaCrit.Sts2.Core.Models;

namespace DevToolMod.Server;

public partial class DevToolHttpServer : Node
{
    private HttpListener? _listener;
    private bool _isRunning;
    private readonly GameStateService _gameState = new();
    private readonly ConsoleService _console = new();

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public void Start(int port)
    {
        if (_isRunning) return;

        _listener = new HttpListener();
        _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
        _listener.Prefixes.Add($"http://localhost:{port}/");

        try
        {
            _listener.Start();
            _isRunning = true;
            GD.Print($"[DevToolMod] HTTP Server listening on port {port}");
            _ = AcceptLoopAsync();
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[DevToolMod] Server start error: {ex.Message}");
        }
    }

    public void Stop()
    {
        _isRunning = false;
        try { _listener?.Stop(); _listener?.Close(); } catch { }
        _listener = null;
    }

    private async Task AcceptLoopAsync()
    {
        while (_isRunning && _listener != null)
        {
            try
            {
                var ctx = await _listener.GetContextAsync();
                // Handle each request concurrently — but all game access goes via GameThread
                _ = HandleRequestAsync(ctx);
            }
            catch when (!_isRunning) { break; }
            catch (Exception ex)
            {
                GD.PrintErr($"[DevToolMod] Accept error: {ex.Message}");
            }
        }
    }

    private async Task HandleRequestAsync(HttpListenerContext ctx)
    {
        var req = ctx.Request;
        var res = ctx.Response;
        res.ContentType = "application/json; charset=utf-8";

        string body;
        int statusCode;
        try
        {
            GD.Print($"[DevToolMod] {req.HttpMethod} {req.Url?.AbsolutePath}");
            (statusCode, body) = await RouteAsync(req);
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[DevToolMod] Unhandled: {ex.Message}");
            statusCode = 500;
            body = Error("internal_error", ex.Message);
        }

        try
        {
            res.StatusCode = statusCode;
            var buf = Encoding.UTF8.GetBytes(body);
            res.ContentLength64 = buf.Length;
            await res.OutputStream.WriteAsync(buf);
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[DevToolMod] Write response error: {ex.Message}");
        }
        finally
        {
            res.Close();
        }
    }

    // ---------------------------------------------------------------------------
    // Router — all game-data paths go through GameThread.InvokeAsync
    // ---------------------------------------------------------------------------

    private async Task<(int, string)> RouteAsync(HttpListenerRequest req)
    {
        var path = req.Url?.AbsolutePath ?? "/";
        var method = req.HttpMethod;
        var query = req.QueryString;

        return path switch
        {
            "/" or "/health" => HandleHealth(),

            "/state" => (200, Json(await GameThread.InvokeAsync(() => _gameState.BuildStatePayload()))),

            "/actions" => (200, Json(await GameThread.InvokeAsync(() =>
                new { actions = _gameState.BuildStatePayload().AvailableActions }))),

            "/screenshot" => await GameThread.InvokeAsync(HandleScreenshot),

            "/scene_tree" => await GameThread.InvokeAsync(() => HandleSceneTree(query)),

            "/console" => await HandleConsoleAsync(query, req),

            "/debug/relics" => (200, Json(HandleDebugRelics(query))),

            "/action" when method == "POST" => await HandleActionAsync(req),

            _ when path.StartsWith("/node/") =>
                await GameThread.InvokeAsync(() => HandleFindNode(path[6..])),

            _ => (404, Error("not_found", $"Unknown endpoint: {path}"))
        };
    }

    // ---------------------------------------------------------------------------
    // Individual handlers — game-data handlers run on game thread
    // ---------------------------------------------------------------------------

    private (int, string) HandleHealth() => (200, Json(new
    {
        ok = true,
        service = "DevToolMod",
        version = "0.1.0",
        endpoints = new[] { "/health", "/state", "/actions", "/screenshot", "/scene_tree", "/console", "/action", "/node/<path>" }
    }));

    // Runs on game thread via GameThread.InvokeAsync
    private (int, string) HandleScreenshot()
    {
        var viewport = GetTree()?.Root?.GetViewport();
        if (viewport == null)
            return (500, Error("no_viewport", "Could not get viewport"));

        var image = viewport.GetTexture().GetImage();
        if (image == null)
            return (500, Error("no_image", "Could not capture screenshot"));

        var png = image.SavePngToBuffer();
        return (200, Json(new { format = "png", data = Convert.ToBase64String(png) }));
    }

    // Runs on game thread
    private (int, string) HandleSceneTree(NameValueCollection query)
    {
        var tree = GetTree();
        if (tree?.Root == null)
            return (500, Error("no_root", "Could not get scene root"));

        var path = query["path"];
        var maxDepth = int.TryParse(query["depth"], out var d) ? d : 2;

        Node target = tree.Root;
        if (!string.IsNullOrEmpty(path))
            target = FindNodeByPath(tree.Root, path) ?? tree.Root;

        return (200, Json(SceneTreeSerializer.Serialize(target, maxDepth)));
    }

    // Runs on game thread
    private (int, string) HandleFindNode(string nodePath)
    {
        var tree = GetTree();
        if (tree?.Root == null)
            return (500, Error("no_root", "Could not get scene root"));

        var node = FindNodeByPath(tree.Root, nodePath);
        if (node == null)
            return (404, Error("node_not_found", $"Node not found: {nodePath}"));

        return (200, Json(SceneTreeSerializer.Serialize(node, 2)));
    }

    // Console: read body on HTTP thread, then dispatch command to game thread
    private async Task<(int, string)> HandleConsoleAsync(NameValueCollection query, HttpListenerRequest req)
    {
        string? cmd = query["cmd"];

        if (string.IsNullOrWhiteSpace(cmd) && req.HttpMethod == "POST")
        {
            using var reader = new StreamReader(req.InputStream, req.ContentEncoding);
            var rawBody = (await reader.ReadToEndAsync()).Trim();
            if (!string.IsNullOrWhiteSpace(rawBody))
            {
                // Try JSON first: {"cmd": "..."}
                if (rawBody.StartsWith("{"))
                {
                    try
                    {
                        var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(rawBody);
                        parsed?.TryGetValue("cmd", out cmd);
                    }
                    catch { /* ignore parse errors */ }
                }
                // Fall back to plain text body as the command
                if (string.IsNullOrWhiteSpace(cmd))
                    cmd = rawBody;
            }
        }

        if (string.IsNullOrWhiteSpace(cmd))
            return (200, Json(new { commands = _console.GetAvailableCommands() }));

        // Execute on game thread — no blocking, no deadlock
        var result = await GameThread.InvokeAsync(() => _console.ExecuteCommandAsync(cmd));
        return (200, Json(new { success = result.Success, message = result.Message }));
    }

    // Action: read body on HTTP thread, then dispatch to game thread
    private async Task<(int, string)> HandleActionAsync(HttpListenerRequest req)
    {
        string rawBody;
        using (var reader = new StreamReader(req.InputStream, req.ContentEncoding))
            rawBody = await reader.ReadToEndAsync();

        ActionRequest? actionReq;
        try { actionReq = JsonSerializer.Deserialize<ActionRequest>(rawBody, JsonOpts); }
        catch (Exception ex) { return (400, Error("invalid_json", ex.Message)); }

        if (string.IsNullOrWhiteSpace(actionReq?.action))
            return (400, Error("invalid_request", "Request body must contain 'action' field"));

        var result = await GameThread.InvokeAsync(() => ActionService.ExecuteAsync(actionReq));
        return (200, Json(result));
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private static object HandleDebugRelics(NameValueCollection query)
    {
        var filter = query["filter"] ?? "";
        var relics = ModelDb.AllRelics
            .Where(r => string.IsNullOrEmpty(filter) || r.Id.Entry.Contains(filter, StringComparison.OrdinalIgnoreCase))
            .Select(r => r.Id.Entry)
            .ToList();
        var pools = ModelDb.AllRelicPools
            .Select(p => new { pool = p.GetType().Name, count = p.AllRelics.Count() })
            .ToList();
        return new { totalRelics = relics.Count, relics, pools };
    }

    private static string Json<T>(T value) =>
        JsonSerializer.Serialize(value, JsonOpts);

    private static string Error(string code, string message) =>
        JsonSerializer.Serialize(new { ok = false, error = new { code, message } });

    private static Node? FindNodeByPath(Node root, string path)
    {
        if (string.IsNullOrEmpty(path)) return root;
        var current = root;
        foreach (var part in path.Split('/'))
        {
            Node? found = null;
            foreach (var child in current.GetChildren())
            {
                if (child.Name == part) { found = child; break; }
            }
            if (found == null) return null;
            current = found;
        }
        return current;
    }
}
