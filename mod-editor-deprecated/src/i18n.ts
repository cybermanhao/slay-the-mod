// UI i18n system
export type Locale = 'en' | 'zh' | 'ja';

export interface Translations {
  // App
  appTitle: string;
  newProject: string;
  openProject: string;
  saveProject: string;
  
  // Tabs
  tabCards: string;
  tabRelics: string;
  tabCharacter: string;
  tabExport: string;
  
  // Card Editor
  cards: string;
  relics: string;
  editCard: string;
  editRelic: string;
  delete: string;
  addCard: string;
  addRelic: string;
  fromTemplate: string;
  newCard: string;
  
  // Card fields
  cardId: string;
  cardName: string;
  cardDescription: string;
  cardCost: string;
  cardType: string;
  cardRarity: string;
  cardTarget: string;
  cardKeywords: string;
  cardTags: string;
  cardEffects: string;
  cardPool: string;
  cardImage: string;
  
  // Card form - locale specific
  nameEn: string;
  nameZh: string;
  nameJa: string;
  descEn: string;
  descZh: string;
  descJa: string;
  
  // Effects
  effectAction: string;
  effectValue: string;
  effectTarget: string;
  addEffect: string;
  
  // Template
  templates: string;
  filterByPool: string;
  filterByType: string;
  allCharacters: string;
  allTypes: string;
  
  // Preview
  preview: string;
  selectCardToPreview: string;
  
  // Export
  exportMod: string;
  exportLocation: string;
  selectFolder: string;
  export: string;
  exportedTo: string;
  
  // Misc
  developer: string;
  devMode: string;
  cancel: string;
  confirm: string;
  character: string;
  type: string;
}

