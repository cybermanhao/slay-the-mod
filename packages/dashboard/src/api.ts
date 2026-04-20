const BASE = import.meta.env.DEV ? 'http://localhost:7842' : ''

export interface AgentState {
  phase: string
  currentTask?: string
  timestamp: string
  progress?: Record<string, unknown>
  [key: string]: unknown
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  metadata?: Record<string, unknown>
}

export interface InboxMessage {
  id: string
  timestamp: string
  message: string
  read: boolean
  metadata?: Record<string, unknown>
}

export interface VersionInfo {
  version: number
  file: string
  url: string
  mtime: number
}

export interface AssetEntry {
  name: string
  type: string
  current: string | null
  currentUrl: string | null
  history: VersionInfo[]
}

export async function fetchState(): Promise<AgentState> {
  const r = await fetch(`${BASE}/api/state`)
  return r.json()
}

export async function fetchLog(limit = 200): Promise<LogEntry[]> {
  const r = await fetch(`${BASE}/api/log?limit=${limit}`)
  return r.json()
}

export async function fetchInbox(): Promise<InboxMessage[]> {
  const r = await fetch(`${BASE}/api/inbox`)
  return r.json()
}

export async function fetchAssets(): Promise<AssetEntry[]> {
  const r = await fetch(`${BASE}/api/assets`)
  return r.json()
}

export async function sendToAgent(message: string): Promise<void> {
  await fetch(`${BASE}/api/inbox`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
}

export function assetImgUrl(url: string): string {
  return BASE + url
}
