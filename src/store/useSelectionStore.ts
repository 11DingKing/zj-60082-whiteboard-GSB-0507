import { create } from 'zustand';
import { SelectionState, BoundingBox, SmartGuide, Shape } from '../types';
import { getShapesBoundingBox } from '../utils';

interface SelectionStore extends SelectionState {
  selectShape: (id: string, multiple?: boolean) => void;
  deselectShape: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  setIsDragging: (isDragging: boolean, x?: number, y?: number) => void;
  setDragStart: (x: number, y: number) => void;
  
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: (shapes: Shape[]) => void;
  
  startResizing: (handle: string) => void;
  endResizing: () => void;
  
  startRotating: () => void;
  endRotating: () => void;
  
  smartGuides: SmartGuide[];
  setSmartGuides: (guides: SmartGuide[]) => void;
}

const initialState: SelectionState = {
  selectedShapeIds: [],
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  isSelecting: false,
  selectionBox: null,
  isResizing: false,
  resizeHandle: '',
  isRotating: false,
};

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  ...initialState,
  smartGuides: [],

  selectShape: (id, multiple = false) => {
    set((state) => {
      if (multiple) {
        if (state.selectedShapeIds.includes(id)) {
          return {
            selectedShapeIds: state.selectedShapeIds.filter((s) => s !== id),
          };
        }
        return {
          selectedShapeIds: [...state.selectedShapeIds, id],
        };
      }
      return { selectedShapeIds: [id] };
    });
  },

  deselectShape: (id) => {
    set((state) => ({
      selectedShapeIds: state.selectedShapeIds.filter((s) => s !== id),
    }));
  },

  clearSelection: () => {
    set({ selectedShapeIds: [] });
  },

  selectAll: () => {
    // 会在组件中结合 project store 调用
  },

  setIsDragging: (isDragging, x, y) => {
    set((state) => ({
      isDragging,
      dragStartX: x !== undefined ? x : state.dragStartX,
      dragStartY: y !== undefined ? y : state.dragStartY,
    }));
  },

  setDragStart: (x, y) => {
    set({ dragStartX: x, dragStartY: y });
  },

  startSelection: (x, y) => {
    set({
      isSelecting: true,
      selectionBox: { x, y, width: 0, height: 0 },
    });
  },

  updateSelection: (x, y) => {
    const { selectionBox } = get();
    if (!selectionBox) return;
    
    set({
      selectionBox: {
        x: Math.min(selectionBox.x, x),
        y: Math.min(selectionBox.y, y),
        width: Math.abs(x - selectionBox.x),
        height: Math.abs(y - selectionBox.y),
      },
    });
  },

  endSelection: (shapes) => {
    const { selectionBox } = get();
    if (!selectionBox) {
      set({ isSelecting: false });
      return;
    }
    
    const selectedIds: string[] = [];
    
    shapes.forEach((shape) => {
      const shapeBox = {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      };
      
      const centerX = shape.x + shape.width / 2;
      const centerY = shape.y + shape.height / 2;
      
      const isCenterInBox =
        centerX >= selectionBox.x &&
        centerX <= selectionBox.x + selectionBox.width &&
        centerY >= selectionBox.y &&
        centerY <= selectionBox.y + selectionBox.height;
      
      const isBoxOverlapping = !(
        shapeBox.x + shapeBox.width < selectionBox.x ||
        selectionBox.x + selectionBox.width < shapeBox.x ||
        shapeBox.y + shapeBox.height < selectionBox.y ||
        selectionBox.y + selectionBox.height < shapeBox.y
      );
      
      if (isCenterInBox || (isBoxOverlapping && shape.type === 'group')) {
        selectedIds.push(shape.id);
      }
    });
    
    set({
      isSelecting: false,
      selectionBox: null,
      selectedShapeIds: selectedIds,
    });
  },

  startResizing: (handle) => {
    set({ isResizing: true, resizeHandle: handle });
  },

  endResizing: () => {
    set({ isResizing: false, resizeHandle: '' });
  },

  startRotating: () => {
    set({ isRotating: true });
  },

  endRotating: () => {
    set({ isRotating: false });
  },

  setSmartGuides: (guides) => {
    set({ smartGuides: guides });
  },
}));
