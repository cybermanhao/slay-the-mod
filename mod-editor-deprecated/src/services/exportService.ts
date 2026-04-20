import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ModProject, Card, Relic, CardEffect, RelicHook } from '../types';

// Generate C# code for a card
function generateCardCode(card: Card, namespace: string): string {
  const effectsCode = card.effects.map((e, i) => generateEffectCode(e, i)).join('\n\n');
  const upgradeCode = generateCardUpgrade(card);
  const poolAttr = getPoolAttribute(card);
  
  return `using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;
using MegaCrit.Sts2.Mods.BaseLib.Models;

namespace ${namespace}.Scripts.Cards;

${poolAttr}
public sealed class ${toPascalCase(card.id)} : CustomCardModel
{
    // === Card Properties ===
    public override CardType Type => CardType.${card.type};
    public override CardRarity Rarity => CardRarity.${card.rarity};
    public override TargetType TargetType => TargetType.${card.targetType};
    public override IEnumerable<CardKeyword> CanonicalKeywords => new HashSet<CardKeyword> { ${card.keywords.map(k => `CardKeyword.${k}`).join(', ')} };
    
    protected override int CanonicalEnergyCost => ${card.cost};
    public override int CanonicalStarCost => ${card.starCost ?? -1};
    
    // === Dynamic Variables ===
    protected override IEnumerable<DynamicVar> CanonicalVars => new DynamicVar[]
    {
${card.vars.map(v => `        new ${v.type}Var(${v.value}, ValueProp.${v.valueProp || 'Move'})`).join(',\n')}
    };

    // === Upgraded Dynamic Variables ===
    protected override IEnumerable<DynamicVar>? UpgradedVars => ${card.upgraded ? `new DynamicVar[]\n    {\n${card.vars.map(v => `        new ${v.type}Var(${v.value + (v.valuePerUpgraded || 0)}, ValueProp.${v.valueProp || 'Move'})`).join(',\n')}\n    }` : 'null'};

    // === Constructor ===
    public ${toPascalCase(card.id)}() : base(${card.cost}, CardType.${card.type}, CardRarity.${card.rarity}, TargetType.${card.targetType}) { }

    // === Portrait Path ===
    public override string PortraitPath => ImageHelper.GetImagePath($"{namespace.ToLowerCase()}/cards/{card.id.ToLowerInvariant()}.png");

    // === Card Play Logic ===
    protected override async Task OnPlay(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
${effectsCode}
    }

    // === Upgrade Logic ===
    protected override void OnUpgrade()
    {
${upgradeCode}
    }
}
`;
}

function getPoolAttribute(card: Card): string {
  // Use selected pools from card
  if (card.pool && card.pool.length > 0) {
    const poolClasses = card.pool.map(p => {
      switch (p) {
        case 'Ironclad': return 'IroncladCardPool';
        case 'Silent': return 'SilentCardPool';
        case 'Defect': return 'DefectCardPool';
        case 'Regent': return 'RegentCardPool';
        case 'Necrobinder': return 'NecrobinderCardPool';
        case 'Colorless': return 'ColorlessCardPool';
        case 'Status': return 'StatusCardPool';
        case 'Curse': return 'CurseCardPool';
        case 'Event': return 'EventCardPool';
        default: return 'ColorlessCardPool';
      }
    });
    return poolClasses.map(p => `[Pool(typeof(${p}))]`).join('\n');
  }
  
  // Fallback to old logic
  if (card.rarity === 'Status') return '[Pool(typeof(StatusCardPool))]';
  if (card.rarity === 'Curse') return '[Pool(typeof(CurseCardPool))]';
  if (card.rarity === 'Basic') {
    if (card.type === 'Attack') return '[Pool(typeof(IroncladCardPool)), Pool(typeof(SilentCardPool)), Pool(typeof(DefectCardPool))]';
    return '[Pool(typeof(IroncladCardPool))]';
  }
  if (card.rarity === 'Event') return '[Pool(typeof(EventCardPool))]';
  return '[Pool(typeof(ColorlessCardPool))]';
}

