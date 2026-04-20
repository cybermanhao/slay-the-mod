/**
 * cli-helper-mcp — Generic agent workflow MCP server
 *
 * Focus: User interaction primitives (dialog, notification)
 * Platform: Windows / macOS / Linux (GNOME/KDE auto-detected)
 *
 * ─── FUTURE TOOLS (not yet implemented) ────────────────────────────────────
 *
 * Process management:
 *   spawn_process(command, cwd?) → { pid } — non-blocking background process
 *   process_status(pid) → { running, exitCode? }
 *   process_kill(pid)
 *
 * Environment inspection:
 *   which(executable) → { path? } — resolve executable path
 *   env_check(vars[]) → { [var]: value | null } — check env var presence
 *
 * Persistent agent state (file-backed KV):
 *   kv_set(key, value, namespace?)
 *   kv_get(key, namespace?) → { value? }
 *   flag_set(name) / flag_check(name) → { set: bool } — simple boolean flags
 *
 * Clipboard:
 *   clipboard_write(text) — write text to clipboard
 *
 * ────────────────────────────────────────────────────────────────────────────
 */
export {};
