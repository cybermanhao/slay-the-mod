using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Keywords;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using Invoker.Scripts.Powers;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Powers;
using MegaCrit.Sts2.Core.ValueProps;

namespace Invoker.Scripts.Cards;

// ═══════════════════════════════════════════════════
// 基础攻击/防御（Invoker 专属）
// ═══════════════════════════════════════════════════

[Pool(typeof(InvokerCardPool))]
public class StrikeInvokerCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/strike_invoker.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(6m, ValueProp.Move)];
    public StrikeInvokerCard() : base(1, CardType.Attack, CardRarity.Basic, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(3m);
}

[Pool(typeof(InvokerCardPool))]
public class DefendInvokerCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/defend_invoker.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(5m, ValueProp.Move)];
    public DefendInvokerCard() : base(1, CardType.Skill, CardRarity.Basic, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CreatureCmd.GainBlock(Owner.Creature, DynamicVars.Block.BaseValue, ValueProp.Move, cardPlay);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(3m);
}

// ═══════════════════════════════════════════════════
// 冰魂线（Quas）
// ═══════════════════════════════════════════════════

[Pool(typeof(InvokerCardPool))]
public class IceArmorCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/ice_armor.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(10m, ValueProp.Move)];
    public IceArmorCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal block = DynamicVars.Block.BaseValue;
        int quas = Owner.PlayerCombatState!.OrbQueue.Orbs.Count(o => o is QuasOrb);
        if (quas > 0) block += 4m;
        await CreatureCmd.GainBlock(Owner.Creature, block, ValueProp.Move, cardPlay);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(4m);
}

[Pool(typeof(InvokerCardPool))]
public class IceSpikeCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/ice_spike.png";
    protected override IEnumerable<DynamicVar> CanonicalVars =>
        [new DamageVar(8m, ValueProp.Move), new PowerVar<VulnerablePower>(1m)];
    public IceSpikeCard() : base(1, CardType.Attack, CardRarity.Common, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
        await PowerCmd.Apply<VulnerablePower>(cardPlay.Target!, DynamicVars.Vulnerable.BaseValue, Owner.Creature, this);
    }

    protected override void OnUpgrade()
    {
        DynamicVars.Damage.UpgradeValueBy(4m);
        DynamicVars.Vulnerable.UpgradeValueBy(1m);
    }
}

[Pool(typeof(InvokerCardPool))]
public class FrostWindCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/frost_wind.png";
    protected override IEnumerable<DynamicVar> CanonicalVars =>
        [new BlockVar(8m, ValueProp.Move), new CardsVar(1)];
    public FrostWindCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CreatureCmd.GainBlock(Owner.Creature, DynamicVars.Block.BaseValue, ValueProp.Move, cardPlay);
        await CardPileCmd.Draw(ctx, DynamicVars.Cards.BaseValue, Owner);
    }

    protected override void OnUpgrade()
    {
        DynamicVars.Block.UpgradeValueBy(4m);
        DynamicVars.Cards.UpgradeValueBy(1);
    }
}

[Pool(typeof(InvokerCardPool))]
public class FreezeCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/freeze.png";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [CardKeyword.Exhaust];
    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(20m, ValueProp.Move)];
    public FreezeCard() : base(2, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CreatureCmd.GainBlock(Owner.Creature, DynamicVars.Block.BaseValue, ValueProp.Move, cardPlay);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(8m);
}

[Pool(typeof(InvokerCardPool))]
public class FrostShellCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/frost_shell.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(3m, ValueProp.Unpowered)];
    public FrostShellCard() : base(1, CardType.Power, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
        => await PowerCmd.Apply<FrostShellPower>(Owner.Creature, (int)DynamicVars.Block.BaseValue, Owner.Creature, this);

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(2m);
}

// ═══════════════════════════════════════════════════
// 雷魂线（Wex）
// ═══════════════════════════════════════════════════