function generateEffectCode(effect: CardEffect, index: number): string {
  switch (effect.action) {
    case 'damage': {
      const target = getTargetCode(effect.target, 'cardPlay.Target');
      return `        // Effect ${index + 1}: Deal ${effect.value} damage
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue)
            .FromCard(this)
            .Targeting(${target})
            .WithHitFx("vfx/vfx_attack_slash")
            .Execute(choiceContext);`;
    }
    case 'block': {
      const target = getTargetCode(effect.target, 'cardPlay.Target');
      return `        // Effect ${index + 1}: Gain ${effect.value} Block
        await BlockCmd.Add(${effect.value}, ${target}).Execute(choiceContext);`;
    }
    case 'draw': {
      return `        // Effect ${index + 1}: Draw ${effect.value} cards
        await CardPileCmd.Draw(choiceContext, ${effect.value}, choiceContext.Player);`;
    }
    case 'heal': {
      return `        // Effect ${index + 1}: Heal ${effect.value} HP
        await HealCmd.Heal(${effect.value}, choiceContext.Player).Execute(choiceContext);`;
    }
    case 'energy': {
      return `        // Effect ${index + 1}: Gain ${effect.value} Energy
        await EnergyConsoleCmd.Gain(choiceContext.Player, ${effect.value});`;
    }
    case 'applyPower': {
      const target = getTargetCode(effect.target, 'cardPlay.Target');
      const powerType = effect.powerType || 'Strength';
      return `        // Effect ${index + 1}: Apply ${effect.value} ${powerType}
        await PowerCmd.Apply<${powerType}Power>(${effect.value}, ${target}, choiceContext);`;
    }
    case 'discard': {
      return `        // Effect ${index + 1}: Discard ${effect.value} cards
        await CardPileCmd.Discard(choiceContext, ${effect.value}, choiceContext.Player);`;
    }
    case 'exhaust': {
      return `        // Effect ${index + 1}: Exhaust ${effect.value} cards
        await CardPileCmd.Exhaust(choiceContext, ${effect.value}, choiceContext.Player);`;
    }
    case 'gainGold': {
      return `        // Effect ${index + 1}: Gain ${effect.value} Gold
        await GoldCmd.Gain(choiceContext.Player, ${effect.value});`;
    }
    case 'channel': {
      return `        // Effect ${index + 1}: Channel ${effect.value} Orbs
        await OrbCmd.Channel<LightningOrb>(${effect.value}, choiceContext.Player);`;
    }
    case 'evoke': {
      return `        // Effect ${index + 1}: Evoke Orbs
        await OrbCmd.Evoke(choiceContext.Player);`;
    }
    default:
      return `        // Effect ${index + 1}: ${effect.action} (${effect.value})`;
  }
}

function getTargetCode(target: string, defaultTarget: string): string {
  switch (target) {
    case 'enemy': return 'cardPlay.Target';
    case 'self': return 'choiceContext.Player';
    case 'allEnemies': return 'choiceContext.AllEnemies';
    case 'randomEnemy': return 'choiceContext.AllEnemies.RandomOrDefault() ?? cardPlay.Target';
    default: return defaultTarget;
  }
}

function generateCardUpgrade(card: Card): string {
  const upgrades: string[] = [];
  
  for (const v of card.vars) {
    if (v.valuePerUpgraded) {
      const varName = v.type === 'Damage' ? 'Damage' : 
                      v.type === 'Block' ? 'Block' : 
                      v.type === 'Draw' ? 'Draw' : 'Int';
      upgrades.push(`        DynamicVars.${varName}.UpgradeValueBy(${v.valuePerUpgraded});`);
    }
  }
  
  return upgrades.length > 0 ? upgrades.join('\n') : '        // No upgrade changes by default';
}

// Generate C# code for a relic
function generateRelicCode(relic: Relic, namespace: string): string {
  const hookMethods = relic.hooks.map(h => generateRelicHookMethod(h)).join('\n\n');
  const rarityAttr = getRelicRarityAttribute(relic.rarity);
  
  return `using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.Entities.Creatures;
using MegaCrit.Sts2.Core.Entities.Players;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Saves.Runs;

namespace ${namespace}.Scripts.Relics;

${rarityAttr}
public sealed class ${toPascalCase(relic.id)} : RelicModel
{
    // === Relic Properties ===
    public override RelicRarity Rarity => RelicRarity.${relic.rarity};
    
    // === Icon Paths ===
    public override string PackedIconPath => ImageHelper.GetImagePath($"{namespace.ToLowerCase()}/relics/{relic.id.ToLowerInvariant()}.png");
    protected override string PackedIconOutlinePath => ImageHelper.GetImagePath($"{namespace.ToLowerCase()}/relics/{relic.id.ToLowerInvariant()}_outline.png");
    protected override string BigIconPath => ImageHelper.GetImagePath($"{namespace.ToLowerCase()}/relics/{relic.id.ToLowerInvariant()}_big.png");

${hookMethods}
}
`;
}

function getRelicRarityAttribute(rarity: string): string {
  switch (rarity) {
    case 'Starter': return '[StarterRelic]';
    case 'Boss': return '[BossRelic]';
    case 'Special': return '[SpecialRelic]';
    default: return '';
  }
}

