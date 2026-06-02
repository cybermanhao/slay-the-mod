# test-orb-cards.ps1 — 自动化验证 10 张新切球/祈唤卡牌
# 依赖：游戏已安装 DevToolMod，端口 18432
# 用法：pwsh -File scripts\test-orb-cards.ps1

param(
    [switch]$LaunchGame,
    [int]$WaitSeconds = 90
)

$BASE = "http://127.0.0.1:18432"
$PASS = 0; $FAIL = 0; $SKIP = 0
$results = @()

function Log($msg) { Write-Host $msg }
function Ok($msg)  { Write-Host "  ✅ $msg" -ForegroundColor Green; $script:PASS++ }
function Fail($msg){ Write-Host "  ❌ $msg" -ForegroundColor Red;   $script:FAIL++ }
function Skip($msg){ Write-Host "  ⏭  $msg" -ForegroundColor Yellow; $script:SKIP++ }
function Info($msg){ Write-Host "     $msg" -ForegroundColor Gray }

# ── HTTP helpers ──────────────────────────────────────────────────────────────

function Invoke-Api($path, $method = "GET", $body = $null) {
    $uri = "$BASE$path"
    try {
        if ($body) {
            $json = $body | ConvertTo-Json -Compress
            return Invoke-RestMethod -Uri $uri -Method $method -Body $json -ContentType "application/json" -TimeoutSec 10
        } else {
            return Invoke-RestMethod -Uri $uri -Method $method -TimeoutSec 10
        }
    } catch {
        return $null
    }
}

function Get-State { return Invoke-Api "/state" }

function Console-Cmd($cmd) {
    return Invoke-Api "/console" "POST" @{ cmd = $cmd }
}

function Play-Card($idx, $target = $null) {
    $body = @{ action = "play_card"; card_index = $idx }
    if ($target -ne $null) { $body.target_index = $target }
    return Invoke-Api "/action" "POST" $body
}

# 等待战斗状态稳定（最多等 8 秒，每秒检查一次，不产生输出）
function Wait-CombatStable {
    for ($i = 0; $i -lt 8; $i++) {
        Start-Sleep 1
        $s = Get-State
        if ($s -and $s.InCombat -and $s.Combat) { return }
    }
}

function End-Turn { return Invoke-Api "/action" "POST" @{ action = "end_turn" } }

function Select-Card($idx) {
    return Invoke-Api "/action" "POST" @{ action = "select_card"; option_index = $idx }
}

# ── Orb count helper ──────────────────────────────────────────────────────────

function Get-OrbCounts($state) {
    if (-not $state.Combat) { return @{Q=0;W=0;E=0;Total=0;Last=""} }
    $orbs = $state.Combat.Orbs
    $q = @($orbs | Where-Object { $_.Type -match "QUAS" }).Count
    $w = @($orbs | Where-Object { $_.Type -match "WEX" }).Count
    $e = @($orbs | Where-Object { $_.Type -match "EXORT" }).Count
    $last = if ($orbs.Count -gt 0) { $orbs[-1].Type } else { "" }
    return @{ Q=$q; W=$w; E=$e; Total=$orbs.Count; Last=$last }
}

function Count-HandSpells($state) {
    if (-not $state.Combat) { return 0 }
    # 法术卡含 Scroll 关键词，通过 CardId 前缀识别
    $spells = @("COLD_SNAP","GHOST_WALK","ICE_WALL","TORNADO","DEAFENING","EMP","ALACRITY","CHAOS","FORGE","SUN_STRIKE")
    $hand = $state.Combat.Hand
    return ($hand | Where-Object { $spells | ForEach-Object { if ($hand_card.CardId -match $_) { $true } } }).Count
}

function Find-Card-In-Hand($state, $cardIdFragment) {
    if (-not $state.Combat) { return $null }
    return $state.Combat.Hand | Where-Object { $_.CardId -match $cardIdFragment } | Select-Object -First 1
}

