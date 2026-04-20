// Card types - aligned with game enums
export type CardType = 'None' | 'Attack' | 'Skill' | 'Power' | 'Status' | 'Curse' | 'Quest';
export type CardRarity = 'None' | 'Basic' | 'Common' | 'Uncommon' | 'Rare' | 'Ancient' | 'Event' | 'Token' | 'Status' | 'Curse' | 'Quest' | 'Special';
export type TargetType = 'None' | 'Self' | 'AnyEnemy' | 'AllEnemies' | 'RandomEnemy' | 'AnyPlayer' | 'AnyAlly' | 'AllAllies' | 'TargetedNoCreature' | 'Osty';

// Card keywords
export type CardKeyword = 'None' | 'Exhaust' | 'Ethereal' | 'Innate' | 'Unplayable' | 'Retain' | 'Sly' | 'Eternal';

// Card tags
export type CardTag = 'None' | 'Strike' | 'Defend' | 'Upgrade' | 'Colorless' | 'Status' | 'Curse';

// Effect action types - mapped to game ValueProps
export type CardEffectAction = 
  | 'damage'
  | 'block'
  | 'draw'
  | 'heal'
  | 'energy'
  | 'applyPower'
  | 'discard'
  | 'exhaust'
  | 'addBlockToSelf'
  | 'gainGold'
  | 'channel'
  | 'evoke'
  | 'summon'
  | 'shiv';

export interface CardEffect {
  id: string;
  action: CardEffectAction;
  value: number;
  target: 'enemy' | 'self' | 'allEnemies' | 'randomEnemy';
  powerType?: string;
  powerAmount?: number;
}

// Relic rarity
export type RelicRarity = 'Starter' | 'Common' | 'Uncommon' | 'Rare' | 'Boss' | 'Special';

// DynamicVar types - aligned with game
export type DynamicVarType = 
  | 'Damage' 
  | 'Block' 
  | 'Draw' 
  | 'Heal' 
  | 'Energy' 
  | 'Gold' 
  | 'MaxHp' 
  | 'Repeat'
  | 'Cards'
  | 'Stars'
  | 'HpLoss'
  | 'Strength'
  | 'Dexterity'
  | 'Focus'
  | 'Vulnerable'
  | 'Weak'
  | 'Poison'
  | 'Intangible'
  | 'Thorns'
  | 'Summon';

// ValueProp flags for damage/block
export type ValueProp = 'Move' | 'Unpowered' | 'Unblockable' | 'SkipHurtAnim';

export interface DynamicVar {
  type: DynamicVarType;
  value: number;
  valuePerUpgraded?: number;
  valueProp?: ValueProp;
}

// Card interface
export interface Card {
  id: string;
  name: Record<'en' | 'zh' | 'ja', string>;
  description: Record<'en' | 'zh' | 'ja', string>;
  upgradedDescription?: Record<'en' | 'zh' | 'ja', string>;
  cost: number;
  upgradedCost?: number;
  type: CardType;
  rarity: CardRarity;
  targetType: TargetType;
  keywords: CardKeyword[];
  tags: CardTag[];
  vars: DynamicVar[];
  effects: CardEffect[];
  imagePath?: string;
  upgraded?: boolean;
  starCost?: number;
  pool: CardPoolType[];
}

// Card pool reference
export type CardPoolType = 'Ironclad' | 'Silent' | 'Defect' | 'Regent' | 'Necrobinder' | 'Colorless' | 'Event' | 'Status' | 'Curse';

// Vanilla card template
export interface VanillaCardTemplate {
  id: string;
  name: Record<'en' | 'zh' | 'ja', string>;
  description: Record<'en' | 'zh' | 'ja', string>;
  cost: number;
  type: CardType;
  rarity: CardRarity;
  targetType: TargetType;
  keywords: CardKeyword[];
  tags: CardTag[];
  effects: CardEffect[];
  pool: CardPoolType;
}

