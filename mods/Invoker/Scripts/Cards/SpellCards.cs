using Godot;
using Invoker.Scripts.MiniGame;
using Invoker.Scripts.Monsters;
using Invoker.Scripts.Pools;
using Invoker.Scripts.Powers;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Powers;
using MegaCrit.Sts2.Core.ValueProps;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using BaseLib.Abstracts;
using BaseLib.Utils;

namespace Invoker.Scripts.Cards;

// ─── QQQ ─── 急速冷却 Cold Snap ───────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class ColdSnapCard : SpellCardBase
{
    protected override int SpellQ => 3;
    protected override int SpellW => 0;
    protected override int SpellE => 0;
    protected override IEnumerable<DynamicVar> CanonicalVars => [new PowerVar<ColdSnapPower>(1m)];

    public ColdSnapCard() : base(CardType.Skill, TargetType.AnyEnemy) { }

    // Enhanced by Quas Command Stone: cost becomes 0 for the rest of combat.
    public override Task AfterCardEnteredCombat(CardModel card)
    {
        if (card == this && IsEnhanced())
            EnergyCost.SetThisCombat(0);
        return Task.CompletedTask;
    }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int amount = (int)DynamicVars["ColdSnapPower"].BaseValue;
        await CommonActions.Apply<ColdSnapPower>(cardPlay.Target!, this, amount);
    }

    protected override void OnUpgrade() => DynamicVars["ColdSnapPower"].UpgradeValueBy(1m);
}

// ─── QQW ─── 幽灵漫步 Ghost Walk ─────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class GhostWalkCard : SpellCardBase
{
    protected override int SpellQ => 2;
    protected override int SpellW => 1;
    protected override int SpellE => 0;
    public GhostWalkCard() : base(CardType.Skill, TargetType.None, cost: 2) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await CommonActions.Apply<IntangiblePower>(Owner.Creature, this, 1);
        await CommonActions.Apply<GhostWalkPower>(Owner.Creature, this, 1);
    }

    protected override void OnUpgrade() => EnergyCost.UpgradeBy(-1);
}

// ─── QQE ─── 寒冰之墙 Ice Wall ───────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class IceWallCard : SpellCardBase
{
    protected override int SpellQ => 2;
    protected override int SpellW => 0;
    protected override int SpellE => 1;
    protected override IEnumerable<DynamicVar> CanonicalVars =>
        [new DamageVar(4m, ValueProp.Move), new PowerVar<WeakPower>(1m)];

    public IceWallCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal dmg = IsEnhanced() ? DynamicVars.Damage.BaseValue + 3m : DynamicVars.Damage.BaseValue;
        int weak = IsEnhanced() ? (int)DynamicVars.Weak.BaseValue + 1 : (int)DynamicVars.Weak.BaseValue;
        await DamageCmd.Attack(dmg).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
        foreach (var enemy in CombatState!.HittableEnemies)
            await CommonActions.Apply<WeakPower>(enemy, this, weak);
    }

    protected override void OnUpgrade()
    {
        DynamicVars.Damage.UpgradeValueBy(4m);
        DynamicVars.Weak.UpgradeValueBy(1m);
    }
}

// ─── QWW ─── 强袭飓风 Tornado ─────────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class TornadoCard : SpellCardBase
{
    protected override int SpellQ => 1;
    protected override int SpellW => 2;
    protected override int SpellE => 0;
    protected override IEnumerable<DynamicVar> CanonicalVars =>
        [new DamageVar(10m, ValueProp.Move), new CardsVar(1)];

    public TornadoCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal dmg = IsEnhanced() ? DynamicVars.Damage.BaseValue + 4m : DynamicVars.Damage.BaseValue;
        int draw = IsEnhanced() ? (int)DynamicVars.Cards.BaseValue + 1 : (int)DynamicVars.Cards.BaseValue;
        await DamageCmd.Attack(dmg).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
        await CardPileCmd.Draw(ctx, draw, Owner);
    }

    protected override void OnUpgrade()
    {
        DynamicVars.Damage.UpgradeValueBy(4m);
        DynamicVars.Cards.UpgradeValueBy(1);
    }
}

