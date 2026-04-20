import { useStore } from '../../stores/appStore';
import { RelicRarity, RelicHookType } from '../../types';
import './CardEditor.css';

const RELIC_RARITIES: RelicRarity[] = ['Starter', 'Common', 'Uncommon', 'Rare', 'Boss', 'Special'];

// All available hook types
const RELIC_HOOKS: RelicHookType[] = [
  'AfterPlayerTurnStart',
  'AfterPlayerTurnEnd',
  'AfterEnemyTurnStart',
  'AfterEnemyTurnEnd',
  'AfterCombatStart',
  'AfterCombatEnd',
  'AfterCombatVictory',
  'BeforeCombatStart',
  'BeforeCardPlayed',
  'AfterCardPlayed',
  'AfterCardDrawn',
  'AfterCardDiscarded',
  'AfterCardExhausted',
  'BeforeDamageReceived',
  'AfterDamageReceived',
  'BeforeDamageDealt',
  'AfterDamageDealt',
  'BeforeBlockGained',
  'AfterBlockGained',
  'AfterBlockBroken',
  'AfterEnergySpent',
  'AfterEnergyReset',
  'AfterGoldGained',
  'AfterStarsGained',
  'OnRelicObtained',
  'AfterPotionUsed',
  'AfterItemPurchased',
  'AfterRoomEntered',
  'AfterActEntered',
  'OnPlayerDeath',
  'BeforeDeath',
];

export function RelicEditor() {
  const { 
    project, 
    selectedRelicId, 
    addRelic, 
    updateRelic, 
    deleteRelic, 
    selectRelic,
    isDeveloperMode,
  } = useStore();

  const locale = project.locale;

  if (project.relics.length === 0) {
    return (
      <div className="editor-empty">
        <h2>Relic Editor</h2>
        <p>No relics yet. Click below to add one.</p>
        <button className="add-btn" onClick={addRelic}>
          + Add Relic
        </button>
      </div>
    );
  }

  const selectedRelic = project.relics.find(r => r.id === selectedRelicId);

  return (
    <div className="card-editor">
      <div className="editor-list">
        <div className="list-header">
          <h3>Relics ({project.relics.length})</h3>
        </div>
        
        <div className="list-items">
          {project.relics.map(relic => (
            <div 
              key={relic.id}
              className={`list-item ${relic.id === selectedRelicId ? 'selected' : ''}`}
              onClick={() => selectRelic(relic.id)}
            >
              <span className="card-type-badge relic">
                {relic.rarity[0]}
              </span>
              <span className="card-name">{relic.name[locale] || relic.name.en}</span>
            </div>
          ))}
        </div>
        
        <button className="add-btn" onClick={addRelic}>
          + Add Relic
        </button>
      </div>

      {selectedRelic && (
        <div className="editor-form">
          <div className="form-header">
            <h3>Edit Relic</h3>
            <button 
              className="delete-btn" 
              onClick={() => deleteRelic(selectedRelic.id)}
            >
              Delete
            </button>
          </div>

          <div className="form-group">
            <label>ID</label>
            <input 
              type="text" 
              value={selectedRelic.id}
              onChange={(e) => updateRelic(selectedRelic.id, { id: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Name (EN)</label>
            <input 
              type="text" 
              value={selectedRelic.name.en}
              onChange={(e) => updateRelic(selectedRelic.id, { 
                name: { ...selectedRelic.name, en: e.target.value } 
              })}
            />
          </div>

          <div className="form-group">
            <label>Name (ZH)</label>
            <input 
              type="text" 
              value={selectedRelic.name.zh || ''}
              onChange={(e) => updateRelic(selectedRelic.id, { 
                name: { ...selectedRelic.name, zh: e.target.value } 
              })}
            />
          </div>

          <div className="form-group">
            <label>Name (JA)</label>
            <input 
              type="text" 
              value={selectedRelic.name.ja || ''}
              onChange={(e) => updateRelic(selectedRelic.id, { 
                name: { ...selectedRelic.name, ja: e.target.value } 
              })}
            />
          </div>

          <div className="form-group">
            <label>Description (EN)</label>
            <textarea 
              value={selectedRelic.description.en}
              onChange={(e) => updateRelic(selectedRelic.id, { 
                description: { ...selectedRelic.description, en: e.target.value } 
              })}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Description (ZH)</label>
            <textarea 
              value={selectedRelic.description.zh || ''}
              onChange={(e) => updateRelic(selectedRelic.id, { 
                description: { ...selectedRelic.description, zh: e.target.value } 
              })}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Description (JA)</label>
            <textarea 
              value={selectedRelic.description.ja || ''}
              onChange={(e) => updateRelic(selectedRelic.id, { 
                description: { ...selectedRelic.description, ja: e.target.value } 
              })}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Rarity</label>
            <select 
              value={selectedRelic.rarity}
              onChange={(e) => updateRelic(selectedRelic.id, { 
                rarity: e.target.value as RelicRarity 
              })}
            >
              {RELIC_RARITIES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <input 
                type="checkbox" 
                checked={selectedRelic.isStarter || false}
                onChange={(e) => updateRelic(selectedRelic.id, { 
                  isStarter: e.target.checked 
                })}
              />
              Starter Relic
            </label>
          </div>

          {isDeveloperMode && (
            <>
              <div className="form-group">
                <label>Image Path</label>
                <input 
                  type="text" 
                  value={selectedRelic.imagePath || ''}
                  onChange={(e) => updateRelic(selectedRelic.id, { 
                    imagePath: e.target.value 
                  })}
                  placeholder="/images/relics/your_relic.png"
                />
              </div>

              <div className="form-group">
                <label>Hooks ({selectedRelic.hooks.length})</label>
                <div className="hooks-list">
                  {selectedRelic.hooks.map((hook, index) => (
                    <div key={index} className="hook-item">
                      <select 
                        value={hook.type}
                        onChange={(e) => {
                          const newHooks = [...selectedRelic.hooks];
                          newHooks[index] = { 
                            type: e.target.value as RelicHookType,
                            params: hook.params 
                          };
                          updateRelic(selectedRelic.id, { hooks: newHooks });
                        }}
                      >
                        {RELIC_HOOKS.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <button 
                        className="remove-hook-btn"
                        onClick={() => {
                          const newHooks = selectedRelic.hooks.filter((_, i) => i !== index);
                          updateRelic(selectedRelic.id, { hooks: newHooks });
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button 
                    className="add-hook-btn"
                    onClick={() => {
                      const newHooks = [...selectedRelic.hooks, { type: 'AfterPlayerTurnStart' as RelicHookType }];
                      updateRelic(selectedRelic.id, { hooks: newHooks });
                    }}
                  >
                    + Add Hook
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Flavor Text (EN)</label>
            <textarea 
              value={selectedRelic.flavorText?.en || ''}
              onChange={(e) => updateRelic(selectedRelic.id, { 
                flavorText: { 
                  en: e.target.value,
                  zh: selectedRelic.flavorText?.zh || '',
                  ja: selectedRelic.flavorText?.ja || ''
                } 
              })}
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
}
