# STS2 Mod Agent

自然语言创建 Slay the Spire 2 Mod 的 Agent 工具平台。

## Features

- **MCP Server**: 代码生成、文件操作、项目构建工具
- **Claude Skill**: STS2 modding 知识库，即取即用
- **Agent**: 理解需求，分解任务，调用 MCP 工具执行
- **可视化编辑器** (规划中): 卡牌/遗物属性编辑、实时预览

## Tech Stack

- **MCP**: Model Context Protocol
- **Skill**: Claude Code Skill
- **Modding**: Godot 4.5.1 + C# + BaseLib
- **Editor**: Tauri + React + TypeScript (规划中)

## Project Structure

```
├── reference/              # 参考资料
│   ├── decompiled_src/   # 游戏反编译源码
│   ├── BaseLib-StS2/     # BaseLib 框架
│   └── ModTemplate-STS2/ # 官方模板
├── mods/                  # 开发的 Mod
├── packages/              # MCP Server
├── skills/                # Claude Skill
├── tools/                 # 工具
└── docs/                  # 文档
```

## Getting Started

### Prerequisites

- Godot 4.5.1 Mono
- .NET 9
- Claude Code (使用 Skill)

### 使用 Skill

```bash
# Claude Code 自动加载 skills/slay-the-spire-2-modding
# 直接描述需求，如：
# "创建一个包含3张攻击牌和1张遗物的mod"
```

### 开发 Mod

```bash
# 1. 修改代码
dotnet build

# 2. 导出 PCK
Godot --headless --path . --export-pack "Windows Desktop" MyMod.pck

# 3. 部署到游戏
cp MyMod.pck "$STEAM mods/MyMod/"
cp MyMod.dll "$STEAM mods/MyMod/"
```

## 文档

- [SPEC.md](docs/SPEC.md) - 架构规格
- [reference/tutorials/](reference/tutorials/) - 官方教程

## License

MIT
