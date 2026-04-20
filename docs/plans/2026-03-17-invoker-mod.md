# Invoker Mod Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a fully playable Invoker (Dota 2) character mod for Slay the Spire 2, covering orb management, 10 invoke spells, 3 command stones, and 2 relics.

**Architecture:** DLL-only mod (no PCK required for code phase); BaseLib provides `CustomCardModel`/`CustomRelicModel`/`[Pool]`/`PlaceholderCharacterModel`; Defect's `OrbModel` is subclassed with empty `ChanneledEffect`/`EvokeEffect` to provide passive display-only orbs; an `InvokeTable` static lookup converts current (q,w,e) counts to a `Type` that gets instantiated into the hand.

**Tech Stack:** Godot 4.5.1 Mono · C# (.NET 9) · BaseLib (Alchyr/BaseLib-StS2) · STS2 v0.99+

---

## Prerequisites (do once, manually)

Before starting Task 1:

1. Download **Godot 4.5.1 Mono** from https://godotengine.org/download if not installed.
2. Download **BaseLib** (dll + pck + json) from https://github.com/Alchyr/BaseLib-StS2/releases. Place all three files in:
   ```
   <SteamDir>\mods\BaseLib\
   ```
3. Locate `sts2.dll`:
   ```
   C:\Program Files (x86)\Steam\steamapps\common\Slay the Spire 2\data_sts2_windows_x86_64\sts2.dll
   ```
4. Copy card images from `C:\code\slay\assets\cards\` into `C:\code\slay\InvokerMod\images\cards\` (create dir). Also copy `C:\code\slay\assets\invoker.png` into `C:\code\slay\InvokerMod\images\`.

---

## File Map

```
C:\code\slay\InvokerMod\
├── InvokerMod.csproj              # Build config; adjust <Sts2Dir> to your Steam path
├── InvokerMod.sln
├── project.godot                  # Minimal Godot project (needed for IDE support)
├── mod_manifest.json
├── images/
│   ├── invoker.png                # Character icon
│   └── cards/                    # 14 ability icons from assets/cards/
├── Scripts/
│   ├── Entry.cs                   # [ModInitializer] + ScriptManagerBridge
│   ├── Characters/
│   │   └── InvokerCharacter.cs    # PlaceholderCharacterModel
│   ├── Pools/
│   │   ├── InvokerCardPool.cs     # CustomCardPoolModel
│   │   └── InvokerRelicPool.cs    # CustomRelicPoolModel
│   ├── Orbs/
│   │   ├── QuasOrb.cs             # OrbModel, no ChanneledEffect/EvokeEffect
│   │   ├── WexOrb.cs
│   │   └── ExortOrb.cs
│   ├── Powers/
│   │   └── ForgeSpiritPower.cs    # Decrement power: 3 dmg/turn to all enemies
│   ├── Cards/
│   │   ├── InvokerCardModel.cs    # Abstract base: 1-cost, shouldShowInCardLibrary=false
│   │   ├── SummonOrbCard.cs       # 0-cost starter: choose Q/W/E, push to queue
│   │   ├── InvokeCard.cs          # 0-cost starter: read orbs → generate spell
│   │   ├── InvokeTable.cs         # Static (q,w,e) → Type lookup, 10 entries
│   │   └── Spells/
│   │       ├── ColdSnapCard.cs    # QQQ
│   │       ├── GhostWalkCard.cs   # QQW
│   │       ├── IceWallCard.cs     # QQE
│   │       ├── TornadoCard.cs     # QWW
│   │       ├── DeafeningBlastCard.cs # QWE
│   │       ├── EmpCard.cs         # WWW
│   │       ├── AlacrityCard.cs    # WWE
│   │       ├── ChaosMeteorCard.cs # WEE
│   │       ├── ForgeSpiritCard.cs # QEE → applies ForgeSpiritPower
│   │       └── SunStrikeCard.cs   # EEE
│   └── Relics/
│       ├── QuasCommandStone.cs    # Starter: QQQ init, auto-Q each turn
│       ├── WexCommandStone.cs     # Starter: WWW init, auto-W each turn
│       ├── ExortCommandStone.cs   # Starter: EEE init, auto-E each turn
│       ├── AghanimsScepter.cs     # Rare: InvokeCard generates 2 cards
│       └── AghanimsFragment.cs   # Uncommon: 25% chance spell each turn
└── InvokerMod/
    └── localization/
        ├── zhs/
        │   ├── cards.json
        │   ├── relics.json
        │   ├── characters.json
        │   └── keywords.json
        └── en/
            ├── cards.json
            ├── relics.json
            ├── characters.json
            └── keywords.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `C:\code\slay\InvokerMod\InvokerMod.csproj`
- Create: `C:\code\slay\InvokerMod\InvokerMod.sln`
- Create: `C:\code\slay\InvokerMod\project.godot`
- Create: `C:\code\slay\InvokerMod\mod_manifest.json`
- Create: `C:\code\slay\InvokerMod\Scripts\Entry.cs`

- [ ] **Step 1: Create project directory**

```bash
mkdir -p C:/code/slay/InvokerMod/Scripts
mkdir -p C:/code/slay/InvokerMod/InvokerMod/localization/zhs
mkdir -p C:/code/slay/InvokerMod/InvokerMod/localization/en
mkdir -p C:/code/slay/InvokerMod/images/cards
```

- [ ] **Step 2: Create `InvokerMod.csproj`**

> ⚠️ Adjust `<Sts2Dir>` to match your actual Steam install path.

```xml
<Project Sdk="Godot.NET.Sdk/4.5.1">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <ImplicitUsings>true</ImplicitUsings>
    <Nullable>enable</Nullable>
    <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
    <PlatformTarget>AnyCPU</PlatformTarget>
    <Sts2Dir>C:\Program Files (x86)\Steam\steamapps\common\Slay the Spire 2</Sts2Dir>
    <Sts2DataDir>$(Sts2Dir)\data_sts2_windows_x86_64</Sts2DataDir>
    <BaseLibDir>$(Sts2Dir)\mods\BaseLib</BaseLibDir>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="sts2">
      <HintPath>$(Sts2DataDir)\sts2.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="0Harmony">
      <HintPath>$(Sts2DataDir)\0Harmony.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="BaseLib">
      <HintPath>$(BaseLibDir)\BaseLib.dll</HintPath>
      <Private>false</Private>
    </Reference>
  </ItemGroup>
  <ItemGroup>
    <Compile Remove="InvokerMod\**" />
  </ItemGroup>
  <ItemGroup>
    <EmbeddedResource Include="InvokerMod\localization\**\*.json">
      <LogicalName>InvokerMod.localization.%(RecursiveDir)%(Filename)%(Extension)</LogicalName>
    </EmbeddedResource>
  </ItemGroup>
  <Target Name="CopyMod" AfterTargets="PostBuildEvent">
    <Exec Command="del /Q &quot;$(Sts2Dir)\mods\InvokerMod\InvokerMod.dll.bak*&quot; 2&gt;NUL"
          ContinueOnError="true" />
    <Exec Command="if exist &quot;$(Sts2Dir)\mods\InvokerMod\InvokerMod.dll&quot; move /Y &quot;$(Sts2Dir)\mods\InvokerMod\InvokerMod.dll&quot; &quot;$(Sts2Dir)\mods\InvokerMod\InvokerMod.dll.bak.%RANDOM%&quot;"
          ContinueOnError="true" />
    <Copy SourceFiles="$(TargetPath)" DestinationFolder="$(Sts2Dir)\mods\InvokerMod\" />
  </Target>
</Project>
```