[Pool(typeof(InvokerCardPool))]
public class ThunderStrikeCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/thunder_strike.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(10m, ValueProp.Move)];
    public ThunderStrikeCard() : base(1, CardType.Attack, CardRarity.Common, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
        int wex = Owner.PlayerCombatState!.OrbQueue.Orbs.Count(o => o is WexOrb);
        if (wex > 0)
            await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).TargetingRandomOpponents(CombatState!).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(4m);
}

[Pool(typeof(InvokerCardPool))]
public class ChainLightningCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/chain_lightning.png";
    protected override IEnumerable<DynamicVar> CanonicalVars =>
        [new DamageVar(6m, ValueProp.Move), new CardsVar(1)];
    public ChainLightningCard() : base(2, CardType.Attack, CardRarity.Common, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
        await CardPileCmd.Draw(ctx, DynamicVars.Cards.BaseValue, Owner);
    }

    protected override void OnUpgrade()
    {
        DynamicVars.Damage.UpgradeValueBy(2m);
        DynamicVars.Cards.UpgradeValueBy(1);
    }
}

[Pool(typeof(InvokerCardPool))]
public class SwiftMindCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/swift_mind.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new CardsVar(2)];
    public SwiftMindCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
        => await CardPileCmd.Draw(ctx, DynamicVars.Cards.BaseValue, Owner);

    protected override void OnUpgrade() => DynamicVars.Cards.UpgradeValueBy(1);
}

[Pool(typeof(InvokerCardPool))]
public class WindStabCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/wind_stab.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(5m, ValueProp.Move)];
    public WindStabCard() : base(0, CardType.Attack, CardRarity.Common, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
        => await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(3m);
}

[Pool(typeof(InvokerCardPool))]
public class ThunderFieldCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/thunder_field.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(1m, ValueProp.Unpowered)];
    public ThunderFieldCard() : base(1, CardType.Power, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
        => await PowerCmd.Apply<ThunderFieldPower>(Owner.Creature, (int)DynamicVars.Damage.BaseValue, Owner.Creature, this);

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(1m);
}

// ═══════════════════════════════════════════════════
// 炎魂线（Exort）
// ═══════════════════════════════════════════════════

[Pool(typeof(InvokerCardPool))]
public class FireballCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/fireball.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(6m, ValueProp.Move)];
    public FireballCard() : base(1, CardType.Attack, CardRarity.Common, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal dmg = DynamicVars.Damage.BaseValue;
        int exort = Owner.PlayerCombatState!.OrbQueue.Orbs.Count(o => o is ExortOrb);
        if (exort > 0) dmg += 3m;
        await DamageCmd.Attack(dmg).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(3m);
}

[Pool(typeof(InvokerCardPool))]
public class FlameBurstCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/flame_burst.png";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [CardKeyword.Exhaust];
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(20m, ValueProp.Move)];
    public FlameBurstCard() : base(2, CardType.Attack, CardRarity.Common, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
        => await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(8m);
}

[Pool(typeof(InvokerCardPool))]
public class ScorchCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/scorch.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(10m, ValueProp.Move)];
    public ScorchCard() : base(1, CardType.Attack, CardRarity.Common, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
        => await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(4m);
}

[Pool(typeof(InvokerCardPool))]
public class FlameShieldCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/flame_shield.png";
    protected override IEnumerable<DynamicVar> CanonicalVars =>
        [new BlockVar(8m, ValueProp.Move), new DamageVar(4m, ValueProp.Move)];
    public FlameShieldCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CreatureCmd.GainBlock(Owner.Creature, DynamicVars.Block.BaseValue, ValueProp.Move, cardPlay);
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).TargetingRandomOpponents(CombatState!).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(4m);
}

[Pool(typeof(InvokerCardPool))]
public class BurningHeartCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/burning_heart.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(2m, ValueProp.Unpowered)];
    public BurningHeartCard() : base(1, CardType.Power, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
        => await PowerCmd.Apply<BurningHeartPower>(Owner.Creature, (int)DynamicVars.Damage.BaseValue, Owner.Creature, this);

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(1m);
}