export const translations: Record<Locale, Translations> = {
  en: {
    appTitle: 'STS2 Mod Visualizer',
    newProject: 'New Project',
    openProject: 'Open Project',
    saveProject: 'Save Project',
    
    tabCards: 'Cards',
    tabRelics: 'Relics',
    tabCharacter: 'Character',
    tabExport: 'Export',
    
    cards: 'Cards',
    relics: 'Relics',
    editCard: 'Edit Card',
    editRelic: 'Edit Relic',
    delete: 'Delete',
    addCard: '+ Add Card',
    addRelic: '+ Add Relic',
    fromTemplate: 'From Template',
    newCard: '+ New Card',
    
    cardId: 'ID',
    cardName: 'Name',
    cardDescription: 'Description',
    cardCost: 'Cost',
    cardType: 'Type',
    cardRarity: 'Rarity',
    cardTarget: 'Target',
    cardKeywords: 'Keywords',
    cardTags: 'Tags',
    cardEffects: 'Effects',
    cardPool: 'Card Pool',
    cardImage: 'Image Path',
    
    nameEn: 'Name (EN)',
    nameZh: 'Name (ZH)',
    nameJa: 'Name (JA)',
    descEn: 'Description (EN)',
    descZh: 'Description (ZH)',
    descJa: 'Description (JA)',
    
    effectAction: 'Action',
    effectValue: 'Value',
    effectTarget: 'Target',
    addEffect: '+ Add Effect',
    
    templates: 'Templates',
    filterByPool: 'Character',
    filterByType: 'Type',
    allCharacters: 'All Characters',
    allTypes: 'All',
    
    preview: 'Preview',
    selectCardToPreview: 'Select a card to preview',
    
    exportMod: 'Export Mod',
    exportLocation: 'Export Location',
    selectFolder: 'Select Folder',
    export: 'Export',
    exportedTo: 'Exported to:',
    
    developer: 'Developer',
    devMode: 'Dev Mode',
    cancel: 'Cancel',
    confirm: 'Confirm',
    character: 'Character',
    type: 'Type',
  },
  
  zh: {
    appTitle: 'STS2 模组可视化工具',
    newProject: '新建项目',
    openProject: '打开项目',
    saveProject: '保存项目',
    
    tabCards: '卡牌',
    tabRelics: '遗物',
    tabCharacter: '角色',
    tabExport: '导出',
    
    cards: '卡牌',
    relics: '遗物',
    editCard: '编辑卡牌',
    editRelic: '编辑遗物',
    delete: '删除',
    addCard: '+ 添加卡牌',
    addRelic: '+ 添加遗物',
    fromTemplate: '从模板选择',
    newCard: '+ 新建卡牌',
    
    cardId: 'ID',
    cardName: '名称',
    cardDescription: '描述',
    cardCost: '费用',
    cardType: '类型',
    cardRarity: '稀有度',
    cardTarget: '目标',
    cardKeywords: '关键词',
    cardTags: '标签',
    cardEffects: '效果',
    cardPool: '卡池',
    cardImage: '图片路径',
    
    nameEn: '名称 (英文)',
    nameZh: '名称 (中文)',
    nameJa: '名称 (日文)',
    descEn: '描述 (英文)',
    descZh: '描述 (中文)',
    descJa: '描述 (日文)',
    
    effectAction: '动作',
    effectValue: '数值',
    effectTarget: '目标',
    addEffect: '+ 添加效果',
    
    templates: '模板',
    filterByPool: '角色',
    filterByType: '类型',
    allCharacters: '全部角色',
    allTypes: '全部',
    
    preview: '预览',
    selectCardToPreview: '选择一张卡牌进行预览',
    
    exportMod: '导出模组',
    exportLocation: '导出位置',
    selectFolder: '选择文件夹',
    export: '导出',
    exportedTo: '已导出至:',
    
    developer: '开发者',
    devMode: '开发模式',
    cancel: '取消',
    confirm: '确认',
    character: '角色',
    type: '类型',
  },
  
  ja: {
    appTitle: 'STS2 モッドビジュアライザー',
    newProject: '新規プロジェクト',
    openProject: 'プロジェクトを開く',
    saveProject: '保存',
    
    tabCards: 'カード',
    tabRelics: 'レリック',
    tabCharacter: 'キャラクター',
    tabExport: 'エクスポート',
    
    cards: 'カード',
    relics: 'レリック',
    editCard: 'カードを編集',
    editRelic: 'レリックを編集',
    delete: '削除',
    addCard: '+ カードを追加',
    addRelic: '+ レリックを追加',
    fromTemplate: 'テンプレートから',
    newCard: '+ 新規カード',
    
    cardId: 'ID',
    cardName: '名前',
    cardDescription: '説明',
    cardCost: 'コスト',
    cardType: 'タイプ',
    cardRarity: 'レアリティ',
    cardTarget: 'ターゲット',
    cardKeywords: 'キーワード',
    cardTags: 'タグ',
    cardEffects: 'エフェクト',
    cardPool: 'カードプール',
    cardImage: '画像パス',
    
    nameEn: '名前 (英語)',
    nameZh: '名前 (中国語)',
    nameJa: '名前 (日本語)',
    descEn: '説明 (英語)',
    descZh: '説明 (中国語)',
    descJa: '説明 (日本語)',
    
    effectAction: 'アクション',
    effectValue: '値',
    effectTarget: 'ターゲット',
    addEffect: '+ エフェクトを追加',
    
    templates: 'テンプレート',
    filterByPool: 'キャラクター',
    filterByType: 'タイプ',
    allCharacters: '全キャラクター',
    allTypes: 'すべて',
    
    preview: 'プレビュー',
    selectCardToPreview: 'プレビューするカードを選択',
    
    exportMod: 'モッドをエクスポート',
    exportLocation: 'エクスポート先',
    selectFolder: 'フォルダを選択',
    export: 'エクスポート',
    exportedTo: 'エクスポート先:',
    
    developer: '開発者',
    devMode: '開発モード',
    cancel: 'キャンセル',
    confirm: '確認',
    character: 'キャラクター',
    type: 'タイプ',
  },
};

export function t(locale: Locale): Translations {
  return translations[locale];
}
