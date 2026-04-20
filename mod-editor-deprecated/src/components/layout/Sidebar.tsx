import { useStore } from '../../stores/appStore';
import { Locale, t } from '../../i18n';
import './Sidebar.css';

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
];

export function Sidebar() {
  const { 
    project, 
    selectedTab, 
    setSelectedTab,
    newProject,
    saveProject,
    openProject,
    isDirty,
    setLocale,
  } = useStore();

  const ui = t(project.locale);
  
  const tabs = [
    { id: 'cards' as const, label: ui.tabCards, icon: '🃏' },
    { id: 'relics' as const, label: ui.tabRelics, icon: '🏆' },
    { id: 'character' as const, label: ui.tabCharacter, icon: '👤' },
    { id: 'export' as const, label: ui.tabExport, icon: '📦' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">{ui.appTitle}</h1>
        <div className="header-buttons">
          <button 
            className="project-btn"
            onClick={openProject}
            title={ui.openProject}
          >
            📂
          </button>
          <button 
            className="project-btn"
            onClick={saveProject}
            title={ui.saveProject}
          >
            💾
          </button>
          <button 
            className="new-project-btn"
            onClick={() => newProject()}
          >
            + {ui.newProject}
          </button>
        </div>
      </div>

      <div className="project-info">
        <div className="project-name">{project.name}</div>
        <div className="project-author">by {project.author}</div>
        {isDirty && <span className="unsaved-indicator">●</span>}
      </div>

      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${selectedTab === tab.id ? 'active' : ''}`}
            onClick={() => setSelectedTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="locale-selector">
          <label>{ui.devMode}:</label>
          <select 
            value={project.locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {LOCALES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