function generateRelicHookMethod(hook: RelicHook): string {
  switch (hook.type) {
    case 'AfterPlayerTurnStart':
      return `    // === Hook: AfterPlayerTurnStart ===
    public override async Task AfterPlayerTurnStart(PlayerChoiceContext choiceContext, Player player)
    {
        // Example: Draw a card at turn start
        // await CardPileCmd.Draw(choiceContext, 1, player);
    }`;

    case 'AfterPlayerTurnEnd':
      return `    // === Hook: AfterPlayerTurnEnd ===
    public override async Task AfterPlayerTurnEnd(PlayerChoiceContext choiceContext, Player player)
    {
        // Add logic here
    }`;

    case 'AfterCombatStart':
      return `    // === Hook: AfterCombatStart ===
    public override async Task AfterCombatStart()
    {
        // Add logic here
    }`;

    case 'AfterCombatEnd':
      return `    // === Hook: AfterCombatEnd ===
    public override async Task AfterCombatEnd(PlayerChoiceContext choiceContext)
    {
        // Add logic here
    }`;

    case 'AfterCombatVictory':
      return `    // === Hook: AfterCombatVictory ===
    public override async Task AfterCombatVictory()
    {
        // Add logic here
    }`;

    case 'BeforeCardPlayed':
      return `    // === Hook: BeforeCardPlayed ===
    public override async Task BeforeCardPlayed(CombatState combatState, CardPlay cardPlay)
    {
        // Add logic here
    }`;

    case 'AfterCardPlayed':
      return `    // === Hook: AfterCardPlayed ===
    public override async Task AfterCardPlayed(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
        // Example: After playing an attack, do something
        // if (cardPlay.Card.Type == CardType.Attack) { }
    }`;

    case 'AfterCardDrawn':
      return `    // === Hook: AfterCardDrawn ===
    public override async Task AfterCardDrawn(PlayerChoiceContext choiceContext, CardModel card, bool fromHandDraw)
    {
        // Add logic here
    }`;

    case 'AfterCardDiscarded':
      return `    // === Hook: AfterCardDiscarded ===
    public override async Task AfterCardDiscarded(PlayerChoiceContext choiceContext, CardModel card)
    {
        // Add logic here
    }`;

    case 'BeforeDamageReceived':
      return `    // === Hook: BeforeDamageReceived ===
    public override async Task BeforeDamageReceived(AttackCommand command)
    {
        // Example: Reduce incoming damage
        // command.SetDamage(command.Damage / 2);
    }`;

    case 'AfterDamageReceived':
      return `    // === Hook: AfterDamageReceived ===
    public override async Task AfterDamageReceived(AttackCommand command)
    {
        // Add logic here
    }`;

    case 'AfterDamageDealt':
      return `    // === Hook: AfterDamageDealt ===
    public override async Task AfterDamageDealt(AttackCommand command)
    {
        // Example: Apply on-hit effects
    }`;

    case 'BeforeBlockGained':
      return `    // === Hook: BeforeBlockGained ===
    public override async Task BeforeBlockGained(Creature creature, ref decimal amount, ValueProp props, CardModel? cardSource)
    {
        // Modify block amount
        // amount += 5;
    }`;

    case 'AfterBlockGained':
      return `    // === Hook: AfterBlockGained ===
    public override async Task AfterBlockGained(Creature creature, decimal amount, ValueProp props, CardModel? cardSource)
    {
        // Add logic here
    }`;

    case 'AfterEnergySpent':
      return `    // === Hook: AfterEnergySpent ===
    public override async Task AfterEnergySpent(CombatState combatState, CardModel card, int amount)
    {
        // Add logic here
    }`;

    case 'AfterGoldGained':
      return `    // === Hook: AfterGoldGained ===
    public override async Task AfterGoldGained(Player player, int amount)
    {
        // Add logic here
    }`;

    case 'AfterStarsGained':
      return `    // === Hook: AfterStarsGained ===
    public override async Task AfterStarsGained(Player player, int amount)
    {
        // Add logic here
    }`;

    case 'OnRelicObtained':
      return `    // === Hook: OnRelicObtained ===
    public override async Task OnRelicObtained()
    {
        // Example: Trigger on relic pickup
    }`;

    case 'AfterPotionUsed':
      return `    // === Hook: AfterPotionUsed ===
    public override async Task AfterPotionUsed(Player player, string potionId)
    {
        // Add logic here
    }`;

    case 'AfterRoomEntered':
      return `    // === Hook: AfterRoomEntered ===
    public override async Task AfterRoomEntered()
    {
        // Add logic here
    }`;

    case 'AfterActEntered':
      return `    // === Hook: AfterActEntered ===
    public override async Task AfterActEntered()
    {
        // Add logic here
    }`;

    case 'OnPlayerDeath':
      return `    // === Hook: OnPlayerDeath ===
    public override async Task OnPlayerDeath()
    {
        // Add logic here
    }`;

    default:
      return `    // === Hook: ${hook.type} ===
    // Hook not implemented - add your logic here`;
  }
}

