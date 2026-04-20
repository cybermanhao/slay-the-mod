// Keywords extracted from game localization
// These are used for keyword highlighting in card descriptions

export interface KeywordInfo {
  id: string;
  name: {
    en: string;
    zh: string;
    ja: string;
  };
  description: {
    en: string;
    zh: string;
    ja: string;
  };
}

// Full keyword database from game
export const KEYWORDS: KeywordInfo[] = [
  // Card Keywords (from card_keywords.json)
  {
    id: 'Eternal',
    name: { en: 'Eternal', zh: '永恒', ja: 'エターナル' },
    description: { 
      en: 'Cannot be removed or transformed from your Deck.', 
      zh: '无法从你的牌组中移除或变化。', 
      ja: 'デッキから削除または変換できません。' 
    }
  },
  {
    id: 'Ethereal',
    name: { en: 'Ethereal', zh: '虚无', ja: 'エセリアル' },
    description: { 
      en: 'If this card is in your Hand at the end of this turn, it is Exhausted.', 
      zh: '如果这张牌在你的手牌中，则将其消耗。', 
      ja: 'このカードがターン終了時に手札にある場合、消耗されます。' 
    }
  },
  {
    id: 'Exhaust',
    name: { en: 'Exhaust', zh: '消耗', ja: '消耗' },
    description: { 
      en: 'Removed until the end of combat.', 
      zh: '战斗结束后移除。', 
      ja: '戦闘終了まで削除されます。' 
    }
  },
  {
    id: 'Innate',
    name: { en: 'Innate', zh: '固有', ja: '先天性' },
    description: { 
      en: 'Start each combat with this card in your Hand.', 
      zh: '每场战斗开始时这张牌会出现在你的手牌。', 
      ja: '各戦闘開始時にこのカードが我的手札にあります。' 
    }
  },
  {
    id: 'Retain',
    name: { en: 'Retain', zh: '保留', ja: '保持' },
    description: { 
      en: 'Retained cards are not discarded at the end of turn.', 
      zh: '保留的牌不会在回合结束时被弃掉。', 
      ja: '保持されたカードはまだターン終了時に廃棄されません。' 
    }
  },
  {
    id: 'Sly',
    name: { en: 'Sly', zh: '奇巧', ja: '賢い' },
    description: { 
      en: 'If this card is discarded from your Hand before the end of your turn, play it for free.', 
      zh: '如果这张牌从你手牌中被弃置在你的回合结束前，免费将其打出。', 
      ja: 'このカードがター終了前に手札から廃棄された場合、 무료로打出します。' 
    }
  },
  {
    id: 'Unplayable',
    name: { en: 'Unplayable', zh: '不能被打出', ja: 'プレイ不可' },
    description: { 
      en: 'Unplayable cards cannot be played.', 
      zh: '不能被打出的牌无法被打出。', 
      ja: 'プレイ不可のカードはプレイできません。' 
    }
  },
  
  // Power Keywords (from powers.json)
  {
    id: 'Dexterity',
    name: { en: 'Dexterity', zh: '敏捷', ja: '敏捷' },
    description: { 
      en: 'Dexterity is a stat that gives +1 Block per point when gaining Block from cards.', 
      zh: '敏捷是一个属性，每点使从卡牌获得格挡时额外获得+1点格挡。', 
      ja: '敏捷はブロックを獲得する時にカードポイントごとに+1ブロックを与えるステータスです。' 
    }
  },
  {
    id: 'Strength',
    name: { en: 'Strength', zh: '力量', ja: '筋力' },
    description: { 
      en: 'Strength is a stat that gives +1 Damage per point when dealing attack damage.', 
      zh: '力量是一个属性，每点使攻击伤害额外造成+1点伤害。', 
      ja: '筋力は攻撃ダメージを与える時にカードポイントごとに+1ダメージを与えるステータスです。' 
    }
  },
  {
    id: 'Vulnerable',
    name: { en: 'Vulnerable', zh: '易伤', ja: '脆弱' },
    description: { 
      en: 'Vulnerable enemies take 50% more damage from attacks.', 
      zh: '易伤的敌人受到的攻击伤害增加50%。', 
      ja: '脆弱な敵は攻撃から50%以上のダメージを受けます。' 
    }
  },
  {
    id: 'Weak',
    name: { en: 'Weak', zh: '虚弱', ja: '弱体化' },
    description: { 
      en: 'Weak enemies deal 50% less damage with attacks.', 
      zh: '虚弱的敌人攻击伤害降低50%。', 
      ja: '弱体化した敵は攻撃ダメージを50%以下にします。' 
    }
  },
  {
    id: 'Frail',
    name: { en: 'Frail', zh: '脆弱', ja: '脆弱' },
    description: { 
      en: 'Frail players gain 50% less Block from cards.', 
      zh: '脆弱的玩家从卡牌获得格挡减少50%。', 
      ja: '脆弱なプレイヤーはカードから50%以下のブロックを獲得します。' 
    }
  },
  {
    id: 'Poison',
    name: { en: 'Poison', zh: '中毒', ja: '毒' },
    description: { 
      en: 'Poison deals damage at the end of each turn equal to its stack.', 
      zh: '中毒在每个回合结束时造成等于其层数的伤害。', 
      ja: '毒は各ターン終了時にスタックに等しいダメージを与えます。' 
    }
  },
  {
    id: 'Regeneration',
    name: { en: 'Regeneration', zh: '回复', ja: '再生' },
    description: { 
      en: 'Regeneration heals for its amount at the end of each turn.', 
      zh: '回复在每个回合结束时回复等于其数值的生命值。', 
      ja: '再生は各ターン終了時に量のHPを回復します。' 
    }
  },
  {
    id: 'Artifact',
    name: { en: 'Artifact', zh: '护盾', ja: 'アーティファクト' },
    description: { 
      en: 'Artifact prevents the next X negative effects.', 
      zh: '护盾防止接下来X次负面效果。', 
      ja: 'アーティファクトは次のX個の否定的な効果を防止します。' 
    }
  },
  {
    id: 'Block',
    name: { en: 'Block', zh: '格挡', ja: 'ブロック' },
    description: { 
      en: 'Block absorbs damage from attacks.', 
      zh: '格挡吸收攻击造成的伤害。', 
      ja: 'ブロックは攻撃からのダメージを吸収します。' 
    }
  },
  {
    id: 'Energy',
    name: { en: 'Energy', zh: '能量', ja: 'エネルギー' },
    description: { 
      en: 'Energy is used to play cards.', 
      zh: '能量用于打出手牌。', 
      ja: 'エネルギーはカードをプレイするために使用されます。' 
    }
  },
  {
    id: 'Shiv',
    name: { en: 'Shiv', zh: '小刀', ja: 'シヴ' },
    description: { 
      en: 'Shivs are special cards that are Exhausted after use.', 
      zh: '小刀是使用后会被消耗的特殊卡牌。', 
      ja: 'シヴは使用後に消耗される特別なカードです。' 
    }
  },
  {
    id: 'Thorns',
    name: { en: 'Thorns', zh: '荆棘', ja: '棘' },
    description: { 
      en: 'Thorns deals damage to attackers.', 
      zh: '荆棘对攻击者造成伤害。', 
      ja: '棘は攻撃者にダメージを与えます。' 
    }
  },
  {
    id: 'Intangible',
    name: { en: 'Intangible', zh: '无实体', ja: 'intangible' },
    description: { 
      en: 'Intangible reduces all damage taken by 50% (min 1).', 
      zh: '无实体使所有受到的伤害减少50%（最少1点）。', 
      ja: 'intangibleはすべて受けるダメージを50%（最小1）減少させます。' 
    }
  },
  {
    id: 'Enrage',
    name: { en: 'Enrage', zh: '激怒', ja: '激怒' },
    description: { 
      en: 'Enrage increases Strength when taking damage.', 
      zh: '激怒在受到伤害时增加力量。', 
      ja: '激怒はダメージを受けると筋力を増加させます。' 
    }
  },
  {
    id: 'Ritual',
    name: { en: 'Ritual', zh: '仪式', ja: '儀式' },
    description: { 
      en: 'Ritual gives Strength at the start of each turn.', 
      zh: '仪式在每个回合开始时给予力量。', 
      ja: '儀식은各ターン開始時に筋力を与えます。' 
    }
  },
  
  // Pile Keywords
  {
    id: 'Draw Pile',
    name: { en: 'Draw Pile', zh: '抽牌堆', ja: 'ドローウェル' },
    description: { 
      en: 'The Draw Pile is where you draw cards from.', 
      zh: '抽牌堆是你抽牌的来源。', 
      ja: 'ドローウェルはカードを引く元です。' 
    }
  },
  {
    id: 'Discard Pile',
    name: { en: 'Discard Pile', zh: '弃牌堆', ja: '廃棄ウェル' },
    description: { 
      en: 'The Discard Pile is where played cards go.', 
      zh: '弃牌堆是使用后的卡牌放置处。', 
      ja: '廃棄ウェルはプレイされたカードが行くところです。' 
    }
  },
  {
    id: 'Exhaust Pile',
    name: { en: 'Exhaust Pile', zh: '消耗堆', ja: '疲労ウェル' },
    description: { 
      en: 'The Exhaust Pile is where Exhausted cards go.', 
      zh: '消耗堆是被消耗的卡牌放置处。', 
      ja: '疲労ウェルは消耗されたカードが行くところです。' 
    }
  },
  {
    id: 'Hand',
    name: { en: 'Hand', zh: '手牌', ja: '手札' },
    description: { 
      en: 'Your Hand contains the cards you can play.', 
      zh: '你的手牌包含你可以打出的卡牌。', 
      ja: '我的手札はプレイできるカードを含みます。' 
    }
  },
  {
    id: 'Deck',
    name: { en: 'Deck', zh: '牌组', ja: 'デッキ' },
    description: { 
      en: 'Your Deck is the collection of cards you draw from.', 
      zh: '你的牌组是你抽牌的卡牌集合。', 
      ja: 'デッキは私が引くカードのコレクションです。' 
    }
  },
];

// Quick lookup by ID
export const KEYWORD_BY_ID = KEYWORDS.reduce((acc, kw) => {
  acc[kw.id] = kw;
  return acc;
}, {} as Record<string, KeywordInfo>);

// For highlighting - just the keyword IDs that should be highlighted
export const KEYWORD_IDS = KEYWORDS.map(k => k.id);
