import { create } from 'zustand';
import { ToolState, ToolType, BorderStyle } from '../types';

interface ToolStore extends ToolState {
  setCurrentTool: (tool: ToolType) => void;
  setFillColor: (color: string) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeStyle: (style: BorderStyle) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setCornerRadius: (radius: number) => void;
}

const initialState: ToolState = {
  currentTool: 'select',
  fillColor: 'rgba(255, 255, 255, 0)',
  strokeColor: '#e0e0e0',
  strokeWidth: 2,
  strokeStyle: 'solid',
  opacity: 1,
  fontSize: 16,
  cornerRadius: 0,
};

export const useToolStore = create<ToolStore>((set) => ({
  ...initialState,

  setCurrentTool: (tool) => {
    set({ currentTool: tool });
  },

  setFillColor: (color) => {
    set({ fillColor: color });
  },

  setStrokeColor: (color) => {
    set({ strokeColor: color });
  },

  setStrokeWidth: (width) => {
    set({ strokeWidth: Math.max(0, width) });
  },

  setStrokeStyle: (style) => {
    set({ strokeStyle: style });
  },

  setOpacity: (opacity) => {
    set({ opacity: Math.min(Math.max(opacity, 0), 1) });
  },

  setFontSize: (size) => {
    set({ fontSize: Math.max(8, size) });
  },

  setCornerRadius: (radius) => {
    set({ cornerRadius: Math.max(0, radius) });
  },
}));