- [ ] **Step 3: Create `project.godot`** (minimal, for IDE C# support)

```ini
config_version=5

[application]
config/name="InvokerMod"

[dotnet]
project/assembly_name="InvokerMod"
```

- [ ] **Step 4: Create `mod_manifest.json`**

```json
{
  "pck_name": "InvokerMod",
  "name": "InvokerMod",
  "author": "YourName",
  "description": "祈求者（Invoker）- Dota 2风格的球系技术验证Mod",
  "version": "0.1.0",
  "dependencies": ["BaseLib"]
}
```

- [ ] **Step 5: Create `Scripts/Entry.cs`**

```csharp
using MegaCrit.Sts2.Core.Logging;
using MegaCrit.Sts2.Core.Modding;
using GodotBridge;

namespace Invoker.Scripts;

[ModInitializer("Init")]
public class Entry
{
    internal const string ModId = "INVOKER";
    internal static readonly Logger Log = new(ModId, LogType.Generic);

    public static void Init()
    {
        ScriptManagerBridge.LookupScriptsInAssembly(typeof(Entry).Assembly);
        Log.Info("InvokerMod initialized!");
    }
}
```

- [ ] **Step 6: Create the mods output directory**

```bash
mkdir -p "C:/Program Files (x86)/Steam/steamapps/common/Slay the Spire 2/mods/InvokerMod"
```

- [ ] **Step 7: Build and verify compilation**

```bash
cd C:/code/slay/InvokerMod
dotnet build
```

Expected: Build succeeds, `InvokerMod.dll` is copied to game mods folder. No errors.

- [ ] **Step 8: Commit**

```bash
cd C:/code/slay/InvokerMod
git init
git add -A
git commit -m "feat: project scaffold — Entry.cs, csproj, manifest"
```

---

## Task 2: Pools and Character Registration

**Files:**
- Create: `Scripts/Pools/InvokerCardPool.cs`
- Create: `Scripts/Pools/InvokerRelicPool.cs`
- Create: `Scripts/Characters/InvokerCharacter.cs`
- Create: `InvokerMod/localization/zhs/characters.json`
- Create: `InvokerMod/localization/en/characters.json`

- [ ] **Step 1: Create `Scripts/Pools/InvokerCardPool.cs`**

```csharp
using BaseLib.Cards;
using Godot;

namespace Invoker.Scripts.Pools;

public class InvokerCardPool : CustomCardPoolModel
{
    public override string Title => "invoker";
    public override string EnergyColorName => "defect";  // blue energy orb
    public override Color DeckEntryCardColor => new(0.2f, 0.5f, 0.9f);
    public override bool IsColorless => false;
}
```

- [ ] **Step 2: Create `Scripts/Pools/InvokerRelicPool.cs`**

```csharp
using BaseLib.Relics;

namespace Invoker.Scripts.Pools;

public class InvokerRelicPool : CustomRelicPoolModel
{
    public override string EnergyColorName => "defect";
}
```

- [ ] **Step 3: Create `Scripts/Characters/InvokerCharacter.cs`**

```csharp
using BaseLib.Characters;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Characters;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.Cards;
using MegaCrit.Sts2.Core.Relics;
using Godot;

namespace Invoker.Scripts.Characters;

public class InvokerCharacter : PlaceholderCharacterModel
{
    public override Color NameColor => new(0.3f, 0.7f, 1.0f);
    public override Color EnergyLabelOutlineColor => new(0.1f, 0.3f, 0.8f);
    public override CharacterGender Gender => CharacterGender.Masculine;
    public override int StartingHp => 75;

    // Comment these back in when Godot scenes are created (Task 13)
    // public override string CustomVisualPath => "res://scenes/invoker_character.tscn";
    // public override string CustomEnergyCounterPath => "res://scenes/invoker_energy_counter.tscn";
    // public override string CustomCharacterSelectBg => "res://scenes/invoker_bg.tscn";

    public override string CharacterTransitionSfx => "event:/sfx/ui/wipe_ironclad";

    public override CardPoolModel CardPool => ModelDb.CardPool<InvokerCardPool>();
    public override RelicPoolModel RelicPool => ModelDb.RelicPool<InvokerRelicPool>();
    // Potions: use default (no custom potion pool)

    // Starting deck — populated in Task 5 after SummonOrbCard and InvokeCard exist
    public override IEnumerable<CardModel> StartingDeck => [];

    // Starting relics — three command stones (player picks one); populated in Task 4
    public override IReadOnlyList<RelicModel> StartingRelics => [];

    public override List<string> GetArchitectAttackVfx() => [
        "vfx/vfx_attack_blunt",
        "vfx/vfx_heavy_blunt",
    ];
}
```

- [ ] **Step 4: Create `InvokerMod/localization/zhs/characters.json`**

```json
{
  "INVOKER-INVOKER_CHARACTER.title": "祈求者",
  "INVOKER-INVOKER_CHARACTER.titleObject": "祈求者",
  "INVOKER-INVOKER_CHARACTER.description": "掌控[gold]冰[/gold]、[gold]雷[/gold]、[gold]炎[/gold]三种元素的智力法师。\n通过[gold]元素祈求[/gold]将球槽中的元素组合转化为强力法术。",
  "INVOKER-INVOKER_CHARACTER.pronounSubject": "他",
  "INVOKER-INVOKER_CHARACTER.pronounObject": "他",
  "INVOKER-INVOKER_CHARACTER.pronounPossessive": "他的",
  "INVOKER-INVOKER_CHARACTER.possessiveAdjective": "他的",
  "INVOKER-INVOKER_CHARACTER.aromaPrinciple": "[sine][blue]元素在等待召唤……[/blue][/sine]",
  "INVOKER-INVOKER_CHARACTER.cardsModifierTitle": "祈求者卡牌",
  "INVOKER-INVOKER_CHARACTER.cardsModifierDescription": "祈求者的卡牌现在会出现在奖励和商店中。",
  "INVOKER-INVOKER_CHARACTER.unlockText": "用[pink]{Prerequisite}[/pink]进行一局游戏来解锁祈求者。"
}
```

- [ ] **Step 5: Create `InvokerMod/localization/en/characters.json`**

```json
{
  "INVOKER-INVOKER_CHARACTER.title": "Invoker",
  "INVOKER-INVOKER_CHARACTER.titleObject": "Invoker",
  "INVOKER-INVOKER_CHARACTER.description": "An intelligence hero who commands [gold]Quas[/gold], [gold]Wex[/gold], and [gold]Exort[/gold] elements.\nUse [gold]Invoke[/gold] to combine your current orbs into a powerful spell.",
  "INVOKER-INVOKER_CHARACTER.pronounSubject": "he",
  "INVOKER-INVOKER_CHARACTER.pronounObject": "him",
  "INVOKER-INVOKER_CHARACTER.pronounPossessive": "his",
  "INVOKER-INVOKER_CHARACTER.possessiveAdjective": "his",
  "INVOKER-INVOKER_CHARACTER.aromaPrinciple": "[sine][blue]Elements await the call...[/blue][/sine]",
  "INVOKER-INVOKER_CHARACTER.cardsModifierTitle": "Invoker Cards",
  "INVOKER-INVOKER_CHARACTER.cardsModifierDescription": "Invoker's cards now appear in rewards and shops.",
  "INVOKER-INVOKER_CHARACTER.unlockText": "Play a run with [pink]{Prerequisite}[/pink] to unlock Invoker."
}
```

- [ ] **Step 6: Build and verify**

```bash
cd C:/code/slay/InvokerMod
dotnet build
```

Expected: Build succeeds.

- [ ] **Step 7: In-game check**

Launch STS2 → character select. InvokerMod should appear (using ironclad placeholder visuals). Selecting it should show 75 HP and the localized name/description.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: pools, character registration, character i18n"
```

---

## Task 3: Orb Spike — Validate OrbModel Subclassing

> **CRITICAL SPIKE**: Must validate before implementing command stones.
> This task determines whether the entire orb approach is feasible.

**Files:**
- Create: `Scripts/Orbs/QuasOrb.cs`
- Create: `Scripts/Orbs/WexOrb.cs`
- Create: `Scripts/Orbs/ExortOrb.cs`
- Create: `Scripts/Relics/_SpikeRelic.cs` (temporary, delete after spike)

- [ ] **Step 1: Create `Scripts/Orbs/QuasOrb.cs`**

```csharp
using MegaCrit.Sts2.Core.Orbs;
using MegaCrit.Sts2.Core.Combat;

namespace Invoker.Scripts.Orbs;

/// <summary>
/// Quas (Q) orb — passive display only, no channeled or evoke effects.
/// </summary>
public class QuasOrb : OrbModel
{
    public override async Task ChanneledEffect(PlayerChoiceContext ctx) { }
    public override async Task EvokeEffect(PlayerChoiceContext ctx) { }
}
```

- [ ] **Step 2: Create `Scripts/Orbs/WexOrb.cs`**

```csharp
using MegaCrit.Sts2.Core.Orbs;
using MegaCrit.Sts2.Core.Combat;

namespace Invoker.Scripts.Orbs;

public class WexOrb : OrbModel
{
    public override async Task ChanneledEffect(PlayerChoiceContext ctx) { }
    public override async Task EvokeEffect(PlayerChoiceContext ctx) { }
}
```

- [ ] **Step 3: Create `Scripts/Orbs/ExortOrb.cs`**

```csharp
using MegaCrit.Sts2.Core.Orbs;
using MegaCrit.Sts2.Core.Combat;

namespace Invoker.Scripts.Orbs;

public class ExortOrb : OrbModel
{
    public override async Task ChanneledEffect(PlayerChoiceContext ctx) { }
    public override async Task EvokeEffect(PlayerChoiceContext ctx) { }
}
```

- [ ] **Step 4: Create temporary `Scripts/Relics/_SpikeRelic.cs`**

This relic adds 3 QuasOrbs at combat start and sets OrbSlotVar to 3, so we can verify both mechanisms in-game.

```csharp
using BaseLib.Relics;
using Invoker.Scripts.Orbs;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Relics;
using MegaCrit.Sts2.Core.Commands;
using Invoker.Scripts.Pools;

namespace Invoker.Scripts.Relics;

/// <summary>
/// TEMPORARY SPIKE RELIC — delete after Task 3 validation.
/// Tests: can OrbSlotVar be locked? Can custom orbs be added and displayed?
/// </summary>
[Pool(typeof(InvokerRelicPool))]
public class SpikeRelic : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Starter;

    public override async Task BeforeCombatStart(PlayerChoiceContext ctx, Player player)
    {
        // SPIKE TEST 1: Can we set orb slot count to exactly 3?
        // Try the most likely API. If it doesn't compile, try alternatives:
        //   player.OrbSlots = 3;
        //   player.MaxOrbSlots = 3;
        //   OrbCmd.SetSlots(3).Execute(ctx);
        // Document which one works.
        player.OrbSlotVar = 3;  // ← verify this compiles; check sts2.dll API

        // SPIKE TEST 2: Can we add custom OrbModel subclasses?
        await OrbCmd.Add<QuasOrb>().Execute(ctx);
        await OrbCmd.Add<QuasOrb>().Execute(ctx);
        await OrbCmd.Add<QuasOrb>().Execute(ctx);
    }
}
```

> ⚠️ `player.OrbSlotVar = 3` and `OrbCmd.Add<T>()` are best-guess APIs. If they don't compile:
> 1. Search `sts2.dll` strings for "OrbSlot" to find the real property name.
> 2. Search for "OrbCmd" to find the real method signatures.
> 3. Update the code and document the real API in `docs/api-reference/core-classes.md`.

- [ ] **Step 5: Add SpikeRelic to InvokerCharacter temporarily**

In `InvokerCharacter.cs`, temporarily add:
```csharp
public override IReadOnlyList<RelicModel> StartingRelics => [
    ModelDb.Relic<SpikeRelic>(),
];
```

- [ ] **Step 6: Build and verify**

```bash
dotnet build
```

If it fails on `player.OrbSlotVar`: look up real API in sts2.dll, fix, rebuild.

- [ ] **Step 7: In-game spike validation**

Start a combat run as Invoker. Verify:
1. ✅ 3 Quas orbs appear in the orb display (same as Defect's orbs)
2. ✅ OrbSlotVar is locked to 3 (orbs don't expand/evoke unexpectedly)
3. ✅ Custom orb subclass renders without crash
4. ❌ If orb slot can't be locked to 3 → implement fallback (see below)

**Fallback plan if OrbSlotVar can't be locked:**
- Remove the `player.OrbSlotVar = 3` line
- In Task 4, add a `PowerModel` (e.g., `OrbQueuePower`) that internally maintains a `Queue<Type>(3)`, tracks which types are in slots, and exposes counts for `InvokeTable`
- Orb visuals would still use `OrbCmd.Add` but we wouldn't rely on the 3-slot limit

- [ ] **Step 8: Delete `_SpikeRelic.cs`, revert InvokerCharacter, commit**

```bash
git add -A
git commit -m "feat: QuasOrb/WexOrb/ExortOrb — spike validated, orb display confirmed"
```

Document OrbSlotVar API result in `docs/api-reference/core-classes.md`.

---

## Task 4: Three Command Stones

**Files:**
- Create: `Scripts/Relics/QuasCommandStone.cs`
- Create: `Scripts/Relics/WexCommandStone.cs`
- Create: `Scripts/Relics/ExortCommandStone.cs`
- Create: placeholder `InvokerMod/localization/zhs/relics.json`
- Create: placeholder `InvokerMod/localization/en/relics.json`
- Modify: `Scripts/Characters/InvokerCharacter.cs`

- [ ] **Step 1: Create `Scripts/Relics/QuasCommandStone.cs`**

```csharp
using BaseLib.Relics;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Cards;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Relics;
using MegaCrit.Sts2.Core.Commands;

