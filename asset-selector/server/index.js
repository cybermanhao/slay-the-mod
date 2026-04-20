import express from 'express';
import cors from 'cors';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3456;

app.use(cors());
app.use(express.json());

// --- State ---
let currentSelection = null; // { id, path, label, preset }
let pendingImages = []; // [{ id, path, label }]
let referenceImages = []; // [{ id, path, thumbnail, name }]
let currentPreset = null;

// --- Presets ---
function loadPreset(name) {
  try {
    const presetPath = join(__dirname, '..', 'presets', `${name}.json`);
    const data = JSON.parse(readFileSync(presetPath, 'utf-8'));
    currentPreset = { name, ...data };
    return currentPreset;
  } catch {
    return null;
  }
}

// --- Routes ---

// Get current preset
app.get('/api/preset', (req, res) => {
  res.json(currentPreset || { name: 'none', assetTypes: [] });
});

// Load preset by name
app.post('/api/preset', (req, res) => {
  const { name } = req.body;
  const preset = loadPreset(name || 'sts2');
  if (preset) {
    res.json(preset);
  } else {
    res.status(404).json({ error: 'Preset not found' });
  }
});

// Submit pending images for selection
app.post('/api/selection/start', (req, res) => {
  const { images, label, preset: presetName } = req.body;
  // images: [{ id, path }]
  if (!images || !Array.isArray(images)) {
    return res.status(400).json({ error: 'images array required' });
  }

  if (presetName && !currentPreset) {
    loadPreset(presetName);
  }

  pendingImages = images.map(img => ({
    id: img.id || String(Date.now() + Math.random()),
    path: img.path,
    label: img.label || basename(img.path),
  }));
  currentSelection = { label: label || 'Select one', status: 'pending' };
  res.json({ ok: true, count: pendingImages.length });
});

// Get pending images
app.get('/api/selection/images', (req, res) => {
  res.json(pendingImages);
});

// Get current selection status
app.get('/api/selection/status', (req, res) => {
  res.json(currentSelection);
});

// Pick an image
app.post('/api/selection/pick', (req, res) => {
  const { id } = req.body;
  const image = pendingImages.find(img => img.id === id);
  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }
  currentSelection = { id: image.id, path: image.path, label: image.label, status: 'done' };
  pendingImages = [];
  res.json({ ok: true, selection: currentSelection });
});

// Get result (polling)
app.get('/api/selection/result', (req, res) => {
  res.json(currentSelection);
});

// Cancel selection
app.delete('/api/selection', (req, res) => {
  pendingImages = [];
  currentSelection = null;
  res.json({ ok: true });
});

// --- Reference Images ---

// Scan a directory for images
app.post('/api/refs/scan', (req, res) => {
  const { dir } = req.body;
  if (!dir) return res.status(400).json({ error: 'dir required' });

  try {
    const files = readdirSync(dir).filter(f => {
      const ext = f.toLowerCase();
      return /\.(png|jpg|jpeg|webp|bmp)$/.test(ext);
    });
    referenceImages = files.map((f, i) => ({
      id: String(i),
      name: f,
      path: join(dir, f),
    }));
    res.json({ ok: true, count: referenceImages.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get reference images
app.get('/api/refs', (req, res) => {
  res.json(referenceImages);
});

// Serve image files
app.use('/img', express.static('/'));

// Serve a single image file by path
app.get('/api/refs/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });
  res.sendFile(filePath, { root: '/' }, err => {
    if (err) res.status(404).json({ error: 'file not found' });
  });
});

app.listen(PORT, () => {
  console.log(`Asset Selector running at http://localhost:${PORT}`);
  loadPreset('sts2');
});
