using Godot;
using Invoker.Scripts.Monsters;
using Invoker.Scripts.Pools;
using Invoker.Scripts.Powers;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Powers;
using MegaCrit.Sts2.Core.ValueProps;
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
    public override string PortraitPath => "res://images/invoker/cards/cold_snap.png";

    public ColdSnapCard() : base(CardType.Skill, TargetType.AnyEnemy) { }

    // 升级（Quas Command Stone）：费用降为 0
    public override Task AfterCardEnteredCombat(CardModel card)
    {
        if (card == this && IsEnhanced())
            EnergyCost.SetThisTurn(0);
        return Task.CompletedTask;
    }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await PowerCmd.Apply<ColdSnapPower>(cardPlay.Target!, 1, Owner.Creature, this);
    }
}

// ─── QQW ─── 幽灵漫步 Ghost Walk ─────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class GhostWalkCard : SpellCardBase
{
    protected override int SpellQ => 2;
    protected override int SpellW => 1;
    protected override int SpellE => 0;
    public override string PortraitPath => "res://images/invoker/cards/ghost_walk.png";

    public GhostWalkCard() : base(CardType.Skill, TargetType.None, cost: 2) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await PowerCmd.Apply<IntangiblePower>(Owner.Creature, 1, Owner.Creature, this);
        await PowerCmd.Apply<GhostWalkPower>(Owner.Creature, 1, Owner.Creature, this);
    }
}

// ─── QQE ─── 寒冰之墙 Ice Wall ───────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class IceWallCard : SpellCardBase
{
    protected override int SpellQ => 2;
    protected override int SpellW => 0;
    protected override int SpellE => 1;
    public override string PortraitPath => "res://images/invoker/cards/ice_wall.png";

    public IceWallCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal dmg = IsEnhanced() ? 7m : 4m;
        int weak = IsEnhanced() ? 2 : 1;
        await DamageCmd.Attack(dmg).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
        foreach (var enemy in CombatState!.HittableEnemies)
            await PowerCmd.Apply<WeakPower>(enemy, weak, Owner.Creature, this);
    }
}

// ─── QWW ─── 强袭飓风 Tornado ─────────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class TornadoCard : SpellCardBase
{
    protected override int SpellQ => 1;
    protected override int SpellW => 2;
    protected override int SpellE => 0;
    public override string PortraitPath => "res://images/invoker/cards/tornado.png";

    public TornadoCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal dmg = IsEnhanced() ? 14m : 10m;
        await DamageCmd.Attack(dmg).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
        await CardPileCmd.Draw(ctx, 1, Owner);
    }
}

// ─── QWE ─── 超震声波 Deafening Blast ────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class DeafeningBlastCard : SpellCardBase
{
    protected override int SpellQ => 1;
    protected override int SpellW => 1;
    protected override int SpellE => 1;
    public override string PortraitPath => "res://images/invoker/cards/deafening_blast.png";

    public DeafeningBlastCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        // No command stone enhances QWE (three different elements)
        await DamageCmd.Attack(12m).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
        foreach (var enemy in CombatState!.HittableEnemies)
            await PowerCmd.Apply<WeakPower>(enemy, 1, Owner.Creature, this);
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

    public EMPCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal damage = IsEnhanced() ? 26m : 20m;
        await DamageCmd.Attack(damage).FromCard(this).TargetingAllOpponents(CombatState!).Execute(ctx);
    }
}

// ─── WWE ─── 灵动迅捷 Alacrity ────────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class AlacrityCard : SpellCardBase
{
    protected override int SpellQ => 0;
    protected override int SpellW => 2;
    protected override int SpellE => 1;
    public override string PortraitPath => "res://images/invoker/cards/alacrity.png";

    public AlacrityCard() : base(CardType.Skill, TargetType.None, cost: 0) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int draw = IsEnhanced() ? 2 : 1;
        int str = IsEnhanced() ? 5 : 3;
        await CardPileCmd.Draw(ctx, draw, Owner);
        await PowerCmd.Apply<TempStrengthPower>(Owner.Creature, str, Owner.Creature, this);
    }
}

// ─── WEE ─── 混沌陨石 Chaos Meteor ───────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class ChaosMeteorCard : SpellCardBase
{
    protected override int SpellQ => 0;
    protected override int SpellW => 1;
    protected override int SpellE => 2;
    public override string PortraitPath => "res://images/invoker/cards/chaos_meteor.png";

    public ChaosMeteorCard() : base(CardType.Attack, TargetType.AnyEnemy, cost: 2) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal mainDmg = IsEnhanced() ? 14m : 10m;
        await DamageCmd.Attack(mainDmg).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);

        int[] chain = IsEnhanced()
            ? new[] { 6, 5, 4, 3, 2 }
            : new[] { 5, 4, 3, 2, 1 };
        foreach (int d in chain)
            await DamageCmd.Attack(d).FromCard(this).TargetingRandomOpponents(CombatState!).Execute(ctx);
    }
}

// ─── EEE ─── 阳炎之击 Sun Strike ─────────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class SunStrikeCard : SpellCardBase
{
    protected override int SpellQ => 0;
    protected override int SpellW => 0;
    protected override int SpellE => 3;
    public override string PortraitPath => "res://images/invoker/cards/sun_strike.png";

    public SunStrikeCard() : base(CardType.Attack, TargetType.AnyEnemy, cost: 3) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        decimal dmg = IsEnhanced()
            ? (decimal)GD.RandRange(30, 50)
            : (decimal)GD.RandRange(25, 38);
        await DamageCmd.Attack(dmg).FromCard(this).Targeting(cardPlay.Target!).Execute(ctx);
    }
}

// ─── QEE ─── 熔炉精灵 Forge Spirit ───────────────────────────────────────────
[Pool(typeof(InvokerCardPool))]
public class ForgeSpiritCard : SpellCardBase
{
    protected override int SpellQ => 1;
    protected override int SpellW => 0;
    protected override int SpellE => 2;
    public override string PortraitPath => "res://images/invoker/cards/forge_spirit.png";

    public ForgeSpiritCard() : base(CardType.Skill, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int hp = IsEnhanced() ? 12 : 6;
        int decay = IsEnhanced() ? 4 : 3;

        var spirit = (ForgeSpiritMonster)ModelDb.Monster<ForgeSpiritMonster>().ToMutable();
        spirit.InitialHp = hp;
        var pet = CombatState!.CreateCreature(spirit, Owner.Creature.Side, null);
        await PlayerCmd.AddPet(pet, Owner);
        // 行为由 ForgeSpiritPower 驱动（Power 挂在精灵身上，Owner = 精灵）
        await PowerCmd.Apply<ForgeSpiritPower>(pet, hp, Owner.Creature, this);
        // 代替主人承受敌方攻击（同 Osty 机制）
        await PowerCmd.Apply<DieForYouPower>(pet, 1, Owner.Creature, this);
    }
}
