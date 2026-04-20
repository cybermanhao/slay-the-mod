using Godot;
using BaseLib.Abstracts;
using BaseLib.Utils;
using Invoker.Scripts.Cards;
using Invoker.Scripts.Pools;
using Invoker.Scripts.Relics;
using MegaCrit.Sts2.Core.Entities.Characters;
using MegaCrit.Sts2.Core.Helpers;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Models.Cards;

namespace Invoker.Scripts.Characters;

public class InvokerCharacter : PlaceholderCharacterModel
{
    public override Color NameColor => new Color(0.4f, 0.7f, 1.0f);
    public override Color EnergyLabelOutlineColor => new Color(0.1f, 0.3f, 0.8f);
    public override CharacterGender Gender => CharacterGender.Masculine;

    public override int StartingHp => 75;
    public override int StartingGold => 99;

    // 3 orb slots — this is the key Invoker mechanic
    public override int BaseOrbSlotCount => 3;

    // Reuse Ironclad transition sfx as placeholder
    public override string CharacterTransitionSfx => "event:/sfx/ui/wipe_ironclad";

    // Character sprite paths - use charui directory
    public override string CustomIconTexturePath => "res://images/charui/character_icon_invoker.png";
    public override string CustomCharacterSelectIconPath => "res://images/charui/char_select_invoker.png";
    public override string CustomCharacterSelectLockedIconPath => "res://images/charui/char_select_invoker_locked.png";
    public override string CustomMapMarkerPath => "res://images/charui/map_marker_invoker.png";

    // 战斗内角色模型
    public override string CustomVisualPath => "res://images/creature_visuals/invoker_character.tscn";

    // 角色选择背景
    public override string CustomCharacterSelectBg => "res://Scripts/Characters/invoker_select_bg.tscn";

    public override CardPoolModel CardPool => ModelDb.CardPool<InvokerCardPool>();
    public override RelicPoolModel RelicPool => ModelDb.RelicPool<InvokerRelicPool>();
    public override PotionPoolModel PotionPool => ModelDb.PotionPool<InvokerPotionPool>();

    // Starting deck: 1x SummonCard (3-in-1), 1x Invoke, 4x Strike, 4x Defend (Invoker 版本)
    public override IEnumerable<CardModel> StartingDeck =>
    [
        ModelDb.Card<SummonCard>(),
        ModelDb.Card<InvokeCard>(),
        ModelDb.Card<StrikeInvokerCard>(),
        ModelDb.Card<StrikeInvokerCard>(),
        ModelDb.Card<StrikeInvokerCard>(),
        ModelDb.Card<StrikeInvokerCard>(),
        ModelDb.Card<DefendInvokerCard>(),
        ModelDb.Card<DefendInvokerCard>(),
        ModelDb.Card<DefendInvokerCard>(),
        ModelDb.Card<DefendInvokerCard>(),
    ];

    // Starting relic: player picks one command stone (QuasCommandStone for default)
    public override IReadOnlyList<RelicModel> StartingRelics =>
    [
        ModelDb.Relic<QuasCommandStone>(),
    ];

    public override List<string> GetArchitectAttackVfx() =>
    [
        "vfx/vfx_attack_blunt",
        "vfx/vfx_attack_slash",
        "vfx/vfx_heavy_blunt",
    ];
}
