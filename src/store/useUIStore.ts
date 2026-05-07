import { create } from 'zustand';
import { UIState } from '../types';

interface UIStore extends UIState {
  toggleLeftPanel: () => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  
  setRightPanelTab: (tab: 'layers' | 'properties') => void;
  
  showContextMenu: (x: number, y: number) => void;
  hideContextMenu: () => void;
  
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
}

const initialState: UIState = {
  leftPanelCollapsed: false,
  rightPanelTab: 'layers',
  contextMenu: null,
  modals: {
    newProject: false,
    renameProject: false,
    deleteProject: false,
    export: false,
  },
};

export const useUIStore = create<UIStore>((set) => ({
  ...initialState,

  toggleLeftPanel: () => {
    set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed }));
  },

  setLeftPanelCollapsed: (collapsed) => {
    set({ leftPanelCollapsed: collapsed });
  },

  setRightPanelTab: (tab) => {
    set({ rightPanelTab: tab });
  },

  showContextMenu: (x, y) => {
    set({ contextMenu: { visible: true, x, y } });
  },

  hideContextMenu: () => {
    set({ contextMenu: null });
  },

  openModal: (modal) => {
    set((state) => ({
      modals: { ...state.modals, [modal]: true },
      contextMenu: null,
    }));
  },

  closeModal: (modal) => {
    set((state) => ({
      modals: { ...state.modals, [modal]: false },
    }));
  },

  closeAllModals: () => {
    set((state) => ({
      modals: {
        newProject: false,
        renameProject: false,
        deleteProject: false,
        export: false,
      },
    }));
  },
}));
