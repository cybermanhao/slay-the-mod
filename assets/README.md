# Asset Generation Workspace

生成流水线的工作目录。**不是 mod 目录**，不打包进 PCK。

## 结构

```
assets/
├── assets.db                          # SQLite：所有版本元数据（版本历史、防飘逸）
├── characters/
│   └── {characterId}/
│       ├── spec/
│       │   ├── history/               # 每版 character-sheet 快照 (v1_xxx.json)
│       │   └── (current 由 DB 指向)
│       ├── reference/
│       │   └── current.png            # I2V 参考图（当前激活版）
│       └── animations/
│           └── {animationName}/
│               ├── current/           # 当前激活版帧序列 + tscn
│               │   ├── frames/
│               │   └── {name}.tscn
│               └── history/           # 历史版本（v1_xxx/ v2_xxx/）
├── cards/
│   └── {cardId}/
│       ├── current.png
│       └── history/
├── relics/
│   └── {relicId}/
│       ├── current.png
│       └── history/
└── orbs/
    └── {orbId}/
        ├── current.png
        └── history/
```

## 防语义飘逸机制

每个 `asset_version` 记录 `spec_version_id`（生成时用的设定集版本）。
调用 `asset_drift_check` 工具可查出哪些资产用的是旧设定集，需要重新生成。

## 部署

生成完成后由 `sync_assets`（cli-helper-mcp）复制到 `mods/Invoker/images/`，
再经 `build_mod` 打包 PCK 部署到游戏。
