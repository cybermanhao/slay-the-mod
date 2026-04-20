import { useStore } from '../../stores/appStore';
import { exportMod } from '../../services/exportService';
import './ExportPanel.css';

export function ExportPanel() {
  const { project } = useStore();

  const handleExport = async () => {
    const result = await exportMod(project);
    if (result) {
      alert(`Mod exported to: ${result}`);
    }
  };

  return (
    <div className="export-panel">
      <h2>Export Mod</h2>
      
      <div className="export-info">
        <div className="info-row">
          <span className="label">Project Name:</span>
          <span className="value">{project.name}</span>
        </div>
        <div className="info-row">
          <span className="label">Author:</span>
          <span className="value">{project.author}</span>
        </div>
        <div className="info-row">
          <span className="label">Version:</span>
          <span className="value">{project.version}</span>
        </div>
        <div className="info-row">
          <span className="label">Cards:</span>
          <span className="value">{project.cards.length}</span>
        </div>
        <div className="info-row">
          <span className="label">Relics:</span>
          <span className="value">{project.relics.length}</span>
        </div>
      </div>

      <div className="export-summary">
        <h3>Export Contents</h3>
        <ul>
          <li>mod_manifest.json</li>
          <li>Entry.cs (Mod initialization)</li>
          <li>{project.cards.length} Card script(s)</li>
          <li>{project.relics.length} Relic script(s)</li>
          <li>Localization files (en, zh, ja)</li>
        </ul>
      </div>

      <button className="export-btn" onClick={handleExport}>
        📦 Export Mod
      </button>

      <div className="export-note">
        <p>Note: Export creates a folder structure ready to be loaded by STS2 with BaseLib.</p>
      </div>
    </div>
  );
}