// ─── QWE ─── 超震声波 Deafening Blast ────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class DeafeningBlastCard : SpellCardBase
{
    protected override int SpellQ => 1;
    protected override int SpellW => 1;
    protected override int SpellE => 1;
    protected override IEnumerable<DynamicVar> CanonicalVars =>
        [new DamageVar(10m, ValueProp.Move), new PowerVar<WeakPower>(2m), new DynamicVar("Chilled", 2m)];

    public DeafeningBlastCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal dmg    = DynamicVars.Damage.BaseValue;
        int weak       = (int)DynamicVars.Weak.BaseValue;
        int chilled    = (int)DynamicVars["Chilled"].BaseValue;

        await DamageCmd.Attack(dmg).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
        foreach (var enemy in CombatState!.HittableEnemies)
        {
            await PowerCmd.Apply<WeakPower>(ctx, new[] { enemy }, weak, Owner.Creature, this);
            await PowerCmd.Apply<FrozenPower>(ctx, new[] { enemy }, chilled, Owner.Creature, this);
        }
    }

    protected override void OnUpgrade()
    {
        DynamicVars.Damage.UpgradeValueBy(4m);
        DynamicVars.Weak.UpgradeValueBy(1m);
        DynamicVars["Chilled"].UpgradeValueBy(1m);
    }
}

// ─── WWW ─── 电磁脉冲 EMP ─────────────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class EMPCard : SpellCardBase
{
    protected override int SpellQ => 0;
    protected override int SpellW => 3;
    protected override int SpellE => 0;
    public override string PortraitPath => "res://images/invoker/cards/emp.png";
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(20m, ValueProp.Move)];

    public EMPCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal damage = IsEnhanced() ? DynamicVars.Damage.BaseValue + 6m : DynamicVars.Damage.BaseValue;
        await DamageCmd.Attack(damage).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(6m);
}

// ─── WWE ─── 灵动迅捷 Alacrity ────────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class AlacrityCard : SpellCardBase
{
    protected override int SpellQ => 0;
    protected override int SpellW => 2;
    protected override int SpellE => 1;
    protected override IEnumerable<DynamicVar> CanonicalVars =>
        [new CardsVar(1), new DynamicVar("TempStrength", 3m)];

    public AlacrityCard() : base(CardType.Skill, TargetType.None, cost: 0) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int draw = IsEnhanced() ? (int)DynamicVars.Cards.BaseValue + 1 : (int)DynamicVars.Cards.BaseValue;
        int str = IsEnhanced() ? (int)DynamicVars["TempStrength"].BaseValue + 2 : (int)DynamicVars["TempStrength"].BaseValue;
        await CardPileCmd.Draw(ctx, draw, Owner);
        await CommonActions.Apply<TempStrengthPower>(Owner.Creature, this, str);
    }

    protected override void OnUpgrade()
    {
        DynamicVars.Cards.UpgradeValueBy(1);
        DynamicVars["TempStrength"].UpgradeValueBy(2);
    }
}

