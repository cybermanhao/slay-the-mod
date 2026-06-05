using Godot;

namespace Invoker.Scripts.MiniGame;

public partial class SunStrikeMiniGameNode : Control
{
    // ── tunables ──────────────────────────────────────────────────────────
    private const float StrikeRadius   = 55f;
    private const float EnemySpeedBase = 38f;
    private const float TimeLimit      = 5f;
    private const float StrikeDelay    = 1.7f;   // delay before damage resolves
    private const float ResultShowTime = 2.8f;

    // scroll geometry
    private const float ScrollW    = 700f;
    private const float ScrollH    = 520f;
    private const float RollerH    = 38f;
    private const float InnerPadX  = 48f;
    private const float TitleH     = 52f;
    private const float BottomBarH = 90f;

    // ── state ─────────────────────────────────────────────────────────────
    private readonly Action<MiniGameResult> _onComplete;
    public IReadOnlyList<EnemyInfo> Enemies { get; }
    private readonly decimal _baseDmg;

    private Vector2[] _pos = [];
    private Vector2[] _vel = [];
    private float[]   _rad = [];

    private Vector2 _mousePos;
    private float   _timeLeft = TimeLimit;

    // pending strike: locked in but not yet resolved
    private bool    _pendingStrike;
    private Vector2 _firePos;
    private float   _strikeTimer;   // 0 → StrikeDelay

    // resolved: result showing
    private bool    _fired;
    private float   _resultTimer;
    private IReadOnlyList<(int TargetIndex, decimal Accuracy)> _hits = [];

    private bool    _posInit;
    private readonly Random _rng = new();

    private Rect2 _scrollRect;
    private Rect2 _playArea;

    public SunStrikeMiniGameNode(Action<MiniGameResult> onComplete,
                                  IReadOnlyList<EnemyInfo> enemies,
                                  decimal baseDmg = 28m)
    {
        _onComplete = onComplete;
        Enemies     = enemies;
        _baseDmg    = baseDmg;
    }

    // ── Godot lifecycle ───────────────────────────────────────────────────
    public override void _Ready()
    {
        SetAnchorsAndOffsetsPreset(LayoutPreset.FullRect);
        MouseFilter = MouseFilterEnum.Stop;

        int n = Enemies.Count;
        _pos = new Vector2[n];
        _vel = new Vector2[n];
        _rad = new float[n];
        for (int i = 0; i < n; i++)
            _rad[i] = Mathf.Clamp(20f + Enemies[i].MaxHp * 0.38f, 26f, 68f);
    }

    private void ComputeLayout()
    {
        var origin = (Size - new Vector2(ScrollW, ScrollH)) / 2f;
        _scrollRect = new Rect2(origin, new Vector2(ScrollW, ScrollH));

        float playTop    = origin.Y + RollerH + TitleH;
        float playBottom = origin.Y + ScrollH - RollerH - BottomBarH;
        _playArea = new Rect2(
            origin.X + InnerPadX, playTop,
            ScrollW - InnerPadX * 2f, playBottom - playTop);
    }

    public override void _Process(double delta)
    {
        if (!_posInit && Size.X > 0)
        {
            ComputeLayout();
            InitPositions();
            _posInit = true;
        }

        // ── result phase: show result, then notify and remove ────────────
        if (_fired)
        {
            _resultTimer -= (float)delta;
            if (_resultTimer <= 0)
            {
                _onComplete(new MiniGameResult(_hits));
                CallDeferred(MethodName.QueueFree);
            }
            QueueRedraw();
            return;
        }

        // ── strike in-flight phase: enemies keep moving, animate fill ─────
        if (_pendingStrike)
        {
            MoveEnemies((float)delta);
            _strikeTimer += (float)delta;
            if (_strikeTimer >= StrikeDelay)
                ResolveFire();
            QueueRedraw();
            return;
        }

        // ── aiming phase ──────────────────────────────────────────────────
        _timeLeft -= (float)delta;
        if (_timeLeft <= 0)
        {
            LockStrike(_mousePos);
            return;
        }

        MoveEnemies((float)delta);
        QueueRedraw();
    }

