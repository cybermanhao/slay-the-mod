# DevToolMod

Development tool mod for Slay the Spire 2 - HTTP API for game debugging and state inspection.

## Features

- **HTTP API Server** - REST API on port 18432
- **Game State Reader** - Read combat, player, enemy, card, orb, and run information
- **Scene Tree Access** - Traverse Godot scene tree for rendering verification
- **Console Command Execution** - Execute game console commands

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/state` | GET | Full game state (screen, combat, run) |
| `/actions` | GET | Available actions for current context |
| `/scene_tree` | GET | Scene tree with `?path=X&depth=N` params |
| `/node/<path>` | GET | Find node by path (e.g., `/node/root/Combat/Player`) |
| `/console` | POST | Execute console command with `?cmd=X` or body `{"cmd": "X"}` |

## State Response Format

```json
{
  "Version": 6,
  "AgentViewVersion": 1,
  "Screen": "Combat",
  "InCombat": true,
  "Combat": {
    "Turn": 3,
    "Player": { "Health": 80, "MaxHealth": 100, "Block": 10, "Energy": 3, "MaxEnergy": 3 },
    "Enemies": [{ "Index": 0, "Id": "Slime", "Health": 30, "MaxHealth": 30, "Block": 0 }],
    "Hand": [{ "Index": 0, "CardId": "Strike", "Name": "Strike", "Cost": 1 }],
    "Orbs": [{ "Type": "Lightning", "PassiveAmount": 6, "EvokeAmount": 8 }]
  },
  "Run": { "Act": 1, "Floor": 5, "Gold": 150 },
  "AvailableActions": ["end_turn", "play_card"]
}
```

## Console Commands

Available commands include: `heal`, `gold`, `energy`, `draw`, `block`, `card`, `kill`, `damage`, `fight`, `travel`, `act`, `stars`, `unlock`, `upgrade`, `godmode`, `getlogs`

## Build

```bash
dotnet build
```

## Deploy

After building, export the PCK and deploy to:
```
C:\Program Files (x86)\Steam\steamapps\common\Slay the Spire 2\mods\
```