// Full card templates extracted from game
export const VANILLA_CARD_TEMPLATES: VanillaCardTemplate[] = [
  // Ironclad - Strike
  {
    id: 'strike_ironclad', pool: 'Ironclad',
    name: { en: 'Strike', zh: '打击', ja: 'ストライク' },
    description: { en: 'Deal 6 damage.', zh: '造成6点伤害。', ja: '6ダメージを与える。' },
    cost: 1, type: 'Attack', rarity: 'Basic', targetType: 'AnyEnemy',
    keywords: [], tags: ['Strike'],
    effects: [{ id: 'e1', action: 'damage', value: 6, target: 'enemy' }]
  },
  // Ironclad - Defend
  {
    id: 'defend_ironclad', pool: 'Ironclad',
    name: { en: 'Defend', zh: '防御', ja: 'ディフェンド' },
    description: { en: 'Gain 5 Block.', zh: '获得5点格挡。', ja: '5ブロックを得る。' },
    cost: 1, type: 'Skill', rarity: 'Basic', targetType: 'Self',
    keywords: [], tags: ['Defend'],
    effects: [{ id: 'e1', action: 'block', value: 5, target: 'self' }]
  },
  // Ironclad - Bash
  {
    id: 'bash', pool: 'Ironclad',
    name: { en: 'Bash', zh: '重击', ja: 'バッシュ' },
    description: { en: 'Deal 8 damage. Apply 2 Vulnerable.', zh: '造成8点伤害。赋予2层虚弱。', ja: '8ダメージを与える。脆弱2を与える。' },
    cost: 2, type: 'Attack', rarity: 'Basic', targetType: 'AnyEnemy',
    keywords: [], tags: ['Strike'],
    effects: [
      { id: 'e1', action: 'damage', value: 8, target: 'enemy' },
      { id: 'e2', action: 'applyPower', value: 2, target: 'enemy', powerType: 'Vulnerable', powerAmount: 2 }
    ]
  },
  // Ironclad - Armaments
  {
    id: 'armaments', pool: 'Ironclad',
    name: { en: 'Armaments', zh: '武装', ja: '武装' },
    description: { en: 'Gain 5 Block. Upgrade a card in your hand.', zh: '获得5点格挡。升级手牌中一张卡。', ja: '5ブロックを得る。手札1枚をアップグレードする。' },
    cost: 1, type: 'Skill', rarity: 'Basic', targetType: 'Self',
    keywords: [], tags: ['Defend'],
    effects: [{ id: 'e1', action: 'block', value: 5, target: 'self' }]
  },
  // Ironclad - Flex
  {
    id: 'flex', pool: 'Ironclad',
    name: { en: 'Flex', zh: '发力', ja: 'フレックス' },
    description: { en: 'Gain 2 Strength.', zh: '获得2点力量。', ja: '2筋力を得る。' },
    cost: 0, type: 'Skill', rarity: 'Basic', targetType: 'Self',
    keywords: [], tags: [],
    effects: [{ id: 'e1', action: 'applyPower', value: 2, target: 'self', powerType: 'Strength', powerAmount: 2 }]
  },
  // Ironclad - Pommel Strike
  {
    id: 'pommel_strike', pool: 'Ironclad',
    name: { en: 'Pommel Strike', zh: '柄击', ja: 'パメルストライク' },
    description: { en: 'Deal 9 damage. Draw 1 card.', zh: '造成9点伤害。抽1张牌。', ja: '9ダメージを与える。1枚カードを引く。' },
    cost: 1, type: 'Attack', rarity: 'Common', targetType: 'AnyEnemy',
    keywords: [], tags: ['Strike'],
    effects: [
      { id: 'e1', action: 'damage', value: 9, target: 'enemy' },
      { id: 'e2', action: 'draw', value: 1, target: 'self' }
    ]
  },
  // Ironclad - Shrug It Off
  {
    id: 'shrug_it_off', pool: 'Ironclad',
    name: { en: 'Shrug It Off', zh: '耸肩', ja: '耸肩' },
    description: { en: 'Gain 8 Block. Draw 1 card.', zh: '获得8点格挡。抽1张牌。', ja: '8ブロックを得る。1枚カードを引く。' },
    cost: 1, type: 'Skill', rarity: 'Common', targetType: 'Self',
    keywords: [], tags: ['Defend'],
    effects: [
      { id: 'e1', action: 'block', value: 8, target: 'self' },
      { id: 'e2', action: 'draw', value: 1, target: 'self' }
    ]
  },
  // Ironclad - Inflame
  {
    id: 'inflame', pool: 'Ironclad',
    name: { en: 'Inflame', zh: '燃烧', ja: 'インフレイム' },
    description: { en: 'Gain 2 Strength.', zh: '获得2点力量。', ja: '2筋力を得る。' },
    cost: 1, type: 'Power', rarity: 'Uncommon', targetType: 'Self',
    keywords: [], tags: [],
    effects: [{ id: 'e1', action: 'applyPower', value: 2, target: 'self', powerType: 'Strength', powerAmount: 2 }]
  },
  // Ironclad - Demon Form
  {
    id: 'demon_form', pool: 'Ironclad',
    name: { en: 'Demon Form', zh: '恶魔形态', ja: 'デーモンフォーム' },
    description: { en: 'At the start of turn, gain 2 Strength.', zh: '回合开始时，获得2点力量。', ja: 'ターン開始時、2筋力を得る。' },
    cost: 3, type: 'Power', rarity: 'Rare', targetType: 'Self',
    keywords: [], tags: [],
    effects: [{ id: 'e1', action: 'applyPower', value: 2, target: 'self', powerType: 'Strength', powerAmount: 2 }]
  },
  // Ironclad - Barricade
  {
    id: 'barricade', pool: 'Ironclad',
    name: { en: 'Barricade', zh: '壁垒', ja: 'バリケード' },
    description: { en: 'Block is not removed at the start of your turn.', zh: '格挡不会在回合开始时移除。', ja: 'ブロックはターン開始時に削除されない。' },
    cost: 3, type: 'Power', rarity: 'Rare', targetType: 'Self',
    keywords: [], tags: [],
    effects: []
  },
  // Ironclad - Impervious
  {
    id: 'impervious', pool: 'Ironclad',
    name: { en: 'Impervious', zh: '坚不可摧', ja: '鉄壁' },
    description: { en: 'Gain 30 Block.', zh: '获得30点格挡。', ja: '30ブロックを得る。' },
    cost: 2, type: 'Skill', rarity: 'Rare', targetType: 'Self',
    keywords: ['Exhaust'], tags: ['Defend'],
    effects: [{ id: 'e1', action: 'block', value: 30, target: 'self' }]
  },
  // Ironclad - Corruption
  {
    id: 'corruption', pool: 'Ironclad',
    name: { en: 'Corruption', zh: '腐败', ja: '腐败' },
    description: { en: 'Skills cost 0 this combat. When played, Exhaust.', zh: '技能在本场战斗中费用变为0。打出时消耗。', ja: 'スキルはコスト0になる。プレイ時、エキゾースト。' },
    cost: 3, type: 'Power', rarity: 'Rare', targetType: 'Self',
    keywords: ['Exhaust'], tags: [],
    effects: []
  },
  // Silent - Strike
  {
    id: 'strike_silent', pool: 'Silent',
    name: { en: 'Strike', zh: '打击', ja: 'ストライク' },
    description: { en: 'Deal 4 damage.', zh: '造成4点伤害。', ja: '4ダメージを与える。' },
    cost: 0, type: 'Attack', rarity: 'Basic', targetType: 'AnyEnemy',
    keywords: [], tags: ['Strike'],
    effects: [{ id: 'e1', action: 'damage', value: 4, target: 'enemy' }]
  },
  // Silent - Defend
  {
    id: 'defend_silent', pool: 'Silent',
    name: { en: 'Defend', zh: '防御', ja: 'ディフェンド' },
    description: { en: 'Gain 5 Block.', zh: '获得5点格挡。', ja: '5ブロックを得る。' },
    cost: 1, type: 'Skill', rarity: 'Basic', targetType: 'Self',
    keywords: [], tags: ['Defend'],
    effects: [{ id: 'e1', action: 'block', value: 5, target: 'self' }]
  },
  // Silent - Shiv
  {
    id: 'shiv', pool: 'Silent',
    name: { en: 'Shiv', zh: '飞镖', ja: 'シヴ' },
    description: { en: 'Deal 4 damage.', zh: '造成4点伤害。', ja: '4ダメージを与える。' },
    cost: 0, type: 'Attack', rarity: 'Basic', targetType: 'AnyEnemy',
    keywords: ['Exhaust'], tags: ['Strike'],
    effects: [{ id: 'e1', action: 'damage', value: 4, target: 'enemy' }]
  },
  // Silent - Poisoned Blade
  {
    id: 'poisoned_blade', pool: 'Silent',
    name: { en: 'Poisoned Blade', zh: '淬毒匕首', ja: '毒塗りナイフ' },
    description: { en: 'Deal 1 damage. Apply 3 Poison.', zh: '造成1点伤害。赋予3层中毒。', ja: '1ダメージを与える。毒3を与える。' },
    cost: 1, type: 'Attack', rarity: 'Uncommon', targetType: 'AnyEnemy',
    keywords: [], tags: ['Strike'],
    effects: [
      { id: 'e1', action: 'damage', value: 1, target: 'enemy' },
      { id: 'e2', action: 'applyPower', value: 3, target: 'enemy', powerType: 'Poison', powerAmount: 3 }
    ]
  },
  // Silent - Deflect
  {
    id: 'deflect', pool: 'Silent',
    name: { en: 'Deflect', zh: '偏斜', ja: 'ディフレクト' },
    description: { en: 'Gain 1 Block.', zh: '获得1点格挡。', ja: '1ブロックを得る。' },
    cost: 0, type: 'Skill', rarity: 'Basic', targetType: 'Self',
    keywords: [], tags: ['Defend'],
    effects: [{ id: 'e1', action: 'block', value: 1, target: 'self' }]
  },
  // Silent - Adrenaline
  {
    id: 'adrenaline', pool: 'Silent',
    name: { en: 'Adrenaline', zh: '肾上腺素', ja: 'アドレナリン' },
    description: { en: 'Gain 1 Energy. Draw 2 cards.', zh: '获得1点能量。抽2张牌。', ja: '1エネルギーを得る。2枚カードを引く。' },
    cost: 0, type: 'Skill', rarity: 'Rare', targetType: 'Self',
    keywords: [], tags: [],
    effects: [
      { id: 'e1', action: 'energy', value: 1, target: 'self' },
      { id: 'e2', action: 'draw', value: 2, target: 'self' }
    ]
  },
  // Silent - Accuracy
  {
    id: 'accuracy', pool: 'Silent',
    name: { en: 'Accuracy', zh: '精准', ja: '精度' },
    description: { en: 'Shivs deal 4 additional damage.', zh: '飞镖额外造成4点伤害。', ja: 'シヴは追加で4ダメージを与える。' },
    cost: 1, type: 'Power', rarity: 'Uncommon', targetType: 'Self',
    keywords: [], tags: [],
    effects: [{ id: 'e1', action: 'applyPower', value: 4, target: 'self', powerType: 'Accuracy', powerAmount: 4 }]
  },
  // Silent - Blade Dance
  {
    id: 'blade_dance', pool: 'Silent',
    name: { en: 'Blade Dance', zh: '刀舞', ja: 'ブレードダンス' },
    description: { en: 'Add 3 Shivs into your hand.', zh: '添加3张[gold]小刀[/gold]到你的[gold]手牌[/gold]。', ja: '手札に3枚のシヴを追加する。' },
    cost: 1, type: 'Skill', rarity: 'Common', targetType: 'Self',
    keywords: [], tags: [],
    effects: [{ id: 'e1', action: 'shiv', value: 3, target: 'self' }]
  },
  // Defect - Strike
  {
    id: 'strike_defect', pool: 'Defect',
    name: { en: 'Strike', zh: '打击', ja: 'ストライク' },
    description: { en: 'Deal 5 damage.', zh: '造成5点伤害。', ja: '5ダメージを与える。' },
    cost: 1, type: 'Attack', rarity: 'Basic', targetType: 'AnyEnemy',
    keywords: [], tags: ['Strike'],
    effects: [{ id: 'e1', action: 'damage', value: 5, target: 'enemy' }]
  },
  // Defect - Defend
  {
    id: 'defend_defect', pool: 'Defect',
    name: { en: 'Defend', zh: '防御', ja: 'ディフェンド' },
    description: { en: 'Gain 5 Block.', zh: '获得5点格挡。', ja: '5ブロックを得る。' },
    cost: 1, type: 'Skill', rarity: 'Basic', targetType: 'Self',
    keywords: [], tags: ['Defend'],
    effects: [{ id: 'e1', action: 'block', value: 5, target: 'self' }]
  },
  // Defect - Zap
  {
    id: 'zap', pool: 'Defect',
    name: { en: 'Zap', zh: '电击', ja: 'ザップ' },
    description: { en: 'Channel 1 Lightning.', zh: '引导1道闪电。', ja: '1つのライトニングをチャンネルする。' },
    cost: 0, type: 'Skill', rarity: 'Basic', targetType: 'Self',
    keywords: [], tags: [],
    effects: [{ id: 'e1', action: 'channel', value: 1, target: 'self' }]
  },
  // Defect - Dual Cast
  {
    id: 'dual_cast', pool: 'Defect',
    name: { en: 'Dual Cast', zh: '双重释放', ja: 'デュアルキャスト' },
    description: { en: 'Evoke your orb.', zh: '激发你的法球。', ja: 'オーブをイボークする。' },
    cost: 0, type: 'Skill', rarity: 'Basic', targetType: 'Self',
    keywords: [], tags: [],
    effects: [{ id: 'e1', action: 'evoke', value: 1, target: 'self' }]
  },
  // Defect - Ball Lightning
  {
    id: 'ball_lightning', pool: 'Defect',
    name: { en: 'Ball Lightning', zh: '球形闪电', ja: 'ボールライトニング' },
    description: { en: 'Deal 7 damage. Channel 1 Lightning.', zh: '造成7点伤害。引导1道闪电。', ja: '7ダメージを与える。1つのライトニングをチャンネルする。' },
    cost: 1, type: 'Attack', rarity: 'Common', targetType: 'AnyEnemy',
    keywords: [], tags: ['Strike'],
    effects: [
      { id: 'e1', action: 'damage', value: 7, target: 'enemy' },
      { id: 'e2', action: 'channel', value: 1, target: 'self' }
    ]
  },
  // Defect - Biased Cognition
  {
    id: 'biased_cognition', pool: 'Defect',
    name: { en: 'Biased Cognition', zh: '偏执认知', ja: 'バイアスド・コグニション' },
    description: { en: 'Gain 2 Focus. At the start of turn, lose 2 Focus.', zh: '获得2点专注。回合开始时，失去2点专注。', ja: '2フォーカスを得る。ターン開始時、2フォーカスを失う。' },
    cost: 1, type: 'Power', rarity: 'Rare', targetType: 'Self',
    keywords: [], tags: [],
    effects: [{ id: 'e1', action: 'applyPower', value: 2, target: 'self', powerType: 'Focus', powerAmount: 2 }]
  },
  // Defect - Barrage
  {
    id: 'barrage', pool: 'Defect',
    name: { en: 'Barrage', zh: '弹幕', ja: '弾幕' },
    description: { en: 'Deal 4 damage for each Channeled orb.', zh: '每引导一个法球造成4点伤害。', ja: 'チャンネルしたオーブ数だけ4ダメージを与える。' },
    cost: 1, type: 'Attack', rarity: 'Uncommon', targetType: 'AllEnemies',
    keywords: [], tags: ['Strike'],
    effects: [{ id: 'e1', action: 'damage', value: 4, target: 'allEnemies' }]
  },
  // Colorless - Shiv (added to deck)
  {
    id: 'shiv_colorless', pool: 'Colorless',
    name: { en: 'Shiv', zh: '飞镖', ja: 'シヴ' },
    description: { en: 'Deal 4 damage. Exhaust.', zh: '造成4点伤害。消耗。', ja: '4ダメージを与える。エキゾースト。' },
    cost: 0, type: 'Attack', rarity: 'Basic', targetType: 'AnyEnemy',
    keywords: ['Exhaust'], tags: ['Strike', 'Colorless'],
    effects: [{ id: 'e1', action: 'damage', value: 4, target: 'enemy' }]
  },
  // Status - Wound
  {
    id: 'wound', pool: 'Status',
    name: { en: 'Wound', zh: '伤口', ja: '傷' },
    description: { en: '', zh: '', ja: '' },
    cost: -2, type: 'Status', rarity: 'Status', targetType: 'None',
    keywords: [], tags: ['Status'],
    effects: []
  },
  // Curse - Dazed
  {
    id: 'dazed', pool: 'Curse',
    name: { en: 'Dazed', zh: '眩晕', ja: '目眩' },
    description: { en: 'Ethereal. Unplayable.', zh: '虚无。不可打出。', ja: 'エセリアル。プレイ不可。' },
    cost: -2, type: 'Curse', rarity: 'Curse', targetType: 'None',
    keywords: ['Ethereal', 'Unplayable'], tags: ['Curse'],
    effects: []
  },
];