namespace Invoker.Scripts.Relics;

[Pool(typeof(InvokerRelicPool))]
public class QuasCommandStone : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Starter;

    public override async Task BeforeCombatStart(PlayerChoiceContext ctx, Player player)
    {
        // Set orb slots to 3 first, THEN add initial orbs
        player.OrbSlotVar = 3;  // ← use API confirmed in Task 3 spike
        await OrbCmd.Add<QuasOrb>().Execute(ctx);
        await OrbCmd.Add<QuasOrb>().Execute(ctx);
        await OrbCmd.Add<QuasOrb>().Execute(ctx);

        // Also clear the per-turn summon tracker at combat start
        SummonOrbCard.TurnSummonTracker.Clear();
    }

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        // Reset per-turn tracker
        SummonOrbCard.TurnSummonTracker.Clear();
        // Auto-summon 1 Quas (does NOT consume per-turn slot — stone is not a card play)
        await OrbCmd.Add<QuasOrb>().Execute(ctx);
    }
}
```

- [ ] **Step 2: Create `Scripts/Relics/WexCommandStone.cs`** (same pattern, all Wex)

```csharp
using BaseLib.Relics;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Cards;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Relics;
using MegaCrit.Sts2.Core.Commands;

namespace Invoker.Scripts.Relics;

[Pool(typeof(InvokerRelicPool))]
public class WexCommandStone : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Starter;

    public override async Task BeforeCombatStart(PlayerChoiceContext ctx, Player player)
    {
        player.OrbSlotVar = 3;
        await OrbCmd.Add<WexOrb>().Execute(ctx);
        await OrbCmd.Add<WexOrb>().Execute(ctx);
        await OrbCmd.Add<WexOrb>().Execute(ctx);
        SummonOrbCard.TurnSummonTracker.Clear();
    }

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        SummonOrbCard.TurnSummonTracker.Clear();
        await OrbCmd.Add<WexOrb>().Execute(ctx);
    }
}
```

- [ ] **Step 3: Create `Scripts/Relics/ExortCommandStone.cs`** (same pattern, all Exort)

```csharp
using BaseLib.Relics;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Cards;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Relics;
using MegaCrit.Sts2.Core.Commands;

namespace Invoker.Scripts.Relics;

