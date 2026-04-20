# Invoker Mod 探索计划 - Skill 知识迭代

## 目标
通过 Invoker mod 开发，系统性探索 STS2 机制，补充 Skill 知识库。

## 卡牌关键词机制（核心）

| 关键词 | 描述 | 实现方式 |
|--------|------|----------|
| **Exhaust** | 打出后移除直到战斗结束 | `AddKeyword(CardKeyword.Exhaust)` |
| **Retain** | 保留的卡牌不会在回合结束时丢弃 | `AddKeyword(CardKeyword.Retain)` |
| **Innate** | 每次战斗开始时在手牌中 | `AddKeyword(CardKeyword.Innate)` |
| **Ethereal** | 回合结束若在手牌中则消耗 | 系统自动处理 |
| **Sly** | 在回合结束前从手牌丢弃则免费触发 | 系统自动处理 |
| **Eternal** | 不能从牌组中移除或转化 | 系统自动处理 |
| **Unplayable** | 无法打出的卡牌 | 系统自动处理 |

## 战斗状态效果

| 效果 | 描述 |
|------|------|
| **Vulnerable** | 受到的伤害+50% |
| **Weak** | 造成的伤害-25% |
| **Frail** | 受到的伤害+25% |
| **Regenerate** | 每回合回复生命 |
| **Plated Armor** | 每回合获得护甲 |

## 探索领域

### 1. 充能球系统 (Orb) ✅ 已部分实现
- [x] 自定义 Orb 视觉
- [x] 隐藏数字
- [ ] Orb 触发效果（Passive/Evoke）
- [ ] 多球组合逻辑

### 2. 卡牌关键词机制 ⭐ P1
- [x] Retain - Invoke 卡需要保留
- [ ] Exhaust - 法术消耗
- [ ] Innate - 核心卡牌
- [ ] Ethereal - 临时卡

### 3. 费用机制
- [ ] 0 cost 机制
- [ ] X cost（可变费用）
- [ ] 能量获取/消耗

### 4. 目标选择
- [ ] SingleEnemy / AllEnemies / RandomEnemy
- [ ] Self 目标
- [ ] 条件目标

### 5. 抽牌/弃牌/消耗堆
- [ ] Drawpile 操作
- [ ] Discardpile 操作
- [ ] Exhaustpile 操作

### 6. 遗物触发
- [ ] OnBattleStart
- [ ] OnCardPlayed
- [ ] OnTurnStart / OnTurnEnd
- [ ] OnAttacked / OnDamaged

### 7. 战斗状态
- [ ] Vulnerable / Weak / Frail
- [ ] Block（护甲）
- [ ] Artifact（免疫负面效果）

### 8. 本地化/UI
- [ ] 多语言支持
- [ ] 粒子效果

## 下一步

从 **Retain 关键词** 开始，验证 Invoke 卡是否需要手动添加 Retain 关键词。

实现测试：
1. 让 InvokeCard 拥有 Retain 关键词
2. 测试 Invoke 生成的法术是否保留在手牌
