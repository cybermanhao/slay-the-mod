using Invoker.Scripts.MiniGame;
using Xunit;

namespace InvokerMod.Tests;

public class MiniGameResultTests
{
    [Fact]
    public void FullHit_Accuracy_IsOne()
    {
        Assert.Equal(1m, MiniGameResult.FullHit(3).Accuracy);
    }

    [Fact]
    public void Miss_Accuracy_IsZero()
    {
        Assert.Equal(0m, MiniGameResult.Miss.Accuracy);
    }

    [Theory]
    [InlineData(1, 4, 0.25)]
    [InlineData(2, 4, 0.5)]
    [InlineData(3, 4, 0.75)]
    [InlineData(4, 4, 1.0)]
    public void PartialHit_Accuracy_IsCorrect(int hit, int total, double expected)
    {
        var result = new MiniGameResult(hit, total);
        Assert.Equal((decimal)expected, result.Accuracy);
    }

    [Fact]
    public void ZeroTargets_Accuracy_DefaultsToOne()
    {
        var result = new MiniGameResult(0, 0);
        Assert.Equal(1m, result.Accuracy);
    }

    [Fact]
    public void FullHit_HitCount_EqualsTotal()
    {
        var result = MiniGameResult.FullHit(5);
        Assert.Equal(result.TotalTargets, result.HitCount);
    }

    [Fact]
    public void Miss_HitCount_IsZero()
    {
        Assert.Equal(0, MiniGameResult.Miss.HitCount);
    }

    // Verify SunStrike damage formula: baseDmg * accuracy, rounded
    [Theory]
    [InlineData(28, 1, 1, 28)]   // full hit → 28
    [InlineData(28, 0, 1, 0)]    // miss → 0
    [InlineData(28, 1, 2, 14)]   // half → 14
    [InlineData(28, 3, 4, 21)]   // 3/4 → 21
    [InlineData(38, 1, 1, 38)]   // upgraded full hit → 38
    public void DamageFormula_RoundsCorrectly(int baseDmg, int hit, int total, int expectedDmg)
    {
        var result = new MiniGameResult(hit, total);
        var dmg = (int)Math.Round((decimal)baseDmg * result.Accuracy);
        Assert.Equal(expectedDmg, dmg);
    }
}
