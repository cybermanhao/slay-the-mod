/**
 * Browser-side picker logic.
 * Bundled by esbuild → dist/picker.js and served as a static file.
 *
 * Entry point: reads window.__PICKER_CONFIG__ (injected by the server as JSON),
 * then renders the card grid and wires all interactions.
 */

import type { AssetPickerItem, PickerConfig } from './types.js';

declare global {
  interface Window { __PICKER_CONFIG__: PickerConfig; }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const { sessionId: SESSION, multiSelect: MULTI, allowUpload: UPLOAD, items: ITEMS } =
  window.__PICKER_CONFIG__;

const selected = new Set<number>();
const uploaded: Array<{ name: string; path: string }> = [];
let nextIdx = ITEMS.length;

const grid    = document.getElementById('grid')!;
const count   = document.getElementById('count')!;
const btnOk   = document.getElementById('btn-confirm') as HTMLButtonElement;
const btnX    = document.getElementById('btn-cancel') as HTMLButtonElement;
const zone    = document.getElementById('upload-zone')!;
const status  = document.getElementById('upload-status')!;

// Render initial items
ITEMS.forEach((item, i) => addCard(item, i));

// Wire toolbar
btnOk.addEventListener('click', confirm_);
btnX.addEventListener('click', cancel_);

// Wire upload zone
if (UPLOAD) {
  zone.style.display = 'flex';
  const fi = document.getElementById('fi') as HTMLInputElement;
  zone.addEventListener('click', () => fi.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('over');
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
  });
  fi.addEventListener('change', () => { if (fi.files) handleFiles(fi.files); });
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function addCard(item: AssetPickerItem, idx: number): void {
  const isHistory = item.metadata?.['_src'] === 'history';

  const card = el('div', {
    class: 'card' + (isHistory ? ' history' : ''),
    'data-idx': String(idx),
  });
  card.addEventListener('click', () => toggle(idx));

  const img = el('img', {
    class: 'card-img',
    src: '/picker-image?path=' + encodeURIComponent(item.imagePath),
    alt: item.label,
  });
  img.addEventListener('error', () => { img.style.opacity = '0.2'; });

  card.append(
    el('div', { class: 'badge' }, String(idx + 1)),
    img,
    el('div', { class: 'label' }, item.label),
  );

  if (isHistory) {
    card.append(el('div', { class: 'hist-badge' }, '历史'));
  }

  if (item.metadata) {
    const meta = el('div', { class: 'meta' });
    for (const [k, v] of Object.entries(item.metadata)) {
      if (k === '_src') continue;
      const row = el('div', { class: 'meta-row' });
      row.append(el('span', { class: 'mk' }, k), el('span', {}, v));
      meta.append(row);
    }
    if (meta.children.length) card.append(meta);
  }

  card.append(el('div', { class: 'check' }, '✓'));
  grid.appendChild(card);
}

// ── Selection ─────────────────────────────────────────────────────────────────

function toggle(idx: number): void {
  if (!MULTI) selected.clear();
  selected.has(idx) ? selected.delete(idx) : selected.add(idx);
  render();
}

function render(): void {
  grid.querySelectorAll<HTMLElement>('.card').forEach(card => {
    const idx = Number(card.dataset['idx']);
    card.classList.toggle('selected', selected.has(idx));
  });
  const n = selected.size;
  count.textContent =
    `${n} selected` + (uploaded.length ? ` · ${uploaded.length} uploaded` : '');
  btnOk.disabled = n === 0;
}

// ── Upload ────────────────────────────────────────────────────────────────────

const IMAGE_EXTS = /\.(png|jpe?g|webp|gif|bmp)$/i;

function readB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res((reader.result as string).split(',')[1]!);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

async function handleFiles(fileList: FileList): Promise<void> {
  const files = [...fileList].filter(
    f => f.type.startsWith('image/') || IMAGE_EXTS.test(f.name),
  );
  if (!files.length) { setStatus('⚠ No image files detected'); return; }

  setStatus(`Uploading ${files.length} file(s)...`);
  let ok = 0, fail = 0;

  for (const f of files) {
    try {
      const b64 = await readB64(f);
      const res = await fetch(`/api/picker-upload/${SESSION}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name, data: b64, mime: f.type || 'image/png', size: f.size }),
      });
      if (res.ok) {
        const { item } = await res.json() as { item: AssetPickerItem };
        const idx = nextIdx++;
        addCard(item, idx);
        uploaded.push({ name: item.label, path: item.imagePath });
        grid.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        ok++;
      } else {
        console.error('Upload failed:', res.status, await res.text());
        fail++;
      }
    } catch (e) {
      console.error('Upload error:', e);
      fail++;
    }
  }

  setStatus(
    fail ? `⚠ ${fail} failed, ${ok} uploaded` : `✓ ${ok} uploaded — click to select`,
  );
  render();
}

function setStatus(msg: string): void {
  status.textContent = msg;
}

// ── Confirm / Cancel ──────────────────────────────────────────────────────────

async function confirm_(): Promise<void> {
  btnOk.disabled = true;
  await fetch(`/api/pick/${SESSION}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indices: [...selected], uploaded, cancelled: false }),
  });
  document.body.innerHTML =
    '<div style="text-align:center;padding:80px;color:#c8a2e8;font-size:1.2rem">✓ Confirmed — you can close this tab</div>';
}

async function cancel_(): Promise<void> {
  await fetch(`/api/pick/${SESSION}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indices: [], uploaded: [], cancelled: true }),
  });
  document.body.innerHTML =
    '<div style="text-align:center;padding:80px;color:#666;font-size:1.2rem">Cancelled</div>';
}
