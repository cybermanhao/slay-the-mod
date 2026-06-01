using Invoker.Scripts.MiniGame;
using Xunit;

namespace InvokerMod.Tests;

public class EnemyInfoTests
{
    [Fact]
    public void EnemyInfo_StoresNameAndMaxHp()
    {
        var info = new EnemyInfo("Cultist", 48);
        Assert.Equal("Cultist", info.Name);
        Assert.Equal(48, info.MaxHp);
    }

    [Fact]
    public void EnemyInfo_RecordEquality()
    {
        var a = new EnemyInfo("Cultist", 48);
        var b = new EnemyInfo("Cultist", 48);
        Assert.Equal(a, b);
    }

    [Fact]
    public void EnemyInfo_DifferentMaxHp_NotEqual()
    {
        var a = new EnemyInfo("Cultist", 48);
        var b = new EnemyInfo("Cultist", 60);
        Assert.NotEqual(a, b);
    }
}
