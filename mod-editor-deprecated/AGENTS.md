# AGENTS.md - STS2 Mod Visualizer

## Project Overview

Desktop application for creating Slay the Spire 2 mods (cards, relics, characters). Built with Tauri v2 + React 19 + TypeScript + Vite.

## Essential Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run build` | Build frontend (TS + Vite) |
| `npm run tauri` | Run Tauri app in dev mode |
| `npm run tauri build` | Build production Tauri app |

Working directory: `C:/code/slay-the-mod/visualize/`

## Code Organization

```
visualize/
├── src/                      # React frontend
│   ├── components/           # UI components
│   │   ├── editor/           # Card/Relic/Export editors
│   │   ├── layout/           # Sidebar, etc.
│   │   └── preview/           # Card preview panel
│   ├── services/             # Tauri IPC calls
│   │   ├── fileService.ts    # Save/load project
│   │   └── exportService.ts  # Mod export logic
│   ├── stores/               # Zustand state
│   │   └── appStore.ts       # Main app state
│   ├── types/                # TypeScript interfaces
│   │   └── index.ts          # Card, Relic, Character types
│   └── App.tsx               # Root component
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── lib.rs            # Tauri commands
│   │   └── main.rs           # Entry point
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri config
└── package.json
```

## Code Patterns

### TypeScript/React

- **State Management**: Zustand with `persist` middleware. Store in `src/stores/appStore.ts`
- **i18n**: Use `Record<'en' | 'zh' | 'ja', string>` for localized strings
- **IDs**: Use `crypto.randomUUID()` or `Date.now()` for unique IDs
- **Components**: Functional components with hooks

### Rust (Tauri Commands)

- Commands defined in `src-tauri/src/lib.rs`
- Use `#[tauri::command]` attribute
- Return `Result<T, String>` for error handling
- Invoke from frontend via `@tauri-apps/api/core`

### Tauri IPC

```typescript
import { invoke } from '@tauri-apps/api/core';

// Available commands
invoke<string>('save_project', { filePath, jsonContent });
invoke<string>('load_project', { filePath });
invoke('save_file', { path, contents });
invoke<string>('greet', { name });
```

## Type Definitions

Key interfaces in `src/types/index.ts`:

- `Card` - Full card model with vars, effects, keywords, tags
- `CardType` - None, Attack, Skill, Power, Status, Curse, Quest
- `CardRarity` - Basic, Common, Uncommon, Rare, Ancient, Event, Token, Status, Curse
- `TargetType` - Self, AnyEnemy, AllEnemies, RandomEnemy, AnyPlayer, AnyAlly
- `CardKeyword` - Exhaust, Ethereal, Innate, Unplayable, Retain, Sly, Eternal
- `DynamicVar` - Damage, Block, Draw, Heal, Energy, Gold, Stars, etc.
- `Relic` - Relic with 20+ hooks (AfterPlayerTurnStart, OnCardPlayed, etc.)
- `CharacterConfig` - Character with starting HP, relic IDs, card pool
- `ModProject` - Main project containing cards, relics, character
- `VANILLA_CARD_TEMPLATES` - 30+ extracted vanilla card templates

## Build Configuration

- **Frontend**: Vite + TypeScript
- **Backend**: Tauri v2 with Rust
- **Window**: 1200x800, min 1000x600
- **Plugins**: tauri-plugin-dialog, tauri-plugin-fs, tauri-plugin-opener

## Export Generates

- `Scripts/Entry.cs` - Mod entry point
- `Scripts/Cards/{CardName}.cs` - Card C# code (extends CustomCardModel)
- `Scripts/Relics/{RelicName}.cs` - Relic C# code (extends RelicModel)
- `mod_manifest.json` - Mod manifest
- `localization/{lang}/cards.json` - Card text
- `localization/{lang}/relics.json` - Relic text

## Gotchas

1. **Working directory**: Always use `visualize/` subdirectory for commands
2. **Tauri dev**: Use `npm run tauri` not `npm run dev` to run the full desktop app
3. **Rust lib name**: Cargo.toml uses `visualize_modding_lib` (underscores, not hyphens)
4. **Permissions**: File system permissions configured in `src-tauri/capabilities/default.json`
5. **State persistence**: Zustand persists to localStorage under key `sts2-mod-visualizer`
6. **Card effects**: Effects array must sync with vars array for display values

## Decompiled Game Reference

Game source code located at: `C:/code/Slay the Spire 2/`

### Documentation

- `C:/code/slay/docs/decompiled/card-system.md` - Card model, types, implementation
- `C:/code/slay/docs/decompiled/hooks-system.md` - Hook system for relics/powers

### Key Source Files

| File | Description |
|------|-------------|
| `src/Core/Models/CardModel.cs` | Base card class |
| `src/Core/Entities/Cards/CardType.cs` | CardType enum |
| `src/Core/Entities/Cards/CardRarity.cs` | CardRarity enum |
| `src/Core/Entities/Cards/TargetType.cs` | TargetType enum |
| `src/Core/Entities/Cards/CardKeyword.cs` | CardKeyword enum |
| `src/Core/Models/RelicModel.cs` | Base relic class |
| `src/Core/Hooks/Hook.cs` | Hook entry points |
| `localization/eng/cards.json` | Card text localization |

## Testing

No test framework currently configured. Manual testing via `npm run tauri`.

## Future Work

- Relic editor UI (placeholder exists)
- Character editor UI (placeholder exists)
- AI image generation with Gemini API
