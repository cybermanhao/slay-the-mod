import { useEffect, useRef, useState } from 'react'
import {
  AgentState, LogEntry, InboxMessage, AssetEntry,
  fetchState, fetchLog, fetchInbox, fetchAssets, sendToAgent, assetImgUrl,
} from './api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(ts: string) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}
function fmtDate(ts: string | number) {
  return new Date(ts).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function levelColor(l: string) {
  return l === 'error' ? 'var(--red)' : l === 'warn' ? 'var(--yellow)' : l === 'debug' ? 'var(--muted)' : 'var(--text)'
}
function phaseColor(p: string) {
  return p === 'idle' ? 'var(--muted)' : p === 'error' ? 'var(--red)' : 'var(--green)'
}

// ── StatusBar ─────────────────────────────────────────────────────────────────

function StatusBar({ state, lastUpdate, tab, setTab, unread }: {
  state: AgentState | null; lastUpdate: Date
  tab: string; setTab: (t: string) => void; unread: number
}) {
  const phase = state?.phase ?? '…'
  const tabs = ['log', 'assets', 'inbox'] as const

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px 0' }}>
        <span style={{ color: 'var(--accent2)', fontWeight: 700, fontSize: 15 }}>STS2 Agent</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '2px 10px', borderRadius: 12,
          background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 12,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: phaseColor(phase),
            boxShadow: phase !== 'idle' ? `0 0 5px ${phaseColor(phase)}` : 'none',
          }} />
          {phase}
        </span>
        {state?.currentTask && (
          <span style={{ color: 'var(--muted)', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {String(state.currentTask)}
          </span>
        )}
        <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto' }}>
          {fmt(lastUpdate.toISOString())}
        </span>
      </div>
      <div style={{ display: 'flex', padding: '0 20px' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 14px 6px', fontSize: 13, fontWeight: 500,
            color: tab === t ? 'var(--accent2)' : 'var(--muted)',
            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            transition: 'color 0.15s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t === 'inbox' ? 'inbox' : t}
            {t === 'inbox' && unread > 0 && (
              <span style={{ background: 'var(--accent)', color: 'white', borderRadius: 8, padding: '0 5px', fontSize: 10 }}>
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── LogPanel ─────────────────────────────────────────────────────────────────

function LogPanel({ entries }: { entries: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length, autoScroll])

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '4px 0' }}
      onScroll={e => {
        const el = e.currentTarget
        setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40)
      }}
    >
      {entries.length === 0 && (
        <div style={{ padding: '32px 20px', color: 'var(--muted)', fontSize: 13 }}>No activity yet.</div>
      )}
      {entries.map((e, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '64px 44px 1fr',
          gap: 8, padding: '2px 20px', fontSize: 12, lineHeight: 1.6,
        }}>
          <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{fmt(e.timestamp)}</span>
          <span style={{ color: levelColor(e.level), textTransform: 'uppercase', fontSize: 10, paddingTop: 2 }}>{e.level}</span>
          <span style={{ color: levelColor(e.level) }}>{e.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

// ── AssetsPanel ───────────────────────────────────────────────────────────────

function AssetsPanel({ assets }: { assets: AssetEntry[] }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [selected, setSelected] = useState<AssetEntry | null>(null)

  const types = ['all', ...Array.from(new Set(assets.map(a => a.type)))]
  const filtered = typeFilter === 'all' ? assets : assets.filter(a => a.type === typeFilter)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              background: typeFilter === t ? 'var(--accent)' : 'var(--bg)',
              color: typeFilter === t ? 'white' : 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '3px 10px', fontSize: 12, cursor: 'pointer',
            }}>
              {t}
            </button>
          ))}
        </div>
        {/* Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignContent: 'flex-start' }}>
          {filtered.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: 8 }}>No assets found.</div>
          )}
          {filtered.map(a => (
            <div key={`${a.type}/${a.name}`}
              onClick={() => setSelected(selected?.name === a.name ? null : a)}
              style={{
                width: 120, cursor: 'pointer',
                background: 'var(--surface)',
                border: `2px solid ${selected?.name === a.name ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ height: 90, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {a.currentUrl
                  ? <img src={assetImgUrl(a.currentUrl)} alt={a.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  : <span style={{ color: 'var(--muted)', fontSize: 11 }}>no image</span>
                }
              </div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                  {a.type} · {a.history.length} ver
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail sidebar */}
      {selected && (
        <div style={{
          width: 280, borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
            {selected.name}
            <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11, marginLeft: 8 }}>{selected.type}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {/* Current */}
            {selected.currentUrl && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current</div>
                <img
                  src={assetImgUrl(selected.currentUrl)}
                  alt="current"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
                />
              </div>
            )}
            {/* History */}
            {selected.history.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  History ({selected.history.length})
                </div>
                {selected.history.map(v => (
                  <div key={v.version} style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    padding: '6px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <img
                      src={assetImgUrl(v.url)}
                      alt={`v${v.version}`}
                      style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>v{v.version}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtDate(v.mtime)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selected.history.length === 0 && !selected.currentUrl && (
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>No images yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── InboxPanel ────────────────────────────────────────────────────────────────

function InboxPanel({ messages, onSend }: { messages: InboxMessage[]; onSend: (msg: string) => void }) {
  const [draft, setDraft] = useState('')

  const handleSend = () => {
    const t = draft.trim()
    if (!t) return
    onSend(t)
    setDraft('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {messages.length === 0 && (
          <div style={{ padding: '32px 20px', color: 'var(--muted)', fontSize: 13 }}>No messages.</div>
        )}
        {[...messages].reverse().map(m => (
          <div key={m.id} style={{
            padding: '10px 20px',
            borderLeft: `3px solid ${m.read ? 'var(--border)' : 'var(--accent)'}`,
            marginBottom: 2,
          }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>{fmt(m.timestamp)}</span>
              {!m.read && <span style={{ color: 'var(--accent2)', fontSize: 11 }}>● unread</span>}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{m.message}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Send instruction to agent…"
          style={{
            flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '7px 12px', color: 'var(--text)', fontSize: 13, outline: 'none',
          }}
        />
        <button onClick={handleSend} style={{
          background: 'var(--accent)', color: 'white', border: 'none',
          borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 13,
        }}>
          Send
        </button>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<AgentState | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [inbox, setInbox] = useState<InboxMessage[]>([])
  const [assets, setAssets] = useState<AssetEntry[]>([])
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [tab, setTab] = useState<'log' | 'assets' | 'inbox'>('log')

  const refresh = async () => {
    try {
      const [s, l, i, a] = await Promise.all([fetchState(), fetchLog(), fetchInbox(), fetchAssets()])
      setState(s); setLog(l); setInbox(i); setAssets(a)
      setLastUpdate(new Date())
    } catch { /* server not yet started */ }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 2000)
    return () => clearInterval(id)
  }, [])

  const handleSend = async (msg: string) => {
    await sendToAgent(msg)
    await refresh()
  }

  const unread = inbox.filter(m => !m.read).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <StatusBar state={state} lastUpdate={lastUpdate} tab={tab} setTab={t => setTab(t as typeof tab)} unread={unread} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'log'    && <LogPanel entries={log} />}
        {tab === 'assets' && <AssetsPanel assets={assets} />}
        {tab === 'inbox'  && <InboxPanel messages={inbox} onSend={handleSend} />}
      </div>
    </div>
  )
}