// Relic hooks - aligned with game hooks
export type RelicHookType = 
  // Turn hooks
  | 'AfterPlayerTurnStart'
  | 'AfterPlayerTurnEnd'
  | 'AfterEnemyTurnStart'
  | 'AfterEnemyTurnEnd'
  // Combat hooks
  | 'AfterCombatStart'
  | 'AfterCombatEnd'
  | 'AfterCombatVictory'
  | 'BeforeCombatStart'
  // Card hooks
  | 'BeforeCardPlayed'
  | 'AfterCardPlayed'
  | 'AfterCardDrawn'
  | 'AfterCardDiscarded'
  | 'AfterCardExhausted'
  // Damage hooks
  | 'BeforeDamageReceived'
  | 'AfterDamageReceived'
  | 'BeforeDamageDealt'
  | 'AfterDamageDealt'
  // Block hooks
  | 'BeforeBlockGained'
  | 'AfterBlockGained'
  | 'AfterBlockBroken'
  // Energy hooks
  | 'AfterEnergySpent'
  | 'AfterEnergyReset'
  // Resource hooks
  | 'AfterGoldGained'
  | 'AfterStarsGained'
  // Item hooks
  | 'OnRelicObtained'
  | 'AfterPotionUsed'
  | 'AfterItemPurchased'
  // Room hooks
  | 'AfterRoomEntered'
  | 'AfterActEntered'
  // Death hooks
  | 'OnPlayerDeath'
  | 'BeforeDeath';

