import { create } from 'zustand';
import { HistoryState, Shape } from '../types';
import { deepClone } from '../utils';

interface HistoryStore extends HistoryState {
  saveState: (shapes: Shape[]) => void;
  undo: () => Shape[] | null;
  redo: () => Shape[] | null;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

const initialState: HistoryState = {
  past: [],
  future: [],
  maxHistory: 100,
};

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  ...initialState,
  canUndo: false,
  canRedo: false,

  saveState: (shapes) => {
    const { past, maxHistory, future } = get();
    const serialized = JSON.stringify(shapes);
    
    if (past.length > 0 && past[past.length - 1] === serialized) {
      return;
    }
    
    const newPast = [...past, serialized];
    if (newPast.length > maxHistory) {
      newPast.shift();
    }
    
    set({
      past: newPast,
      future: [],
      canUndo: true,
      canRedo: false,
    });
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;
    
    const currentState = past[past.length - 1];
    const newPast = past.slice(0, -1);
    
    set({
      past: newPast,
      future: [currentState, ...future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });
    
    if (newPast.length > 0) {
      return JSON.parse(newPast[newPast.length - 1]) as Shape[];
    }
    
    return [];
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;
    
    const nextState = future[0];
    const newFuture = future.slice(1);
    
    set({
      past: [...past, nextState],
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
    
    return JSON.parse(nextState) as Shape[];
  },

  clearHistory: () => {
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },
}));