    private void InitPositions()
    {
        int n   = Enemies.Count;
        float w = _playArea.Size.X;
        float cx = _playArea.Position.X;
        float cy = _playArea.Position.Y + _playArea.Size.Y * 0.5f;

        for (int i = 0; i < n; i++)
        {
            float t = n == 1 ? 0.5f : (float)i / (n - 1);
            _pos[i] = new Vector2(
                cx + w * (0.15f + t * 0.70f),
                cy + _playArea.Size.Y * 0.28f * (float)(_rng.NextDouble() - 0.5));
            float angle = (float)(_rng.NextDouble() * Math.Tau);
            _vel[i] = new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * EnemySpeedBase;
        }
    }

    private void MoveEnemies(float delta)
    {
        for (int i = 0; i < _pos.Length; i++)
        {
            _pos[i] += _vel[i] * delta;
            float r  = _rad[i];
            float lx = _playArea.Position.X + r;
            float rx = _playArea.End.X - r;
            float ty = _playArea.Position.Y + r;
            float by = _playArea.End.Y - r;
            if (_pos[i].X < lx || _pos[i].X > rx) _vel[i] = new Vector2(-_vel[i].X, _vel[i].Y);
            if (_pos[i].Y < ty || _pos[i].Y > by) _vel[i] = new Vector2(_vel[i].X, -_vel[i].Y);
            _pos[i] = _pos[i].Clamp(new Vector2(lx, ty), new Vector2(rx, by));
        }
    }

    public override void _Input(InputEvent @event)
    {
        if (_fired || _pendingStrike) return;
        if (@event is InputEventMouseMotion m)
        {
            _mousePos = m.Position;
            QueueRedraw();
        }
        else if (@event is InputEventMouseButton { Pressed: true, ButtonIndex: MouseButton.Left } mb)
        {
            LockStrike(mb.Position);
        }
    }

    // ── core logic ────────────────────────────────────────────────────────

    private void LockStrike(Vector2 click)
    {
        _pendingStrike = true;
        _firePos       = click;
        _strikeTimer   = 0f;
        QueueRedraw();
    }

    private void ResolveFire()
    {
        _pendingStrike = false;
        _fired         = true;

        var hits = new List<(int, decimal)>();
        for (int i = 0; i < _pos.Length; i++)
        {
            float dist   = _firePos.DistanceTo(_pos[i]);
            float maxHit = StrikeRadius + _rad[i];
            if (dist < maxHit)
            {
                float raw   = Mathf.Clamp(1f - dist / maxHit, 0f, 1f);
                decimal acc = (decimal)(raw * raw);
                hits.Add((i, acc));
            }
        }

        _hits        = hits;
        _resultTimer = ResultShowTime;
        // _onComplete is called AFTER ResultShowTime elapses, not here
        QueueRedraw();
    }

    // ── rendering ─────────────────────────────────────────────────────────
    public override void _Draw()
    {
        if (!_posInit) return;

        DrawRect(new Rect2(Vector2.Zero, Size), new Color(0f, 0f, 0f, 0.60f));
        DrawScroll();

        for (int i = 0; i < _pos.Length; i++)
            DrawEnemy(i);

        DrawStrikeIndicator();
    }