export interface RelicHook {
  type: RelicHookType;
  params?: Record<string, unknown>;
}

// Relic interface
export interface Relic {
  id: string;
  name: Record<'en' | 'zh' | 'ja', string>;
  description: Record<'en' | 'zh' | 'ja', string>;
  rarity: RelicRarity;
  hooks: RelicHook[];
  imagePath?: string;
  isStarter?: boolean;
  flavorText?: Record<'en' | 'zh' | 'ja', string>;
}

// Character config
export interface CharacterConfig {
  id: string;
  name: Record<'en' | 'zh' | 'ja', string>;
  description: Record<'en' | 'zh' | 'ja', string>;
  startingHp: number;
  maxHp?: number;
  startingRelicIds: string[];
  startingCardIds: string[];
  cardPoolId: string;
  relicPoolId: string;
  color?: string;
  energyColorName?: string;
  characterIconPath?: string;
}

// Main project interface
export interface ModProject {
  id: string;
  name: string;
  author: string;
  version: string;
  locale: 'en' | 'zh' | 'ja';
  cards: Card[];
  relics: Relic[];
  character?: CharacterConfig;
  createdAt: string;
  updatedAt: string;
}

// Default empty project
export function createEmptyProject(name: string = 'MyMod', author: string = 'Anonymous'): ModProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    author,
    version: '1.0.0',
    locale: 'en',
    cards: [],
    relics: [],
    createdAt: now,
    updatedAt: now,
  };
}

