using System.Text.Json;
using Xunit;
using DevToolMod.Game;

namespace DevToolMod.Tests;

public class SceneTreeTests
{
    [Fact]
    public void QueryString_Parse_SimpleKeyValue()
    {
        // Arrange
        var qs = new QueryStringHelper("path=/Game/Combat&depth=3");

        // Assert
        Assert.Equal("/Game/Combat", qs["path"]);
        Assert.Equal("3", qs["depth"]);
    }

    [Fact]
    public void QueryString_Parse_EmptyString()
    {
        // Arrange
        var qs = new QueryStringHelper("");

        // Assert
        Assert.Null(qs["path"]);
    }

    [Fact]
    public void QueryString_Parse_NoValue()
    {
        // Arrange
        var qs = new QueryStringHelper("keyonly");

        // Assert
        Assert.Equal("", qs["keyonly"]);
    }

    [Fact]
    public void GameStatePayload_Serializes_ToJson()
    {
        // Arrange
        var payload = new GameStatePayload
        {
            Version = 6,
            AgentViewVersion = 1,
            Screen = "Combat",
            InCombat = true,
            Combat = new CombatPayload
            {
                Turn = 3,
                Player = new PlayerPayload
                {
                    Health = 80,
                    MaxHealth = 100,
                    Block = 10,
                    Energy = 3,
                    MaxEnergy = 3
                }
            },
            Run = new RunPayload
            {
                Act = 1,
                Floor = 5,
                Gold = 150
            },
            AvailableActions = new System.Collections.Generic.List<string> { "end_turn", "play_card" }
        };

        // Act
        var json = JsonSerializer.Serialize(payload);
        var deserialized = JsonSerializer.Deserialize<GameStatePayload>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal(6, deserialized.Version);
        Assert.Equal("Combat", deserialized.Screen);
        Assert.True(deserialized.InCombat);
        Assert.NotNull(deserialized.Combat);
        Assert.Equal(3, deserialized.Combat.Turn);
        Assert.NotNull(deserialized.Combat.Player);
        Assert.Equal(80, deserialized.Combat.Player.Health);
        Assert.NotNull(deserialized.Run);
        Assert.Equal(5, deserialized.Run.Floor);
        Assert.Equal(2, deserialized.AvailableActions.Count);
    }

    [Fact]
    public void CombatPayload_Serializes_WithEnemies()
    {
        // Arrange
        var combat = new CombatPayload
        {
            Turn = 2,
            Enemies = new System.Collections.Generic.List<EnemyPayload>
            {
                new EnemyPayload { Index = 0, Id = "Slime", Health = 30, MaxHealth = 30, Block = 0 },
                new EnemyPayload { Index = 1, Id = "Goblin", Health = 25, MaxHealth = 40, Block = 10 }
            }
        };

        // Act
        var json = JsonSerializer.Serialize(combat);
        var deserialized = JsonSerializer.Deserialize<CombatPayload>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal(2, deserialized.Enemies.Count);
        Assert.Equal("Slime", deserialized.Enemies[0].Id);
        Assert.Equal(25, deserialized.Enemies[1].Health);
    }

    [Fact]
    public void CardPayload_Serializes_Correctly()
    {
        // Arrange
        var card = new CardPayload
        {
            Index = 0,
            CardId = "Strike",
            Name = "Strike",
            Cost = 1
        };

        // Act
        var json = JsonSerializer.Serialize(card);
        var deserialized = JsonSerializer.Deserialize<CardPayload>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal("Strike", deserialized.CardId);
        Assert.Equal(1, deserialized.Cost);
    }

    [Fact]
    public void OrbPayload_Serializes_Correctly()
    {
        // Arrange
        var orb = new OrbPayload
        {
            Type = "Lightning",
            PassiveAmount = 6,
            EvokeAmount = 8
        };

        // Act
        var json = JsonSerializer.Serialize(orb);
        var deserialized = JsonSerializer.Deserialize<OrbPayload>(json);

        // Assert
        Assert.NotNull(deserialized);
        Assert.Equal("Lightning", deserialized.Type);
        Assert.Equal(6, deserialized.PassiveAmount);
        Assert.Equal(8, deserialized.EvokeAmount);
    }
}

// Simple query string helper for testing
public class QueryStringHelper
{
    private readonly Dictionary<string, string> _params = new();

    public QueryStringHelper(string query)
    {
        if (string.IsNullOrEmpty(query)) return;

        foreach (var pair in query.Split('&'))
        {
            var parts = pair.Split('=');
            var key = Uri.UnescapeDataString(parts[0]);
            var value = parts.Length > 1 ? Uri.UnescapeDataString(parts[1]) : "";
            _params[key] = value;
        }
    }

    public string? this[string key] => _params.TryGetValue(key, out var val) ? val : null;
}