    private void DrawScroll()
    {
        var o = _scrollRect.Position;

        DrawRect(_scrollRect, new Color(0.92f, 0.86f, 0.68f));
        DrawRect(new Rect2(o.X + InnerPadX - 4, _playArea.Position.Y - 4,
                           _playArea.Size.X + 8, _playArea.Size.Y + 8),
                 new Color(0f, 0f, 0f, 0.07f));

        DrawRoller(new Vector2(o.X, o.Y), ScrollW, RollerH);
        DrawRoller(new Vector2(o.X, o.Y + ScrollH - RollerH), ScrollW, RollerH);

        DrawString(ThemeDB.FallbackFont,
            new Vector2(o.X + ScrollW / 2f - 60f, o.Y + RollerH + 38f),
            "☀  阳炎冲击", modulate: new Color(0.48f, 0.22f, 0.04f), fontSize: 24);

        float divY = o.Y + RollerH + TitleH;
        DrawLine(new Vector2(o.X + InnerPadX, divY),
                 new Vector2(o.X + ScrollW - InnerPadX, divY),
                 new Color(0.55f, 0.38f, 0.18f, 0.55f), 1.5f);

        float bottomY = _playArea.End.Y + 12f;
        DrawCountdownBar(bottomY);

        if (!_pendingStrike && !_fired)
            DrawString(ThemeDB.FallbackFont,
                new Vector2(o.X + ScrollW / 2f - 65f, bottomY + 54f),
                "点击放置天火", modulate: new Color(0.40f, 0.22f, 0.08f), fontSize: 18);
        else if (_pendingStrike)
            DrawString(ThemeDB.FallbackFont,
                new Vector2(o.X + ScrollW / 2f - 50f, bottomY + 54f),
                "天火下落中…", modulate: new Color(0.85f, 0.30f, 0.08f), fontSize: 18);
    }

    private void DrawRoller(Vector2 pos, float w, float rh)
    {
        DrawRect(new Rect2(pos, new Vector2(w, rh)), new Color(0.30f, 0.18f, 0.08f));
        DrawLine(pos + new Vector2(0, 5f),      pos + new Vector2(w, 5f),      new Color(0.55f, 0.38f, 0.18f, 0.55f), 2f);
        DrawLine(pos + new Vector2(0, rh - 3f), pos + new Vector2(w, rh - 3f), new Color(0f, 0f, 0f, 0.35f), 2f);
        float capR = rh * 0.55f;
        DrawCircle(pos + new Vector2(capR + 4f,     rh / 2f), capR, new Color(0.42f, 0.26f, 0.10f));
        DrawCircle(pos + new Vector2(w - capR - 4f, rh / 2f), capR, new Color(0.42f, 0.26f, 0.10f));
    }

    private void DrawCountdownBar(float barTopY)
    {
        float barW = ScrollW - InnerPadX * 2f;
        float barX = _scrollRect.Position.X + InnerPadX;

        float ratio;
        Color col;
        if (_pendingStrike)
        {
            // Shows strike delay progress (fills up as the strike falls)
            ratio = Mathf.Clamp(_strikeTimer / StrikeDelay, 0f, 1f);
            col   = new Color(1f, 0.30f, 0.08f);
        }
        else if (_fired)
        {
            ratio = 0f;
            col   = new Color(0.3f, 0.3f, 0.3f);
        }
        else
        {
            ratio = Mathf.Clamp(_timeLeft / TimeLimit, 0f, 1f);
            col   = ratio > 0.5f ? new Color(0.22f, 0.78f, 0.22f)
                  : ratio > 0.25f ? new Color(1f, 0.75f, 0.10f)
                  : new Color(1f, 0.22f, 0.18f);
        }

        DrawRect(new Rect2(barX, barTopY + 4f, barW, 10f), new Color(0.30f, 0.22f, 0.14f));
        DrawRect(new Rect2(barX, barTopY + 4f, barW * ratio, 10f), col);
    }