// Create default card
export function createDefaultCard(): Card {
  return {
    id: `CARD_${Date.now()}`,
    name: { en: 'New Card', zh: '新卡牌', ja: '新しいカード' },
    description: { en: 'Deal {Damage} damage.', zh: '造成 {Damage} 点伤害。', ja: '{Damage} ダメージを与える。' },
    upgradedDescription: { en: 'Deal {Damage} damage.', zh: '造成 {Damage} 点伤害。', ja: '{Damage} ダメージを与える。' },
    cost: 1,
    upgradedCost: undefined,
    type: 'Attack',
    rarity: 'Common',
    targetType: 'AnyEnemy',
    keywords: [],
    tags: [],
    vars: [{ type: 'Damage', value: 6, valuePerUpgraded: 3, valueProp: 'Move' }],
    effects: [{ id: 'e1', action: 'damage', value: 6, target: 'enemy' }],
    pool: ['Colorless'],
  };
}

// Create card from vanilla template
export function createCardFromTemplate(template: VanillaCardTemplate): Card {
  return {
    id: `${template.id.toUpperCase()}_${Date.now()}`,
    name: { ...template.name },
    description: { ...template.description },
    upgradedDescription: undefined,
    cost: template.cost,
    upgradedCost: undefined,
    type: template.type,
    rarity: template.rarity,
    targetType: template.targetType,
    keywords: template.keywords,
    tags: template.tags,
    vars: template.effects.map(e => ({
      type: effectActionToVarType(e.action),
      value: e.value,
      valuePerUpgraded: 0,
      valueProp: 'Move' as ValueProp,
    })),
    effects: template.effects.map((e, i) => ({ ...e, id: `e${i + 1}` })),
    pool: [template.pool],
  };
}