// ─── WEE ─── 混沌陨石 Chaos Meteor ───────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class ChaosMeteorCard : SpellCardBase
{
    protected override int SpellQ => 0;
    protected override int SpellW => 1;
    protected override int SpellE => 2;
    protected override IEnumerable<DynamicVar> CanonicalVars =>
        [new DamageVar(12m, ValueProp.Move), new DynamicVar("Burn", 3m)];

    public ChaosMeteorCard() : base(CardType.Attack, TargetType.AnyEnemy, cost: 2) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal mainDmg = IsEnhanced() ? DynamicVars.Damage.BaseValue + 4m : DynamicVars.Damage.BaseValue;
        int burn        = IsEnhanced() ? (int)DynamicVars["Burn"].BaseValue + 1 : (int)DynamicVars["Burn"].BaseValue;

        await DamageCmd.Attack(mainDmg).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);

        // 多段小伤害——主要目的是触发急速冷却的冻结叠加
        int[] chain = CurrentUpgradeLevel > 0 ? new[] { 4, 3, 2 } : new[] { 3, 2, 1 };
        foreach (int d in chain)
            await DamageCmd.Attack(d).FromCard(this).TargetingRandomOpponents(CombatState!).Execute(ctx);

        await PowerCmd.Apply<BurnPower>(ctx, new[] { cardPlay.Target! }, burn, Owner.Creature, this);
    }

    protected override void OnUpgrade()
    {
        DynamicVars.Damage.UpgradeValueBy(4m);
        DynamicVars["Burn"].UpgradeValueBy(1m);
    }
}

// ─── EEE ─── 阳炎之击 Sun Strike ─────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class SunStrikeCard : SpellCardBase
{
    protected override int SpellQ => 0;
    protected override int SpellW => 0;
    protected override int SpellE => 3;
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DamageVar(28m, ValueProp.Move)];

    public SunStrikeCard() : base(CardType.Attack, TargetType.None, cost: 3) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        var hittableCreatures = CombatState?.HittableEnemies?.ToList() ?? [];
        var enemies = hittableCreatures
            .Select(e => new EnemyInfo(e.Name, e.MaxHp, e.CurrentHp))
            .ToList();
        if (enemies.Count == 0)
            enemies.Add(new EnemyInfo("???", 1, 1));

        decimal baseDmg = IsEnhanced() ? DynamicVars.Damage.BaseValue + 10m : DynamicVars.Damage.BaseValue;

        var tcs  = new TaskCompletionSource<MiniGameResult>();
        var node = new SunStrikeMiniGameNode(result => tcs.SetResult(result), enemies, baseDmg);
        ((Godot.SceneTree)Godot.Engine.GetMainLoop()).Root.AddChild(node);

        var result = await tcs.Task;
        foreach (var (targetIndex, accuracy) in result.Hits)
        {
            decimal dmg = Math.Round(baseDmg * accuracy);
            if (dmg > 0 && targetIndex < hittableCreatures.Count)
                await DamageCmd.Attack(dmg).FromCard(this)
                    .Targeting(hittableCreatures[targetIndex]).Execute(ctx);
        }
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(10m);
}

// ─── QEE ─── 熔炉精灵 Forge Spirit ───────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class ForgeSpiritCard : SpellCardBase
{
    protected override int SpellQ => 1;
    protected override int SpellW => 0;
    protected override int SpellE => 2;
    protected override IEnumerable<DynamicVar> CanonicalVars => [new DynamicVar("SpiritHp", 6m)];

    public ForgeSpiritCard() : base(CardType.Skill, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int hp    = IsEnhanced() ? (int)DynamicVars["SpiritHp"].BaseValue + 6 : (int)DynamicVars["SpiritHp"].BaseValue;
        int turns = IsEnhanced() ? 4 : 3;

        var spirit = (ForgeSpiritMonster)ModelDb.Monster<ForgeSpiritMonster>().ToMutable();
        spirit.InitialHp     = hp;
        spirit.TurnsRemaining = turns;
        spirit.AttackDamage  = 5;

        var pet = CombatState!.CreateCreature(spirit, Owner.Creature.Side, null);
        await PlayerCmd.AddPet(pet, Owner);
        // ForgeSpiritPower Amount = turns remaining (Counter type, visible in UI)
        await PowerCmd.Apply<ForgeSpiritPower>(ctx, new[] { pet }, (decimal)turns, Owner.Creature, this);
        // Takes hits for the player
        await CommonActions.Apply<DieForYouPower>(pet, this, 1);
    }

    protected override void OnUpgrade() => DynamicVars["SpiritHp"].UpgradeValueBy(6);
}