[Pool(typeof(InvokerRelicPool))]
public class ExortCommandStone : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Starter;

    public override async Task BeforeCombatStart(PlayerChoiceContext ctx, Player player)
    {
        player.OrbSlotVar = 3;
        await OrbCmd.Add<ExortOrb>().Execute(ctx);
        await OrbCmd.Add<ExortOrb>().Execute(ctx);
        await OrbCmd.Add<ExortOrb>().Execute(ctx);
        SummonOrbCard.TurnSummonTracker.Clear();
    }

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        SummonOrbCard.TurnSummonTracker.Clear();
        await OrbCmd.Add<ExortOrb>().Execute(ctx);
    }
}
```

- [ ] **Step 4: Create `InvokerMod/localization/zhs/relics.json`** (starter relics only for now)

```json
{
  "INVOKER-QUAS_COMMAND_STONE.title": "寒霜命石",
  "INVOKER-QUAS_COMMAND_STONE.description": "战斗开始时，球槽初始化为[INVOKER-QUAS]QQQ[/INVOKER-QUAS]。每回合开始时自动召唤1个[INVOKER-QUAS]冰魂[/INVOKER-QUAS]。强化[gold]QQQ/QQW/QQE[/gold]技能。",
  "INVOKER-QUAS_COMMAND_STONE.flavor": "寒冰的力量，化为命运之石。",

  "INVOKER-WEX_COMMAND_STONE.title": "风暴命石",
  "INVOKER-WEX_COMMAND_STONE.description": "战斗开始时，球槽初始化为[INVOKER-WEX]WWW[/INVOKER-WEX]。每回合开始时自动召唤1个[INVOKER-WEX]雷魂[/INVOKER-WEX]。强化[gold]QWW/WWW/WWE[/gold]技能。",
  "INVOKER-WEX_COMMAND_STONE.flavor": "闪电永不停歇。",

  "INVOKER-EXORT_COMMAND_STONE.title": "烈焰命石",
  "INVOKER-EXORT_COMMAND_STONE.description": "战斗开始时，球槽初始化为[INVOKER-EXORT]EEE[/INVOKER-EXORT]。每回合开始时自动召唤1个[INVOKER-EXORT]炎魂[/INVOKER-EXORT]。强化[gold]QEE/WEE/EEE[/gold]技能。",
  "INVOKER-EXORT_COMMAND_STONE.flavor": "烈焰淬炼，万古长存。"
}
```

- [ ] **Step 5: Create `InvokerMod/localization/en/relics.json`**

```json
{
  "INVOKER-QUAS_COMMAND_STONE.title": "Quas Exstone",
  "INVOKER-QUAS_COMMAND_STONE.description": "Start combat with orbs [INVOKER-QUAS]QQQ[/INVOKER-QUAS]. Each turn, auto-summon 1 [INVOKER-QUAS]Quas[/INVOKER-QUAS]. Enhances [gold]QQQ/QQW/QQE[/gold] spells.",
  "INVOKER-QUAS_COMMAND_STONE.flavor": "The power of frost, crystallized into fate.",

  "INVOKER-WEX_COMMAND_STONE.title": "Wex Exstone",
  "INVOKER-WEX_COMMAND_STONE.description": "Start combat with orbs [INVOKER-WEX]WWW[/INVOKER-WEX]. Each turn, auto-summon 1 [INVOKER-WEX]Wex[/INVOKER-WEX]. Enhances [gold]QWW/WWW/WWE[/gold] spells.",
  "INVOKER-WEX_COMMAND_STONE.flavor": "Lightning never rests.",

  "INVOKER-EXORT_COMMAND_STONE.title": "Exort Exstone",
  "INVOKER-EXORT_COMMAND_STONE.description": "Start combat with orbs [INVOKER-EXORT]EEE[/INVOKER-EXORT]. Each turn, auto-summon 1 [INVOKER-EXORT]Exort[/INVOKER-EXORT]. Enhances [gold]QEE/WEE/EEE[/gold] spells.",
  "INVOKER-EXORT_COMMAND_STONE.flavor": "Fire forges the eternal."
}
```

- [ ] **Step 6: Update `InvokerCharacter.StartingRelics`**

The character offers all 3 stones at start — STS2 starter relic selection handles the "pick one" UI automatically when 3 Starter relics are listed:

```csharp
public override IReadOnlyList<RelicModel> StartingRelics => [
    ModelDb.Relic<QuasCommandStone>(),
    ModelDb.Relic<WexCommandStone>(),
    ModelDb.Relic<ExortCommandStone>(),
];
```

- [ ] **Step 7: Build**

```bash
dotnet build
```

Expected: Build succeeds (SummonOrbCard.TurnSummonTracker will cause error — it's a forward reference that will be resolved in Task 5). Temporarily comment out those 3 lines if needed, add `// TODO: restore after Task 5` comment.

- [ ] **Step 8: In-game check**

Start run as Invoker → character select shows 3 command stone choices. Pick QuasCommandStone → enter combat → orbs display shows QQQ. Next turn: orb auto-added (4th Q added, 1st Q evicted, still QQQ — FIFO queue).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: three command stones — orb init and auto-summon"
```

---

## Task 5: SummonOrbCard

**Files:**
- Create: `Scripts/Cards/InvokerCardModel.cs`
- Create: `Scripts/Cards/SummonOrbCard.cs`
- Modify: `Scripts/Characters/InvokerCharacter.cs` (add starting deck)
- Add to: `InvokerMod/localization/zhs/cards.json`
- Add to: `InvokerMod/localization/en/cards.json`

- [ ] **Step 1: Create `Scripts/Cards/InvokerCardModel.cs`**

Base class for all Invoker-generated spell cards (not for starter cards like SummonOrb/Invoke).

```csharp
using BaseLib.Cards;
using MegaCrit.Sts2.Core.Cards;

namespace Invoker.Scripts.Cards;

/// <summary>
/// Base class for all 10 invoke spells. Generated into hand by InvokeCard.
/// 1-cost, not shown in card library (generated at runtime).
/// </summary>
public abstract class InvokerCardModel : CustomCardModel
{
    // Subclasses call base with their specific parameters
    protected InvokerCardModel(
        CardType type,
        TargetType targetType)
        : base(
            energyCost: 1,
            type: type,
            rarity: CardRarity.Special,
            targetType: targetType,
            shouldShowInCardLibrary: false)
    {
    }

    /// <summary>
    /// Whether the owning player has a QuasCommandStone, WexCommandStone, or ExortCommandStone
    /// that buffs this specific spell. Set by command stones in Task 12.
    /// </summary>
    public bool IsEnhanced { get; set; } = false;
}
```

- [ ] **Step 2: Create `Scripts/Cards/SummonOrbCard.cs`**

> ⚠️ `OrbCmd.Add<T>()` syntax — verify against Task 3 spike result. The card needs a way to let the player choose Q/W/E. In STS2, single-card choice is typically done via `TargetType` or a custom choice. For MVP, create **3 separate named cards** (SummonQuasCard, SummonWexCard, SummonExortCard) all backed by the same SummonOrbCard logic. Adjust if a better API exists.

```csharp
using BaseLib.Cards;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Cards;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;

namespace Invoker.Scripts.Cards;

public enum OrbType { Quas, Wex, Exort }

/// <summary>
/// Per-turn summon limiter. Reset by CommandStones at combat start + turn start.
/// Static so all 3 SummonOrb variants share one tracker.
/// </summary>
public static class TurnSummonTracker
{
    public static readonly HashSet<OrbType> UsedThisTurn = new();
}

[Pool(typeof(InvokerCardPool))]
public class SummonQuasCard : CustomCardModel
{
    public SummonQuasCard() : base(
        energyCost: 0,
        type: CardType.Skill,
        rarity: CardRarity.Basic,
        targetType: TargetType.None,
        shouldShowInCardLibrary: false) { }

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new BlockVar(8, ValueProp.Move),   // base block per Quas orb
    ];

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        if (TurnSummonTracker.UsedThisTurn.Contains(OrbType.Quas))
        {
            Entry.Log.Debug("Quas already summoned this turn — skipping.");
            return;
        }
        TurnSummonTracker.UsedThisTurn.Add(OrbType.Quas);

        await OrbCmd.Add<QuasOrb>().Execute(ctx);

        // Instant effect: grant block based on current Quas count in slots
        // Count Q orbs in current slots — exact API to be verified in Spike
        int quasCount = CountOrbsOfType<QuasOrb>(ctx);
        int blockAmount = 8 + (quasCount * 4);
        // TODO: replace with correct BlockCmd API once confirmed
        // await BlockCmd.GainBlock(blockAmount).Execute(ctx);
    }

    // Helper: count how many orbs of a given type are in current slots
    // Exact implementation depends on API — adjust after spike
    private static int CountOrbsOfType<T>(PlayerChoiceContext ctx) where T : OrbModel
    {
        // Best-guess: ctx.Player.Orbs is a list of OrbModel
        // return ctx.Player.Orbs?.Count(o => o is T) ?? 0;
        return 0; // stub until API confirmed
    }

    protected override void OnUpgrade() { }
}

[Pool(typeof(InvokerCardPool))]
public class SummonWexCard : CustomCardModel
{
    public SummonWexCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.RandomEnemy, false) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        if (TurnSummonTracker.UsedThisTurn.Contains(OrbType.Wex)) return;
        TurnSummonTracker.UsedThisTurn.Add(OrbType.Wex);

        await OrbCmd.Add<WexOrb>().Execute(ctx);

        // Instant effect: 5 damage to random enemy
        await DamageCmd.Attack(5)
            .FromCard(this)
            .Targeting(cardPlay.Target)
            .Execute(ctx);
    }

    protected override void OnUpgrade() { }
}

[Pool(typeof(InvokerCardPool))]
public class SummonExortCard : CustomCardModel
{
    public SummonExortCard() : base(0, CardType.Skill, CardRarity.Basic, TargetType.AllEnemies, false) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        if (TurnSummonTracker.UsedThisTurn.Contains(OrbType.Exort)) return;
        TurnSummonTracker.UsedThisTurn.Add(OrbType.Exort);

        await OrbCmd.Add<ExortOrb>().Execute(ctx);

