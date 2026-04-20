import { useStore } from './stores/appStore';
import { Sidebar } from './components/layout/Sidebar';
import { CardEditor } from './components/editor/CardEditor';
import { RelicEditor } from './components/editor/RelicEditor';
import { CardPreviewPanel } from './components/preview/CardPreview';
import { ExportPanel } from './components/editor/ExportPanel';
import './App.css';

function App() {
  const { selectedTab, project } = useStore();

  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        <div className="editor-area">
          {selectedTab === 'cards' && <CardEditor />}
          {selectedTab === 'relics' && <RelicEditor />}
          {selectedTab === 'character' && (
            <div className="placeholder">
              <h2>Character Editor</h2>
              <p>Project: {project.name}</p>
              {project.character ? (
                <div className="character-info">
                  <p>Starting HP: {project.character.startingHp}</p>
                </div>
              ) : (
                <p>No character configured yet.</p>
              )}
            </div>
          )}
          {selectedTab === 'export' && <ExportPanel />}
        </div>
      </main>
      {selectedTab === 'cards' && <CardPreviewPanel />}
    </div>
  );
}

export default App;