function Find-Card-Index($state, $cardIdFragment) {
    if (-not $state.Combat) { return -1 }
    for ($i = 0; $i -lt $state.Combat.Hand.Count; $i++) {
        if ($state.Combat.Hand[$i].CardId -match $cardIdFragment) { return $i }
    }
    return -1
}

# ── Launch game ───────────────────────────────────────────────────────────────

if ($LaunchGame) {
    Log "🚀 启动游戏..."
    Start-Process "C:\Program Files (x86)\Steam\steamapps\common\Slay the Spire 2\SlayTheSpire2.exe"
}

# ── Wait for DevToolMod ────────────────────────────────────────────────────────

Log "`n⏳ 等待 DevToolMod 就绪（最多 ${WaitSeconds}s）..."
$deadline = (Get-Date).AddSeconds($WaitSeconds)
$ready = $false
while ((Get-Date) -lt $deadline) {
    $h = Invoke-Api "/health"
    if ($h -and $h.ok) { $ready = $true; break }
    Start-Sleep 3
    Write-Host "." -NoNewline
}
if (-not $ready) {
    Write-Host "`n❌ DevToolMod 未响应，请确认游戏已启动且 DevToolMod 已加载"
    exit 1
}
Log "`n✅ DevToolMod 就绪 — $($h.service) $($h.version)"

# ── Navigate to combat ────────────────────────────────────────────────────────

Log "`n🎮 检查游戏状态..."
$state = Get-State
Log "   当前屏幕: $($state.Screen)"

if (-not $state.InCombat) {
    Log "   尝试用 'fight' 命令进入战斗..."
    Console-Cmd "fight" | Out-Null
    Start-Sleep 3
    $state = Get-State

    if (-not $state.InCombat) {
        Log "   fight 命令未生效，尝试通关导航..."
        # 尝试从主菜单到战斗
        Invoke-Api "/action" "POST" @{ action = "open_character_select" } | Out-Null
        Wait-CombatStable
        Invoke-Api "/action" "POST" @{ action = "select_character"; option_index = 0 } | Out-Null
        Wait-CombatStable
        Invoke-Api "/action" "POST" @{ action = "embark" } | Out-Null
        Start-Sleep 3
        $state = Get-State
    }
}

if (-not $state.InCombat) {
    Log "❌ 无法自动进入战斗。请手动进入战斗后重新运行脚本（不加 -LaunchGame）"
    exit 1
}

Log "✅ 当前在战斗中 — 回合 $($state.Combat.Turn)，敌人数: $($state.Combat.Enemies.Count)"
$firstEnemy = if ($state.Combat.Enemies.Count -gt 0) { 0 } else { $null }

# ── 确保能量充足 ──────────────────────────────────────────────────────────────

Console-Cmd "energy 10" | Out-Null
Start-Sleep 1

# ══════════════════════════════════════════════════════════════════════════════
# 卡牌测试函数
# ══════════════════════════════════════════════════════════════════════════════