// ═══════════════════════════════════════════════════
// 稀有牌（Rare Cards）
// ═══════════════════════════════════════════════════

/// <summary>
/// Void Surge: 2-cost Attack — Deal 8 + 4×(total orbs) damage. Good with full queue.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class VoidSurgeCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/sun_strike.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(8m, ValueProp.Move)];
    public VoidSurgeCard() : base(2, CardType.Attack, CardRarity.Rare, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        var orbs = Owner.PlayerCombatState!.OrbQueue.Orbs;
        decimal dmg = DynamicVars.Damage.BaseValue + orbs.Count * 4m;
        await DamageCmd.Attack(dmg).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(4m);
}

/// <summary>
/// Elemental Ward: 1-cost Skill — Gain 8 Block per distinct orb type (Quas/Wex/Exort).
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class ElementalWardCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/freeze.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(8m, ValueProp.Move)];
    public ElementalWardCard() : base(1, CardType.Skill, CardRarity.Rare, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        var orbs = Owner.PlayerCombatState!.OrbQueue.Orbs;
        int types = (orbs.Any(o => o is QuasOrb) ? 1 : 0)
                  + (orbs.Any(o => o is WexOrb) ? 1 : 0)
                  + (orbs.Any(o => o is ExortOrb) ? 1 : 0);
        decimal block = DynamicVars.Block.BaseValue * Math.Max(1, types);
        await CreatureCmd.GainBlock(Owner.Creature, block, ValueProp.Move, cardPlay);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(4m);
}

/// <summary>
/// Arcane Recall: 0-cost Skill — Invoke twice. Exhaust.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class ArcaneRecallCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/invoke.png";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke, CardKeyword.Exhaust];
    protected override IEnumerable<DynamicVar> CanonicalVars => [];
    public ArcaneRecallCard() : base(0, CardType.Skill, CardRarity.Rare, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await InvokeCmd.Execute(ctx, this);
        await InvokeCmd.Execute(ctx, this);
    }

    protected override void OnUpgrade() { }
}

// ═══════════════════════════════════════════════════
// 祈求系（Invoke Cards）
// ═══════════════════════════════════════════════════

/// <summary>
/// Runic Strike: 1-cost Attack — Deal damage, then Invoke.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class RunicStrikeCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/thunder_strike.png";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke];
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(8m, ValueProp.Move)];
    public RunicStrikeCard() : base(1, CardType.Attack, CardRarity.Common, TargetType.AnyEnemy) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
        await InvokeCmd.Execute(ctx, this);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(4m);
}

/// <summary>
/// Catalyst: 1-cost Skill — Draw 2 cards, then Invoke.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class CatalystCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/swift_mind.png";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke];
    protected override IEnumerable<DynamicVar> CanonicalVars => [new CardsVar(2)];
    public CatalystCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CardPileCmd.Draw(ctx, DynamicVars.Cards.BaseValue, Owner);
        await InvokeCmd.Execute(ctx, this);
    }

    protected override void OnUpgrade() => DynamicVars.Cards.UpgradeValueBy(1);
}

/// <summary>
/// Spell Weave: 1-cost Skill — Gain Block, then Invoke.
/// </summary>
[Pool(typeof(InvokerCardPool))]
public class SpellWeaveCard : CustomCardModel
{
    public override string PortraitPath => "res://images/invoker/cards/ghost_walk.png";
    public override IEnumerable<CardKeyword> CanonicalKeywords => [InvokerKeywords.Invoke];
    protected override IEnumerable<DynamicVar> CanonicalVars => [new BlockVar(7m, ValueProp.Move)];
    public SpellWeaveCard() : base(1, CardType.Skill, CardRarity.Common, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CreatureCmd.GainBlock(Owner.Creature, DynamicVars.Block.BaseValue, ValueProp.Move, cardPlay);
        await InvokeCmd.Execute(ctx, this);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(3m);
}
