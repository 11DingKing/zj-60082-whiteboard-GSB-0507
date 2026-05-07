import { create } from 'zustand';
import { CanvasState } from '../types';

interface CanvasStore extends CanvasState {
  setOffset: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  resetView: () => void;
  zoomTo: (centerX: number, centerY: number, targetZoom: number) => void;
  panBy: (dx: number, dy: number) => void;
  setShowGrid: (show: boolean) => void;
}

const initialState: CanvasState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  minZoom: 0.1,
  maxZoom: 5,
  showGrid: true,
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...initialState,

  setOffset: (x, y) => {
    set({ offsetX: x, offsetY: y });
  },

  setZoom: (zoom) => {
    const { minZoom, maxZoom } = get();
    const clampedZoom = Math.min(Math.max(zoom, minZoom), maxZoom);
    set({ zoom: clampedZoom });
  },

  resetView: () => {
    set({ offsetX: 0, offsetY: 0, zoom: 1 });
  },

  zoomTo: (centerX, centerY, targetZoom) => {
    const { zoom, minZoom, maxZoom, offsetX, offsetY } = get();
    const clampedZoom = Math.min(Math.max(targetZoom, minZoom), maxZoom);
    
    if (clampedZoom === zoom) return;
    
    const scaleFactor = clampedZoom / zoom;
    const newOffsetX = centerX - (centerX - offsetX) * scaleFactor;
    const newOffsetY = centerY - (centerY - offsetY) * scaleFactor;
    
    set({ zoom: clampedZoom, offsetX: newOffsetX, offsetY: newOffsetY });
  },

  panBy: (dx, dy) => {
    const { offsetX, offsetY } = get();
    set({ offsetX: offsetX + dx, offsetY: offsetY + dy });
  },

  setShowGrid: (show) => {
    set({ showGrid: show });
  },
}));