        // Instant effect: 3 damage to all enemies
        await DamageCmd.Attack(3)
            .FromCard(this)
            .Targeting(cardPlay.Target)
            .Execute(ctx);
    }

    protected override void OnUpgrade() { }
}
```

- [ ] **Step 3: Fix forward reference in command stones**

In `QuasCommandStone.cs`, `WexCommandStone.cs`, `ExortCommandStone.cs`: replace `SummonOrbCard.TurnSummonTracker.Clear()` with `TurnSummonTracker.UsedThisTurn.Clear()`.

- [ ] **Step 4: Update starting deck in `InvokerCharacter.cs`**

```csharp
public override IEnumerable<CardModel> StartingDeck => [
    // Summon cards — 1 of each type (player gets to try all 3 orbs)
    ModelDb.Card<SummonQuasCard>(),
    ModelDb.Card<SummonWexCard>(),
    ModelDb.Card<SummonExortCard>(),
    // InvokeCard will be added in Task 6
    // Standard starter cards
    ModelDb.Card<StrikeCard>(),  // verify exact name
    ModelDb.Card<StrikeCard>(),
    ModelDb.Card<StrikeCard>(),
    ModelDb.Card<StrikeCard>(),
    ModelDb.Card<DefendCard>(),  // verify exact name
    ModelDb.Card<DefendCard>(),
    ModelDb.Card<DefendCard>(),
    ModelDb.Card<DefendCard>(),
];
```

> ⚠️ `StrikeCard` and `DefendCard` — verify exact class names from STS2 source or use console `card [ID]` to check. Likely `StrikeCardIronclad` or similar if character-specific. Check `sts2.dll` strings for "strike" to find the right class.

- [ ] **Step 5: Create `InvokerMod/localization/zhs/cards.json`** (starter cards only)

```json
{
  "INVOKER-SUMMON_QUAS_CARD.title": "召唤冰魂",
  "INVOKER-SUMMON_QUAS_CARD.description": "召唤1个[INVOKER-QUAS]冰魂[/INVOKER-QUAS]并推入球槽。\n获得格挡（8 + 当前冰魂数×4）。\n[red]每回合限1次[/red]。",

  "INVOKER-SUMMON_WEX_CARD.title": "召唤雷魂",
  "INVOKER-SUMMON_WEX_CARD.description": "召唤1个[INVOKER-WEX]雷魂[/INVOKER-WEX]并推入球槽。\n对随机敌人造成[gold]5[/gold]点伤害。\n[red]每回合限1次[/red]。",

  "INVOKER-SUMMON_EXORT_CARD.title": "召唤炎魂",
  "INVOKER-SUMMON_EXORT_CARD.description": "召唤1个[INVOKER-EXORT]炎魂[/INVOKER-EXORT]并推入球槽。\n对所有敌人造成[gold]3[/gold]点伤害。\n[red]每回合限1次[/red]。"
}
```

- [ ] **Step 6: Create `InvokerMod/localization/en/cards.json`** (matching English)

```json
{
  "INVOKER-SUMMON_QUAS_CARD.title": "Summon Quas",
  "INVOKER-SUMMON_QUAS_CARD.description": "Summon 1 [INVOKER-QUAS]Quas[/INVOKER-QUAS] into your orb slots.\nGain Block (8 + 4 per current Quas).\n[red]Once per turn[/red].",

  "INVOKER-SUMMON_WEX_CARD.title": "Summon Wex",
  "INVOKER-SUMMON_WEX_CARD.description": "Summon 1 [INVOKER-WEX]Wex[/INVOKER-WEX] into your orb slots.\nDeal [gold]5[/gold] damage to a random enemy.\n[red]Once per turn[/red].",

  "INVOKER-SUMMON_EXORT_CARD.title": "Summon Exort",
  "INVOKER-SUMMON_EXORT_CARD.description": "Summon 1 [INVOKER-EXORT]Exort[/INVOKER-EXORT] into your orb slots.\nDeal [gold]3[/gold] damage to all enemies.\n[red]Once per turn[/red]."
}
```

- [ ] **Step 7: Build**

```bash
dotnet build
```

- [ ] **Step 8: In-game check**

Start combat as Invoker. Summon cards appear in hand. Playing SummonQuas pushes a Quas into slot display (FIFO: oldest evicted). Playing same type twice in one turn shows no second effect (tracker works). Auto-summon from command stone still adds an orb.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: SummonQuas/Wex/Exort cards with per-turn tracker"
```

---

## Task 6: InvokeTable + InvokeCard

**Files:**
- Create: `Scripts/Cards/InvokeTable.cs`
- Create: `Scripts/Cards/InvokeCard.cs`
- Modify: `Scripts/Characters/InvokerCharacter.cs` (add InvokeCard to deck)
- Add to: `InvokerMod/localization/zhs/cards.json`

- [ ] **Step 1: Create `Scripts/Cards/InvokeTable.cs`**

```csharp
using Invoker.Scripts.Cards.Spells;

namespace Invoker.Scripts.Cards;

/// <summary>
/// Maps (quasCount, wexCount, exortCount) to a spell card Type.
/// All combinations where q+w+e == 3.
/// Returns null if counts are invalid (sum != 3).
/// </summary>
public static class InvokeTable
{
    public static Type? Lookup(int q, int w, int e)
    {
        if (q + w + e != 3) return null;

        // Normalize: sort the triple to match canonical combinations
        // QQQ=300, QQW=210, QQE=201, QWW=120, QWE=111,
        // WWW=030, WWE=021, WEE=012, QEE=102, EEE=003

        return (q, w, e) switch
        {
            (3, 0, 0) => typeof(ColdSnapCard),       // QQQ
            (2, 1, 0) => typeof(GhostWalkCard),      // QQW
            (2, 0, 1) => typeof(IceWallCard),        // QQE
            (1, 2, 0) => typeof(TornadoCard),        // QWW
            (1, 1, 1) => typeof(DeafeningBlastCard), // QWE
            (0, 3, 0) => typeof(EmpCard),            // WWW
            (0, 2, 1) => typeof(AlacrityCard),       // WWE
            (0, 1, 2) => typeof(ChaosMeteorCard),    // WEE
            (1, 0, 2) => typeof(ForgeSpiritCard),    // QEE
            (0, 0, 3) => typeof(SunStrikeCard),      // EEE
            _ => null
        };
    }
}
```

- [ ] **Step 2: Create `Scripts/Cards/InvokeCard.cs`**

```csharp
using BaseLib.Cards;
using Invoker.Scripts.Orbs;
using Invoker.Scripts.Pools;
using Invoker.Scripts.Relics;
using MegaCrit.Sts2.Core.Cards;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;

namespace Invoker.Scripts.Cards;

[Pool(typeof(InvokerCardPool))]
public class InvokeCard : CustomCardModel
{
    public InvokeCard() : base(
        energyCost: 0,
        type: CardType.Skill,
        rarity: CardRarity.Basic,
        targetType: TargetType.None,
        shouldShowInCardLibrary: false) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        // Count current orbs in slots
        // ⚠️ Exact API to verify — adjust based on Spike result
        var orbs = ctx.Player.Orbs ?? [];  // or however the orb list is accessed
        int q = orbs.Count(o => o is QuasOrb);
        int w = orbs.Count(o => o is WexOrb);
        int e = orbs.Count(o => o is ExortOrb);

        var spellType = InvokeTable.Lookup(q, w, e);
        if (spellType == null)
        {
            Entry.Log.Warn($"InvokeCard: invalid orb counts q={q} w={w} e={e}, no spell generated.");
            return;
        }

        int copies = HasAghanimsScepter(ctx.Player) ? 2 : 1;
        for (int i = 0; i < copies; i++)
        {
            var spell = (CardModel)Activator.CreateInstance(spellType)!;
            await CardPileCmd.AddToHand(spell).Execute(ctx);  // verify exact API
        }
    }

    private static bool HasAghanimsScepter(Player player) =>
        player.AllRelics?.Any(r => r is AghanimsScepter) ?? false;

    protected override void OnUpgrade() { }
}
```

> ⚠️ `ctx.Player.Orbs`, `CardPileCmd.AddToHand` — verify exact APIs. Look for "AddToHand" or "AddCardToHand" in sts2.dll strings.

- [ ] **Step 3: Add InvokeCard to starting deck**

In `InvokerCharacter.cs`, add `ModelDb.Card<InvokeCard>()` to `StartingDeck`.

- [ ] **Step 4: Add InvokeCard localization** to `zhs/cards.json` and `en/cards.json`

zhs:
```json
"INVOKER-INVOKE_CARD.title": "元素祈求",
"INVOKER-INVOKE_CARD.description": "读取球槽中[INVOKER-QUAS]Q[/INVOKER-QUAS][INVOKER-WEX]W[/INVOKER-WEX][INVOKER-EXORT]E[/INVOKER-EXORT]的数量，生成1张对应的召唤法术加入手牌。"
```

en:
```json
"INVOKER-INVOKE_CARD.title": "Invoke",
"INVOKER-INVOKE_CARD.description": "Read the current [INVOKER-QUAS]Q[/INVOKER-QUAS][INVOKER-WEX]W[/INVOKER-WEX][INVOKER-EXORT]E[/INVOKER-EXORT] counts in your orb slots and add the matching spell to your hand."
```

- [ ] **Step 5: Build**

```bash
dotnet build
```

Expected: compile error on missing spell card types (ColdSnapCard etc.) — that's fine, they're forward references. Create empty stub files for each:

```csharp
// Scripts/Cards/Spells/ColdSnapCard.cs (stub)
namespace Invoker.Scripts.Cards.Spells;
public class ColdSnapCard : InvokerCardModel {
    public ColdSnapCard() : base(CardType.Attack, TargetType.AnyEnemy) {}
    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay) {}
}
```

Create stubs for all 10 spell types, build, confirm it compiles.

- [ ] **Step 6: In-game check**

Play InvokeCard with EEE in slots → SunStrikeCard stub appears in hand (0-damage for now). Verify the table lookup works.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: InvokeTable + InvokeCard — core invoke pipeline working"
```

---

## Task 7: Sun Strike (EEE) — Full Spell Pipeline Validation

**Files:**
- Replace stub: `Scripts/Cards/Spells/SunStrikeCard.cs`
- Add to: `InvokerMod/localization/zhs/cards.json` and `en/cards.json`

- [ ] **Step 1: Implement `Scripts/Cards/Spells/SunStrikeCard.cs`**

```csharp
using MegaCrit.Sts2.Core.Cards;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;

namespace Invoker.Scripts.Cards.Spells;

public class SunStrikeCard : InvokerCardModel
{
    public SunStrikeCard() : base(CardType.Attack, TargetType.AnyEnemy) { }

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new DamageVar(IsEnhanced ? 48 : 36, ValueProp.Move)
    ];

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue)
            .FromCard(this)
            .Targeting(cardPlay.Target)
            .Execute(ctx);
    }

    protected override void OnUpgrade()
    {
        DynamicVars.Damage.UpgradeValueBy(12);
    }
}
```

- [ ] **Step 2: Add localization**

zhs:
```json
"INVOKER-SUN_STRIKE_CARD.title": "阳炎之击",
"INVOKER-SUN_STRIKE_CARD.description": "对目标造成{Damage:diff()}点伤害。\n[gold]EEE[/gold]"
```

en:
```json
"INVOKER-SUN_STRIKE_CARD.title": "Sun Strike",
"INVOKER-SUN_STRIKE_CARD.description": "Deal {Damage:diff()} damage.\n[gold]EEE[/gold]"
```

- [ ] **Step 3: Build + full pipeline test**

```bash
dotnet build
```

In-game: equip ExortCommandStone → combat starts with EEE → play InvokeCard → SunStrikeCard appears in hand → play SunStrikeCard → deals 36 damage. Upgrade SunStrikeCard → deals 48 damage.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: SunStrikeCard (EEE) — full invoke pipeline validated"
```

---

## Task 8: Remaining 9 Spell Cards

**Files:** Replace all stubs in `Scripts/Cards/Spells/`

Implement one card at a time in this order (simplest → most complex):

- [ ] **Step 1: `EmpCard.cs` (WWW) — AOE damage**

```csharp
public class EmpCard : InvokerCardModel
{
    public EmpCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new DamageVar(IsEnhanced ? 26 : 20, ValueProp.Move)
    ];

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue)
            .FromCard(this)
            .Targeting(cardPlay.Target)
            .Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(8);
}
```

- [ ] **Step 2: `AlacrityCard.cs` (WWE) — energy + draw**

```csharp
public class AlacrityCard : InvokerCardModel
{
    public AlacrityCard() : base(CardType.Skill, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int energyGain = IsEnhanced ? 3 : 2;
        // TODO: add energy — verify EnergyCmd or similar API
        // await EnergyCmd.Add(energyGain).Execute(ctx);
        await CardPileCmd.Draw(ctx, 2, ctx.Player);
    }

    protected override void OnUpgrade() { }
}
```

- [ ] **Step 3: `ChaosMeteorCard.cs` (WEE) — AOE damage**

```csharp
public class ChaosMeteorCard : InvokerCardModel
{
    public ChaosMeteorCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new DamageVar(IsEnhanced ? 30 : 20, ValueProp.Move)
    ];

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue)
            .FromCard(this).Targeting(cardPlay.Target).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(8);
}
```

- [ ] **Step 4: `DeafeningBlastCard.cs` (QWE) — AOE + weak**

```csharp
public class DeafeningBlastCard : InvokerCardModel
{
    public DeafeningBlastCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new DamageVar(12, ValueProp.Move)
    ];

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue)
            .FromCard(this).Targeting(cardPlay.Target).Execute(ctx);
        // Apply 1 stack of Weak to all enemies
        // await PowerCmd.Apply<WeakPower>(1, cardPlay.Target, ctx);  // verify API
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(6);
}
```

- [ ] **Step 5: `TornadoCard.cs` (QWW) — AOE damage**

```csharp
public class TornadoCard : InvokerCardModel
{
    public TornadoCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new DamageVar(10, ValueProp.Move)
    ];

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue)
            .FromCard(this).Targeting(cardPlay.Target).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(5);
}
```

- [ ] **Step 6: `ColdSnapCard.cs` (QQQ) — single target vulnerable + damage**

```csharp
public class ColdSnapCard : InvokerCardModel
{
    public ColdSnapCard() : base(CardType.Attack, TargetType.AnyEnemy) { }

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new DamageVar(4, ValueProp.Move)
    ];

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int vulnStacks = IsEnhanced ? 5 : 3;
        // await PowerCmd.Apply<VulnerablePower>(vulnStacks, cardPlay.Target, ctx);
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue)
            .FromCard(this).Targeting(cardPlay.Target).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(4);
}
```

- [ ] **Step 7: `GhostWalkCard.cs` (QQW) — block + weak all**

```csharp
public class GhostWalkCard : InvokerCardModel
{
    public GhostWalkCard() : base(CardType.Skill, TargetType.AllEnemies) { }

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new BlockVar(IsEnhanced ? 24 : 16, ValueProp.Move)
    ];

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        // Gain block
        // await BlockCmd.GainBlock(DynamicVars.Block.BaseValue).Execute(ctx);
        // Apply 1 Weak to all enemies
        // await PowerCmd.Apply<WeakPower>(1, cardPlay.Target, ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Block.UpgradeValueBy(8);
}
```

- [ ] **Step 8: `IceWallCard.cs` (QQE) — vulnerable all + damage**

```csharp
public class IceWallCard : InvokerCardModel
{
    public IceWallCard() : base(CardType.Attack, TargetType.AllEnemies) { }

    protected override IEnumerable<DynamicVar> CanonicalVars => [
        new DamageVar(4, ValueProp.Move)
    ];

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int vulnStacks = IsEnhanced ? 4 : 2;
        // await PowerCmd.Apply<VulnerablePower>(vulnStacks, cardPlay.Target, ctx);
        await DamageCmd.Attack(DynamicVars.Damage.BaseValue)
            .FromCard(this).Targeting(cardPlay.Target).Execute(ctx);
    }

    protected override void OnUpgrade() => DynamicVars.Damage.UpgradeValueBy(4);
}
```

- [ ] **Step 9: Add all spell card localization** to `zhs/cards.json` and `en/cards.json`

```json
// zhs additions:
"INVOKER-EMP_CARD.title": "电磁脉冲",
"INVOKER-EMP_CARD.description": "对所有敌人造成{Damage:diff()}点伤害。\n[gold]WWW[/gold]",

"INVOKER-ALACRITY_CARD.title": "灵动迅捷",
"INVOKER-ALACRITY_CARD.description": "获得[blue]2[/blue]点能量。抽[blue]2[/blue]张牌。\n[gold]WWE[/gold]",

"INVOKER-CHAOS_METEOR_CARD.title": "混沌陨石",
"INVOKER-CHAOS_METEOR_CARD.description": "对所有敌人造成{Damage:diff()}点伤害。\n[gold]WEE[/gold]",

"INVOKER-DEAFENING_BLAST_CARD.title": "超强声波",
"INVOKER-DEAFENING_BLAST_CARD.description": "对所有敌人造成{Damage:diff()}点伤害，施加[虚弱]1层虚弱。\n[gold]QWE[/gold]",

"INVOKER-TORNADO_CARD.title": "强袭飓风",
"INVOKER-TORNADO_CARD.description": "对所有敌人造成{Damage:diff()}点伤害。\n[gold]QWW[/gold]",

"INVOKER-COLD_SNAP_CARD.title": "急速冷却",
"INVOKER-COLD_SNAP_CARD.description": "施加[脆弱]3层脆弱。造成{Damage:diff()}点伤害。\n[gold]QQQ[/gold]",

"INVOKER-GHOST_WALK_CARD.title": "幽灵漫步",
"INVOKER-GHOST_WALK_CARD.description": "获得{Block:diff()}点格挡。对所有敌人施加[虚弱]1层虚弱。\n[gold]QQW[/gold]",

"INVOKER-ICE_WALL_CARD.title": "寒冰之墙",
"INVOKER-ICE_WALL_CARD.description": "对所有敌人施加[脆弱]2层脆弱，造成{Damage:diff()}点伤害。\n[gold]QQE[/gold]"
```