function effectActionToVarType(action: CardEffectAction): DynamicVarType {
  switch (action) {
    case 'damage': return 'Damage';
    case 'block': return 'Block';
    case 'draw': return 'Draw';
    case 'heal': return 'Heal';
    case 'energy': return 'Energy';
    case 'gainGold': return 'Gold';
    case 'channel': return 'Stars';
    case 'evoke': return 'Stars';
    default: return 'Damage';
  }
}

// Create default relic
export function createDefaultRelic(): Relic {
  return {
    id: `RELIC_${Date.now()}`,
    name: { en: 'New Relic', zh: '新遗物', ja: '新しいレリック' },
    description: { en: 'Draw 1 card at the start of your turn.', zh: '回合开始时抽1张牌。', ja: 'ターン開始時に1枚カードを引く。' },
    rarity: 'Common',
    hooks: [{ type: 'AfterPlayerTurnStart' }],
  };
}

// === Available Game Assets (from decompiled game) ===

// Available card portraits by pool
export const AVAILABLE_CARD_IMAGES: Record<string, string[]> = {
  ironclad: [
    'aggression', 'anger', 'armaments', 'ashen_strike', 'barricade', 'bash',
    'battle_trance', 'blood_wall', 'bloodletting', 'bludgeon', 'body_slam',
    'brand', 'break', 'breakthrough', 'bully', 'burning_pact', 'cascade',
    'cinder', 'colossus', 'conflagration', 'corruption', 'crimson_mantle',
    'cruelty', 'dark_embrace', 'defend_ironclad', 'demon_form', 'demonic_shield',
    'dismantle', 'dominate', 'drum_of_battle', 'evil_eye', 'expect_a_fight',
    'feed', 'feel_no_pain', 'fiend_fire', 'fight_me', 'flame_barrier',
    'forgotten_ritual', 'grapple', 'havoc', 'headbutt', 'hellraiser', 'hemokinesis',
    'howl_from_beyond', 'impervious', 'infernal_blade', 'inferno', 'inflame',
    'iron_wave', 'juggernaut', 'juggling', 'limit_break', 'mangle', 'molten_fist',
    'offering', 'one_two_punch', 'pacts_end', 'perfected_strike', 'pillage',
    'pommel_strike', 'primal_force', 'pyre', 'rage', 'rampage', 'rupture',
    'second_wind', 'setup_strike', 'shrug_it_off', 'spite', 'stampede', 'stoke',
    'stomp', 'stone_armor', 'strike_ironclad', 'sword_boomerang', 'tank', 'taunt',
    'tear_asunder', 'thrash', 'thunderclap', 'tremble', 'true_grit', 'twin_strike',
    'unmovable', 'unrelenting', 'uppercut', 'vicious', 'whirlwind'
  ],
  silent: [
    'accelerant', 'accuracy', 'acrobatics', 'adrenaline', 'afterimage', 'anticipate',
    'assassinate', 'backflip', 'backstab', 'bane', 'blade_dance', 'blade_of_ink',
    'blur', 'bouncing_flask', 'caltrops', 'catalyst', 'cloak_and_dagger',
    'concentrate', 'crime_punishment', 'crippling_cloud', 'dagger_throw', 'dash',
    'deadly_poison', 'defense', 'deflect', 'disappear', 'dodge_and_weave',
    'doom', 'dual_wield', 'endless_pain', 'envenom', 'escape_plan', 'exsanguinate',
    'finisher', 'fleet_pilgrim', 'fly_blade', 'footwork', 'frost_strike',
    'ghostly_formation', 'glacier', 'grand_finale', 'groundwork', 'heaving_blade',
    'hidden_blade', 'immunize', 'impervious_smoke', 'incense_powder', 'inferno',
    'into_the_fragments', 'leg_sweep', 'masterful_stab', 'metamorphosis', 'nightmare',
    'noxious_fumes', 'outmaneuver', 'piercing_gaze', 'poisoned_stab', 'quick_slash',
    'rend', 'reprocute', 'schadenfreude', 'second_deal', 'sedate', 'shiv', 'shoot',
    'slice', 'smoke_bomb', 'stalker', 'strike_silent', 'sunder', 'super_slimed',
    'swift_strike', 'throwing_knife', 'toolbox', 'trebuchet', 'unload', 'upper_hand',
    'wraith_form'
  ],
  defect: [
    'all_for_one', 'ball_lightning', 'barrage', 'beam_cell', 'biased_cognition',
    'boost_away', 'boot_sequence', 'buffer', 'capacitor', 'cast', 'charge_battery',
    'clash', 'compile_driver', 'consume', 'coolheaded', 'creative_ai', 'darkness',
    'defend_defect', 'discharge', 'double_energy', 'dual_cast', 'echo_form',
    'fission', 'flame_turret', 'force_field', 'fragment', 'fusion', 'gain_power',
    'golem_anger', 'gravity_field', 'heatsink', 'hologram', 'impulse', 'inferno',
    'insight', 'loop', 'machine_learning', 'matrix', 'melter', 'metabolism',
    'multicast', 'neutron_star', 'nonlocal', 'obliterate', 'optics', 'orbit',
    'overflow', 'rainbow', 'reaper', 'reboot', 'reform', 'render', 'repeating_orb',
    'runic_cube', 'scry', 'seek', 'self_repair', 'sentry', 'set_up', 'skewer',
    'smash', 'spark', 'static_discharge', 'stimulate', 'storm', 'strike_defect',
    'sunder', 'sweeping_beam', 'tempest', 'thought_strike', 'thunder_strike',
    'turbo', 'turret', 'ward', 'wave_of_the_hand', 'whirlwind', 'window',
    'zap', 'zap_defect'
  ],
  colorless: [
    'alchemize', 'anointed', 'automation', 'bandage_up', 'beat_down', 'believe_in_you',
    'dark_shackles', 'deep_breath', 'detect_weakness', 'disarm', 'empty_fist',
    'enlightenment', 'examination', 'expansion', 'finesse', 'flash_of_steel',
    'flex', 'forethought', 'ghostly_armor', 'hidden_cache', 'holy_water', 'impatience',
    'injury', 'inspire', 'jack_of_all_trades', 'madness', 'master_of_strategy',
    'metallicize', 'mind_blast', 'miracle', 'nullify', 'offering', 'panacea',
    'power_through', 'prayer', 'purify', 'quick_restart', 'reaper_scythe', 'redemption',
    'regret', 'secret_weapon', 'shadow_ Clone', 'shrug_it_off', 'smite', 'strategy',
    'sunder', 'swift_crafting', 'tear', 'thinking_ahead', 'transmutation', 'tranquility',
    'trip', 'unexploited', 'upgrade', 'warcry', 'weave', 'wheeze', 'wild_strike',
    'witness', 'worldly_exile', 'zen'
  ],
  necrobinder: [],
  regent: [],
  status: ['wound', 'dazed', 'slimed', 'burning', 'frost', 'poisoned'],
  curse: [
    'ascenders_bane', 'clumsy', 'curse_of_the_bell', 'debt', 'decay', 'doubt',
    'enthralled', 'folly', 'greed', 'guilty', 'injury', 'necrotic_circle',
    'parasite', 'pain', 'regret', 'shame', 'writhe'
  ]
};

