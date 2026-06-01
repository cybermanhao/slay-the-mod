using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Keywords;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using Invoker.Scripts.Powers;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Cards;

// ═══════════════════════════════════════════════════
// 普通 — 基础切球卡
// ═══════════════════════════════════════════════════

/// <summary>
/// 烈焰打击 — Common Attack: 造成 7 伤害，切入一个 Exort。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class FlameStrikeCard : InvokerCard
{
    protected override string ImageFileName => "flame_burst";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(7m, ValueProp.Move)];
    public FlameStrikeCard() : base(1, CardType.Attack, CardRarity.Common, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
        await OrbCmd.Channel<ExortOrb>(ctx, Owner);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(3m);
}

/// <summary>
/// 雷思敏捷 — Common Skill: 抽 3 张牌，切入一个 Wex。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SwiftThunderCard : InvokerCard
{
    protected override string ImageFileName => "swift_mind";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new CardsVar(3)];
    public SwiftThunderCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CardPileCmd.Draw(ctx, (int)DynamicVars.Cards.BaseValue, Owner);
        await OrbCmd.Channel<WexOrb>(ctx, Owner);
    }

    protected override void OnUpgrade() => EnergyCost.UpgradeBy(-1);
}

/// <summary>
/// 寒冰护盾 — Common Skill: 获得 9 格挡，切入一个 Quas。
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class IceShieldCard : InvokerCard
{
    protected override string ImageFileName => "ice_armor";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(9m, ValueProp.Move)];
    public IceShieldCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CreatureCmd.GainBlock(Owner.Creature, DynamicVars.Block.BaseValue, ValueProp.Move, cardPlay);
        await OrbCmd.Channel<QuasOrb>(ctx, Owner);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(4m);
}