- [ ] **Step 10: Build**

```bash
dotnet build
```

- [ ] **Step 11: In-game verify**

Test each orb combination: set up QQQ via console (`card` + manual orb manipulation if possible) → Invoke → verify correct spell appears.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: all 9 non-ForgeSpiritCard spells implemented"
```

---

## Task 9: ForgeSpiritPower + ForgeSpiritCard

**Files:**
- Create: `Scripts/Powers/ForgeSpiritPower.cs`
- Replace stub: `Scripts/Cards/Spells/ForgeSpiritCard.cs`
- Add to: localization jsons

- [ ] **Step 1: Create `Scripts/Powers/ForgeSpiritPower.cs`**

```csharp
using MegaCrit.Sts2.Core.Powers;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;

namespace Invoker.Scripts.Powers;

/// <summary>
/// Decrement power. Each turn (after enemy turn), deals 3 damage to all enemies.
/// Loses 1 stack per trigger. Expires at 0.
/// </summary>
public class ForgeSpiritPower : PowerModel
{
    // PowerStackType.Decrement: automatically decrements and removes at 0
    public override PowerStackType StackType => PowerStackType.Decrement;

    /// <summary>Called after the enemy's turn ends.</summary>
    public override async Task AfterTurnEnd(PlayerChoiceContext ctx, CombatSide side)
    {
        // Only trigger on enemy turns (side == CombatSide.Enemy or similar)
        // ⚠️ Verify CombatSide enum value for enemy
        if (side != CombatSide.Enemy) return;

        await DamageCmd.Attack(3)
            .FromPower(this)               // verify: .FromPower() or .FromSource(this)
            .Targeting(TargetType.AllEnemies)
            .Execute(ctx);
    }
}
```

> ⚠️ Verify: `CombatSide.Enemy` value, `DamageCmd.FromPower()` method name, `TargetType.AllEnemies` usage in this context.

- [ ] **Step 2: Implement `Scripts/Cards/Spells/ForgeSpiritCard.cs`**

```csharp
using Invoker.Scripts.Powers;
using MegaCrit.Sts2.Core.Cards;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;

namespace Invoker.Scripts.Cards.Spells;

public class ForgeSpiritCard : InvokerCardModel
{
    public ForgeSpiritCard() : base(CardType.Power, TargetType.None) { }

    protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
    {
        int stacks = IsEnhanced ? 5 : 3;
        await PowerCmd.Apply<ForgeSpiritPower>(stacks, ctx.Player, ctx);
        // ⚠️ Verify: does Apply target the player (to store the power) even though the effect targets enemies?
        // The power's AfterTurnEnd hook references AllEnemies directly, so Apply(player) is correct.
    }

    protected override void OnUpgrade() { }
}
```

- [ ] **Step 3: Add localization**

zhs:
```json
"INVOKER-FORGE_SPIRIT_CARD.title": "熔炉精灵",
"INVOKER-FORGE_SPIRIT_CARD.description": "施加[gold]熔炉精灵[/gold]：敌方回合结束时，对所有敌人造成[gold]3[/gold]点伤害，持续[gold]3[/gold]回合。\n[gold]QEE[/gold]",
"INVOKER-FORGE_SPIRIT_POWER.title": "熔炉精灵",
"INVOKER-FORGE_SPIRIT_POWER.description": "每次敌方回合结束时，对所有敌人造成[gold]3[/gold]点伤害。"
```

en:
```json
"INVOKER-FORGE_SPIRIT_CARD.title": "Forge Spirit",
"INVOKER-FORGE_SPIRIT_CARD.description": "Apply [gold]Forge Spirit[/gold]: at the end of each enemy turn, deal [gold]3[/gold] damage to all enemies for [gold]3[/gold] turns.\n[gold]QEE[/gold]",
"INVOKER-FORGE_SPIRIT_POWER.title": "Forge Spirit",
"INVOKER-FORGE_SPIRIT_POWER.description": "At the end of each enemy turn, deal [gold]3[/gold] damage to all enemies."
```

- [ ] **Step 4: Build + test**

```bash
dotnet build
```

In-game: invoke QEE → Forge Spirit card appears → play it → counter appears → enemy takes 3 damage after their turn → counter decrements → disappears after 3 enemy turns.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ForgeSpiritPower + ForgeSpiritCard (QEE)"
```

---

## Task 10: Two Relics — Aghanim's Scepter and Shard

**Files:**
- Create: `Scripts/Relics/AghanimsScepter.cs`
- Create: `Scripts/Relics/AghanimsFragment.cs`
- Add to: localization relics.json (zhs + en)

- [ ] **Step 1: Create `Scripts/Relics/AghanimsScepter.cs`**

```csharp
using BaseLib.Relics;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Relics;

namespace Invoker.Scripts.Relics;

[Pool(typeof(InvokerRelicPool))]
public class AghanimsScepter : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Rare;
    // No hooks needed — InvokeCard checks for this relic's presence directly
    // (see InvokeCard.HasAghanimsScepter)
}
```

- [ ] **Step 2: Create `Scripts/Relics/AghanimsFragment.cs`**

```csharp
using BaseLib.Relics;
using Invoker.Scripts.Cards;
using Invoker.Scripts.Pools;
using MegaCrit.Sts2.Core.Cards;
using MegaCrit.Sts2.Core.Combat;
using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Relics;

namespace Invoker.Scripts.Relics;

[Pool(typeof(InvokerRelicPool))]
public class AghanimsFragment : CustomRelicModel
{
    public override RelicRarity Rarity => RelicRarity.Uncommon;

    private static readonly Type[] AllSpells = [
        typeof(Spells.ColdSnapCard),
        typeof(Spells.GhostWalkCard),
        typeof(Spells.IceWallCard),
        typeof(Spells.TornadoCard),
        typeof(Spells.DeafeningBlastCard),
        typeof(Spells.EmpCard),
        typeof(Spells.AlacrityCard),
        typeof(Spells.ChaosMeteorCard),
        typeof(Spells.ForgeSpiritCard),
        typeof(Spells.SunStrikeCard),
    ];

    public override async Task AfterPlayerTurnStart(PlayerChoiceContext ctx, Player player)
    {
        // 25% chance: add a random spell to hand
        if (Random.Shared.NextDouble() < 0.25)
        {
            var spellType = AllSpells[Random.Shared.Next(AllSpells.Length)];
            var spell = (CardModel)Activator.CreateInstance(spellType)!;
            await CardPileCmd.AddToHand(spell).Execute(ctx);  // verify API
        }
    }
}
```

- [ ] **Step 3: Add relic localization**

zhs additions to `relics.json`:
```json
"INVOKER-AGHANIMS_SCEPTER.title": "阿哈利姆的神杖",
"INVOKER-AGHANIMS_SCEPTER.description": "打出[gold]元素祈求[/gold]时，生成[blue]2[/blue]张对应技能卡加入手牌（而非1张）。",
"INVOKER-AGHANIMS_SCEPTER.flavor": "蕴含着千年法力的传说神器。",

"INVOKER-AGHANIMS_FRAGMENT.title": "魔晶",
"INVOKER-AGHANIMS_FRAGMENT.description": "每回合开始时，有[gold]25%[/gold]的概率将1张随机召唤技能卡加入手牌。",
"INVOKER-AGHANIMS_FRAGMENT.flavor": "神杖的碎片，依然蕴含着力量。"
```

- [ ] **Step 4: Build + test**

```bash
dotnet build
```