    private void DrawEnemy(int i)
    {
        var pos = _pos[i];
        float r = _rad[i];
        var e   = Enemies[i];

        bool wasHit = _fired && _hits.Any(h => h.TargetIndex == i);
        Color fill = wasHit
            ? new Color(0.80f, 0.35f, 0.05f, 0.90f)
            : new Color(0.28f, 0.48f, 0.78f, 0.75f);
        DrawCircle(pos, r, fill);

        if (wasHit)
            DrawArc(pos, r + 4f, 0, Mathf.Tau, 48, new Color(1f, 0.87f, 0.10f), 3f);

        DrawString(ThemeDB.FallbackFont,
            pos + new Vector2(-r * 0.85f, 6f),
            e.Name, modulate: Colors.White, fontSize: 14);

        float bw = r * 1.9f;
        var bPos = pos + new Vector2(-bw / 2f, r + 6f);
        DrawRect(new Rect2(bPos, new Vector2(bw, 5f)), new Color(0.15f, 0.12f, 0.08f));
        float hpRatio = e.MaxHp > 0 ? (float)e.CurrentHp / e.MaxHp : 1f;
        Color hpCol = hpRatio > 0.5f ? new Color(0.2f, 0.82f, 0.2f)
                    : hpRatio > 0.25f ? new Color(1f, 0.78f, 0.1f)
                    : new Color(1f, 0.2f, 0.15f);
        DrawRect(new Rect2(bPos, new Vector2(bw * hpRatio, 5f)), hpCol);

        if (wasHit)
        {
            decimal acc    = _hits.First(h => h.TargetIndex == i).Accuracy;
            int dmgNum     = (int)Math.Round(_baseDmg * acc);
            string accLbl  = acc >= 0.8m ? "完美命中" : acc >= 0.5m ? "命中" : "擦边";
            Color lc       = acc >= 0.8m ? new Color(0.15f, 0.90f, 0.15f)
                           : acc >= 0.5m ? new Color(1f, 0.92f, 0.10f)
                           : new Color(1f, 0.52f, 0.10f);

            // accuracy label
            DrawString(ThemeDB.FallbackFont,
                pos + new Vector2(-30f, -r - 32f),
                accLbl, modulate: lc, fontSize: 18);

            // damage number — large, red-orange
            DrawString(ThemeDB.FallbackFont,
                pos + new Vector2(-28f, -r - 10f),
                $"-{dmgNum}", modulate: new Color(1f, 0.35f, 0.08f), fontSize: 26);
        }
    }

    private void DrawStrikeIndicator()
    {
        if (_fired)
        {
            // Frozen ring + result
            DrawArc(_firePos, StrikeRadius, 0, Mathf.Tau, 48,
                new Color(1f, 0.38f, 0.05f, 0.92f), 3f);
            DrawCircle(_firePos, 7f, new Color(1f, 0.38f, 0.05f));

            if (!_hits.Any())
                DrawString(ThemeDB.FallbackFont,
                    _firePos + new Vector2(-30f, -StrikeRadius - 14f),
                    "脱靶", modulate: new Color(1f, 0.22f, 0.20f), fontSize: 28);
            return;
        }

        if (_pendingStrike)
        {
            // Locked ring (gold)
            DrawArc(_firePos, StrikeRadius, 0, Mathf.Tau, 48,
                new Color(1f, 0.82f, 0.10f, 0.90f), 2.5f);

            // Expanding red fill — radius grows from 0 to StrikeRadius over StrikeDelay
            float progress  = Mathf.Clamp(_strikeTimer / StrikeDelay, 0f, 1f);
            float fillR     = StrikeRadius * progress;
            if (fillR > 0.5f)
                DrawCircle(_firePos, fillR, new Color(1f, 0.12f, 0.05f, 0.45f));

            // Center dot pulses
            DrawCircle(_firePos, 5f + 3f * progress, new Color(1f, 0.5f, 0.1f, 0.85f));
            return;
        }

        // Aiming: follow mouse
        DrawArc(_mousePos, StrikeRadius, 0, Mathf.Tau, 48,
            new Color(1f, 0.72f, 0.08f, 0.60f), 2.5f);
        DrawCircle(_mousePos, 4.5f, new Color(1f, 0.80f, 0.12f, 0.90f));
    }
}
