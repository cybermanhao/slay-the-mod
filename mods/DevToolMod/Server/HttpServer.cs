using System.Collections.Specialized;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Godot;
using DevToolMod.Game;
using DevToolMod.Console;
using DevToolMod.SceneTree;

namespace DevToolMod.Server;

public partial class DevToolHttpServer : Node
{
    private HttpListener? _listener;
    private bool _isRunning;
    private readonly GameStateService _gameState = new();
    private readonly ConsoleService _console = new();

    public DevToolHttpServer()
    {
    }

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
            _ = AcceptRequestsAsync();
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[DevToolMod] Server error: {ex.Message}");
        }
    }

    public void Stop()
    {
        _isRunning = false;
        try { _listener?.Stop(); _listener?.Close(); } catch { }
        _listener = null;
    }

    private async Task AcceptRequestsAsync()
    {
        while (_isRunning && _listener != null)
        {
            try
            {
                var context = await _listener.GetContextAsync();
                _ = HandleRequestAsync(context);
            }
            catch (Exception ex) when (_isRunning)
            {
                GD.PrintErr($"[DevToolMod] Request error: {ex.Message}");
            }
            catch { }
        }
    }

    private async Task HandleRequestAsync(HttpListenerContext context)
    {
        var response = context.Response;
        string responseText = "";

        try
        {
            var path = context.Request.Url?.AbsolutePath ?? "/";
            var method = context.Request.HttpMethod;
            GD.Print($"[DevToolMod] {method} {path}");

            var (statusCode, json) = RouteRequest(path, context.Request.QueryString, context.Request);
            response.StatusCode = statusCode;
            responseText = json;
            response.ContentType = "application/json; charset=utf-8";
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[DevToolMod] Handler error: {ex}");
            response.StatusCode = 500;
            responseText = CreateError("internal_error", ex.Message);
        }

        var buffer = Encoding.UTF8.GetBytes(responseText);
        response.ContentLength64 = buffer.Length;
        await response.OutputStream.WriteAsync(buffer);
        response.Close();
    }

    private (int, string) RouteRequest(string path, NameValueCollection query, HttpListenerRequest request)
    {
        return path switch
        {
            "/" or "/health" => HandleHealth(),
            "/state" => HandleState(),
            "/actions" => HandleActions(),
            "/scene_tree" => HandleSceneTree(query),
            "/console" => HandleConsole(query, request),
            "/screenshot" => HandleScreenshot(),
            _ when path.StartsWith("/node/") => HandleFindNode(path.Substring(6)),
            _ => (404, CreateError("not_found", $"Unknown endpoint: {path}"))
        };
    }

    private (int, string) HandleHealth()
    {
        return (200, JsonSerializer.Serialize(new
        {
            ok = true,
            service = "DevToolMod",
            version = "0.1.0",
            endpoints = new[] { "/health", "/state", "/actions", "/scene_tree", "/console", "/screenshot", "/node/<path>" }
        }));
    }

    private (int, string) HandleState()
    {
        try
        {
            var state = _gameState.BuildStatePayload();
            return (200, JsonSerializer.Serialize(state));
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[DevToolMod] State error: {ex}");
            return (500, CreateError("state_error", ex.Message));
        }
    }

    private (int, string) HandleActions()
    {
        try
        {
            var state = _gameState.BuildStatePayload();
            return (200, JsonSerializer.Serialize(new { actions = state.AvailableActions }));
        }
        catch (Exception ex)
        {
            return (500, CreateError("actions_error", ex.Message));
        }
    }

    private (int, string) HandleConsole(NameValueCollection query, HttpListenerRequest request)
    {
        try
        {
            string? cmd = query["cmd"];
            if (string.IsNullOrWhiteSpace(cmd))
            {
                // Read command from request body for POST
                if (request.HttpMethod == "POST")
                {
                    using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
                    var body = reader.ReadToEndAsync().GetAwaiter().GetResult();
                    var json = JsonSerializer.Deserialize<Dictionary<string, string>>(body);
                    json?.TryGetValue("cmd", out cmd);
                }
            }

            if (string.IsNullOrWhiteSpace(cmd))
            {
                // List available commands
                var commands = _console.GetAvailableCommands();
                return (200, JsonSerializer.Serialize(new { commands }));
            }

            var result = _console.ExecuteCommand(cmd);
            return (200, JsonSerializer.Serialize(new { success = result.Success, message = result.Message }));
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[DevToolMod] Console error: {ex}");
            return (500, CreateError("console_error", ex.Message));
        }
    }

    private (int, string) HandleSceneTree(NameValueCollection query)
    {
        try
        {
            var tree = GetTree();
            if (tree?.Root == null)
                return (500, CreateError("no_root", "Could not get scene root"));

            var path = query["path"];
            var depthStr = query["depth"];
            var maxDepth = int.TryParse(depthStr, out var d) ? d : 2;

            Node target = tree.Root;
            if (!string.IsNullOrEmpty(path))
            {
                target = FindNodeByPath(tree.Root, path) ?? tree.Root;
            }

            var data = SceneTreeSerializer.Serialize(target, maxDepth);
            return (200, JsonSerializer.Serialize(data));
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[DevToolMod] SceneTree error: {ex}");
            return (500, CreateError("scene_tree_error", ex.Message));
        }
    }

    private (int, string) HandleFindNode(string nodePath)
    {
        try
        {
            var tree = GetTree();
            if (tree?.Root == null)
                return (500, CreateError("no_root", "Could not get scene root"));

            var node = FindNodeByPath(tree.Root, nodePath);
            if (node == null)
                return (404, CreateError("node_not_found", $"Node not found: {nodePath}"));

            var data = SceneTreeSerializer.Serialize(node, 2);
            return (200, JsonSerializer.Serialize(data));
        }
        catch (Exception ex)
        {
            return (500, CreateError("find_node_error", ex.Message));
        }
    }

    private (int, string) HandleScreenshot()
    {
        try
        {
            var tree = GetTree();
            if (tree?.Root == null)
                return (500, CreateError("no_root", "Could not get scene root"));

            var viewport = tree.Root.GetViewport();
            if (viewport == null)
                return (500, CreateError("no_viewport", "Could not get viewport"));

            var image = viewport.GetTexture().GetImage();
            if (image == null)
                return (500, CreateError("no_image", "Could not capture screenshot"));

            var pngData = image.SavePngToBuffer();
            return (200, Convert.ToBase64String(pngData));
        }
        catch (Exception ex)
        {
            GD.PrintErr($"[DevToolMod] Screenshot error: {ex}");
            return (500, CreateError("screenshot_error", ex.Message));
        }
    }

    private Node? FindNodeByPath(Node root, string path)
    {
        if (string.IsNullOrEmpty(path)) return root;

        var parts = path.Split('/');
        var current = root;

        foreach (var part in parts)
        {
            if (current == null) return null;
            var found = false;
            foreach (var child in current.GetChildren())
            {
                if (child.Name == part)
                {
                    current = child;
                    found = true;
                    break;
                }
            }
            if (!found) return null;
        }
        return current;
    }

    private static string CreateError(string code, string message)
    {
        return JsonSerializer.Serialize(new { ok = false, error = new { code, message } });
    }
}
