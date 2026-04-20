# Invoker Mod — 待办事项（以代码为准）

> 最后更新：`feature/invoker` 分支  
> 已完成项用 ✅ 标记，待处理项保持 ❌

---

## 核心机制

- [x] **Orb 系统**：Quas / Wex / Exort 三种球，3个槽位
- [x] **Invoke 技能**：根据当前球组合生成对应法术（InvokeTable 映射）
- [x] **Scroll 机制**：手牌最多2张 Scroll，FIFO exhaust
- [x] **Retain 关键词**：Invoke 生成的法术回合结束不丢弃
- [x] **Exhaust 关键词**：法术牌打出后移除
- [x] **Summon 球**：Q/W/E 三种单球召唤卡 + 三合一 SummonCard
- [x] **每回合召唤限制**：TurnSummonTracker 控制每种球每回合1次

## 卡牌实现

### 起始套牌
- [x] Strike Invoker（4张）
- [x] Defend Invoker（4张）
- [x] Invoke Card（升级后额外给一张 Invoke）
- [x] Summon Card（三选一，升级后 Retain）

### Invoke 法术（10张）
- [x] Cold Snap (QQQ)
- [x] Ghost Walk (QQW)
- [x] Ice Wall (QQE)
- [x] Tornado (QWW)
- [x] Deafening Blast (QWE)
- [x] EMP (WWW)
- [x] Alacrity (WWE)
- [x] Chaos Meteor (WEE)
- [x] Forge Spirit (QEE)
- [x] Sun Strike (EEE)

### 普通卡池
- [x] 冰系：Ice Armor, Ice Spike, Frost Wind, Freeze, Frost Shell
- [x] 雷系：Thunder Strike, Chain Lightning, Swift Mind, Wind Stab, Thunder Field
- [x] 炎系：Fireball, Flame Burst, Scorch, Flame Shield, Burning Heart

### 稀有卡
- [x] Void Surge
- [x] Elemental Ward
- [x] Arcane Recall

### Invoke 联动卡
- [x] Runic Strike
- [x] Catalyst
- [x] Spell Weave

### 升级系统
- [x] 所有卡牌实现 `OnUpgrade()`
- [x] 所有法术牌定义 `CanonicalVars`（DynamicVar）

## 遗物

- [x] Quas Command Stone（Starter）
- [x] Wex Command Stone（Starter）
- [x] Exort Command Stone（Starter）
- [x] Aghanim's Scepter（Rare）
- [x] Aghanim's Fragment（Uncommon）

## Power

- [x] ColdSnapPower
- [x] GhostWalkPower
- [x] TempStrengthPower
- [x] ForgeSpiritPower
- [x] FrostShellPower
- [x] ThunderFieldPower
- [x] BurningHeartPower

## 角色与视觉

- [x] InvokerCharacter（PlaceholderCharacterModel）
- [x] 选角背景 / 立绘 / 锁定图 / 地图标记 / 角色图标
- [x] 卡牌立绘（29张）
- [x] 遗物图标（5张）
- [x] 球场景（quas/wex/exort tscn）
- [x] 自定义关键词本地化（Scroll / Invoke / Quas / Wex / Exort）
- [ ] **战斗人物动画** — 当前用 `battle_sprite.png` 占位，需 Spine 动画

## 本地化

- [x] 英文（en）cards.json / powers.json / card_keywords.json
- [x] 简体中文（zhs）cards.json / powers.json / card_keywords.json
- [ ] 其他语言（如需发布）

## 技术

- [x] 项目编译 0 错误 0 警告
- [x] DLL 自动部署到游戏 mods 目录
- [x] BaseLib 依赖解决

## 已知问题 / 待优化

- [ ] **SummonCard 数值同步**：SummonCard 使用 `ModelDb.Card<>().DynamicVars` 获取基础值，无法反映 SummonOrbCard 的升级状态
- [ ] **Forge Spirit 视觉**：当前借用 Osty 场景，需替换为专属动画
- [ ] **球被动效果**：当前球无被动/evoke效果，仅作计数器
- [ ] **数值平衡**：EMP、Tornado、Alacrity、Chaos Meteor 等卡牌效率可能偏高，需游戏内测试
- [ ] **毁天灭地（Cataclysm）**：设计中提到 EEE+魔晶剑 → Cataclysm，但代码中未实现（当前 Scepter 仅影响 copies=2）
- [ ] **版本号更新**：Invoker.json 仍为 0.1.0
- [ ] **作者信息**：Invoker.json 中 author 为 "YourName"

## 长期规划

- [ ] 专属战斗动画（Spine）
- [ ] 法术特效（VFX）
- [ ] 背景音乐/音效
- [ ] Steam Workshop 发布准备