// Generate Entry.cs
function generateEntryCode(project: ModProject, namespace: string): string {
  return `using System;
using Godot;
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;

namespace ${namespace}.Scripts;

[ModInitializer("Init")]
public class Entry : Godot.Node
{
    internal const string ModId = "${toPascalCase(project.name)}";
    internal static readonly Logger Log = new(ModId, LogType.Generic);

    public override void _Ready()
    {
        Log.Info("${project.name} v${project.version} by ${project.author} initialized!");
    }

    public static void Init()
    {
        Log.Info("Mod initialization complete");
    }
}
`;
}

// Generate mod_manifest.json
function generateModManifest(project: ModProject, _namespace: string): string {
  return JSON.stringify({
    id: toPascalCase(project.name).toLowerCase(),
    name: project.name,
    author: project.author,
    version: project.version,
    description: `Mod created with STS2 Mod Visualizer`,
    dependencies: ['BaseLib'],
    steamWorkshopId: null,
  }, null, 2);
}

// Generate localization files
function generateLocalization(project: ModProject): { [key: string]: { cards: object; relics: object } } {
  const locales = ['en', 'zh', 'ja'] as const;
  const result: { [key: string]: { cards: object; relics: object } } = {};
  
  for (const locale of locales) {
    const cards: { [key: string]: string } = {};
    const relics: { [key: string]: string } = {};
    const prefix = project.author.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    for (const card of project.cards) {
      cards[`${prefix}_${card.id.toUpperCase()}.title`] = card.name[locale] || card.name.en;
      cards[`${prefix}_${card.id.toUpperCase()}.description`] = card.description[locale] || card.description.en;
      
      // Add upgraded description if exists
      if (card.upgraded && card.upgradedDescription?.[locale]) {
        cards[`${prefix}_${card.id.toUpperCase()}.upgradedDescription`] = card.upgradedDescription[locale];
      }
    }
    
    for (const relic of project.relics) {
      relics[`${prefix}_${relic.id.toUpperCase()}.title`] = relic.name[locale] || relic.name.en;
      relics[`${prefix}_${relic.id.toUpperCase()}.description`] = relic.description[locale] || relic.description.en;
      if (relic.flavorText) {
        relics[`${prefix}_${relic.id.toUpperCase()}.flavor`] = relic.flavorText[locale] || relic.flavorText.en || '';
      }
    }
    
    result[locale] = { cards, relics };
  }
  
  return result;
}

// Helper function to convert to PascalCase
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

// Main export function
export async function exportMod(project: ModProject): Promise<string | null> {
  const selected = await open({
    title: 'Select Export Directory',
    directory: true,
    multiple: false,
  });
  
  if (!selected || Array.isArray(selected)) return null;
  
  const baseDir = selected;
  const namespace = toPascalCase(project.name);
  
  // Entry.cs
  await invoke('save_file', { 
    path: `${baseDir}/Scripts/Entry.cs`, 
    contents: generateEntryCode(project, namespace) 
  });
  
  // Cards
  for (const card of project.cards) {
    await invoke('save_file', { 
      path: `${baseDir}/Scripts/Cards/${toPascalCase(card.id)}.cs`, 
      contents: generateCardCode(card, namespace) 
    });
  }
  
  // Relics
  for (const relic of project.relics) {
    await invoke('save_file', { 
      path: `${baseDir}/Scripts/Relics/${toPascalCase(relic.id)}.cs`, 
      contents: generateRelicCode(relic, namespace) 
    });
  }
  
  // mod_manifest.json
  await invoke('save_file', { 
    path: `${baseDir}/mod_manifest.json`, 
    contents: generateModManifest(project, namespace) 
  });
  
  // Localization
  const localization = generateLocalization(project);
  for (const [locale, content] of Object.entries(localization)) {
    await invoke('save_file', { 
      path: `${baseDir}/localization/${locale}/cards.json`, 
      contents: JSON.stringify(content.cards, null, 2) 
    });
    await invoke('save_file', { 
      path: `${baseDir}/localization/${locale}/relics.json`, 
      contents: JSON.stringify(content.relics, null, 2) 
    });
  }
  
  return baseDir;
}
