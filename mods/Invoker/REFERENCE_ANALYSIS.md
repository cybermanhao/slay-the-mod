# STS2 Mod 示例分析 — 从社区学到的最佳实践

> 基于 GitHub 搜索 + 本地 reference 目录分析  
> 分析目标：为 Invoker Mod 找出可借鉴的代码模式、架构改进和潜在问题修复方案

---

## 目录

1. [分析来源](#分析来源)
2. [项目结构对比](#项目结构对比)
3. [关键代码模式](#关键代码模式)
4. [可借鉴的具体改进](#可借鉴的具体改进)
5. [社区 mod 亮点](#社区-mod-亮点)
6. [我们当前的差距](#我们当前的差距)

---

## 分析来源

### GitHub 搜索发现的 mod

| Mod | 作者 | 类型 | 亮点 |
|-----|------|------|------|
| **STS2-Buu** | harsh2204 | 角色 mod | 完整角色（姿态系统、Ki 资源、Spine 动画、GitHub Pages 卡册） |
| **sts2-font-scaling** | IbrahimCSAE | UI mod | Godot UI 注入、设置面板集成、跨平台配置 |
| **sts2-quickRestart** | freude916 | 工具 mod | 中文教程资源、ModTemplate 使用说明 |
| **sts2-main-menu-mod-manager** | 本地 reference | UI mod | 主菜单按钮注入、主题切换、反射调用游戏内部方法 |
| **ModConfig-STS2** | 本地 reference | 框架 mod | 跨 mod 配置系统、零 Harmony、设置面板注入 |

### 本地 reference 目录

| 项目 | 用途 |
|------|------|
| `ModTemplate-StS2` | 官方角色模板（BaseLib） |
| `SlayTheSpire2ModdingTutorials` | 中文社区教程（BaseLib 接口、角色创建、Godot 场景） |
| `StS2ModAnalyzers` | Roslyn 分析器示例 + Sample 代码 |
| `ModConfig-STS2` | 跨 mod 配置系统参考 |
| `sts2-main-menu-mod-manager` | Godot UI 注入高级示例 |

---

## 项目结构对比

### ModTemplate-StS2 推荐结构

```
{ModId}/
├── {ModId}.csproj              # 项目文件
├── {ModId}.json                # mod 清单
├── {ModId}.sln                 # 解决方案
├── MainFile.cs                 # Entry + Harmony 初始化
└── {ModId}Code/                # C# 代码
    ├── Cards/
    │   └── {ModId}Card.cs      # 抽象基类，统一 PortraitPath
    ├── Character/
    │   ├── {ModId}.cs          # PlaceholderCharacterModel
    │   ├── {ModId}CardPool.cs
    │   ├── {ModId}RelicPool.cs
    │   └── {ModId}PotionPool.cs
    ├── Potions/
    ├── Powers/
    │   └── {ModId}Power.cs     # 抽象基类，统一 IconPath（带 fallback）
    ├── Relics/
    │   └── {ModId}Relic.cs     # 抽象基类，统一 IconPath（带 fallback）
    └── Extensions/
        └── StringExtensions.cs # RemovePrefix, ImagePath 辅助方法
└── {ModId}/                    # Godot 资源
    ├── localization/
    ├── images/
    └── scenes/
```

### Invoker Mod 当前结构

```
mods/Invoker/
├── InvokerMod.csproj
├── Invoker.json
├── InvokerMod.sln
├── project.godot
├── export_presets.cfg
├── Scripts/                      # ← 建议改名为 InvokerModCode/
│   ├── Entry.cs
│   ├── Cards/
│   ├── Characters/
│   ├── Keywords/
│   ├── Monsters/
│   ├── Orbs/
│   ├── Pools/
│   ├── Powers/
│   └── Relics/
└── InvokerMod/                   # Godot 资源 + 本地化
    └── localization/
```

### 改进建议

1. **代码目录命名**：`Scripts/` → `InvokerModCode/`（与 ModTemplate 一致，避免与 Godot 内置 Scripts 概念混淆）
2. **缺少抽象基类**：
   - 没有 `InvokerCard : CustomCardModel` 统一基类
   - 没有 `InvokerPower : CustomPowerModel` 统一基类
   - 没有 `InvokerRelic : CustomRelicModel` 统一基类
3. **缺少 Extensions**：每个卡牌的 `PortraitPath` 和每个遗物的 `PackedIconPath` 都是硬编码字符串，可以通过扩展方法统一

---

## 关键代码模式

### 模式 1：抽象基类统一资源路径

**ModTemplate 的做法**（推荐）：

```csharp
// Cards/CharModCard.cs
public abstract class CharModCard(int cost, CardType type, CardRarity rarity, TargetType target)
    : CustomCardModel(cost, type, rarity, target)
{
    // 自动从 ID 推导图片路径，无需每个子类重写
    public override string CustomPortraitPath => 
        $"{Id.Entry.RemovePrefix().ToLowerInvariant()}.png".BigCardImagePath();
    
    public override string PortraitPath => 
        $"{Id.Entry.RemovePrefix().ToLowerInvariant()}.png".CardImagePath();
}
```

**Invoker 当前**：每个卡牌类都手动写 `PortraitPath`：

```csharp
public class ColdSnapCard : SpellCardBase
{
    public override string PortraitPath => "res://images/invoker/cards/cold_snap.png";
}
```

**差距**：如果重命名图片或调整目录结构，需要修改 N 个文件。

---

### 模式 2：Power / Relic 的 fallback 图标

**ModTemplate 的做法**：

```csharp
public abstract class CharModPower : CustomPowerModel
{
    public override string CustomPackedIconPath
    {
        get
        {
            var path = $"{Id.Entry.RemovePrefix().ToLowerInvariant()}.png".PowerImagePath();
            // 如果找不到专属图标，回退到默认 power.png
            return ResourceLoader.Exists(path) ? path : "power.png".PowerImagePath();
        }
    }
}
```

**Invoker 当前**：Power 类没有自定义图标路径（依赖默认），但如果有的话也是硬编码。

---

### 模式 3：ModInitializer 入口

**ModTemplate 的做法**：

```csharp
[ModInitializer(nameof(Initialize))]
public partial class MainFile : Node
{
    public static Logger Logger { get; } = new(ModId, LogType.Generic);

    public static void Initialize()
    {
        Harmony harmony = new(ModId);
        harmony.PatchAll();
    }
}
```

**Invoker 当前**：

```csharp
[ModInitializer("Init")]
public class Entry
{
    internal static readonly Logger Log = new(ModId, LogType.Generic);

    public static void Init()
    {
        ScriptManagerBridge.LookupScriptsInAssembly(typeof(Entry).Assembly);
        new Harmony("com.invoker.mod").PatchAll(typeof(Entry).Assembly);
        Log.Info("InvokerMod initialized!");
    }
}
```

**差距**：没有继承 `Node`，但当前不需要 Godot 节点功能，所以没问题。`ScriptManagerBridge.LookupScriptsInAssembly` 是好的实践（已做）。

---

### 模式 4：BaseLib 扩展方法（Id.Entry.RemovePrefix）

**ModTemplate 使用**：

```csharp
// 从 "INVOKER-COLD_SNAP_CARD" 提取 "cold_snap_card"
Id.Entry.RemovePrefix().ToLowerInvariant()
```

这个扩展方法在 `BaseLib.Extensions` 命名空间中。Invoker 当前没有使用它，导致很多手动字符串拼接。

---

### 模式 5：CustomFrame（自定义卡框）

**中文教程提到**：

```csharp
public override Texture2D? CustomFrame => GD.Load<Texture2D>("res://images/icon_1024.png");
```

Invoker 当前没有自定义卡框，使用的是默认卡框。如果后续需要主题化（如蓝色冰系卡框），可以添加。

---

### 模式 6：Godot UI 注入（高级）

**sts2-main-menu-mod-manager** 展示了如何不通过 Harmony patch，而是通过 `SceneTree.NodeAdded` 事件监听来注入 UI：

```csharp
[ModInitializer("Initialize")]
public sealed class MainFile
{
    public static void Initialize()
    {
        if (Engine.GetMainLoop() is not SceneTree tree || tree.Root is null)
            return;
        
        _sceneTree = tree;
        _sceneTree.NodeAdded += OnNodeAdded;   // 监听节点创建
        _sceneTree.ProcessFrame += OnProcessFrame;  // 每帧扫描
    }

    private static void OnNodeAdded(Node node)
    {
        var typeName = node.GetType().FullName;
        if (typeName == "MegaCrit.Sts2.Core.Nodes.Screens.MainMenu.NMainMenu")
        {
            TryInjectMainMenu(node);  // 注入 Mod Manager 按钮
        }
    }
}
```

**应用场景**：如果 Invoker 需要自定义战斗 UI（如球槽显示、Invoke 按钮），可以参考此模式。

---

### 模式 7：跨 mod 配置系统（ModConfig-STS2）

**ModConfig-STS2** 提供了一个零依赖的配置框架：

```csharp
// 在其他 mod 中注册配置
ModConfigApi.Register("InvokerMod", "祈求者 Mod", new ConfigEntry[]
{
    new ConfigEntry { Key = "ShowOrbQueue", Label = "显示球队列", Type = ConfigType.Toggle, DefaultValue = true },
    new ConfigEntry { Key = "SpellCardAnimation", Label = "法术卡动画", Type = ConfigType.Toggle, DefaultValue = true },
});
```

玩家在游戏内 Settings → Mod Settings 中可以直接修改。  
**应用场景**：如果后续需要让玩家开关某些视觉效果或调整数值，可以集成此系统。

---

### 模式 8：SimpleModConfig（BaseLib 内置）

**中文教程提到**：

```csharp
public class ModConfig : SimpleModConfig
{
    public static bool Test1 { get; set; } = true;
    public static bool Test2 { get; set; } = false;
}

// 在 Entry.Init() 中：
ModConfigRegistry.Register("InvokerMod", new ModConfig());
```

**限制**：目前只支持 `bool` 类型。需要更复杂配置（slider、dropdown）时，用 ModConfig-STS2 更合适。

---

### 模式 9：Harmony Patch 的替代方案

**ModConfig-STS2** 完全避免使用 Harmony，仅通过：
- `ScriptManagerBridge.LookupScriptsInAssembly`
- Godot `SceneTree` 事件
- 反射调用其他 mod 的 API

**Invoker 当前**：使用了 Harmony 但没有实际 Patch 类（`PatchAll` 扫描不到任何 `[HarmonyPatch]`）。可以移除 Harmony 依赖以简化项目。

---

### 模式 10：角色本地化（characters.json）

**中文教程详细说明**：

```json
{
  "INVOKER-INVOKER_CHARACTER.aromaPrinciple": "[sine][blue]……等待……[/blue][/sine]",
  "INVOKER-INVOKER_CHARACTER.banter.alive.endTurnPing": "……",
  "INVOKER-INVOKER_CHARACTER.cardsModifierDescription": "祈求者的卡牌现在会出现在奖励和商店中。",
  "INVOKER-INVOKER_CHARACTER.cardsModifierTitle": "祈求者卡牌",
  "INVOKER-INVOKER_CHARACTER.description": "世界上最古老的法师。\n以[gold]三种元素[/gold]施展毁天灭地的法术。",
  "INVOKER-INVOKER_CHARACTER.title": "祈求者",
  "INVOKER-INVOKER_CHARACTER.unlockText": "用[pink]{Prerequisite}[/pink]进行一局游戏来解锁这个角色。"
}
```

**Invoker 当前**：缺少 `characters.json` 本地化文件。

---

## 可借鉴的具体改进

### 高优先级

| 改进项 | 来源 | 工作量 | 收益 |
|--------|------|--------|------|
| 添加 `characters.json` 本地化 | 中文教程 | 小 | 角色选择界面显示正常中文 |
| 创建 `InvokerCard` / `InvokerPower` / `InvokerRelic` 抽象基类 | ModTemplate | 中 | 统一资源路径，减少硬编码 |
| 使用 `Id.Entry.RemovePrefix()` 简化路径 | ModTemplate | 小 | 代码更简洁 |
| 移除未使用的 Harmony 依赖 | ModConfig | 小 | 减少依赖，编译更快 |

### 中优先级

| 改进项 | 来源 | 工作量 | 收益 |
|--------|------|--------|------|
| 添加 `CustomFrame` 自定义卡框 | 中文教程 | 小 | 视觉差异化 |
| 集成 `SimpleModConfig` | 中文教程 | 小 | 玩家可开关某些功能 |
| 创建 `StringExtensions` 统一图片路径 | ModTemplate | 小 | 路径管理更规范 |

### 低优先级（长期）

| 改进项 | 来源 | 工作量 | 收益 |
|--------|------|--------|------|
| 自定义能量表盘 `.tscn` | 中文教程 | 大 | 视觉主题化 |
| 自定义人物战斗场景 `.tscn` | 中文教程 | 大 | 替换 Osty 占位 |
| Godot UI 注入（球槽 HUD） | main-menu-mod-manager | 大 | 更直观的球管理 |
| 集成 ModConfig-STS2 | ModConfig | 中 | 高级配置面板 |

---

## 社区 mod 亮点

### STS2-Buu（角色 mod 标杆）

- **姿态系统**：三种形态切换，每个形态改变卡牌行为
- **Ki 资源**：自定义 secondary resource（类似能量但独立）
- **Spine 动画**：完整的战斗动画（idle/attack/hit/death）
- **GitHub Pages 卡册**：自动生成网页版卡牌浏览器（含升级切换）
- **目录结构**：`BuuCode/`（C#）和 `Buu/`（Godot 资源）分离清晰

**可借鉴**：
- 如果 Invoker 需要姿态/形态系统，参考 Buu 的实现
- 卡册网站的想法很好，但当前阶段不必要

### sts2-font-scaling（UI mod）

- 纯 Godot UI 操作，无游戏逻辑
- 设置面板集成（Settings → Mod Settings）
- 实时生效的字体缩放

**可借鉴**：
- 如果 Invoker 需要自定义 UI（如球槽显示），参考其 UI 注入模式

---

## 我们当前的差距

### 与 ModTemplate 的差距

1. **缺少抽象基类**：ModTemplate 建议每个类型（Card/Power/Relic）有自己的抽象基类，统一资源路径和公共行为
2. **缺少 Extensions 工具类**：`RemovePrefix()`、`ImagePath()` 等扩展方法可以大幅简化代码
3. **目录命名**：`Scripts/` 在 Godot 项目中有特殊含义，建议改为 `InvokerModCode/`

### 与中文教程的差距

1. **缺少 `characters.json`**：角色选择界面、事件对话、解锁条件等文本未本地化
2. **缺少自定义 Godot 场景**：当前使用 `PlaceholderCharacterModel` 的默认场景，没有自定义角色视觉、能量表盘、选择背景等
3. **卡框未自定义**：使用默认卡框，可以添加蓝色科技风格卡框

### 与社区最佳实践的差距

1. **Harmony 未实际使用**：当前 `harmony.PatchAll()` 扫描不到任何 Patch 类，可以移除
2. **缺少 mod 配置**：没有提供玩家自定义选项（如开关视觉效果、调整音效）
3. **缺少版本管理**：`Invoker.json` 版本号为 `0.1.0`，作者为 `YourName`

---

## 建议的下一步

1. **立即做**：
   - 创建 `InvokerCard` / `InvokerPower` / `InvokerRelic` 抽象基类
   - 使用 `Id.Entry.RemovePrefix()` 简化所有 `PortraitPath` / `PackedIconPath`
   - 添加 `characters.json` 本地化
   - 更新 `Invoker.json` 作者和版本

2. **短期做**：
   - 移除 Harmony 依赖（如果没有实际 Patch）
   - 添加 `SimpleModConfig` 让玩家开关某些功能
   - 自定义卡框 `CustomFrame`

3. **长期做**：
   - 自定义 Godot 场景（角色视觉、能量表盘）
   - 考虑 GitHub Pages 卡册网站
