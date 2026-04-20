# STS2 Art Director Agent Design

**Date:** 2026-03-21
**Status:** Draft

## Goal

Integrate an Art Director Agent into `sts2-asset-generator` Skill as the artistic direction engine. Responsibilities: understand asset requirements, analyze source game assets, design Gemini prompts, execute generation, and post-process output.

## Asset Type Coverage

| Type | Dimensions | Aspect Ratio |
|------|------------|--------------|
| Card Portrait | 1000×760 | 1.316:1 |
| Relic Icon | 256×256 | 1:1 |
| Power Icon | 256×256 | 1:1 |
| Character Portrait | 1000×760 | 1.316:1 |

## Two Working Modes

### Mode A — Fast Pipeline

```
Input → Analyze (optional skip) → Generate → Post-process → Output
```

- Triggered when input is simple / user selects fast mode
- No human intervention
- Maximum 1 generation attempt

### Mode B — Reflection Loop (with optional human check-in)

```
Input → Analyze Source Cards → Prompt Design → [Human Confirm] → Generate → Evaluate → [Human Can Intervene]
           ↓ not converged              ↓ fail            ↓ fail
        Improve Prompt → Regenerate → Re-evaluate → Continue or Output
```

- Triggered when input is complex or user selects reflection mode
- Up to 3 iterations
- Human confirms prompt before generation (not after every iteration)
- Human can intervene at evaluation failure

## Analysis Pipeline

1. **Input Parsing**
   - Asset type (card/relic/power/character)
   - Character class (ironclad/silent/defect/necrobinder/regent/custom)
   - Card/skill description
   - Style direction (e.g., "elemental magic", "melee weapon")

2. **Reference Extraction**
   - Load source game assets from `reference/decompiled_src/Slay the Spire 2/images/packed/card_portraits/{character}/`
   - PNG files are standard PNG format (not compressed .ctex)
   - Up to 6 images per Gemini analysis call

3. **Style Hint Generation**
   - Color palette from character + asset type
   - Lighting style (rim lighting, backlighting, etc.)
   - Composition patterns
   - Key visual elements

## Prompt Design

### Input for Gemini Image Generation

```typescript
interface GenerateRequest {
  model: 'gemini-2.5-flash-preview' | 'gemini-3.1-flash-preview';
  aspectRatio: '2:3' | '1:1' | '5:4'; // based on asset type
  imageSize: '512px' | '1K' | '2K' | '4K'; // 1K for draft, 2K+ for final
  prompt: string;
}
```

### Post-processing (Sharp)

- Crop to exact dimensions (1000×760 for cards, 256×256 for icons)
- PNG format output
- Quality: 100% for final

## Output Structure

```json
{
  "success": true,
  "asset": {
    "type": "card_portrait",
    "path": "mods/Invoker/images/invoker/cards/strike_invoker.png",
    "dimensions": { "width": 1000, "height": 760 },
    "character": "invoker",
    "cardType": "attack",
    "styleHints": { "...": "..." },
    "promptHash": "sha256_first_16_chars"
  },
  "iterations": 1,
  "mode": "fast_pipeline"
}
```

## File Locations

- **Scripts**: `skills/sts2-asset-generator/scripts/art-director.ts`
- **References**: `skills/sts2-asset-generator/references/`
- **Output**: `mods/{ModName}/images/{category}/`

## Key Finding: Source PNG Assets

Source game assets are available as PNG (not Godot .ctex):
- Path: `reference/decompiled_src/Slay the Spire 2/images/packed/card_portraits/{character}/`
- Just rename `.png.import` to `.png` or extract from the .ctex (which is actually PNG data)
- Card portraits: 1000×760
- Relic icons: 256×256
- Power icons: 256×256

## Atlas Region Finding

Game uses TexturePacker `.tpsheet` JSON for atlas sprites:
- Path: `res://images/atlases/{atlasName}.tpsheet` (inside PCK)
- Class: `MegaCrit.Sts2.Core.Assets.AtlasManager`
- Structure: `TpSheetSprite { Region: {X, Y, W, H}, Margin: {X, Y, W, H} }`
- API: `AtlasManager.GetSprite("card_atlas", "ironclad/strike_ironclad")`

## Open Questions

- [ ] Character portrait dimensions (may differ from card portraits)
- [ ] Batch generation support (multiple cards at once)
- [ ] Prompt history storage for consistency across sessions
