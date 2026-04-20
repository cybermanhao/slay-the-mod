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
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = 'C:/code/slay-the-mod';
function resolveProjectPath(p) {
    if (path.isAbsolute(p))
        return p;
    return path.join(PROJECT_ROOT, p);
}
function capOutput(s, max = 10000) {
    if (s.length <= max)
        return s;
    return s.slice(0, max) + `\n... (truncated, total ${s.length} chars)`;
}
function detectPlatform() {
    const p = process.platform;
    if (p === 'win32')
        return { os: 'windows', desktop: null };
    if (p === 'darwin')
        return { os: 'macos', desktop: null };
    // Linux — check XDG_CURRENT_DESKTOP and DESKTOP_SESSION
    const xdg = (process.env.XDG_CURRENT_DESKTOP ?? process.env.DESKTOP_SESSION ?? '').toLowerCase();
    const desktop = xdg.includes('gnome') || xdg.includes('unity') || xdg.includes('pantheon')
        ? 'gnome'
        : xdg.includes('kde') || xdg.includes('plasma')
            ? 'kde'
            : 'other';
    return { os: 'linux', desktop };
}
function runCmd(cmd, args_, timeoutMs = 120000) {
    try {
        const r = spawnSync(cmd, args_, { shell: false, timeout: timeoutMs, encoding: 'utf8' });
        return {
            stdout: (r.stdout ?? '').trim(),
            success: (r.status ?? -1) === 0,
            stderr: r.stderr?.trim() || undefined,
        };
    }
    catch (err) {
        return { stdout: '', success: false, stderr: String(err) };
    }
}
// ─── show_dialog ─────────────────────────────────────────────────────────────
//
// Cross-platform synchronous user interaction.
// Windows  → PowerShell (WinForms / VisualBasic / WPF)
// macOS    → osascript (AppleScript)
// Linux    → zenity (GNOME) / kdialog (KDE) / zenity fallback
//
// Modes:
//   confirm       → Yes/No/Cancel
//   ok            → OK only
//   input         → free text entry
//   select        → numbered choice list
//   file_picker   → native file browser, returns "|"-separated paths or ""
//                   continueAdding=true: loops, asks "Add more?" after each pick, merges results
function toolShowDialog(args) {
    const { title, message, mode = 'ok', choices = [] } = args;
    const multi = args.multiSelect !== false;
    const plat = detectPlatform();
    // ── file_picker continueAdding loop ──────────────────────────────────────
    if (mode === 'file_picker' && args.continueAdding) {
        const allPaths = [];
        let round = 1;
        while (true) {
            const pickResult = toolShowDialog({ ...args, continueAdding: false,
                title: round === 1 ? title : `${title} (批次 ${round})` });
            const batch = pickResult.response.split('|').filter(Boolean);
            allPaths.push(...batch);
            if (batch.length === 0)
                break; // user cancelled — stop
            // Ask if they want to add more
            const more = toolShowDialog({
                title: '继续添加？',
                message: `已选 ${allPaths.length} 张。继续添加更多图片吗？`,
                mode: 'confirm',
            });
            if (more.response !== 'Yes')
                break;
            round++;
        }
        return { response: allPaths.join('|'), success: allPaths.length > 0, count: allPaths.length };
    }
    // ── Windows ──────────────────────────────────────────────────────────────
    if (plat.os === 'windows') {
        let script;
        const eMsg = message.replace(/'/g, "''").replace(/"/g, '`"');
        const eTitle = title.replace(/'/g, "''").replace(/"/g, '`"');
        if (mode === 'file_picker') {
            const filter = (args.fileFilter ?? 'Images (*.png;*.jpg;*.jpeg;*.webp)|*.png;*.jpg;*.jpeg;*.webp|All files (*.*)|*.*')
                .replace(/'/g, "''").replace(/"/g, '`"');
            script = [
                'Add-Type -AssemblyName System.Windows.Forms',
                '$d = New-Object System.Windows.Forms.OpenFileDialog',
                `$d.Title = "${eTitle}"`,
                `$d.Filter = "${filter}"`,
                `$d.Multiselect = $${multi ? 'true' : 'false'}`,
                `$d.InitialDirectory = "${process.cwd().replace(/\\/g, '\\\\')}"`,
                'if ($d.ShowDialog() -eq "OK") { Write-Output ($d.FileNames -join "|") } else { Write-Output "" }',
            ].join('; ');
        }
        else if (mode === 'input') {
            script = [
                'Add-Type -AssemblyName Microsoft.VisualBasic',
                `$result = [Microsoft.VisualBasic.Interaction]::InputBox("${eMsg}", "${eTitle}", "")`,
                'Write-Output $result',
            ].join('; ');
        }
        else if (mode === 'select' && choices.length > 0) {
            const listBody = choices.map((c, i) => `${i + 1}. ${c}`).join('\\n');
            const fullMsg = `${eMsg}\\n\\n${listBody}\\n\\nEnter number:`;
            const choicesJson = JSON.stringify(choices).replace(/'/g, "''");
            script = [
                'Add-Type -AssemblyName Microsoft.VisualBasic',
                `$input = [Microsoft.VisualBasic.Interaction]::InputBox("${fullMsg}", "${eTitle}", "")`,
                `$choices = '${choicesJson}' | ConvertFrom-Json`,
                '$idx = [int]$input - 1',
                'if ($idx -ge 0 -and $idx -lt $choices.Count) { Write-Output $choices[$idx] } else { Write-Output "" }',
            ].join('; ');
        }
        else {
            const buttons = mode === 'confirm' ? 'YesNoCancel' : 'OK';
            script = [
                'Add-Type -AssemblyName PresentationFramework',
                `$result = [System.Windows.MessageBox]::Show("${eMsg}", "${eTitle}", "${buttons}", "Question")`,
                'Write-Output $result',
            ].join('; ');
        }
        // file_picker needs STA thread for WinForms + must NOT use -NonInteractive (blocks GUI)
        const psFlags = mode === 'file_picker'
            ? ['-NoProfile', '-STA', '-Command', script]
            : ['-NoProfile', '-NonInteractive', '-Command', script];
        const r = runCmd('powershell', psFlags);
        return { response: r.stdout, success: r.success, stderr: r.stderr };
    }
    // ── macOS ─────────────────────────────────────────────────────────────────
    if (plat.os === 'macos') {
        const eMsg = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const eTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        if (mode === 'file_picker') {
            const exts = (args.fileFilter ?? '').match(/\*\.\w+/g) ?? ['*.png', '*.jpg', '*.jpeg', '*.webp'];
            const utis = exts.map(e => `"${e.replace('*.', '')}"`).join(', ');
            const multi_ = multi ? 'with multiple selections allowed' : '';
            const script = `choose file of type {${utis}} with prompt "${eMsg}" ${multi_}`;
            const r = runCmd('osascript', ['-e', script]);
            // osascript returns comma-separated alias paths like "Macintosh HD:Users:..."
            // Convert colon-separated Mac paths to POSIX
            const paths = r.stdout.split(', ').map(p => p.trim()).filter(Boolean)
                .map(p => {
                const posix = p.replace(/^[^:]+:/, '/').replace(/:/g, '/');
                return posix;
            }).join('|');
            return { response: paths, success: r.success, stderr: r.stderr };
        }
        else if (mode === 'input') {
            const r = runCmd('osascript', ['-e',
                `display dialog "${eMsg}" with title "${eTitle}" default answer "" buttons {"Cancel","OK"} default button "OK"`
            ]);
            const match = r.stdout.match(/text returned:([^,]*)/);
            return { response: match ? match[1].trim() : '', success: r.success && !!match };
        }
        else if (mode === 'select' && choices.length > 0) {
            const list = choices.map(c => `"${c.replace(/"/g, '\\"')}"`).join(', ');
            const r = runCmd('osascript', ['-e',
                `choose from list {${list}} with prompt "${eMsg}" with title "${eTitle}"`
            ]);
            return { response: r.stdout === 'false' ? '' : r.stdout, success: r.success };
        }
        else if (mode === 'confirm') {
            const r = runCmd('osascript', ['-e',
                `display dialog "${eMsg}" with title "${eTitle}" buttons {"Cancel","No","Yes"} default button "Yes"`
            ]);
            const btn = r.stdout.match(/button returned:(\w+)/)?.[1] ?? 'Cancel';
            return { response: btn, success: r.success };
        }
        else {
            runCmd('osascript', ['-e',
                `display dialog "${eMsg}" with title "${eTitle}" buttons {"OK"} default button "OK"`
            ]);
            return { response: 'OK', success: true };
        }
    }
    // ── Linux ─────────────────────────────────────────────────────────────────
    const useKdialog = plat.desktop === 'kde';
    if (mode === 'file_picker') {
        if (useKdialog) {
            const multiFlag = multi ? '--multiple --separate-output' : '';
            const r = runCmd('kdialog', ['--getopenfilename', os.homedir(), '--title', title, ...(multi ? ['--multiple', '--separate-output'] : [])]);
            return { response: r.stdout.split('\n').filter(Boolean).join('|'), success: r.success };
        }
        else {
            // zenity
            const r = runCmd('zenity', [
                '--file-selection', '--title', title,
                '--file-filter', args.fileFilter ?? '*.png *.jpg *.jpeg *.webp',
                ...(multi ? ['--multiple', '--separator', '|'] : []),
            ]);
            return { response: r.stdout, success: r.success };
        }
    }
    else if (mode === 'input') {
        if (useKdialog) {
            const r = runCmd('kdialog', ['--inputbox', message, '', '--title', title]);
            return { response: r.stdout, success: r.success };
        }
        else {
            const r = runCmd('zenity', ['--entry', '--title', title, '--text', message]);
            return { response: r.stdout, success: r.success };
        }
    }
    else if (mode === 'select' && choices.length > 0) {
        if (useKdialog) {
            const menuArgs = choices.flatMap((c, i) => [`${i + 1}`, c]);
            const r = runCmd('kdialog', ['--menu', message, '--title', title, ...menuArgs]);
            const idx = parseInt(r.stdout) - 1;
            return { response: choices[idx] ?? '', success: r.success };
        }
        else {
            const r = runCmd('zenity', ['--list', '--title', title, '--text', message, '--column', 'Option', ...choices]);
            return { response: r.stdout, success: r.success };
        }
    }
    else if (mode === 'confirm') {
        if (useKdialog) {
            const r = runCmd('kdialog', ['--yesnocancel', message, '--title', title]);
            const response = r.success ? 'Yes' : (r.stdout === '' ? 'Cancel' : 'No');
            return { response, success: true };
        }
        else {
            const r = runCmd('zenity', ['--question', '--title', title, '--text', message]);
            return { response: r.success ? 'Yes' : 'No', success: true };
        }
    }
    else {
        if (useKdialog) {
            runCmd('kdialog', ['--msgbox', message, '--title', title]);
        }
        else {
            runCmd('zenity', ['--info', '--title', title, '--text', message]);
        }
        return { response: 'OK', success: true };
    }
}
// ─── show_notification ───────────────────────────────────────────────────────
//
// Non-blocking system notification.
// Windows → NotifyIcon balloon (WinForms)
// macOS   → osascript display notification
// Linux   → notify-send
function toolShowNotification(args) {
    const { title, message, type = 'info' } = args;
    const plat = detectPlatform();
    if (plat.os === 'windows') {
        const iconType = type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Info';
        const eTitle = title.replace(/"/g, '`"');
        const eMessage = message.replace(/"/g, '`"');
        const script = [
            'Add-Type -AssemblyName System.Windows.Forms',
            '$n = New-Object System.Windows.Forms.NotifyIcon',
            '$n.Icon = [System.Drawing.SystemIcons]::Information',
            '$n.Visible = $true',
            `$n.ShowBalloonTip(4000, "${eTitle}", "${eMessage}", [System.Windows.Forms.ToolTipIcon]::${iconType})`,
            'Start-Sleep -Milliseconds 500',
            '$n.Dispose()',
        ].join('; ');
        const r = runCmd('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], 10000);
        return { sent: r.success, stderr: r.stderr };
    }
    if (plat.os === 'macos') {
        const eTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const eMessage = message.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const r = runCmd('osascript', ['-e',
            `display notification "${eMessage}" with title "${eTitle}"`
        ], 5000);
        return { sent: r.success, stderr: r.stderr };
    }
    // Linux — notify-send
    const urgency = type === 'error' ? 'critical' : type === 'warning' ? 'normal' : 'low';
    const r = runCmd('notify-send', ['--urgency', urgency, title, message], 5000);
    return { sent: r.success, stderr: r.stderr };
}
const _pickerSessions = new Map();
const IMAGE_EXTS_SET = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
function buildPickerHtml(sessionId, title, message, items, multiSelect, allowUpload) {
    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    // All dynamic data goes through JSON.stringify — zero escaping issues
    const config = JSON.stringify({ sessionId, multiSelect, allowUpload, items });
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f0f1a;color:#e0e0e0;padding:24px;min-height:100vh}
  h1{font-size:1.4rem;color:#c8a2e8;margin-bottom:6px}
  .msg{color:#888;margin-bottom:8px;font-size:.9rem}
  .hint{color:#555;font-size:.8rem;margin-bottom:18px}
  .grid{display:flex;flex-wrap:wrap;gap:16px;justify-content:flex-start;margin-bottom:24px}
  .card{background:#16213e;border:2px solid #2a2a4e;border-radius:10px;padding:12px;width:200px;
        text-align:center;cursor:pointer;position:relative;transition:border-color .15s,transform .1s,box-shadow .15s;user-select:none}
  .card:hover{border-color:#7b5ea7;transform:translateY(-2px);box-shadow:0 4px 20px rgba(123,94,167,.3)}
  .card.selected{border-color:#c8a2e8;box-shadow:0 0 0 3px rgba(200,162,232,.25)}
  .card.history{border-style:dashed;opacity:.85}
  .badge{position:absolute;top:8px;left:8px;background:#7b5ea7;color:#fff;border-radius:50%;
         width:22px;height:22px;line-height:22px;font-size:.75rem;font-weight:700;text-align:center}
  .hist-badge{position:absolute;bottom:8px;left:8px;background:#3a2a4e;color:#9070c0;
              border-radius:4px;padding:1px 5px;font-size:.65rem;font-weight:600}
  .check{position:absolute;top:8px;right:8px;background:#c8a2e8;color:#0f0f1a;border-radius:50%;
         width:22px;height:22px;line-height:22px;font-size:.85rem;font-weight:700;display:none;text-align:center}
  .card.selected .check{display:block}
  .card-img{max-width:100%;max-height:160px;border-radius:6px;object-fit:contain;display:block;margin:28px auto 10px}
  .label{font-size:.85rem;color:#d4c4f0;font-weight:600;margin-bottom:6px;word-break:break-all}
  .meta{font-size:.72rem;color:#666;text-align:left;margin-top:4px}
  .meta-row{display:flex;gap:6px;padding:1px 0}
  .mk{color:#5555aa;min-width:50px}
  #upload-zone{border:2px dashed #3a2a5e;border-radius:10px;padding:16px 24px;
               display:flex;align-items:center;gap:12px;cursor:pointer;margin-bottom:20px;
               transition:border-color .2s,background .2s}
  #upload-zone:hover,#upload-zone.over{border-color:#c8a2e8;background:#16213e}
  .uz-icon{font-size:1.4rem;color:#7b5ea7}
  .uz-text{color:#7b5ea7;font-size:.9rem}
  #upload-status{font-size:.8rem;color:#7b5ea7;min-height:1.2em;margin-bottom:12px}
  input[type=file]{display:none}
  .toolbar{display:flex;gap:12px;align-items:center;border-top:1px solid #2a2a4e;padding-top:16px}
  .count{flex:1;color:#888;font-size:.85rem}
  button{padding:10px 28px;border-radius:8px;border:none;font-size:.95rem;font-weight:600;cursor:pointer;transition:opacity .15s}
  .btn-confirm{background:#7b5ea7;color:#fff}
  .btn-confirm:hover{opacity:.85}
  .btn-confirm:disabled{background:#3a3a5e;color:#666;cursor:not-allowed}
  .btn-cancel{background:#2a2a4e;color:#888}
  .btn-cancel:hover{opacity:.85}
</style>
</head>
<body>
<h1>${esc(title)}</h1>
<p class="msg">${esc(message)}</p>
<p class="hint">${multiSelect ? '点击多选' : '点击选择'} · then click Confirm</p>
<div id="upload-zone" style="display:none">
  <span class="uz-icon">＋</span>
  <span class="uz-text">上传新图片（拖拽或点击）</span>
</div>
<input type="file" id="fi" accept="image/*" multiple>
<div id="upload-status"></div>
<div class="grid" id="grid"></div>
<div class="toolbar">
  <div class="count" id="count">0 selected</div>
  <button class="btn-cancel" id="btn-cancel">Cancel</button>
  <button class="btn-confirm" id="btn-confirm" disabled>Confirm</button>
</div>

<script>window.__PICKER_CONFIG__ = ${config};</script>
<script src="/picker.js"></script>
</body>
</html>`;
}
async function toolShowAssetPicker(args) {
    const { title, message, multiSelect = false, allowUpload = false, uploadDir, showHistory = false } = args;
    let assets = [...(args.assets ?? [])];
    if (allowUpload && !uploadDir)
        return { error: 'uploadDir is required when allowUpload is true' };
    // Prepend history items (existing files in uploadDir, not already in assets)
    if (showHistory && uploadDir && fs.existsSync(uploadDir)) {
        const existingPaths = new Set(assets.map(a => a.imagePath));
        const histFiles = fs.readdirSync(uploadDir)
            .filter(f => IMAGE_EXTS_SET.has(path.extname(f).toLowerCase()))
            .map(f => path.join(uploadDir, f))
            .filter(p => !existingPaths.has(p))
            .sort();
        const histItems = histFiles.map(p => ({
            label: path.basename(p),
            imagePath: p,
            metadata: { _src: 'history' },
        }));
        assets = [...assets, ...histItems];
    }
    if (assets.length === 0 && !allowUpload)
        return { error: 'No assets provided' };
    const absUploadDir = uploadDir ? path.resolve(uploadDir) : undefined;
    if (absUploadDir)
        fs.mkdirSync(absUploadDir, { recursive: true });
    const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const result = await new Promise((resolve) => {
        _pickerSessions.set(sessionId, { items: assets, multiSelect, uploadDir: absUploadDir, resolve });
        setTimeout(() => {
            if (_pickerSessions.has(sessionId)) {
                _pickerSessions.delete(sessionId);
                resolve({ selections: [], uploadedFiles: [], cancelled: true });
            }
        }, 600000);
        const url = `http://localhost:${DASHBOARD_PORT}/picker/${sessionId}`;
        spawnSync('cmd.exe', ['/c', 'start', '""', url], { shell: false, timeout: 5000 });
    });
    _pickerSessions.delete(sessionId);
    if (result.cancelled)
        return { cancelled: true, count: 0 };
    return {
        selections: result.selections,
        uploadedFiles: result.uploadedFiles,
        count: result.selections.length,
    };
}
const _uploadSessions = new Map();
function buildUploadHtml(sessionId, title, message) {
    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f0f1a;color:#e0e0e0;padding:32px;min-height:100vh}
  h1{font-size:1.4rem;color:#c8a2e8;margin-bottom:6px}
  .msg{color:#888;margin-bottom:24px;font-size:.9rem}
  #drop{border:2px dashed #3a2a5e;border-radius:12px;padding:48px 24px;text-align:center;
        cursor:pointer;transition:border-color .2s,background .2s;margin-bottom:24px}
  #drop:hover,#drop.over{border-color:#c8a2e8;background:#16213e}
  #drop .icon{font-size:3rem;margin-bottom:12px;opacity:.6}
  #drop .hint{color:#7b5ea7;font-size:1rem;margin-bottom:6px}
  #drop .sub{color:#555;font-size:.8rem}
  #previews{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px}
  .prev{position:relative;width:140px;background:#16213e;border-radius:8px;padding:8px;border:1px solid #2a2a4e}
  .prev img{width:100%;height:100px;object-fit:contain;border-radius:4px;display:block;margin-bottom:6px}
  .prev .name{font-size:.72rem;color:#aaa;word-break:break-all}
  .prev .size{font-size:.68rem;color:#555}
  .prev .rm{position:absolute;top:4px;right:4px;background:#3a0a0a;color:#ff6b6b;border:none;
            border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:.8rem;line-height:20px;text-align:center}
  .toolbar{display:flex;gap:12px;align-items:center}
  .count{flex:1;color:#888;font-size:.85rem}
  button{padding:10px 28px;border-radius:8px;border:none;font-size:.95rem;font-weight:600;cursor:pointer;transition:opacity .15s}
  .btn-confirm{background:#7b5ea7;color:#fff}
  .btn-confirm:hover{opacity:.85}
  .btn-confirm:disabled{background:#3a3a5e;color:#666;cursor:not-allowed}
  .btn-cancel{background:#2a2a4e;color:#888}
  .btn-cancel:hover{opacity:.85}
  #status{margin-top:16px;font-size:.85rem;color:#7b5ea7;min-height:1.2em}
  input[type=file]{display:none}
</style>
</head>
<body>
<h1>${esc(title)}</h1>
<p class="msg">${esc(message)}</p>
<div id="drop" onclick="document.getElementById('fi').click()">
  <div class="icon">📁</div>
  <div class="hint">拖拽图片到这里，或点击浏览</div>
  <div class="sub">支持 PNG / JPG / JPEG / WEBP · 可多选</div>
</div>
<input type="file" id="fi" accept="image/*" multiple onchange="addFiles(this.files)">
<div id="previews"></div>
<div class="toolbar">
  <div class="count" id="count">0 files</div>
  <button class="btn-cancel" onclick="cancel()">Cancel</button>
  <button class="btn-confirm" id="btn-ok" disabled onclick="upload()">Upload & Confirm</button>
</div>
<div id="status"></div>
<script>
const SESSION='${sessionId}';
const files=[];

const drop=document.getElementById('drop');
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('over')});
drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('over');addFiles(e.dataTransfer.files)});

function addFiles(fl){
  [...fl].forEach(f=>{
    if(!f.type.startsWith('image/'))return;
    files.push(f);
    const idx=files.length-1;
    const url=URL.createObjectURL(f);
    const d=document.createElement('div');d.className='prev';d.id='p'+idx;
    d.innerHTML=\`<button class="rm" onclick="removeFile(\${idx})">×</button>
      <img src="\${url}"><div class="name">\${f.name}</div>
      <div class="size">\${(f.size/1024).toFixed(1)} KB</div>\`;
    document.getElementById('previews').appendChild(d);
  });
  render();
}

function removeFile(i){
  files[i]=null;
  const el=document.getElementById('p'+i);
  if(el)el.remove();
  render();
}

function render(){
  const n=files.filter(Boolean).length;
  document.getElementById('count').textContent=n+' file'+(n!==1?'s':'');
  document.getElementById('btn-ok').disabled=n===0;
}

async function readBase64(f){
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>res(r.result.split(',')[1]);
    r.onerror=rej;
    r.readAsDataURL(f);
  });
}

async function upload(){
  const valid=files.filter(Boolean);
  if(!valid.length)return;
  document.getElementById('btn-ok').disabled=true;
  document.getElementById('status').textContent='Uploading...';
  const payload=await Promise.all(valid.map(async f=>({
    name:f.name,data:await readBase64(f),mime:f.type,size:f.size
  })));
  const r=await fetch('/api/upload/'+SESSION,{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({files:payload,cancelled:false})});
  if(r.ok){
    document.body.innerHTML='<div style="text-align:center;padding:80px;color:#c8a2e8;font-size:1.2rem">✓ Uploaded — you can close this tab</div>';
  } else {
    document.getElementById('status').textContent='Upload failed, try again';
    document.getElementById('btn-ok').disabled=false;
  }
}

async function cancel(){
  await fetch('/api/upload/'+SESSION,{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({files:[],cancelled:true})});
  document.body.innerHTML='<div style="text-align:center;padding:80px;color:#666;font-size:1.2rem">Cancelled</div>';
}
</script>
</body>
</html>`;
}
async function toolUploadFiles(args) {
    const { title, message, saveDir } = args;
    const absDir = path.resolve(saveDir);
    fs.mkdirSync(absDir, { recursive: true });
    const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const result = await new Promise((resolve) => {
        _uploadSessions.set(sessionId, { saveDir: absDir, savedFiles: [], resolve });
        setTimeout(() => {
            if (_uploadSessions.has(sessionId)) {
                _uploadSessions.delete(sessionId);
                resolve({ files: [], cancelled: true });
            }
        }, 600000);
        const url = `http://localhost:${DASHBOARD_PORT}/upload/${sessionId}`;
        spawnSync('cmd.exe', ['/c', 'start', '""', url], { shell: false, timeout: 5000 });
    });
    _uploadSessions.delete(sessionId);
    if (result.cancelled)
        return { cancelled: true, count: 0 };
    return { files: result.files, count: result.files.length };
}
// ─── Agent state & inbox ─────────────────────────────────────────────────────
//
// Three files in PROJECT_ROOT/agent-workspace/:
//   inbox.json       — user → agent messages (written by dashboard / user)
//   agent-log.jsonl  — agent → user progress log (append-only)
//   state.json       — agent current state snapshot (overwritten each update)
//
// Tools:
//   read_inbox()              — agent reads unread user messages, marks read
//   write_log(msg, level?)    — agent appends a progress entry
//   update_state(state)       — agent overwrites current state snapshot
const WORKSPACE_DIR = path.join(PROJECT_ROOT, 'agent-workspace');
const INBOX_PATH = path.join(WORKSPACE_DIR, 'inbox.json');
const LOG_PATH = path.join(WORKSPACE_DIR, 'agent-log.jsonl');
const STATE_PATH = path.join(WORKSPACE_DIR, 'state.json');
function ensureWorkspace() {
    if (!fs.existsSync(WORKSPACE_DIR))
        fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}
function readInboxFile() {
    if (!fs.existsSync(INBOX_PATH))
        return [];
    try {
        return JSON.parse(fs.readFileSync(INBOX_PATH, 'utf8'));
    }
    catch {
        return [];
    }
}
function writeInboxFile(messages) {
    ensureWorkspace();
    fs.writeFileSync(INBOX_PATH, JSON.stringify(messages, null, 2), 'utf8');
}
function toolReadInbox() {
    const messages = readInboxFile();
    const unread = messages.filter(m => !m.read);
    if (unread.length === 0)
        return { messages: [], count: 0 };
    // Mark all as read
    const updated = messages.map(m => m.read ? m : { ...m, read: true });
    writeInboxFile(updated);
    return { messages: unread, count: unread.length };
}
function toolWriteLog(args) {
    ensureWorkspace();
    const entry = {
        timestamp: new Date().toISOString(),
        level: args.level ?? 'info',
        message: args.message,
        ...(args.metadata ? { metadata: args.metadata } : {}),
    };
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
    return { written: true };
}
function toolUpdateState(args) {
    ensureWorkspace();
    const state = {
        timestamp: new Date().toISOString(),
        ...args,
    };
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
    return { written: true };
}
// User-facing: write a message to inbox (for dashboard / direct use)
function toolSendToAgent(args) {
    const messages = readInboxFile();
    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        message: args.message,
        read: false,
        ...(args.metadata ? { metadata: args.metadata } : {}),
    };
    messages.push(entry);
    writeInboxFile(messages);
    return { sent: true, id: entry.id };
}
// ─── run_command ─────────────────────────────────────────────────────────────
function toolRunCommand(args) {
    const { command, cwd, timeoutMs = 30000 } = args;
    const resolvedCwd = cwd ? resolveProjectPath(cwd) : PROJECT_ROOT;
    try {
        const r = spawnSync(command, {
            shell: true,
            cwd: resolvedCwd,
            timeout: timeoutMs,
            encoding: 'utf8',
            maxBuffer: 1024 * 1024 * 10,
        });
        return {
            stdout: capOutput(r.stdout ?? ''),
            stderr: capOutput(r.stderr ?? ''),
            exitCode: r.status ?? -1,
            success: (r.status ?? -1) === 0,
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { stdout: '', stderr: `Error spawning process: ${msg}`, exitCode: -1, success: false };
    }
}
// ─── check_process ───────────────────────────────────────────────────────────
function toolCheckProcess(args) {
    const { processName } = args;
    try {
        const r = spawnSync('tasklist', ['/FO', 'CSV', '/NH'], {
            shell: false,
            timeout: 10000,
            encoding: 'utf8',
        });
        if ((r.status ?? -1) !== 0)
            return { running: false };
        const nameLower = processName.toLowerCase();
        for (const line of (r.stdout ?? '').split('\n')) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            const parts = trimmed.split('","');
            if (parts.length < 2)
                continue;
            const imageName = parts[0].replace(/^"/, '').toLowerCase();
            const pid = parseInt(parts[1].replace(/"/g, ''), 10);
            if (imageName.includes(nameLower) || nameLower.includes(imageName.replace('.exe', ''))) {
                return { running: true, pid: isNaN(pid) ? undefined : pid };
            }
        }
        return { running: false };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { running: false, error: msg };
    }
}
// ─── open_path ───────────────────────────────────────────────────────────────
function toolOpenPath(args) {
    const target = resolveProjectPath(args.path);
    try {
        const stat = fs.statSync(target);
        let command;
        let cmdArgs;
        if (stat.isDirectory()) {
            command = 'explorer.exe';
            cmdArgs = [target.replace(/\//g, '\\')];
        }
        else {
            command = 'cmd.exe';
            cmdArgs = ['/c', 'start', '""', target.replace(/\//g, '\\')];
        }
        const r = spawnSync(command, cmdArgs, { shell: false, timeout: 10000 });
        return { opened: (r.status ?? -1) === 0 };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { opened: false, error: msg };
    }
}
// ─── MCP Server ──────────────────────────────────────────────────────────────
const server = new Server({ name: 'cli-helper-mcp', version: '2.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'show_asset_picker',
            description: 'Show a browser preview of multiple image assets side-by-side, then prompt the user to select one. ' +
                'Opens a styled HTML page in the default browser (non-blocking) so the user can compare visuals, ' +
                'then shows a numbered selection dialog. Returns the selected asset label and path.',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Picker window title' },
                    message: { type: 'string', description: 'Instruction shown to the user' },
                    assets: {
                        type: 'array',
                        description: 'Assets to compare',
                        items: {
                            type: 'object',
                            properties: {
                                label: { type: 'string', description: 'Display name / version label' },
                                imagePath: { type: 'string', description: 'Absolute path to the image file' },
                                metadata: {
                                    type: 'object',
                                    description: 'Optional key-value metadata shown under the image (e.g. model, score)',
                                    additionalProperties: { type: 'string' },
                                },
                            },
                            required: ['label', 'imagePath'],
                        },
                    },
                    multiSelect: {
                        type: 'boolean',
                        description: 'Allow selecting multiple items (default: false)',
                    },
                    allowUpload: {
                        type: 'boolean',
                        description: 'Show inline drag-and-drop upload zone in the picker page. Uploaded images appear in the grid immediately and can be selected. Requires uploadDir.',
                    },
                    uploadDir: {
                        type: 'string',
                        description: 'Absolute directory path where uploaded files will be saved. Required when allowUpload is true.',
                    },
                    showHistory: {
                        type: 'boolean',
                        description: 'Scan uploadDir for previously uploaded images and display them in the grid with a "历史" badge. Useful for revisiting past uploads across sessions.',
                    },
                },
                required: ['title', 'message', 'assets'],
            },
        },
        {
            name: 'show_dialog',
            description: 'Show a synchronous dialog to the user and return their response. ' +
                'Blocks until the user responds. Modes: ok (acknowledge), confirm (yes/no/cancel), ' +
                'input (free text), select (numbered choice list), ' +
                'file_picker (native Windows file browser — returns pipe-separated absolute paths or "" if cancelled).',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Dialog window title' },
                    message: { type: 'string', description: 'Message to display' },
                    mode: {
                        type: 'string',
                        enum: ['ok', 'confirm', 'input', 'select', 'file_picker'],
                        description: 'Dialog mode (default: ok)',
                    },
                    choices: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Options for select mode',
                    },
                    fileFilter: {
                        type: 'string',
                        description: 'File type filter for file_picker, e.g. "Images|*.png;*.jpg;*.jpeg". Default: common image formats.',
                    },
                    multiSelect: {
                        type: 'boolean',
                        description: 'Allow selecting multiple files in file_picker (default: true)',
                    },
                    continueAdding: {
                        type: 'boolean',
                        description: 'file_picker only: after each pick, ask "Add more?" and merge all batches into one result',
                    },
                },
                required: ['title', 'message'],
            },
        },
        {
            name: 'show_notification',
            description: 'Show a non-blocking Windows balloon notification. Returns immediately.',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Notification title' },
                    message: { type: 'string', description: 'Notification body' },
                    type: {
                        type: 'string',
                        enum: ['info', 'warning', 'error'],
                        description: 'Icon type (default: info)',
                    },
                },
                required: ['title', 'message'],
            },
        },
        {
            name: 'run_command',
            description: 'Run any shell command and return stdout, stderr, and exit code.',
            inputSchema: {
                type: 'object',
                properties: {
                    command: { type: 'string', description: 'Shell command to execute' },
                    cwd: {
                        type: 'string',
                        description: 'Working directory (absolute or relative to project root)',
                    },
                    timeoutMs: {
                        type: 'number',
                        description: 'Timeout in milliseconds (default 30000)',
                    },
                },
                required: ['command'],
            },
        },
        {
            name: 'check_process',
            description: 'Check if a Windows process is running by name.',
            inputSchema: {
                type: 'object',
                properties: {
                    processName: {
                        type: 'string',
                        description: 'Process name to search for (e.g. "SlayTheSpire2", "Godot")',
                    },
                },
                required: ['processName'],
            },
        },
        {
            name: 'read_inbox',
            description: 'Read unread user messages from the agent inbox and mark them as read. ' +
                'Call this before major decisions to check if the user left any instructions.',
            inputSchema: { type: 'object', properties: {} },
        },
        {
            name: 'write_log',
            description: 'Append a progress entry to the agent activity log (visible in dashboard).',
            inputSchema: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'Log message' },
                    level: { type: 'string', enum: ['info', 'warn', 'error', 'debug'], description: 'Log level (default: info)' },
                    metadata: { type: 'object', description: 'Optional structured data', additionalProperties: true },
                },
                required: ['message'],
            },
        },
        {
            name: 'update_state',
            description: 'Overwrite the agent state snapshot (visible in dashboard as current status). ' +
                'Call at the start of each phase to keep the dashboard up to date.',
            inputSchema: {
                type: 'object',
                properties: {
                    phase: { type: 'string', description: 'Current phase name (e.g. "generating", "deploying", "idle")' },
                    currentTask: { type: 'string', description: 'Human-readable description of the current task' },
                    progress: { type: 'object', description: 'Optional progress data', additionalProperties: true },
                },
                required: ['phase'],
            },
        },
        {
            name: 'send_to_agent',
            description: 'Write a message to the agent inbox. Use this to send instructions to the agent ' +
                'while it is running autonomously. The agent will read it before its next major decision.',
            inputSchema: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'Instruction or feedback for the agent' },
                    metadata: { type: 'object', description: 'Optional structured data', additionalProperties: true },
                },
                required: ['message'],
            },
        },
        {
            name: 'open_path',
            description: 'Open a file or folder in Windows Explorer / default application.',
            inputSchema: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Path to open (absolute or relative to project root)',
                    },
                },
                required: ['path'],
            },
        },
        {
            name: 'upload_files',
            description: 'Open a browser-based drag-and-drop file upload page. ' +
                'User drops or selects images, they are saved to saveDir, and their paths are returned. ' +
                'Use this when you need the user to provide reference images or other files.',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Upload page title' },
                    message: { type: 'string', description: 'Instruction shown to the user' },
                    saveDir: { type: 'string', description: 'Absolute directory path to save uploaded files' },
                },
                required: ['title', 'message', 'saveDir'],
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    let result;
    try {
        switch (name) {
            case 'read_inbox':
                result = toolReadInbox();
                break;
            case 'write_log':
                result = toolWriteLog(args);
                break;
            case 'update_state':
                result = toolUpdateState(args);
                break;
            case 'send_to_agent':
                result = toolSendToAgent(args);
                break;
            case 'show_asset_picker':
                result = await toolShowAssetPicker(args);
                break;
            case 'show_dialog':
                result = toolShowDialog(args);
                break;
            case 'show_notification':
                result = toolShowNotification(args);
                break;
            case 'run_command':
                result = toolRunCommand(args);
                break;
            case 'check_process':
                result = toolCheckProcess(args);
                break;
            case 'open_path':
                result = toolOpenPath(args);
                break;
            case 'upload_files':
                result = await toolUploadFiles(args);
                break;
            default:
                result = { error: `Unknown tool: ${name}` };
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result = { error: `Unexpected error in ${name}: ${msg}` };
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
});
// ─── Dashboard HTTP Server ────────────────────────────────────────────────────
const DASHBOARD_PORT = parseInt(process.env.DASHBOARD_PORT ?? '7842', 10);
const DASHBOARD_DIST = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../../dashboard/dist');
const ASSETS_DIR = path.join(PROJECT_ROOT, 'assets');
const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};
function serveFile(res, filePath) {
    try {
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
        res.end(data);
    }
    catch {
        res.writeHead(404);
        res.end('Not found');
    }
}
function apiJson(res, data) {
    const body = JSON.stringify(data);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(body);
}
function startDashboardServer() {
    const srv = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://localhost:${DASHBOARD_PORT}`);
        const pathname = url.pathname;
        // CORS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
            res.end();
            return;
        }
        // ── API ──────────────────────────────────────────────────────────────────
        if (pathname === '/api/state') {
            try {
                const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
                apiJson(res, state);
            }
            catch {
                apiJson(res, { phase: 'idle', timestamp: new Date().toISOString() });
            }
            return;
        }
        if (pathname === '/api/log') {
            try {
                const limit = parseInt(url.searchParams.get('limit') ?? '100', 10);
                const lines = fs.readFileSync(LOG_PATH, 'utf8')
                    .split('\n').filter(Boolean)
                    .map(l => JSON.parse(l))
                    .slice(-limit);
                apiJson(res, lines);
            }
            catch {
                apiJson(res, []);
            }
            return;
        }
        if (pathname === '/api/inbox') {
            if (req.method === 'GET') {
                apiJson(res, readInboxFile());
                return;
            }
            if (req.method === 'POST') {
                let body = '';
                req.on('data', d => { body += d; });
                req.on('end', () => {
                    try {
                        const { message, metadata } = JSON.parse(body);
                        const result = toolSendToAgent({ message, metadata });
                        apiJson(res, result);
                    }
                    catch {
                        res.writeHead(400);
                        res.end('Bad request');
                    }
                });
                return;
            }
        }
        // ── Asset picker routes ──────────────────────────────────────────────────
        // GET  /picker.js                  → serve bundled browser script
        // GET  /picker/:sessionId          → serve interactive HTML
        // GET  /picker-image?path=...      → proxy local image file
        if (pathname === '/picker.js' && req.method === 'GET') {
            serveFile(res, path.join(__dirname, 'picker.js'));
            return;
        }
        // POST /api/pick/:sessionId        → receive browser selection, resolve Promise
        const pickerMatch = pathname.match(/^\/picker\/([a-z0-9]+)$/);
        if (pickerMatch && req.method === 'GET') {
            const sid = pickerMatch[1];
            const session = _pickerSessions.get(sid);
            if (!session) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Session not found or expired');
                return;
            }
            const html = buildPickerHtml(sid, 'Asset Picker', 'Select assets below', session.items, session.multiSelect, !!session.uploadDir);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }
        if (pathname === '/picker-image' && req.method === 'GET') {
            const imgPath = url.searchParams.get('path') ?? '';
            if (!imgPath || !fs.existsSync(imgPath)) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const ext = path.extname(imgPath).toLowerCase();
            const mime = ext === '.png' ? 'image/png'
                : ext === '.gif' ? 'image/gif'
                    : ext === '.webp' ? 'image/webp'
                        : 'image/jpeg';
            res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'max-age=60' });
            fs.createReadStream(imgPath).pipe(res);
            return;
        }
        const pickApiMatch = pathname.match(/^\/api\/pick\/([a-z0-9]+)$/);
        if (pickApiMatch && req.method === 'POST') {
            const sid = pickApiMatch[1];
            let body = '';
            req.on('data', d => { body += d; });
            req.on('end', () => {
                const session = _pickerSessions.get(sid);
                if (!session) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Session not found' }));
                    return;
                }
                try {
                    const { indices, uploaded, cancelled } = JSON.parse(body);
                    _pickerSessions.delete(sid);
                    if (cancelled) {
                        session.resolve({ selections: [], uploadedFiles: [], cancelled: true });
                    }
                    else {
                        const selections = (indices ?? []).map(i => ({
                            label: session.items[i]?.label ?? '',
                            index: i,
                            imagePath: session.items[i]?.imagePath ?? '',
                        }));
                        session.resolve({ selections, uploadedFiles: uploaded ?? [], cancelled: false });
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: true }));
                }
                catch {
                    res.writeHead(400);
                    res.end('Bad request');
                }
            });
            return;
        }
        // ── Picker inline upload ──────────────────────────────────────────────────
        // POST /api/picker-upload/:sessionId  → save single file, return new item for JS to add to grid
        const pickerUploadMatch = pathname.match(/^\/api\/picker-upload\/([a-z0-9]+)$/);
        if (pickerUploadMatch && req.method === 'POST') {
            const sid = pickerUploadMatch[1];
            let body = '';
            req.on('data', d => { body += d; });
            req.on('end', () => {
                const session = _pickerSessions.get(sid);
                if (!session || !session.uploadDir) {
                    res.writeHead(404);
                    res.end('Session not found or upload not enabled');
                    return;
                }
                try {
                    const { name, data, size } = JSON.parse(body);
                    const safeName = name.replace(/[/\\?%*:|"<>]/g, '_');
                    const dest = path.join(session.uploadDir, safeName);
                    fs.writeFileSync(dest, Buffer.from(data, 'base64'));
                    // Append to session items so index resolution works at confirm time
                    const newItem = { label: safeName, imagePath: dest, metadata: { _src: 'uploaded', size: `${Math.round(size / 1024)}KB` } };
                    session.items.push(newItem);
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: true, item: newItem }));
                }
                catch {
                    res.writeHead(400);
                    res.end('Bad request');
                }
            });
            return;
        }
        // ── Upload routes ─────────────────────────────────────────────────────────
        // GET  /upload/:sessionId          → serve upload HTML
        // POST /api/upload/:sessionId      → receive base64 files, save, resolve Promise
        const uploadPageMatch = pathname.match(/^\/upload\/([a-z0-9]+)$/);
        if (uploadPageMatch && req.method === 'GET') {
            const sid = uploadPageMatch[1];
            const session = _uploadSessions.get(sid);
            if (!session) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Session not found or expired');
                return;
            }
            const html = buildUploadHtml(sid, 'Upload Files', 'Drag images here or click to browse');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }
        const uploadApiMatch = pathname.match(/^\/api\/upload\/([a-z0-9]+)$/);
        if (uploadApiMatch && req.method === 'POST') {
            const sid = uploadApiMatch[1];
            let body = '';
            req.on('data', d => { body += d; });
            req.on('end', () => {
                const session = _uploadSessions.get(sid);
                if (!session) {
                    res.writeHead(404);
                    res.end('Session not found');
                    return;
                }
                try {
                    const { files, cancelled } = JSON.parse(body);
                    _uploadSessions.delete(sid);
                    if (cancelled) {
                        session.resolve({ files: [], cancelled: true });
                    }
                    else {
                        const saved = [];
                        for (const f of files) {
                            // Sanitize filename
                            const safeName = f.name.replace(/[/\\?%*:|"<>]/g, '_');
                            const dest = path.join(session.saveDir, safeName);
                            fs.writeFileSync(dest, Buffer.from(f.data, 'base64'));
                            saved.push({ name: safeName, path: dest, size: f.size });
                        }
                        session.resolve({ files: saved, cancelled: false });
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ ok: true }));
                }
                catch (e) {
                    res.writeHead(400);
                    res.end('Bad request');
                }
            });
            return;
        }
        // ── Asset index API ──────────────────────────────────────────────────────
        // /api/assets → scan assets dir and return grouped structure
        if (pathname === '/api/assets') {
            const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
            const types = ['cards', 'relics', 'animations', 'orbs', 'characters'];
            const result = [];
            for (const type of types) {
                const typeDir = path.join(ASSETS_DIR, type);
                if (!fs.existsSync(typeDir))
                    continue;
                for (const name of fs.readdirSync(typeDir)) {
                    const nameDir = path.join(typeDir, name);
                    if (!fs.statSync(nameDir).isDirectory())
                        continue;
                    const entry = { name, type, current: null, currentUrl: null, history: [] };
                    // current/
                    const currentDir = path.join(nameDir, 'current');
                    if (fs.existsSync(currentDir)) {
                        const files = fs.readdirSync(currentDir).filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()));
                        if (files[0]) {
                            entry.current = files[0];
                            entry.currentUrl = `/assets/${type}/${name}/current/${files[0]}`;
                        }
                    }
                    // history/
                    const historyDir = path.join(nameDir, 'history');
                    if (fs.existsSync(historyDir)) {
                        const hfiles = fs.readdirSync(historyDir).filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()));
                        for (const hf of hfiles) {
                            const match = hf.match(/^v(\d+)_/);
                            const version = match ? parseInt(match[1], 10) : 0;
                            const mtime = fs.statSync(path.join(historyDir, hf)).mtimeMs;
                            entry.history.push({ version, file: hf, url: `/assets/${type}/${name}/history/${hf}`, mtime });
                        }
                        entry.history.sort((a, b) => b.version - a.version);
                    }
                    result.push(entry);
                }
            }
            apiJson(res, result);
            return;
        }
        // ── Asset files ──────────────────────────────────────────────────────────
        // /assets/... → serve from PROJECT_ROOT/assets/
        if (pathname.startsWith('/assets/')) {
            const rel = pathname.slice('/assets/'.length);
            serveFile(res, path.join(ASSETS_DIR, rel));
            return;
        }
        // ── Dashboard SPA ────────────────────────────────────────────────────────
        if (pathname.startsWith('/app')) {
            // SPA fallback
            serveFile(res, path.join(DASHBOARD_DIST, 'index.html'));
            return;
        }
        const staticPath = pathname === '/' ? '/index.html' : pathname;
        const candidate = path.join(DASHBOARD_DIST, staticPath);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            serveFile(res, candidate);
        }
        else {
            serveFile(res, path.join(DASHBOARD_DIST, 'index.html'));
        }
    });
    srv.listen(DASHBOARD_PORT, '127.0.0.1', () => {
        process.stderr.write(`dashboard: http://localhost:${DASHBOARD_PORT}\n`);
    });
    srv.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            process.stderr.write(`dashboard port ${DASHBOARD_PORT} in use, skipping\n`);
        }
    });
}
// ─── Start ───────────────────────────────────────────────────────────────────
async function main() {
    startDashboardServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write('cli-helper-mcp v2 started\n');
}
main().catch((err) => {
    process.stderr.write(`Fatal error: ${err}\n`);
    process.exit(1);
});
