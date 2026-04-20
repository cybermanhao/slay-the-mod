import { useState } from 'react';
import { useStore } from '../../stores/appStore';
import { CardType, CardRarity, TargetType, CardEffectAction, CardEffect, VANILLA_CARD_TEMPLATES, CardPoolType, CardKeyword, CardTag, DynamicVar, DynamicVarType, ValueProp } from '../../types';
import { t } from '../../i18n';
import './CardEditor.css';

const CARD_TYPES: CardType[] = ['Attack', 'Skill', 'Power', 'Status', 'Curse'];
const CARD_RARITIES: CardRarity[] = ['Basic', 'Common', 'Uncommon', 'Rare', 'Ancient', 'Event', 'Token', 'Status', 'Curse', 'Quest'];
const TARGET_TYPES: TargetType[] = ['AnyEnemy', 'RandomEnemy', 'AllEnemies', 'Self', 'None'];

// Card keywords
const CARD_KEYWORDS: CardKeyword[] = ['None', 'Exhaust', 'Ethereal', 'Innate', 'Unplayable', 'Retain', 'Sly', 'Eternal'];

// Card tags
const CARD_TAGS: CardTag[] = ['None', 'Strike', 'Defend', 'Upgrade', 'Colorless', 'Status', 'Curse'];

// DynamicVar types
const DYNAMIC_VAR_TYPES: DynamicVarType[] = ['Damage', 'Block', 'Draw', 'Heal', 'Energy', 'Gold', 'MaxHp', 'Repeat', 'Cards', 'Stars', 'HpLoss', 'Strength', 'Dexterity', 'Focus', 'Vulnerable', 'Weak', 'Poison', 'Intangible', 'Thorns', 'Summon'];

// ValueProp options
const VALUE_PROPS: ValueProp[] = ['Move', 'Unpowered', 'Unblockable', 'SkipHurtAnim'];

// Card pools/characters
const CARD_POOLS: { value: CardPoolType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Characters' },
  { value: 'Ironclad', label: 'Ironclad' },
  { value: 'Silent', label: 'Silent' },
  { value: 'Defect', label: 'Defect' },
  { value: 'Regent', label: 'Regent' },
  { value: 'Necrobinder', label: 'Necrobinder' },
  { value: 'Colorless', label: 'Colorless' },
  { value: 'Status', label: 'Status' },
  { value: 'Curse', label: 'Curse' },
];

const EFFECT_ACTIONS: { value: CardEffectAction; label: string }[] = [
  { value: 'damage', label: 'Damage' },
  { value: 'block', label: 'Block' },
  { value: 'draw', label: 'Draw Card' },
  { value: 'heal', label: 'Heal' },
  { value: 'energy', label: 'Energy' },
  { value: 'applyPower', label: 'Apply Power' },
  { value: 'discard', label: 'Discard' },
  { value: 'exhaust', label: 'Exhaust' },
  { value: 'gainGold', label: 'Gain Gold' },
];

const EFFECT_TARGETS = [
  { value: 'enemy', label: 'Enemy' },
  { value: 'self', label: 'Self' },
  { value: 'allEnemies', label: 'All Enemies' },
  { value: 'randomEnemy', label: 'Random Enemy' },
];

