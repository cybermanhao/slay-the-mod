# DevToolMod API Documentation

## Base URL

```
http://127.0.0.1:18432
```

## Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "service": "DevToolMod",
  "version": "0.1.0",
  "endpoints": ["/health", "/state", "/actions", "/scene_tree", "/console", "/node/<path>"]
}
```

---

### GET /state

Returns full game state.

**Query Parameters:** None

**Response:**
```json
{
  "Version": 6,
  "AgentViewVersion": 1,
  "Screen": "Combat",
  "InCombat": true,
  "Combat": {
    "Turn": 3,
    "Player": {
      "Health": 80,
      "MaxHealth": 100,
      "Block": 10,
      "Energy": 3,
      "MaxEnergy": 3
    },
    "Enemies": [
      {
        "Index": 0,
        "Id": "Slime",
        "Health": 30,
        "MaxHealth": 30,
        "Block": 0
      }
    ],
    "Hand": [
      {
        "Index": 0,
        "CardId": "Strike",
        "Name": "Strike",
        "Cost": 1
      }
    ],
    "Orbs": [
      {
        "Type": "Lightning",
        "PassiveAmount": 6,
        "EvokeAmount": 8
      }
    ]
  },
  "Run": {
    "Act": 1,
    "Floor": 5,
    "Gold": 150
  },
  "AvailableActions": ["end_turn", "play_card"]
}
```

---

### GET /actions

Returns available actions for current context.

**Response:**
```json
{
  "actions": ["end_turn", "play_card"]
}
```

During non-combat:
```json
{
  "actions": ["proceed", "choose_map_node"]
}
```

---

### GET /scene_tree

Returns scene tree starting from root or specified path.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | string | (root) | Starting node path |
| `depth` | int | 2 | Max traversal depth |

**Example:** `GET /scene_tree?path=/root/Combat&depth=3`

**Response:**
```json
{
  "Name": "Combat",
  "Type": "Node2D",
  "Visible": true,
  "Position": { "x": 0, "y": 0 },
  "Scale": { "x": 1, "y": 1 },
  "Children": [
    {
      "Name": "Player",
      "Type": "CharacterBody2D",
      "Visible": true,
      "Position": { "x": 100, "y": 200 },
      "Scale": { "x": 1, "y": 1 }
    }
  ]
}
```

---

### GET /node/<path>

Find and serialize a specific node by path.

**Example:** `GET /node/root/Combat/Player`

**Response:** Same format as scene_tree node (max depth 2)

**Error 404:** Node not found

---

### POST /console

Execute a console command.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `cmd` | Command to execute |

Or send JSON body: `{"cmd": "heal 10"}`

**Example:** `POST /console?cmd=heal%2010`

**Response:**
```json
{
  "success": true,
  "message": "Healed '10' HP to Ironclad."
}
```

---

## Common Console Commands

| Command | Args | Description |
|---------|------|-------------|
| `heal` | `<amount:int>` | Heal player |
| `gold` | `<amount:int>` | Add gold |
| `energy` | `<amount:int>` | Set energy |
| `draw` | `<amount:int>` | Draw cards |
| `block` | `<amount:int>` | Add block |
| `card` | `<name:string>` | Add card to hand |
| `kill` | - | Kill all enemies |
| `damage` | `<target:int> <amount:int>` | Deal damage |
| `fight` | - | Start combat |
| `travel` | `<node:string>` | Travel to map node |
| `act` | `<num:int>` | Jump to act |
| `stars` | `<amount:int>` | Set stars |
| `unlock` | `<id:string>` | Unlock content |
| `upgrade` | `<card:int>` | Upgrade card |
| `godmode` | - | Toggle god mode |
| `getlogs` | `<name:string>` | Collect logs |

## Error Response Format

```json
{
  "ok": false,
  "error": {
    "code": "not_found",
    "message": "Node not found: /root/Invalid"
  }
}
```
