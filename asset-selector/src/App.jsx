import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:3456';

// Open file in system default app
function openFile(path) {
  // On Windows: use cmd /c start, on Mac: open, on Linux: xdg-open
  const encoded = path.replace(/"/g, '\\"');
  if (navigator.platform.startsWith('Win')) {
    window.open(`file:///${path.replace(/\\/g, '/')}`, '_blank');
  } else {
    window.open(`file://${path}`, '_blank');
  }
}

export default function App() {
  const [tab, setTab] = useState('refs'); // 'refs' | 'select'
  const [refs, setRefs] = useState([]);
  const [scanDir, setScanDir] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [selection, setSelection] = useState(null); // { id, path, label }
  const [pendingImages, setPendingImages] = useState([]);
  const [selectionLabel, setSelectionLabel] = useState('');
  const [loading, setLoading] = useState(false);

  // Poll for selection result
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/selection/status`);
        const data = await res.json();
        if (data.status === 'done') {
          setSelection(data);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Scan directory for images
  const scanDir_ = useCallback(async (dir) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/refs/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir }),
      });
      const data = await res.json();
      if (data.ok) {
        const res2 = await fetch(`${API}/api/refs`);
        const imgs = await res2.json();
        setRefs(imgs);
      } else {
        alert('Scan failed: ' + (data.error || 'unknown error'));
      }
    } catch (e) {
      alert('Cannot connect to server: ' + e.message);
    }
    setLoading(false);
    setShowModal(false);
  }, []);

  // Submit images for selection
  const submitForSelection = useCallback(async (images, label) => {
    setSelection(null);
    setPendingImages(images);
    setSelectionLabel(label || 'Select one');
    await fetch(`${API}/api/selection/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images, label }),
    });
    setTab('select');
  }, []);

  const pickImage = useCallback(async (id) => {
    await fetch(`${API}/api/selection/pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const res = await fetch(`${API}/api/selection/result`);
    const data = await res.json();
    setSelection(data);
    setPendingImages([]);
  }, []);

  const handleCtrlClick = useCallback((e, path) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      openFile(path);
    }
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="header">
        <h1>Asset Selector</h1>
        <span className="preset-tag">STS2</span>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'refs' ? 'active' : ''}`} onClick={() => setTab('refs')}>
          参考图库
        </button>
        <button className={`tab ${tab === 'select' ? 'active' : ''}`} onClick={() => setTab('select')}>
          选择
          {pendingImages.length > 0 && <span style={{ marginLeft: 6, color: '#6366f1' }}>({pendingImages.length})</span>}
        </button>
      </div>

      {/* Selection Result Banner */}
      {selection && (
        <div className="pending-banner" style={{ background: '#22c55e' }}>
          已选择：<strong>{selection.label}</strong>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{selection.path}</span>
          <span className="dismiss" onClick={() => setSelection(null)}>✕</span>
        </div>
      )}

      {/* Pending Selection Banner */}
      {pendingImages.length > 0 && !selection && (
        <div className="pending-banner">
          <span>等待选择：{selectionLabel}</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{pendingImages.length} 张图</span>
          <span className="dismiss" onClick={async () => {
            await fetch(`${API}/api/selection`, { method: 'DELETE' });
            setPendingImages([]);
          }}>取消</span>
        </div>
      )}

      {/* References Tab */}
      {tab === 'refs' && (
        <div className="refs-view">
          <div className="refs-toolbar">
            <input
              type="text"
              placeholder="输入目录路径，回车扫描..."
              value={scanDir}
              onChange={e => setScanDir(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && scanDir.trim()) {
                  scanDir_(scanDir.trim());
                }
              }}
            />
            <button className="btn btn-ghost" onClick={() => setShowModal(true)}>浏览...</button>
          </div>

          {loading ? (
            <div className="loading">扫描中...</div>
          ) : refs.length === 0 ? (
            <div className="empty-state">
              输入目录路径并回车，或点击"浏览..."选择目录
              <br /><br />
              <small style={{ color: '#555' }}>支持 png / jpg / webp / bmp</small>
            </div>
          ) : (
            <div className="refs-grid">
              {refs.map(img => (
                <div
                  key={img.id}
                  className="ref-card"
                  title={`${img.path}\n\nCtrl+点击打开`}
                  onClick={e => handleCtrlClick(e, img.path)}
                  onMouseEnter={() => setHoveredId(img.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <img
                    src={`${API}/api/refs/file?path=${encodeURIComponent(img.path)}`}
                    alt={img.name}
                    loading="lazy"
                  />
                  <div className="img-name" title={img.path}>{img.name}</div>
                  {hoveredId === img.id && (
                    <div className="img-tooltip">{img.path}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selection Tab */}
      {tab === 'select' && (
        <div className="selection-view">
          {pendingImages.length === 0 && !selection ? (
            <div className="empty-state">
              无待选图片。
              <br />
              <small style={{ color: '#555' }}>等待 Agent 提交...</small>
            </div>
          ) : pendingImages.length > 0 ? (
            <>
              <div className="selection-label">
                选择一张：<span>{selectionLabel}</span>
              </div>
              <div className="image-grid">
                {pendingImages.map(img => (
                  <div
                    key={img.id}
                    className="image-card"
                    onClick={() => pickImage(img.id)}
                    title={img.path}
                  >
                    <img
                      src={`${API}/api/refs/file?path=${encodeURIComponent(img.path)}`}
                      alt={img.label || img.id}
                    />
                    <div className="img-name" title={img.path}>
                      {img.label || img.id}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              已完成选择，等待 Agent 提交新图片...
            </div>
          )}
        </div>
      )}

      {/* Scan Directory Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>扫描目录</h3>
            <input
              autoFocus
              placeholder="例如: C:/images/refs"
              value={scanDir}
              onChange={e => setScanDir(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && scanDir.trim()) scanDir_(scanDir.trim());
                if (e.key === 'Escape') setShowModal(false);
              }}
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={() => scanDir.trim() && scanDir_(scanDir.trim())}>扫描</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