In-game: obtain Scepter via console (`relic INVOKER-AGHANIMS_SCEPTER`) → play InvokeCard → 2 spells appear. Obtain Fragment → start turn → sometimes a spell appears for free.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: AghanimsScepter and AghanimsFragment relics"
```

---

## Task 11: Complete i18n and Keyword Hover

**Files:**
- Complete: `InvokerMod/localization/zhs/keywords.json`
- Complete: `InvokerMod/localization/en/keywords.json`
- Review: all other localization files for completeness

- [ ] **Step 1: Create `InvokerMod/localization/zhs/keywords.json`**

```json
{
  "INVOKER-QUAS.name": "冰魂",
  "INVOKER-QUAS.description": "推入球槽时立刻获得格挡（8 + 当前冰魂数×4）。球槽满时推出最早的球。",

  "INVOKER-WEX.name": "雷魂",
  "INVOKER-WEX.description": "推入球槽时对随机敌人造成5点伤害。球槽满时推出最早的球。",

  "INVOKER-EXORT.name": "炎魂",
  "INVOKER-EXORT.description": "推入球槽时对所有敌人造成3点伤害。球槽满时推出最早的球。",

  "INVOKER-INVOKE.name": "元素祈求",
  "INVOKER-INVOKE.description": "读取球槽中[INVOKER-QUAS]冰魂[/INVOKER-QUAS]、[INVOKER-WEX]雷魂[/INVOKER-WEX]、[INVOKER-EXORT]炎魂[/INVOKER-EXORT]的数量组合，生成对应的1费召唤法术。"
}
```

> ⚠️ **Spike**: Verify that `INVOKER-QUAS` (with MODID prefix) is the correct key format for hover tags (`[INVOKER-QUAS]...[/INVOKER-QUAS]`). Check BaseLib source or test in-game. If prefix is NOT needed, change all keys to just `QUAS`, `WEX`, `EXORT`, `INVOKE` and update all card descriptions accordingly.

- [ ] **Step 2: Create `InvokerMod/localization/en/keywords.json`**

```json
{
  "INVOKER-QUAS.name": "Quas",
  "INVOKER-QUAS.description": "When pushed into an orb slot: gain Block (8 + 4 per current Quas count). The oldest orb is evicted when slots are full.",

  "INVOKER-WEX.name": "Wex",
  "INVOKER-WEX.description": "When pushed into an orb slot: deal 5 damage to a random enemy. The oldest orb is evicted when slots are full.",

  "INVOKER-EXORT.name": "Exort",
  "INVOKER-EXORT.description": "When pushed into an orb slot: deal 3 damage to all enemies. The oldest orb is evicted when slots are full.",

  "INVOKER-INVOKE.name": "Invoke",
  "INVOKER-INVOKE.description": "Read the [INVOKER-QUAS]Quas[/INVOKER-QUAS], [INVOKER-WEX]Wex[/INVOKER-WEX], [INVOKER-EXORT]Exort[/INVOKER-EXORT] counts in your orb slots and generate the matching 1-cost spell."
}
```

- [ ] **Step 3: Verify {DynamicVar:diff()} + hover tag coexistence**

In-game: hover over a card whose description contains both `{Damage:diff()}` and `[INVOKER-QUAS]...[/INVOKER-QUAS]`. Verify both render correctly (no broken text, tooltip pops up on hover).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete i18n and keyword hover — zhs + en"
```

---

## Task 12: Command Stone Enhancement Logic

**Files:**
- Modify: `Scripts/Relics/QuasCommandStone.cs`
- Modify: `Scripts/Relics/WexCommandStone.cs`
- Modify: `Scripts/Relics/ExortCommandStone.cs`
- Modify: `Scripts/Cards/InvokeCard.cs`

The enhancement: when a player with QuasCommandStone invokes a Q-heavy spell (QQQ/QQW/QQE), the spell is flagged `IsEnhanced = true` before being added to hand. Same for W and E stones.

- [ ] **Step 1: Add enhancement logic to `InvokeCard.cs`**

Extend `OnPlay` to set `IsEnhanced` before adding to hand:

```csharp
protected override async Task OnPlay(PlayerChoiceContext ctx, CardPlay cardPlay)
{
    var orbs = ctx.Player.Orbs ?? [];
    int q = orbs.Count(o => o is QuasOrb);
    int w = orbs.Count(o => o is WexOrb);
    int e = orbs.Count(o => o is ExortOrb);

    var spellType = InvokeTable.Lookup(q, w, e);
    if (spellType == null) { Entry.Log.Warn($"Invalid orb counts q={q} w={w} e={e}"); return; }

    bool enhanced = IsEnhancedByStone(ctx.Player, q, w, e);
    int copies = HasAghanimsScepter(ctx.Player) ? 2 : 1;

    for (int i = 0; i < copies; i++)
    {
        var spell = (InvokerCardModel)Activator.CreateInstance(spellType)!;
        spell.IsEnhanced = enhanced;
        await CardPileCmd.AddToHand(spell).Execute(ctx);
    }
}

private static bool IsEnhancedByStone(Player player, int q, int w, int e)
{
    var relics = player.AllRelics;
    if (relics == null) return false;

    // QuasCommandStone enhances Q-heavy spells (at least 2 Q)
    if (relics.Any(r => r is QuasCommandStone) && q >= 2) return true;
    // WexCommandStone enhances W-heavy spells (at least 2 W, or QWW)
    if (relics.Any(r => r is WexCommandStone) && w >= 2) return true;
    // ExortCommandStone enhances E-heavy spells (at least 2 E)
    if (relics.Any(r => r is ExortCommandStone) && e >= 2) return true;

    return false;
}
```

- [ ] **Step 2: Build + test enhancements**

```bash
dotnet build
```

In-game with QuasCommandStone: invoke QQQ → SunStrike-equivalent card shows +2 vulnerable. Invoke WWW (no enhancement for Quas stone) → normal EMP.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: command stone spell enhancement via IsEnhanced flag"
```

---

## Task 13: Card Images (PCK Export)

> This task requires Godot 4.5.1 Mono installed.

**Files:**
- Modify: `Scripts/Cards/InvokerCardModel.cs` (add PortraitPath)
- Create: Godot scene files (copy from tutorial templates, adapt for Invoker)

- [ ] **Step 1: Set up Godot project**

Open Godot 4.5.1 Mono. Import project from `C:\code\slay\InvokerMod\`. Godot will scan `project.godot` and set up the project.

- [ ] **Step 2: Copy images into project**

Ensure `C:\code\slay\InvokerMod\images\cards\` contains all 14 PNG files (from assets/cards/). Ensure `C:\code\slay\InvokerMod\images\invoker.png` exists.

- [ ] **Step 3: Add PortraitPath to InvokerCardModel**

```csharp
public override string PortraitPath =>
    $"res://images/cards/{Id.Entry.ToLowerInvariant()}.png";
```

Check that the `Id.Entry` value matches the image filename for each card (e.g., `sun_strike_card` → `invoker_sun_strike.png`). You may need per-card overrides if names don't match exactly.

- [ ] **Step 4: Create Godot scenes** (copy tutorial templates)

Copy `test_character.tscn`, `test_energy_counter.tscn`, `test_bg.tscn` from `C:\code\slay\SlayTheSpire2ModdingTutorials\Basics\05 - 添加新人物\` into `C:\code\slay\InvokerMod\scenes\`. Rename to `invoker_character.tscn`, `invoker_energy_counter.tscn`, `invoker_bg.tscn`.

Update all internal script and resource references to point to `InvokerMod` paths. Follow the energy counter "神秘操作" manual tscn editing steps from the tutorial.

- [ ] **Step 5: Uncomment visual paths in InvokerCharacter.cs**

```csharp
public override string CustomVisualPath => "res://scenes/invoker_character.tscn";
public override string CustomEnergyCounterPath => "res://scenes/invoker_energy_counter.tscn";
public override string CustomCharacterSelectBg => "res://scenes/invoker_bg.tscn";
public override string CustomIconTexturePath => "res://images/invoker.png";
```

- [ ] **Step 6: Export PCK from Godot**

In Godot: Project → Export → Add export preset for Windows. In "Resources" tab, make sure `images/` and `scenes/` are included. Export as `.pck` only (no executable). Place the exported `InvokerMod.pck` in the game's mods folder: `<SteamDir>\mods\InvokerMod\`.

- [ ] **Step 7: Build + test**

```bash
dotnet build
```

Launch game: Invoker character should now show the invoker.png portrait. Card images should appear on spell cards.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: card images via Godot PCK — PortraitPath + visual scenes"
```

---

## API Spike Reference (update as you discover real values)

| Symbol | Best-guess | Confirmed | Notes |
|--------|-----------|-----------|-------|
| `player.OrbSlotVar = 3` | | ❓ | Task 3 spike |
| `OrbCmd.Add<T>()` | | ❓ | Task 3 spike |
| `ctx.Player.Orbs` | | ❓ | Task 6 |
| `CardPileCmd.AddToHand(card)` | | ❓ | Task 6 |
| `PowerCmd.Apply<T>(stacks, target, ctx)` | | ❓ | Task 9 |
| `DamageCmd.FromPower(this)` | | ❓ | Task 9 |
| `CombatSide.Enemy` | | ❓ | Task 9 |
| `EnergyCmd.Add(n)` | | ❓ | Task 8 |
| `BlockCmd.GainBlock(n)` | | ❓ | Task 8 |
| `WeakPower` / `VulnerablePower` class names | | ❓ | Task 8 |
| `StrikeCard` / `DefendCard` class names | | ❓ | Task 5 |

When a spike confirms an API: fill in the "Confirmed" column and update `docs/api-reference/core-classes.md`.