// Available relic images (starter relics highlighted)
export const AVAILABLE_RELIC_IMAGES: { id: string; starter: boolean }[] = [
  // Starter relics
  { id: 'burning_blood', starter: true },
  { id: 'ring_of_serpent', starter: true },
  { id: 'cracked_core', starter: true },
  { id: 'oddly_smooth_stone', starter: true },
  { id: 'pure_water', starter: true },
  // Common relics
  { id: 'akabeko', starter: false },
  { id: 'anchor', starter: false },
  { id: 'art_of_war', starter: false },
  { id: 'bag_of_marbles', starter: false },
  { id: 'bag_of_preparation', starter: false },
  { id: 'blood_vial', starter: false },
  { id: 'bone_flute', starter: false },
  { id: 'box', starter: false },
  { id: 'brass_ring', starter: false },
  { id: 'calling_bell', starter: false },
  { id: 'centennial_puzzle', starter: false },
  { id: 'ceramic_fish', starter: false },
  { id: 'data_disk', starter: false },
  { id: 'dream_catcher', starter: false },
  { id: 'encrypted_ink', starter: false },
  { id: 'eshin_shadow', starter: false },
  { id: 'face_of_cleric', starter: false },
  { id: 'faith', starter: false },
  { id: 'food_rations', starter: false },
  { id: 'frost_embrace', starter: false },
  { id: 'gambling_chips', starter: false },
  { id: 'golden_eyes', starter: false },
  { id: 'golden_idol', starter: false },
  { id: 'gram', starter: false },
  { id: 'happy_flower', starter: false },
  { id: 'magic_flower', starter: false },
  { id: 'maw_bank', starter: false },
  { id: 'meal_ticket', starter: false },
  { id: 'membership_card', starter: false },
  { id: 'orange_pellets', starter: false },
  { id: 'peacock', starter: false },
  { id: 'pill', starter: false },
  { id: 'prayer_wheel', starter: false },
  { id: 'red_mask', starter: false },
  { id: 'regal_pillow', starter: false },
  { id: 'relic_bottle', starter: false },
  { id: 'silver_bullet', starter: false },
  { id: 'sling', starter: false },
  { id: 'snake_ring', starter: false },
  { id: 'spear', starter: false },
  { id: 'steam_power', starter: false },
  { id: 'sundial', starter: false },
  { id: 'teacup', starter: false },
  { id: 'the_bomb', starter: false },
  { id: 'tiny_chest', starter: false },
  { id: 'tourists_sash', starter: false },
  { id: 'vajra', starter: false },
  { id: 'wax_idol', starter: false },
  { id: 'white_beast_statue', starter: false },
  { id: 'winged_greaves', starter: false },
  // Boss relics
  { id: 'astrolabe', starter: false },
  { id: 'black_block', starter: false },
  { id: 'black_blood', starter: false },
  { id: 'black_star', starter: false },
  { id: 'blizzard', starter: false },
  { id: 'cursed_key', starter: false },
  { id: 'ectoplasm', starter: false },
  { id: 'empty_cage', starter: false },
  { id: 'fusion_hammer', starter: false },
  { id: 'glove', starter: false },
  { id: 'holy_water', starter: false },
  { id: 'incense_burner', starter: false },
  { id: 'mark_of_the_bloom', starter: false },
  { id: 'necronomicon', starter: false },
  { id: 'neows_blessing', starter: false },
  { id: 'oddly_smooth_stone', starter: false },
  { id: 'potion_belt', starter: false },
  { id: 'saw', starter: false },
  { id: 'snecko_skull', starter: false },
  { id: 'sozu', starter: false },
  { id: 'spire_form', starter: false },
  { id: 'toolbox', starter: false },
  { id: 'turnip', starter: false },
  { id: 'universal_energy', starter: false },
  { id: 'velvet_choker', starter: false },
  { id: 'vinegar', starter: false }
];

// Character select images
export const AVAILABLE_CHARACTER_IMAGES = [
  'char_select_ironclad',
  'char_select_silent', 
  'char_select_defect',
  'char_select_necrobinder',
  'char_select_regent'
];

// Get image path for card
export function getCardImagePath(_pool: string, cardId: string): string {
  const basePath = `/images/cards/${cardId.toLowerCase()}.png`;
  return basePath;
}

// Get image path for relic  
export function getRelicImagePath(relicId: string): string {
  return `/images/relics/${relicId.toLowerCase()}.png`;
}

// Get character icon path
export function getCharacterIconPath(characterId: string): string {
  return `/images/characters/char_select_${characterId.toLowerCase()}.png`;
}