function TemplateSelector() {
  const { addCard, addCardFromTemplate } = useStore();
  const project = useStore(state => state.project);
  const locale = project.locale;
  const ui = t(locale);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filterPool, setFilterPool] = useState<CardPoolType | 'all'>('all');
  const [filterType, setFilterType] = useState<CardType | 'all'>('all');

  const filteredTemplates = VANILLA_CARD_TEMPLATES.filter(t => {
    if (filterPool !== 'all' && t.pool !== filterPool) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  });

  // Get image URL for a card
  const getCardImage = (cardId: string) => `/images/cards/${cardId.toLowerCase()}.png`;

  // Get localized name
  const getName = (template: typeof VANILLA_CARD_TEMPLATES[0]) => {
    return template.name[locale] || template.name.en;
  };

  return (
    <div className="template-selector">
      <div className="template-buttons">
        <button className="add-btn" onClick={addCard}>{ui.newCard}</button>
        <button className="add-btn secondary" onClick={() => setShowTemplates(!showTemplates)}>
          📋 {ui.fromTemplate} ({VANILLA_CARD_TEMPLATES.length})
        </button>
      </div>
      
      {showTemplates && (
        <div className="template-modal">
          <div className="template-filters">
            <div className="filter-group">
              <label>{ui.filterByPool}:</label>
              <select value={filterPool} onChange={(e) => setFilterPool(e.target.value as CardPoolType | 'all')}>
                {CARD_POOLS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>{ui.filterByType}:</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as CardType | 'all')}>
                <option value="all">{ui.allTypes}</option>
                {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="template-count">{filteredTemplates.length}</div>
          <div className="template-list">
            {filteredTemplates.map(template => (
              <div 
                key={template.id}
                className="template-item"
                onClick={() => {
                  addCardFromTemplate(template);
                  setShowTemplates(false);
                }}
              >
                <div className="template-thumbnail">
                  <img 
                    src={getCardImage(template.id)} 
                    alt={getName(template)}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className={`pool-badge ${template.pool.toLowerCase()}`}>{template.pool}</span>
                <span className={`type-badge ${template.type.toLowerCase()}`}>{template.type[0]}</span>
                <span className="template-name">{getName(template)}</span>
                <span className="template-cost">{template.cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EffectSelector({ 
  effects, 
  onChange,
  ui
}: { 
  effects: CardEffect[]; 
  onChange: (effects: CardEffect[]) => void;
  ui: ReturnType<typeof t>;
}) {
  const addEffect = () => {
    onChange([...effects, { 
      id: `e${Date.now()}`, 
      action: 'damage', 
      value: 6, 
      target: 'enemy' 
    }]);
  };

  const updateEffect = (index: number, updates: Partial<CardEffect>) => {
    const newEffects = [...effects];
    newEffects[index] = { ...newEffects[index], ...updates };
    onChange(newEffects);
  };

  const removeEffect = (index: number) => {
    onChange(effects.filter((_, i) => i !== index));
  };

  return (
    <div className="effect-selector">
      <div className="effect-list">
        {effects.map((effect, index) => (
          <div key={effect.id} className="effect-item">
            <select 
              value={effect.action}
              onChange={(e) => updateEffect(index, { action: e.target.value as CardEffectAction })}
            >
              {EFFECT_ACTIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            
            <span className="effect-label">{ui.effectValue}:</span>
            <input 
              type="number" 
              value={effect.value}
              onChange={(e) => updateEffect(index, { value: parseInt(e.target.value) || 0 })}
              className="effect-value"
            />
            
            <span className="effect-label">{ui.effectTarget}:</span>
            <select 
              value={effect.target}
              onChange={(e) => updateEffect(index, { target: e.target.value as CardEffect['target'] })}
            >
              {EFFECT_TARGETS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            
            {effect.action === 'applyPower' && (
              <>
                <span className="effect-label">power:</span>
                <input 
                  type="text"
                  value={effect.powerType || ''}
                  onChange={(e) => updateEffect(index, { powerType: e.target.value })}
                  placeholder="Power name"
                  className="effect-power"
                />
              </>
            )}
            
            <button className="remove-effect" onClick={() => removeEffect(index)}>×</button>
          </div>
        ))}
      </div>
      <button className="add-btn small" onClick={addEffect}>{ui.addEffect}</button>
    </div>
  );
}

function KeywordSelector({
  keywords,
  onChange
}: {
  keywords: CardKeyword[];
  onChange: (keywords: CardKeyword[]) => void;
}) {
  const toggleKeyword = (keyword: CardKeyword) => {
    if (keyword === 'None') {
      onChange(['None']);
      return;
    }
    const filtered = keywords.filter(k => k !== 'None');
    if (filtered.includes(keyword)) {
      onChange(filtered.filter(k => k !== keyword));
    } else {
      onChange([...filtered, keyword]);
    }
  };

  return (
    <div className="keyword-selector">
      <div className="keyword-list">
        {CARD_KEYWORDS.map(kw => (
          <label key={kw} className={`keyword-item ${keywords.includes(kw) || (kw === 'None' && keywords.includes('None')) ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={keywords.includes(kw)}
              onChange={() => toggleKeyword(kw)}
            />
            {kw}
          </label>
        ))}
      </div>
    </div>
  );
}

function TagSelector({
  tags,
  onChange
}: {
  tags: CardTag[];
  onChange: (tags: CardTag[]) => void;
}) {
  const toggleTag = (tag: CardTag) => {
    if (tag === 'None') {
      onChange(['None']);
      return;
    }
    const filtered = tags.filter(t => t !== 'None');
    if (filtered.includes(tag)) {
      onChange(filtered.filter(t => t !== tag));
    } else {
      onChange([...filtered, tag]);
    }
  };

  return (
    <div className="tag-selector">
      <div className="tag-list">
        {CARD_TAGS.map(tag => (
          <label key={tag} className={`tag-item ${tags.includes(tag) || (tag === 'None' && tags.includes('None')) ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={tags.includes(tag)}
              onChange={() => toggleTag(tag)}
            />
            {tag}
          </label>
        ))}
      </div>
    </div>
  );
}

function DynamicVarEditor({
  vars,
  onChange
}: {
  vars: DynamicVar[];
  onChange: (vars: DynamicVar[]) => void;
}) {
  const addVar = () => {
    onChange([...vars, { type: 'Damage', value: 6, valuePerUpgraded: 3, valueProp: 'Move' }]);
  };

  const updateVar = (index: number, updates: Partial<DynamicVar>) => {
    const newVars = [...vars];
    newVars[index] = { ...newVars[index], ...updates };
    onChange(newVars);
  };

  const removeVar = (index: number) => {
    onChange(vars.filter((_, i) => i !== index));
  };

  return (
    <div className="dynamic-var-editor">
      <div className="var-list">
        {vars.map((v, index) => (
          <div key={index} className="var-item">
            <select
              value={v.type}
              onChange={(e) => updateVar(index, { type: e.target.value as DynamicVarType })}
            >
              {DYNAMIC_VAR_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            
            <span className="var-label">Base:</span>
            <input
              type="number"
              value={v.value}
              onChange={(e) => updateVar(index, { value: parseInt(e.target.value) || 0 })}
              className="var-value"
            />
            
            <span className="var-label">Upgrade:</span>
            <input
              type="number"
              value={v.valuePerUpgraded ?? 0}
              onChange={(e) => updateVar(index, { valuePerUpgraded: parseInt(e.target.value) || 0 })}
              className="var-value"
            />
            
            <select
              value={v.valueProp || 'Move'}
              onChange={(e) => updateVar(index, { valueProp: e.target.value as ValueProp })}
            >
              {VALUE_PROPS.map(vp => (
                <option key={vp} value={vp}>{vp}</option>
              ))}
            </select>
            
            <button className="remove-var" onClick={() => removeVar(index)}>×</button>
          </div>
        ))}
      </div>
      <button className="add-btn small" onClick={addVar}>+ Add Variable</button>
    </div>
  );
}

function CardPoolSelector({
  pool,
  onChange
}: {
  pool: CardPoolType[];
  onChange: (pool: CardPoolType[]) => void;
}) {
  const togglePool = (p: CardPoolType) => {
    if (pool.includes(p)) {
      onChange(pool.filter(x => x !== p));
    } else {
      onChange([...pool, p]);
    }
  };

  return (
    <div className="pool-selector">
      <div className="pool-list">
        {CARD_POOLS.filter(p => p.value !== 'all').map(p => (
          <label key={p.value} className={`pool-item ${pool.includes(p.value as CardPoolType) ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={pool.includes(p.value as CardPoolType)}
              onChange={() => togglePool(p.value as CardPoolType)}
            />
            {p.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function ImagePathEditor({
  imagePath,
  cardId,
  onChange
}: {
  imagePath: string | undefined;
  cardId: string;
  onChange: (path: string) => void;
}) {
  const defaultPath = `res://mymod/images/cards/${cardId.toLowerCase()}.png`;

  return (
    <div className="image-path-editor">
      <input
        type="text"
        value={imagePath || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={defaultPath}
      />
      <button
        className="small"
        onClick={() => onChange(defaultPath)}
        title="Reset to default"
      >
        Reset
      </button>
    </div>
  );
}

function DeveloperModePanel({ cardId }: { cardId: string }) {
  const { project, isDeveloperMode } = useStore();
  const card = project.cards.find(c => c.id === cardId);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

  if (!isDeveloperMode || !card) return null;

  const generatePreviewCode = () => {
    return `using MegaCrit.Sts2.Core.Commands;
using MegaCrit.Sts2.Core.Entities.Cards;
using MegaCrit.Sts2.Core.GameActions.Multiplayer;
using MegaCrit.Sts2.Core.Localization.DynamicVars;
using MegaCrit.Sts2.Core.Models;
using MegaCrit.Sts2.Core.ValueProps;

namespace MyMod.Scripts.Cards;

[Pool(typeof(ColorlessCardPool))]
public class ${card.id} : CustomCardModel
{
    private const int energyCost = ${card.cost};
    private const CardType type = CardType.${card.type};
    private const CardRarity rarity = CardRarity.${card.rarity};
    private const TargetType targetType = TargetType.${card.targetType};

    protected override IEnumerable<DynamicVar> CanonicalVars => [
${card.effects.map(e => `        new ${e.action.charAt(0).toUpperCase() + e.action.slice(1)}Var(${e.value}, ValueProp.Move)`).join(',\n')}
    ];

    public ${card.id}() : base(energyCost, type, rarity, targetType, true) { }

    protected override async Task OnPlay(PlayerChoiceContext choiceContext, CardPlay cardPlay)
    {
${card.effects.map(e => generateEffectCode(e)).join('\n')}
    }
}
`;
  };

  const generateEffectCode = (effect: CardEffect): string => {
    switch (effect.action) {
      case 'damage':
        return `        await DamageCmd.Attack(${effect.value})
            .FromCard(this)
            .Targeting(cardPlay.Target)
            .Execute(choiceContext);`;
      case 'draw':
        return `        await CardPileCmd.Draw(choiceContext, ${effect.value}, choiceContext.Player);`;
      case 'block':
        return `        // Gain Block - use BlockCmd`;
      case 'heal':
        return `        // Heal - use HealCmd`;
      case 'energy':
        return `        // Gain Energy`;
      case 'applyPower':
        return `        // Apply ${effect.powerType || 'Power'} - use PowerCmd`;
      case 'discard':
        return `        // Discard - use CardPileCmd.Discard`;
      case 'exhaust':
        return `        // Exhaust - use CardPileCmd.Exhaust`;
      default:
        return `        // ${effect.action}`;
    }
  };

  return (
    <div className="developer-panel">
      <div className="dev-tabs">
        <button 
          className={activeTab === 'code' ? 'active' : ''} 
          onClick={() => setActiveTab('code')}
        >
          Generated Code
        </button>
        <button 
          className={activeTab === 'preview' ? 'active' : ''} 
          onClick={() => setActiveTab('preview')}
        >
          Effect Preview
        </button>
      </div>
      
      {activeTab === 'code' && (
        <pre className="code-preview">
          <code>{generatePreviewCode()}</code>
        </pre>
      )}
      
      {activeTab === 'preview' && (
        <div className="effect-preview">
          <h4>Card Effects:</h4>
          {card.effects.map((e, i) => (
            <div key={i} className="effect-preview-item">
              {EFFECT_ACTIONS.find(a => a.value === e.action)?.label}: 
              {e.value} → {EFFECT_TARGETS.find(t => t.value === e.target)?.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CardEditor() {
  const { 
    project, 
    selectedCardId, 
    selectCard, 
    updateCard, 
    deleteCard,
    isDeveloperMode,
    toggleDeveloperMode 
  } = useStore();

  const selectedCard = project.cards.find(c => c.id === selectedCardId);
  const locale = project.locale;
  const ui = t(locale);

  if (project.cards.length === 0) {
    return (
      <div className="editor-empty">
        <TemplateSelector />
      </div>
    );
  }

  return (
    <div className="card-editor">
      <div className="editor-list">
        <div className="list-header">
          <h3>{ui.cards} ({project.cards.length})</h3>
          <label className="dev-mode-toggle">
            <input 
              type="checkbox" 
              checked={isDeveloperMode} 
              onChange={toggleDeveloperMode}
            />
            {ui.devMode}
          </label>
        </div>
        
        <TemplateSelector />
        
        <div className="list-items">
          {project.cards.map(card => (
            <div 
              key={card.id}
              className={`list-item ${card.id === selectedCardId ? 'selected' : ''}`}
              onClick={() => selectCard(card.id)}
            >
              <span className={`card-type-badge ${card.type.toLowerCase()}`}>
                {card.type[0]}
              </span>
              <span className="card-name">{card.name[locale] || card.name.en}</span>
              <span className="card-cost">{card.cost}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedCard && (
        <div className="editor-form">
          <div className="form-header">
            <h3>{ui.editCard}</h3>
            <button 
              className="delete-btn" 
              onClick={() => deleteCard(selectedCard.id)}
            >
              {ui.delete}
            </button>
          </div>

          <div className="form-group">
            <label>{ui.cardId}</label>
            <input 
              type="text" 
              value={selectedCard.id}
              onChange={(e) => updateCard(selectedCard.id, { id: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Name ({locale.toUpperCase()})</label>
            <input 
              type="text" 
              value={selectedCard.name[locale] || ''}
              onChange={(e) => updateCard(selectedCard.id, { 
                name: { ...selectedCard.name, [locale]: e.target.value } 
              })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{ui.cardCost}</label>
              <input 
                type="number" 
                min="0" 
                max="99"
                value={selectedCard.cost}
                onChange={(e) => updateCard(selectedCard.id, { cost: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label>{ui.cardType}</label>
              <select 
                value={selectedCard.type}
                onChange={(e) => updateCard(selectedCard.id, { type: e.target.value as CardType })}
              >
                {CARD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{ui.cardRarity}</label>
              <select 
                value={selectedCard.rarity}
                onChange={(e) => updateCard(selectedCard.id, { rarity: e.target.value as CardRarity })}
              >
                {CARD_RARITIES.map(rarity => (
                  <option key={rarity} value={rarity}>{rarity}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{ui.cardTarget}</label>
              <select 
                value={selectedCard.targetType}
                onChange={(e) => updateCard(selectedCard.id, { targetType: e.target.value as TargetType })}
              >
                {TARGET_TYPES.map(target => (
                  <option key={target} value={target}>{target}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{ui.cardDescription} ({locale.toUpperCase()})</label>
            <textarea 
              value={selectedCard.description[locale] || ''}
              onChange={(e) => updateCard(selectedCard.id, { 
                description: { ...selectedCard.description, [locale]: e.target.value } 
              })}
              placeholder="Use {Damage}, {Block}, {Draw} for dynamic values"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>{ui.cardEffects}</label>
            <EffectSelector 
              effects={selectedCard.effects}
              onChange={(effects) => updateCard(selectedCard.id, { effects })}
              ui={ui}
            />
          </div>

          <div className="form-group">
            <label>Keywords</label>
            <KeywordSelector 
              keywords={selectedCard.keywords}
              onChange={(keywords) => updateCard(selectedCard.id, { keywords })}
            />
          </div>

          <div className="form-group">
            <label>Tags</label>
            <TagSelector 
              tags={selectedCard.tags}
              onChange={(tags) => updateCard(selectedCard.id, { tags })}
            />
          </div>

          <div className="form-group">
            <label>Dynamic Variables</label>
            <DynamicVarEditor 
              vars={selectedCard.vars}
              onChange={(vars) => updateCard(selectedCard.id, { vars })}
            />
          </div>

          <div className="form-group">
            <label>Card Pools (Characters)</label>
            <CardPoolSelector 
              pool={selectedCard.pool}
              onChange={(pool) => updateCard(selectedCard.id, { pool })}
            />
          </div>

          <div className="form-group">
            <label>Image Path</label>
            <ImagePathEditor 
              imagePath={selectedCard.imagePath}
              cardId={selectedCard.id}
              onChange={(imagePath) => updateCard(selectedCard.id, { imagePath })}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={selectedCard.upgraded || false}
                onChange={(e) => updateCard(selectedCard.id, { upgraded: e.target.checked })}
              />
              Has Upgraded Version
            </label>
          </div>

          {selectedCard.upgraded && (
            <>
              <div className="form-group">
                <label>Upgraded Cost (leave empty if unchanged)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="99"
                  value={selectedCard.upgradedCost ?? ''}
                  onChange={(e) => updateCard(selectedCard.id, { 
                    upgradedCost: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  placeholder={String(selectedCard.cost)}
                />
              </div>

              <div className="form-group">
                <label>Upgraded Description ({locale.toUpperCase()})</label>
                <textarea 
                  value={selectedCard.upgradedDescription?.[locale] || ''}
                  onChange={(e) => updateCard(selectedCard.id, { 
                    upgradedDescription: { 
                      en: selectedCard.upgradedDescription?.en || '', 
                      zh: selectedCard.upgradedDescription?.zh || '', 
                      ja: selectedCard.upgradedDescription?.ja || '',
                      [locale]: e.target.value 
                    } 
                  })}
                  placeholder="Use {Damage}, {Block}, {Draw} for dynamic values"
                  rows={3}
                />
              </div>
            </>
          )}

          <DeveloperModePanel cardId={selectedCard.id} />
        </div>
      )}
    </div>
  );
}
