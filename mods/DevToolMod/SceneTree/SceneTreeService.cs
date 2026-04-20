using Godot;

namespace DevToolMod.SceneTree;

public class SceneTreeService
{
    /// <summary>
    /// Get the path from root to this node (e.g., "root/child/grandchild")
    /// </summary>
    public string GetNodePath(Node node)
    {
        var parts = new List<string>();
        var current = node;

        while (current != null)
        {
            parts.Insert(0, current.Name);
            current = current.GetParent();
        }

        return string.Join("/", parts);
    }

    /// <summary>
    /// Find a node by path (e.g., "root/Combat/Player")
    /// </summary>
    public Node? FindNodeByPath(Node root, string path)
    {
        if (string.IsNullOrEmpty(path))
            return null;

        var parts = path.Split('/');
        var current = root;

        foreach (var part in parts)
        {
            if (current == null)
                return null;

            if (current.Name == part)
            {
                // Found root of path
                if (parts.Length == 1)
                    return current;
                // Continue to children
            }

            // Check direct children
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

            if (!found && current.Name != part)
                return null;
        }

        return current;
    }

    /// <summary>
    /// Get all children recursively
    /// </summary>
    public IEnumerable<Node> GetChildrenRecursive(Node node)
    {
        foreach (var child in node.GetChildren())
        {
            yield return child;
            foreach (var grandChild in GetChildrenRecursive(child))
            {
                yield return grandChild;
            }
        }
    }

    /// <summary>
    /// Find nodes by type
    /// </summary>
    public IEnumerable<T> FindNodesByType<T>(Node root) where T : Node
    {
        if (root is T typedRoot)
            yield return typedRoot;

        foreach (var child in root.GetChildren())
        {
            if (child is T typedChild)
                yield return typedChild;

            foreach (var found in FindNodesByType<T>(child))
            {
                yield return found;
            }
        }
    }
}