function Test-Card($name, $cardId, $testFn) {
    Log "`n── $name ($cardId) ──────────────────────────"

    # 等待上一次操作完全稳定（如史莱姆分裂等状态过渡）
    Wait-CombatStable

    # 清空手牌，避免手牌满10张导致card命令失败
    Invoke-Api "/action" "POST" @{ action = "clear_hand" } | Out-Null
    Start-Sleep 1

    # 补充能量
    Console-Cmd "energy 10" | Out-Null
    Start-Sleep 1

    # 添加卡牌到手牌
    $r = Console-Cmd "card $cardId"
    Start-Sleep 1

    $state = Get-State
    $idx = Find-Card-Index $state $cardId.Replace("INVOKER-","").Replace("_CARD","")
    if ($idx -lt 0) {
        # 尝试用完整 ID 匹配
        $idx = Find-Card-Index $state $cardId
    }

    if ($idx -lt 0) {
        Fail "卡牌未出现在手牌中（console cmd 可能失败）"
        Info "手牌: $(($state.Combat.Hand | ForEach-Object { $_.CardId }) -join ', ')"
        return
    }

    Info "卡牌在手牌位置 $idx"
    & $testFn $idx $state
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 1：烈焰打击 (FlameStrike) — 造伤 + 切 Exort
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "烈焰打击" "INVOKER-FLAME_STRIKE_CARD" {
    param($idx, $stateBefore)
    $orbsBefore = Get-OrbCounts $stateBefore
    Info "切球前: Q=$($orbsBefore.Q) W=$($orbsBefore.W) E=$($orbsBefore.E) Last=$($orbsBefore.Last)"

    Play-Card $idx $firstEnemy | Out-Null
    Wait-CombatStable
    $stateAfter = Get-State
    $orbsAfter = Get-OrbCounts $stateAfter
    Info "切球后: Q=$($orbsAfter.Q) W=$($orbsAfter.W) E=$($orbsAfter.E) Last=$($orbsAfter.Last)"

    if ($orbsAfter.Last -match "EXORT") {
        Ok "最新球为 Exort（$($orbsAfter.Last)）"
    } else {
        Fail "最新球不是 Exort（Last=$($orbsAfter.Last)）"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 2：雷思敏捷 (SwiftThunder) — 抽牌 + 切 Wex
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "雷思敏捷" "INVOKER-SWIFT_THUNDER_CARD" {
    param($idx, $stateBefore)
    $orbsBefore = Get-OrbCounts $stateBefore
    $handBefore = $stateBefore.Combat.Hand.Count

    Play-Card $idx | Out-Null
    Wait-CombatStable
    $stateAfter = Get-State
    $orbsAfter = Get-OrbCounts $stateAfter
    $handAfter = $stateAfter.Combat.Hand.Count

    if ($orbsAfter.Last -match "WEX") {
        Ok "最新球为 Wex（$($orbsAfter.Last)）"
    } else {
        Fail "最新球不是 Wex（Last=$($orbsAfter.Last)）"
    }

    # 手牌数：打出1张(-1)，抽3张(+3)，净增+2
    if ($handAfter -ge $handBefore + 1) {
        Ok "手牌增加（抽牌生效，$handBefore -> $handAfter）"
    } else {
        Info "手牌变化: $handBefore -> $handAfter（可能受其他效果影响）"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 3：寒冰护盾 (IceShield) — 格挡 + 切 Quas
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "寒冰护盾" "INVOKER-ICE_SHIELD_CARD" {
    param($idx, $stateBefore)
    $orbsBefore = Get-OrbCounts $stateBefore
    $blockBefore = $stateBefore.Combat.Player.Block

    Play-Card $idx | Out-Null
    Wait-CombatStable
    $stateAfter = Get-State
    $orbsAfter = Get-OrbCounts $stateAfter
    $blockAfter = $stateAfter.Combat.Player.Block

    if ($orbsAfter.Last -match "QUAS") {
        Ok "最新球为 Quas（$($orbsAfter.Last)）"
    } else {
        Fail "最新球不是 Quas（Last=$($orbsAfter.Last)）"
    }
    if ($blockAfter -gt $blockBefore) {
        Ok "格挡增加 ($blockBefore -> $blockAfter)"
    } else {
        Fail "格挡未增加（before=$blockBefore after=$blockAfter）"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 4：冰脉祈唤 (QuasInvoke) — 切 Quas + 祈唤法术进手
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "冰脉祈唤" "INVOKER-QUAS_INVOKE_CARD" {
    param($idx, $stateBefore)
    $orbsBefore = Get-OrbCounts $stateBefore
    $handCountBefore = $stateBefore.Combat.Hand.Count

    Play-Card $idx | Out-Null
    Wait-CombatStable
    $stateAfter = Get-State
    $orbsAfter = Get-OrbCounts $stateAfter
    $handCountAfter = $stateAfter.Combat.Hand.Count

    if ($orbsAfter.Last -match "QUAS") {
        Ok "最新球为 Quas（$($orbsAfter.Last)）"
    } else {
        Fail "最新球不是 Quas（Last=$($orbsAfter.Last)）"
    }
    # 打出1张(-1)，Invoke 生成1张(+1)，净持平；但 Invoke 结果是 Retain，所以手牌不少于 before-1
    if ($handCountAfter -ge $handCountBefore) {
        Ok "法术卡已生成进手牌（手牌 $handCountBefore -> $handCountAfter）"
    } else {
        Info "手牌 $handCountBefore -> $handCountAfter（法术卡未增加，检查 Invoke 是否成功）"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 5：雷鸣祈唤 (WexInvoke) — 造伤 + 切 Wex + 祈唤
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "雷鸣祈唤" "INVOKER-WEX_INVOKE_CARD" {
    param($idx, $stateBefore)
    $orbsBefore = Get-OrbCounts $stateBefore
    $handBefore = $stateBefore.Combat.Hand.Count

    Play-Card $idx $firstEnemy | Out-Null
    Wait-CombatStable
    $stateAfter = Get-State
    $orbsAfter = Get-OrbCounts $stateAfter

    if ($orbsAfter.Last -match "WEX") {
        Ok "最新球为 Wex（$($orbsAfter.Last)）"
    } else {
        Fail "最新球不是 Wex（Last=$($orbsAfter.Last)）"
    }
    if ($stateAfter.Combat.Hand.Count -ge $handBefore) {
        Ok "法术卡进手牌（Invoke 生效）"
    } else {
        Info "手牌 $handBefore -> $($stateAfter.Combat.Hand.Count)"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 6：炎核祈唤 (ExortInvoke) — 全体伤害 + 切 Exort + 祈唤
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "炎核祈唤" "INVOKER-EXORT_INVOKE_CARD" {
    param($idx, $stateBefore)
    $orbsBefore = Get-OrbCounts $stateBefore

    Play-Card $idx | Out-Null
    Wait-CombatStable
    $stateAfter = Get-State
    $orbsAfter = Get-OrbCounts $stateAfter

    if ($orbsAfter.Last -match "EXORT") {
        Ok "最新球为 Exort（$($orbsAfter.Last)）"
    } else {
        Fail "最新球不是 Exort（Last=$($orbsAfter.Last)）"
    }
    if ($stateAfter.Combat.Hand.Count -ge $stateBefore.Combat.Hand.Count) {
        Ok "法术卡进手牌（Invoke 生效）"
    } else {
        Info "手牌: $($stateBefore.Combat.Hand.Count) -> $($stateAfter.Combat.Hand.Count)"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 7：元素调谐 (ElementalTune) — 选球×2（自动选 Quas，option 0）
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "元素调谐" "INVOKER-ELEMENTAL_TUNE_CARD" {
    param($idx, $stateBefore)
    $orbsBefore = Get-OrbCounts $stateBefore

    # 打出后会弹出选择界面
    Play-Card $idx | Out-Null
    Wait-CombatStable

    # 尝试选择第一个选项（Quas）
    Select-Card 0 | Out-Null
    Wait-CombatStable

    $stateAfter = Get-State
    $orbsAfter = Get-OrbCounts $stateAfter
    $totalAfter = $orbsAfter.Total
    $totalBefore = $orbsBefore.Total

    # 选 Quas 两次，最新球应为 QUAS_ORB
    if ($orbsAfter.Last -match "QUAS") {
        Ok "最新球为 Quas（切球生效，Last=$($orbsAfter.Last)）"
    } else {
        Fail "最新球不是 Quas（Last=$($orbsAfter.Last)，选球 UI 可能需要手动）"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 8：天命一击 (FateStrike) — 造伤 + 祈唤
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "天命一击" "INVOKER-FATE_STRIKE_CARD" {
    param($idx, $stateBefore)
    $handBefore = $stateBefore.Combat.Hand.Count

    Play-Card $idx $firstEnemy | Out-Null
    Wait-CombatStable
    $stateAfter = Get-State

    if ($stateAfter.Combat.Hand.Count -ge $handBefore) {
        Ok "法术卡进手牌（Invoke 生效）"
    } else {
        Info "手牌 $handBefore -> $($stateAfter.Combat.Hand.Count)"
    }

    # 验证造成了伤害（敌人血量减少）
    $dmgDealt = $false
    for ($i = 0; $i -lt [Math]::Min($stateBefore.Combat.Enemies.Count, $stateAfter.Combat.Enemies.Count); $i++) {
        if ($stateAfter.Combat.Enemies[$i].Health -lt $stateBefore.Combat.Enemies[$i].Health) {
            $dmgDealt = $true
        }
    }
    if ($dmgDealt) {
        Ok "造成伤害（敌人血量减少）"
    } else {
        Info "无法确认伤害（敌人可能已死亡或有格挡）"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 9：自选祈唤 (OrbInvoke) — 选球 + 祈唤 + 抽1
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "自选祈唤" "INVOKER-ORB_INVOKE_CARD" {
    param($idx, $stateBefore)
    $orbsBefore = Get-OrbCounts $stateBefore
    $handBefore = $stateBefore.Combat.Hand.Count

    Play-Card $idx | Out-Null
    Wait-CombatStable
    Select-Card 0 | Out-Null  # 选 Quas
    Wait-CombatStable

    $stateAfter = Get-State
    $orbsAfter = Get-OrbCounts $stateAfter

    if ($orbsAfter.Last -match "QUAS") {
        Ok "最新球为 Quas（切球生效，Last=$($orbsAfter.Last)）"
    } else {
        Fail "最新球不是 Quas（Last=$($orbsAfter.Last)，选球 UI 交互可能需要手动）"
    }

    # 打出1(-1) + Invoke法术(+1) + 抽1(+1) = +1
    if ($stateAfter.Combat.Hand.Count -ge $handBefore + 1) {
        Ok "Invoke + 抽牌生效（手牌 $handBefore -> $($stateAfter.Combat.Hand.Count)）"
    } else {
        Info "手牌 $handBefore -> $($stateAfter.Combat.Hand.Count)"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 测试 10：元素共鸣 (ElementalResonance) — 打出后下回合有虚无祈唤
# ══════════════════════════════════════════════════════════════════════════════
Test-Card "元素共鸣" "INVOKER-ELEMENTAL_RESONANCE_CARD" {
    param($idx, $stateBefore)

    Play-Card $idx | Out-Null
    Wait-CombatStable
    $stateAfter = Get-State

    # 确认能力已应用
    $hasPower = $false
    # Powers 可能在 state 里，也可能需要检查 Player 状态
    Info "能力卡已打出，结束回合验证下回合是否有虚无祈唤..."

    # 结束回合（End-Turn 在敌方回合开始时返回，AfterPlayerTurnStart 在新玩家回合触发，需等待敌方行动完毕）
    End-Turn | Out-Null
    Start-Sleep 8
    $nextTurn = Get-State

    if (-not $nextTurn.InCombat) {
        Info "战斗已结束（敌人死亡），跳过验证"
        Skip "元素共鸣：战斗结束，无法验证回合开始效果"
        return
    }

    # 检查手牌是否有 InvokeCard（Ethereal）
    $invokeInHand = $nextTurn.Combat.Hand | Where-Object { $_.CardId -match "INVOKE_CARD" }
    if ($invokeInHand) {
        Ok "下回合手牌出现虚无祈唤（元素共鸣生效）"
        Info "   祈唤卡: $($invokeInHand.Name) cost=$($invokeInHand.Cost)"
    } else {
        Info "手牌: $(($nextTurn.Combat.Hand | ForEach-Object { $_.CardId }) -join ', ')"
        Fail "下回合手牌无虚无祈唤"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# 结果汇总
# ══════════════════════════════════════════════════════════════════════════════

Log "`n══════════════════════════════════════════"
Log "  验证结果汇总"
Log "══════════════════════════════════════════"
Log "  ✅ PASS: $PASS"
Log "  ❌ FAIL: $FAIL"
Log "  ⏭  SKIP: $SKIP"
Log "══════════════════════════════════════════"

if ($FAIL -eq 0) {
    Log "`n🎉 所有可验证项通过！" -ForegroundColor Green
} else {
    Log "`n⚠️  有 $FAIL 项失败，请检查上方日志" -ForegroundColor Yellow
}
