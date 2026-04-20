import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  ModProject, 
  Card, 
  Relic, 
  CharacterConfig,
  VanillaCardTemplate,
  createEmptyProject,
  createDefaultCard,
  createDefaultRelic,
  createCardFromTemplate
} from '../types';
import { saveProject as saveProjectFile, loadProject as loadProjectFile } from '../services/fileService';
import { Locale } from '../i18n';

interface AppState {
  // Current project
  project: ModProject;
  isDirty: boolean;
  currentFilePath: string | null;
  
  // UI state
  selectedTab: 'cards' | 'relics' | 'character' | 'export';
  selectedCardId: string | null;
  selectedRelicId: string | null;
  isDeveloperMode: boolean;
  
  // Recent projects
  recentProjects: { name: string; path: string }[];
  
  // Actions
  setProject: (project: ModProject) => void;
  newProject: (name?: string, author?: string) => void;
  loadProject: (project: ModProject, filePath: string) => void;
  saveProject: () => Promise<void>;
  openProject: () => Promise<void>;
  markDirty: () => void;
  markClean: () => void;
  
  // Card actions
  addCard: () => void;
  addCardFromTemplate: (template: VanillaCardTemplate) => void;
  updateCard: (id: string, card: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  selectCard: (id: string | null) => void;
  
  // Relic actions
  addRelic: () => void;
  updateRelic: (id: string, relic: Partial<Relic>) => void;
  deleteRelic: (id: string) => void;
  selectRelic: (id: string | null) => void;
  
  // Character actions
  updateCharacter: (character: Partial<CharacterConfig>) => void;
  
  // UI actions
  setSelectedTab: (tab: 'cards' | 'relics' | 'character' | 'export') => void;
  toggleDeveloperMode: () => void;
  setLocale: (locale: Locale) => void;
  
  // Recent projects
  addRecentProject: (name: string, path: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      project: createEmptyProject(),
      isDirty: false,
      currentFilePath: null,
      selectedTab: 'cards',
      selectedCardId: null,
      selectedRelicId: null,
      isDeveloperMode: false,
      recentProjects: [],
      
      // Project actions
      setProject: (project) => set({ project, isDirty: false }),
      
      newProject: (name = 'MyMod', author = 'Anonymous') => {
        const project = createEmptyProject(name, author);
        set({ 
          project, 
          isDirty: false, 
          currentFilePath: null,
          selectedCardId: null,
          selectedRelicId: null,
          selectedTab: 'cards'
        });
      },
      
      loadProject: (project, filePath) => {
        set({ 
          project, 
          isDirty: false, 
          currentFilePath: filePath,
          selectedCardId: project.cards[0]?.id || null,
          selectedRelicId: project.relics[0]?.id || null,
        });
      },
      
      markDirty: () => set({ isDirty: true }),
      markClean: () => set({ isDirty: false }),
      
      saveProject: async () => {
        const state = useStore.getState();
        const filePath = await saveProjectFile(state.project, state.currentFilePath || undefined);
        if (filePath) {
          set({ currentFilePath: filePath, isDirty: false });
          useStore.getState().addRecentProject(state.project.name, filePath);
        }
      },
      
      openProject: async () => {
        const result = await loadProjectFile();
        if (result) {
          set({ 
            project: result.project, 
            isDirty: false, 
            currentFilePath: result.filePath,
            selectedCardId: result.project.cards[0]?.id || null,
            selectedRelicId: result.project.relics[0]?.id || null,
          });
          useStore.getState().addRecentProject(result.project.name, result.filePath);
        }
      },
      
      // Card actions
      addCard: () => {
        const newCard = createDefaultCard();
        set((state) => ({
          project: {
            ...state.project,
            cards: [...state.project.cards, newCard],
            updatedAt: new Date().toISOString(),
          },
          selectedCardId: newCard.id,
          isDirty: true,
        }));
      },
      
      addCardFromTemplate: (template) => {
        const newCard = createCardFromTemplate(template);
        set((state) => ({
          project: {
            ...state.project,
            cards: [...state.project.cards, newCard],
            updatedAt: new Date().toISOString(),
          },
          selectedCardId: newCard.id,
          isDirty: true,
        }));
      },
      
      updateCard: (id, updates) => {
        set((state) => ({
          project: {
            ...state.project,
            cards: state.project.cards.map((card) =>
              card.id === id ? { ...card, ...updates } : card
            ),
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        }));
      },
      
      deleteCard: (id) => {
        set((state) => ({
          project: {
            ...state.project,
            cards: state.project.cards.filter((card) => card.id !== id),
            updatedAt: new Date().toISOString(),
          },
          selectedCardId: state.selectedCardId === id ? null : state.selectedCardId,
          isDirty: true,
        }));
      },
      
      selectCard: (id) => set({ selectedCardId: id }),
      
      // Relic actions
      addRelic: () => {
        const newRelic = createDefaultRelic();
        set((state) => ({
          project: {
            ...state.project,
            relics: [...state.project.relics, newRelic],
            updatedAt: new Date().toISOString(),
          },
          selectedRelicId: newRelic.id,
          isDirty: true,
        }));
      },
      
      updateRelic: (id, updates) => {
        set((state) => ({
          project: {
            ...state.project,
            relics: state.project.relics.map((relic) =>
              relic.id === id ? { ...relic, ...updates } : relic
            ),
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        }));
      },
      
      deleteRelic: (id) => {
        set((state) => ({
          project: {
            ...state.project,
            relics: state.project.relics.filter((relic) => relic.id !== id),
            updatedAt: new Date().toISOString(),
          },
          selectedRelicId: state.selectedRelicId === id ? null : state.selectedRelicId,
          isDirty: true,
        }));
      },
      
      selectRelic: (id) => set({ selectedRelicId: id }),
      
      // Character actions
      updateCharacter: (character) => {
        set((state) => ({
          project: {
            ...state.project,
            character: {
              ...state.project.character,
              ...character,
            } as CharacterConfig,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        }));
      },
      
      // UI actions
      setSelectedTab: (tab) => set({ selectedTab: tab }),
      toggleDeveloperMode: () => set((state) => ({ isDeveloperMode: !state.isDeveloperMode })),
      setLocale: (locale) => set((state) => ({ 
        project: { ...state.project, locale }
      })),
      
      // Recent projects
      addRecentProject: (name, path) => {
        set((state) => ({
          recentProjects: [
            { name, path },
            ...state.recentProjects.filter((p) => p.path !== path),
          ].slice(0, 5),
        }));
      },
    }),
    {
      name: 'sts2-mod-visualizer',
      partialize: (state) => ({ 
        recentProjects: state.recentProjects,
        isDeveloperMode: state.isDeveloperMode,
      }),
    }
  )
);
