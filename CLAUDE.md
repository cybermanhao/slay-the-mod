# STS2 Mod 开发工具

## 项目定位

自然语言创建 Slay the Spire 2 Mod 的 Agent 工具平台，包含：
- MCP Server: 代码生成、文件操作、项目构建工具
- Skill: STS2 modding 知识库
- Agent: 理解需求，分解任务，调用 MCP 工具执行

## 本地路径

- **项目根**: `C:\code\slay-the-mod\`
- **反编译源码**: `reference/decompiled_src/`
- **游戏 mods**: `C:\Program Files (x86)\Steam\steamapps\common\Slay the Spire 2\mods\`
- **Skill**: `skills/slay-the-spire-2-modding/`
- **LeoChat**: `C:\code\LeoChat\`
- **OpenMCP**: VSCode/Trae 插件

## MCP 开发调试

### 方式1: LeoChat

```bash
# 1. 启动 MCP Server
cd packages/sts2-mcp-server
pnpm install
pnpm dev

# 2. 启动 LeoChat (另一个终端)
cd C:\code\LeoChat
pnpm dev

# 3. 在 LeoChat UI 添加 MCP Server 配置
```

### 方式2: OpenMCP (VSCode 插件)

1. 安装 OpenMCP 插件到 VSCode/Trae
2. 配置连接 sts2-mcp-server
3. 使用 Inspector 测试工具

### MCP Server 配置

```json
// .openmcp/connection.json
{
  "items": [
    {
      "type": "stdio",
      "name": "STS2 MCP",
      "command": "node",
      "args": ["C:/code/slay-the-mod/packages/sts2-mcp-server/dist/index.js"]
    }
  ]
}
```

### MCP 设计文档

- **设计Spec**: `packages/sts2-mcp-server/SPEC.md`
- 包含完整的功能规划、架构分层、实现优先级
- **外部MCP**: fast-filesystem-mcp (文件操作)

## Mod 开发流程

1. 修改代码 → `dotnet build`
2. 导出 PCK: Godot headless export
3. 部署: 复制 .pck + .dll 到游戏 mods 目录

## 调试

- 游戏日志: `%APPDATA%\Roaming\SlayTheSpire2\logs\`

## 示例项目: Invoker

- **路径**: `mods/Invoker/`
- **状态**: 正在开发中
- **用途**: 验证技术可行性，开发成功后更新 Skill 与 MCP

### 开发流程

```bash
# 1. 编译
cd mods/Invoker
dotnet build

# 2. 导出 PCK（已自动化）
# 生成 InvokerMod.pck

# 3. 部署（注意：目标是 mods/InvokerMod/ 子目录，DLL 由 csproj 自动复制）
cp InvokerMod.pck "C:\Program Files (x86)\Steam\steamapps\common\Slay the Spire 2\mods\InvokerMod\"
```

### 技术验证

- 如 Invoker 开发成功且具有价值 → 将技术经验更新到 Skill 和 MCP
