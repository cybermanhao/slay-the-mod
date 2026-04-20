using Godot;

namespace DevToolMod.SceneTree;

public static class SceneTreeSerializer
{
    public static SceneNodeData Serialize(Node node, int maxDepth = 3, int currentDepth = 0)
    {
        var data = new SceneNodeData
        {
            Name = node.Name,
            Type = node.GetType().Name,
            Visible = node is CanvasItem ci ? ci.Visible : true,
            Position = new Dictionary<string, float>
            {
                ["x"] = node is Node2D n2d ? n2d.GlobalPosition.X : 0,
                ["y"] = node is Node2D n2d2 ? n2d2.GlobalPosition.Y : 0
            },
            Scale = new Dictionary<string, float>
            {
                ["x"] = node is Node2D s2d ? s2d.Scale.X : 0,
                ["y"] = node is Node2D s2d2 ? s2d2.Scale.Y : 0
            }
        };

        // Add texture info for Sprite2D
        if (node is Sprite2D sprite)
        {
            data.Texture = sprite.Texture?.ResourcePath;
        }

        // Add children if within depth limit
        if (currentDepth < maxDepth)
        {
            data.Children = new List<SceneNodeData>();
            foreach (var child in node.GetChildren())
            {
                data.Children.Add(Serialize(child, maxDepth, currentDepth + 1));
            }
        }
        else
        {
            data.ChildCount = node.GetChildCount();
        }

        return data;
    }
}

public class SceneNodeData
{
    public string Name { get; set; } = "";
    public string Type { get; set; } = "";
    public bool Visible { get; set; }
    public Dictionary<string, float> Position { get; set; } = new();
    public Dictionary<string, float> Scale { get; set; } = new();
    public string? Texture { get; set; }
    public List<SceneNodeData>? Children { get; set; }
    public int ChildCount { get; set; }
}
