# Invoker Mod 开发日志

## 当前状态（2026-03-23）

### ✅ 已完成素材

| 素材 | 路径 | 状态 |
|------|------|------|
| 选角背景 | `images/packed/character_select/char_select_invoker_bg.png` | ✅ 满意 |
| 选角立绘 | `images/charui/char_select_invoker.png` | ✅ 满意 |
| 选角锁定 | `images/charui/char_select_invoker_locked.png` | ✅ 满意 |
| 地图标记 | `images/charui/map_marker_invoker.png` | ✅ 满意 |
| 角色图标 | `images/charui/character_icon_invoker.png` | ✅ 满意 |
| 卡牌立绘 | `images/invoker/cards/` | ✅ 29张 |
| 遗物图标 | `images/invoker/relics/` | ✅ 5张 |
| 元素球 tscn | `images/orbs/` | ✅ quas/wex/exort |

### ❌ 未完成素材

| 素材 | 说明 |
|------|------|
| 战斗人物动画 | 需要 idle/attack/hit/death，当前 battle_sprite.png 不满意 |

### 战斗动画 — 调研结论

尝试了以下视频生成 API 方案，最终放弃：

| 方案 | 原因 |
|------|------|
| 火山方舟 ARK Seedance 2.0 | 未对外开放（`not allow open yet`） |
| 火山方舟 ARK Seedance 1.5 Pro | 可用，但按 token 计费不合算 |
| 即梦 Visual API | HMAC 鉴权复杂，且价格不合算 |
| 即梦消费端 App | 无法程序化调用 |

**结论**：战斗动画改为手动制作或使用其他方式。

### 字符设计参考（已生成，可复用）

- 角色设定表 v4：`images/generated_versions/character_gen_v4/character-sheet.json`
- 参考图：`images/generated_versions/character_gen_v4/reference.png`
- spec_version_id: 4（存于 asset DB）
- 参考图来源：`images/raw image/R.jpg`（外观）+ `images/invoker/battle_sprite.png`（姿态）

---

## 已实现的 MCP 工具能力

### cli-helper-mcp
- `show_asset_picker` — 浏览器图片选择器，支持多选、上传、历史记录
- `show_dialog` — PowerShell 对话框
- `show_notification` — 系统通知
- `write_log` / `update_state` — Dashboard 进度日志

### sts2-mcp-server
- `prepare_character_generation` — 多图参考 Gemini 生成角色设定表
  - 支持 `referenceImagePaths[]` 传多张参考图
- `generate_character_animation` — 视频生成 pipeline（已实现但暂不使用）
  - 支持 volcengine Seedance 1.5 Pro
  - 模型：`doubao-seedance-1-5-pro-251215`
  - endpoint: `POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks`
  - 轮询: `GET .../tasks/{id}`，status: `queued/running/succeeded/failed/expired`
  - usage: `completion_tokens` / `total_tokens`
- `build_and_deploy` — dotnet build + Godot export + 部署

### 即梦 Visual API（已记录，未实现）

文档：`reference/seedance-api/jimeng-se.md`

- Endpoint: `POST https://visual.volcengineapi.com?Action=CVSync2AsyncSubmitTask&Version=2022-08-31`
- 鉴权：HMAC 签名（Region: cn-north-1, Service: cv）
- 特色：**首尾帧 I2V**（2张图），req_key: `jimeng_i2v_first_tail_v30`
- 查询: `Action=CVSync2AsyncGetResult`，status: `in_queue/generating/done`
- 视频 URL 有效期：1小时

---

## 下一步

1. **战斗动画**：手动制作 / 找设计师 / 用其他工具（如 Kling、Runway 等）
2. **接着开发 Mod 代码**：当前卡牌/遗物代码状态待确认

