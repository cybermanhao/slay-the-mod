import { useState } from 'react';
import { useStore } from '../../stores/appStore';
import { Card } from '../../types';
import { KEYWORD_BY_ID } from '../../data/keywords';
import './CardPreview.css';

interface CardPreviewProps {
  card: Card;
}

export function CardPreview({ card }: CardPreviewProps) {
  const locale = useStore(state => state.project.locale);
  const name = card.name[locale] || card.name.en;
  const description = card.description[locale] || card.description.en;
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Determine the image source: custom path > game asset > placeholder
  const getCardImage = () => {
    if (card.imagePath) {
      return card.imagePath;
    }
    const gameImagePath = `/images/cards/${card.id.toLowerCase()}.png`;
    return gameImagePath;
  };

  const cardImage = getCardImage();

  // Parse description to replace {Var} with actual values
  const parseDescription = (desc: string) => {
    let result = desc;
    card.vars.forEach(v => {
      result = result.replace(new RegExp(`\\{${v.type}\\}`, 'g'), v.value.toString());
      result = result.replace(new RegExp(`\\{${v.type}:diff\\(\\)\\}`, 'g'), 
        v.valuePerUpgraded ? `${v.value} → ${v.value + v.valuePerUpgraded}` : v.value.toString());
    });
    return result;
  };

  // Parse description for keyword highlighting
  const renderDescriptionWithKeywords = (desc: string) => {
    const parsed = parseDescription(desc);
    // Split by [gold]keyword[/gold] pattern
    const parts = parsed.split(/(\[gold\]|\[\/gold\])/);
    
    return parts.map((part, index) => {
      if (part === '[gold]') {
        return null; // Skip opening tag
      }
      if (part === '[/gold]') {
        return null; // Skip closing tag
      }
      if (part.startsWith('[') && part.endsWith(']')) {
        // This is a keyword in brackets like [keyword]
        const keyword = part.slice(1, -1);
        const kw = KEYWORD_BY_ID[keyword];
        const displayName = kw ? kw.name[locale] : keyword;
        
        return (
          <span 
            key={index}
            className="keyword-highlight"
            onMouseEnter={(e) => {
              setHoveredKeyword(keyword);
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
            }}
            onMouseLeave={() => setHoveredKeyword(null)}
          >
            {displayName}
          </span>
        );
      }
      return part;
    });
  };

  const hoveredKw = hoveredKeyword ? KEYWORD_BY_ID[hoveredKeyword] : null;

  return (
    <div className={`card-preview ${card.type.toLowerCase()}`}>
      {hoveredKeyword && hoveredKw && (
        <div 
          className="keyword-tooltip" 
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <strong>{hoveredKw.name[locale]}</strong>
          <p>{hoveredKw.description[locale]}</p>
        </div>
      )}
      <div className="card-cost-badge">{card.cost}</div>
      <div className="card-image">
        {card.imagePath || card.id ? (
          <img src={cardImage} alt={name} onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }} />
        ) : null}
        <div className={`card-placeholder ${card.imagePath || card.id ? 'hidden' : ''}`}>
          <span>{card.type[0]}</span>
        </div>
      </div>
      <div className="card-name">{name}</div>
      <div className="card-type">{card.type}</div>
      <div className="card-description">{renderDescriptionWithKeywords(description)}</div>
      <div className="card-rarity">{card.rarity}</div>
    </div>
  );
}

export function CardPreviewPanel() {
  const { project, selectedCardId } = useStore();
  
  if (!selectedCardId) {
    return (
      <div className="preview-panel">
        <div className="preview-empty">
          <p>Select a card to preview</p>
        </div>
      </div>
    );
  }

  const card = project.cards.find(c => c.id === selectedCardId);
  if (!card) {
    return null;
  }

  return (
    <div className="preview-panel">
      <h3>Preview</h3>
      <CardPreview card={card} />
    </div>
  );
}
