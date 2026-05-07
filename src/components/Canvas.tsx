import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CanvasRenderer } from '../canvas/renderer';
import {
  Shape,
  Point,
  ToolType,
  BorderStyle,
  BoundingBox,
  TextShape,
  PenShape,
  ArrowShape,
  LineShape,
} from '../types';
import {
  generateId,
  isPointInRect,
  doRectsOverlap,
  getShapesBoundingBox,
  roundToStep,
  simplifyPath,
} from '../utils';
import {
  useCanvasStore,
  useToolStore,
  useProjectStore,
  useSelectionStore,
  useHistoryStore,
} from '../store';

interface CanvasProps {
  onTextEdit?: (shape: TextShape) => void;
}

const Canvas: React.FC<CanvasProps> = ({ onTextEdit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [mouseState, setMouseState] = useState({
    isDown: false,
    isMiddleDown: false,
    isRightDown: false,
    ctrlPressed: false,
    shiftPressed: false,
    altPressed: false,
    spacePressed: false,
  });
  
  const [drawingState, setDrawingState] = useState<{
    isDrawing: boolean;
    drawingShape: Shape | null;
    startPoint: Point;
    currentPoint: Point;
    penPoints: Point[];
  }>({
    isDrawing: false,
    drawingShape: null,
    startPoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    penPoints: [],
  });

  const { offsetX, offsetY, zoom, showGrid, panBy, zoomTo, setShowGrid } = useCanvasStore();
  const {
    currentTool,
    fillColor,
    strokeColor,
    strokeWidth,
    strokeStyle,
    opacity,
    fontSize,
    cornerRadius,
  } = useToolStore();
  const {
    shapes,
    getShape,
    getShapes,
    getSortedShapes,
    getNextZIndex,
    getShapeName,
    addShape,
    updateShape,
    removeShapes,
    duplicateShapes,
    groupShapes,
    ungroupShape,
    moveToTop,
    moveToBottom,
    moveUp,
    moveDown,
    updateConnectors,
  } = useProjectStore();
  const {
    selectedShapeIds,
    selectShape,
    clearSelection,
    setIsDragging,
    setDragStart,
    startSelection,
    updateSelection,
    endSelection,
    startResizing,
    endResizing,
    startRotating,
    endRotating,
    isDragging,
    isSelecting,
    selectionBox,
    isResizing,
    isRotating,
    dragStartX,
    dragStartY,
    resizeHandle,
    smartGuides,
    setSmartGuides,
  } = useSelectionStore();
  const { saveState, canUndo, canRedo, undo, redo } = useHistoryStore();

  const [dragOffsets, setDragOffsets] = useState<Map<string, Point>>(new Map());
  const [originalShapes, setOriginalShapes] = useState<Shape[]>([]);
  const [textEditorShape, setTextEditorShape] = useState<TextShape | null>(null);
  
  const [rotationState, setRotationState] = useState<{
    isRotating: boolean;
    startAngle: number;
    originalRotations: Map<string, number>;
    centerX: number;
    centerY: number;
  }>({
    isRotating: false,
    startAngle: 0,
    originalRotations: new Map(),
    centerX: 0,
    centerY: 0,
  });

  const initRenderer = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    if (!rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvas);
    }
    
    rendererRef.current.setSize(container.clientWidth, container.clientHeight);
  }, []);

  const getSelectedShapesRotation = useCallback((): number => {
    const selectedShapes = getShapes(selectedShapeIds);
    if (selectedShapes.length === 0) return 0;
    return selectedShapes[0].rotation;
  }, [getShapes, selectedShapeIds]);

  const isPointOnRotateHandle = useCallback((canvasPoint: Point): boolean => {
    const selectedShapes = getShapes(selectedShapeIds);
    if (selectedShapes.length === 0) return false;
    
    const bbox = getShapesBoundingBox(selectedShapes);
    if (!bbox) return false;
    
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    const rotation = getSelectedShapesRotation();
    
    const rotateHandleDistance = 20;
    const handleCanvasY = bbox.y - rotateHandleDistance;
    const handleCanvasX = bbox.x + bbox.width / 2;
    
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const dx = handleCanvasX - centerX;
    const dy = handleCanvasY - centerY;
    const rotatedHandleX = centerX + dx * cos - dy * sin;
    const rotatedHandleY = centerY + dx * sin + dy * cos;
    
    const handleRadius = 5 + 5 / zoom;
    const dist = Math.sqrt(
      Math.pow(canvasPoint.x - rotatedHandleX, 2) +
      Math.pow(canvasPoint.y - rotatedHandleY, 2)
    );
    
    return dist <= handleRadius;
  }, [getShapes, selectedShapeIds, getSelectedShapesRotation, zoom]);

  const render = useCallback(() => {
    if (!rendererRef.current) return;
    
    const renderer = rendererRef.current;
    renderer.setTransform(offsetX, offsetY, zoom);
    renderer.setShowGrid(showGrid);
    renderer.render(getSortedShapes());
    
    if (isSelecting && selectionBox) {
      renderer.drawSelectionBox(selectionBox, false);
    }
    
    if (selectedShapeIds.length > 0) {
      const selectedShapes = getShapes(selectedShapeIds);
      if (selectedShapes.length > 0) {
        const bbox = getShapesBoundingBox(selectedShapes);
        if (bbox) {
          const rotation = getSelectedShapesRotation();
          renderer.drawSelectionBox(bbox, true, rotation);
        }
      }
    }
    
    if (drawingState.isDrawing && drawingState.drawingShape) {
      renderer.render([...getSortedShapes(), drawingState.drawingShape]);
    }
  }, [
    offsetX, offsetY, zoom, showGrid, getSortedShapes,
    isSelecting, selectionBox, selectedShapeIds, getShapes,
    drawingState.isDrawing, drawingState.drawingShape,
    getSelectedShapesRotation,
  ]);

  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    return {
      x: (screenX - offsetX) / zoom,
      y: (screenY - offsetY) / zoom,
    };
  }, [offsetX, offsetY, zoom]);

  const canvasToScreen = useCallback((canvasX: number, canvasY: number): Point => {
    return {
      x: canvasX * zoom + offsetX,
      y: canvasY * zoom + offsetY,
    };
  }, [offsetX, offsetY, zoom]);

  const getShapeAtPoint = useCallback((canvasPoint: Point): Shape | undefined => {
    const sortedShapes = [...shapes]
      .filter((s) => s.visible && !s.locked && s.type !== 'group')
      .sort((a, b) => b.zIndex - a.zIndex);
    
    for (const shape of sortedShapes) {
      const { x, y, width, height } = shape;
      const padding = strokeWidth / zoom + 5;
      
      if (isPointInRect(canvasPoint, {
        x: x - padding,
        y: y - padding,
        width: width + padding * 2,
        height: height + padding * 2,
      })) {
        if (shape.groupId) {
          return shapes.find((s) => s.id === shape.groupId) || shape;
        }
        return shape;
      }
    }
    
    return undefined;
  }, [shapes, strokeWidth, zoom]);

  const createShape = useCallback((tool: ToolType, startPoint: Point, endPoint: Point): Shape => {
    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x) || 1;
    const height = Math.abs(endPoint.y - startPoint.y) || 1;
    
    const style = {
      fillColor,
      strokeColor,
      strokeWidth,
      strokeStyle: strokeStyle as BorderStyle,
      opacity,
    };
    
    const zIndex = getNextZIndex();
    const name = getShapeName(tool);
    
    const baseShape = {
      id: generateId(),
      x,
      y,
      width,
      height,
      rotation: 0,
      style,
      visible: true,
      locked: false,
      zIndex,
      name,
    };
    
    switch (tool) {
      case 'rectangle':
        return { ...baseShape, type: 'rectangle', cornerRadius } as any;
      case 'circle':
        const radius = Math.min(width, height) / 2;
        return {
          ...baseShape,
          type: 'circle',
          x: startPoint.x - radius,
          y: startPoint.y - radius,
          width: radius * 2,
          height: radius * 2,
        } as any;
      case 'ellipse':
        return { ...baseShape, type: 'ellipse' } as any;
      case 'triangle':
        return { ...baseShape, type: 'triangle' } as any;
      case 'diamond':
        return { ...baseShape, type: 'diamond' } as any;
      case 'line':
        return {
          ...baseShape,
          type: 'line',
          points: [startPoint, endPoint],
        } as LineShape;
      case 'arrow':
        return {
          ...baseShape,
          type: 'arrow',
          points: [startPoint, endPoint],
          arrowHeadLength: 15,
        } as ArrowShape;
      case 'pen':
        return {
          ...baseShape,
          type: 'pen',
          points: [startPoint, endPoint],
          pressure: [],
        } as PenShape;
      case 'text':
        return {
          ...baseShape,
          type: 'text',
          text: '',
          fontSize,
          fontFamily: '-apple-system, sans-serif',
          textAlign: 'left' as CanvasTextAlign,
        } as TextShape;
      default:
        return { ...baseShape, type: 'rectangle', cornerRadius: 0 } as any;
    }
  }, [fillColor, strokeColor, strokeWidth, strokeStyle, opacity, fontSize, cornerRadius, getNextZIndex, getShapeName]);

  const updateDrawingShape = useCallback((endPoint: Point) => {
    if (!drawingState.drawingShape) return;
    
    const { drawingShape, startPoint } = drawingState;
    const tool = currentTool;
    
    let updatedShape = { ...drawingShape };
    
    if (tool === 'line' || tool === 'arrow') {
      const lineShape = updatedShape as LineShape | ArrowShape;
      lineShape.points = [startPoint, endPoint];
      lineShape.x = Math.min(startPoint.x, endPoint.x);
      lineShape.y = Math.min(startPoint.y, endPoint.y);
      lineShape.width = Math.abs(endPoint.x - startPoint.x) || 1;
      lineShape.height = Math.abs(endPoint.y - startPoint.y) || 1;
    } else if (tool === 'pen') {
      const penShape = updatedShape as PenShape;
      penShape.points = [...drawingState.penPoints, endPoint];
      
      const xs = penShape.points.map((p) => p.x);
      const ys = penShape.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      
      penShape.x = minX;
      penShape.y = minY;
      penShape.width = maxX - minX || 1;
      penShape.height = maxY - minY || 1;
    } else {
      let x = Math.min(startPoint.x, endPoint.x);
      let y = Math.min(startPoint.y, endPoint.y);
      let width = Math.abs(endPoint.x - startPoint.x);
      let height = Math.abs(endPoint.y - startPoint.y);
      
      if (mouseState.shiftPressed && tool !== 'text') {
        if (tool === 'circle') {
          const size = Math.min(width, height);
          width = size;
          height = size;
          x = startPoint.x < endPoint.x ? startPoint.x : startPoint.x - size;
          y = startPoint.y < endPoint.y ? startPoint.y : startPoint.y - size;
        } else if (tool === 'ellipse') {
          const ratio = width / height;
          if (ratio > 1) {
            height = width;
          } else {
            width = height;
          }
        }
      }
      
      updatedShape.x = x;
      updatedShape.y = y;
      updatedShape.width = width || 1;
      updatedShape.height = height || 1;
    }
    
    setDrawingState((prev) => ({ ...prev, drawingShape: updatedShape, currentPoint: endPoint }));
  }, [drawingState, currentTool, mouseState.shiftPressed]);

  const finishDrawing = useCallback(() => {
    if (!drawingState.drawingShape) return;
    
    let shape = drawingState.drawingShape;
    
    if (shape.type === 'pen') {
      const penShape = shape as PenShape;
      penShape.points = simplifyPath(penShape.points, 2);
    }
    
    if (shape.type === 'text') {
      setTextEditorShape(shape as TextShape);
      if (onTextEdit) {
        onTextEdit(shape as TextShape);
      }
    }
    
    addShape(shape);
    saveState([...shapes, shape]);
    selectShape(shape.id);
    
    setDrawingState({
      isDrawing: false,
      drawingShape: null,
      startPoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      penPoints: [],
    });
  }, [drawingState.drawingShape, addShape, saveState, shapes, selectShape, onTextEdit]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY);
    
    if (e.button === 1 || (e.button === 0 && mouseState.spacePressed)) {
      setMouseState((prev) => ({ ...prev, isMiddleDown: true }));
      setDragStart(screenX, screenY);
      return;
    }
    
    if (e.button === 2) {
      setMouseState((prev) => ({ ...prev, isRightDown: true }));
      return;
    }
    
    if (currentTool === 'select') {
      if (isPointOnRotateHandle(canvasPoint)) {
        const selectedShapes = getShapes(selectedShapeIds);
        if (selectedShapes.length > 0) {
          const bbox = getShapesBoundingBox(selectedShapes);
          if (bbox) {
            const centerX = bbox.x + bbox.width / 2;
            const centerY = bbox.y + bbox.height / 2;
            
            const startAngle = Math.atan2(
              canvasPoint.y - centerY,
              canvasPoint.x - centerX
            );
            
            const originalRotations = new Map<string, number>();
            selectedShapes.forEach((shape) => {
              originalRotations.set(shape.id, shape.rotation);
            });
            
            setRotationState({
              isRotating: true,
              startAngle,
              originalRotations,
              centerX,
              centerY,
            });
            
            setOriginalShapes(selectedShapes.map((s) => ({ ...s })));
          }
        }
        return;
      }
      
      const clickedShape = getShapeAtPoint(canvasPoint);
      
      if (clickedShape) {
        const isMultiSelect = e.ctrlKey || e.metaKey;
        
        if (isMultiSelect) {
          selectShape(clickedShape.id, true);
        } else if (!selectedShapeIds.includes(clickedShape.id)) {
          clearSelection();
          selectShape(clickedShape.id);
        }
        
        setIsDragging(true, canvasPoint.x, canvasPoint.y);
        
        const selectedShapes = getShapes(selectedShapeIds.includes(clickedShape.id) 
          ? selectedShapeIds 
          : [clickedShape.id]);
        
        const offsets = new Map<string, Point>();
        selectedShapes.forEach((shape) => {
          offsets.set(shape.id, {
            x: shape.x - canvasPoint.x,
            y: shape.y - canvasPoint.y,
          });
        });
        
        setDragOffsets(offsets);
        setOriginalShapes(selectedShapes.map((s) => ({ ...s })));
      } else {
        clearSelection();
        startSelection(canvasPoint.x, canvasPoint.y);
      }
    } else {
      const shape = createShape(currentTool, canvasPoint, canvasPoint);
      setDrawingState({
        isDrawing: true,
        drawingShape: shape,
        startPoint: canvasPoint,
        currentPoint: canvasPoint,
        penPoints: [canvasPoint],
      });
    }
  }, [
    mouseState.spacePressed, currentTool, screenToCanvas,
    getShapeAtPoint, selectedShapeIds, getShapes,
    selectShape, clearSelection, setIsDragging, setDragStart,
    startSelection, createShape, isPointOnRotateHandle,
    getShapesBoundingBox, setOriginalShapes,
  ]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPoint = screenToCanvas(screenX, screenY);
    
    if (mouseState.isMiddleDown || (mouseState.spacePressed && e.buttons === 1)) {
      const dx = screenX - dragStartX;
      const dy = screenY - dragStartY;
      panBy(dx, dy);
      setDragStart(screenX, screenY);
      return;
    }
    
    if (isSelecting) {
      updateSelection(canvasPoint.x, canvasPoint.y);
    }
    
    if (rotationState.isRotating) {
      const currentAngle = Math.atan2(
        canvasPoint.y - rotationState.centerY,
        canvasPoint.x - rotationState.centerX
      );
      
      let deltaAngle = currentAngle - rotationState.startAngle;
      let deltaDegrees = (deltaAngle * 180) / Math.PI;
      
      if (mouseState.shiftPressed) {
        deltaDegrees = Math.round(deltaDegrees / 15) * 15;
      }
      
      selectedShapeIds.forEach((id) => {
        const originalRotation = rotationState.originalRotations.get(id);
        if (originalRotation !== undefined) {
          let newRotation = originalRotation + deltaDegrees;
          
          while (newRotation >= 360) newRotation -= 360;
          while (newRotation < 0) newRotation += 360;
          
          updateShape(id, { rotation: newRotation });
        }
      });
    }
    
    if (isDragging && selectedShapeIds.length > 0) {
      const deltaX = canvasPoint.x - dragStartX;
      const deltaY = canvasPoint.y - dragStartY;
      
      selectedShapeIds.forEach((id) => {
        const offset = dragOffsets.get(id);
        if (offset) {
          let newX = canvasPoint.x + offset.x;
          let newY = canvasPoint.y + offset.y;
          
          if (mouseState.shiftPressed) {
            newX = roundToStep(newX, 10);
            newY = roundToStep(newY, 10);
          }
          
          updateShape(id, { x: newX, y: newY });
        }
      });
    }
    
    if (drawingState.isDrawing) {
      updateDrawingShape(canvasPoint);
    }
  }, [
    mouseState.isMiddleDown, mouseState.spacePressed, mouseState.shiftPressed,
    screenToCanvas, dragStartX, dragStartY, panBy, setDragStart,
    isSelecting, updateSelection, isDragging, selectedShapeIds,
    dragOffsets, updateShape, drawingState.isDrawing, updateDrawingShape,
    rotationState,
  ]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (mouseState.isMiddleDown && e.button === 0)) {
      setMouseState((prev) => ({ ...prev, isMiddleDown: false }));
      return;
    }
    
    if (e.button === 2) {
      setMouseState((prev) => ({ ...prev, isRightDown: false }));
      return;
    }
    
    if (rotationState.isRotating) {
      setRotationState({
        isRotating: false,
        startAngle: 0,
        originalRotations: new Map(),
        centerX: 0,
        centerY: 0,
      });
      saveState([...shapes]);
      updateConnectors(selectedShapeIds);
      return;
    }
    
    if (isSelecting) {
      endSelection(shapes.filter((s) => s.visible && !s.locked));
      return;
    }
    
    if (isDragging && selectedShapeIds.length > 0) {
      setIsDragging(false);
      saveState([...shapes]);
      updateConnectors(selectedShapeIds);
      return;
    }
    
    if (drawingState.isDrawing) {
      finishDrawing();
    }
  }, [
    mouseState.isMiddleDown, isSelecting, endSelection, shapes,
    isDragging, selectedShapeIds, setIsDragging, saveState,
    drawingState.isDrawing, finishDrawing, rotationState,
    updateConnectors,
  ]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = zoom + delta;
    
    zoomTo(screenX, screenY, newZoom);
  }, [zoom, zoomTo]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    
    if (e.key === ' ') {
      e.preventDefault();
      setMouseState((prev) => ({ ...prev, spacePressed: true }));
    }
    
    if (e.key === 'Shift') {
      setMouseState((prev) => ({ ...prev, shiftPressed: true }));
    }
    
    if (e.key === 'Control' || e.key === 'Meta') {
      setMouseState((prev) => ({ ...prev, ctrlPressed: true }));
    }
    
    if (ctrlOrMeta && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (canUndo) {
        const prevShapes = undo();
        if (prevShapes !== null) {
          useProjectStore.setState({ shapes: prevShapes });
        }
      }
    }
    
    if (ctrlOrMeta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      if (canRedo) {
        const nextShapes = redo();
        if (nextShapes !== null) {
          useProjectStore.setState({ shapes: nextShapes });
        }
      }
    }
    
    if (ctrlOrMeta && e.key === 'g' && !e.shiftKey) {
      e.preventDefault();
      if (selectedShapeIds.length >= 2) {
        const groupId = groupShapes(selectedShapeIds);
        if (groupId) {
          clearSelection();
          selectShape(groupId);
          saveState([...shapes]);
        }
      }
    }
    
    if (ctrlOrMeta && e.shiftKey && e.key === 'g') {
      e.preventDefault();
      if (selectedShapeIds.length === 1) {
        const shape = getShape(selectedShapeIds[0]);
        if (shape && shape.type === 'group') {
          const childIds = ungroupShape(shape.id);
          clearSelection();
          childIds.forEach((id) => selectShape(id, true));
          saveState([...shapes]);
        }
      }
    }
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedShapeIds.length > 0 && !textEditorShape) {
        e.preventDefault();
        removeShapes(selectedShapeIds);
        clearSelection();
        saveState([...shapes.filter((s) => !selectedShapeIds.includes(s.id))]);
      }
    }
    
    if (e.key === 'Escape') {
      clearSelection();
      setDrawingState({
        isDrawing: false,
        drawingShape: null,
        startPoint: { x: 0, y: 0 },
        currentPoint: { x: 0, y: 0 },
        penPoints: [],
      });
    }
    
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (selectedShapeIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        
        switch (e.key) {
          case 'ArrowUp': dy = -step; break;
          case 'ArrowDown': dy = step; break;
          case 'ArrowLeft': dx = -step; break;
          case 'ArrowRight': dx = step; break;
        }
        
        selectedShapeIds.forEach((id) => {
          const shape = getShape(id);
          if (shape) {
            updateShape(id, { x: shape.x + dx, y: shape.y + dy });
          }
        });
      }
    }
    
    if (ctrlOrMeta && e.key === 'a') {
      e.preventDefault();
      const visibleUnlockedShapes = shapes.filter((s) => s.visible && !s.locked);
      visibleUnlockedShapes.forEach((s) => selectShape(s.id, true));
    }
    
    if (ctrlOrMeta && e.key === 'd') {
      e.preventDefault();
      if (selectedShapeIds.length > 0) {
        const newIds = duplicateShapes(selectedShapeIds);
        clearSelection();
        newIds.forEach((id) => selectShape(id, true));
        saveState([...shapes]);
      }
    }
  }, [
    canUndo, canRedo, undo, redo,
    selectedShapeIds, groupShapes, ungroupShape,
    clearSelection, selectShape, saveState, shapes,
    getShape, updateShape, removeShapes, duplicateShapes,
    textEditorShape,
  ]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') {
      setMouseState((prev) => ({ ...prev, spacePressed: false }));
    }
    
    if (e.key === 'Shift') {
      setMouseState((prev) => ({ ...prev, shiftPressed: false }));
    }
    
    if (e.key === 'Control' || e.key === 'Meta') {
      setMouseState((prev) => ({ ...prev, ctrlPressed: false }));
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleResize = useCallback(() => {
    initRenderer();
    render();
  }, [initRenderer, render]);

  useEffect(() => {
    initRenderer();
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [initRenderer, handleResize, handleKeyDown, handleKeyUp]);

  useEffect(() => {
    render();
  }, [render]);

  const handleTextConfirm = useCallback((text: string) => {
    if (textEditorShape) {
      if (text.trim()) {
        updateShape(textEditorShape.id, { text });
        saveState([...shapes]);
      } else {
        removeShapes([textEditorShape.id]);
        clearSelection();
      }
    }
    setTextEditorShape(null);
  }, [textEditorShape, updateShape, removeShapes, clearSelection, saveState, shapes]);

  const handleTextCancel = useCallback(() => {
    if (textEditorShape) {
      removeShapes([textEditorShape.id]);
      clearSelection();
    }
    setTextEditorShape(null);
  }, [textEditorShape, removeShapes, clearSelection]);

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{
          cursor: mouseState.spacePressed ? 'grab' : 
                  isDragging ? 'grabbing' : 
                  currentTool === 'select' ? 'default' : 'crosshair',
        }}
      />
      
      {textEditorShape && (
        <TextEditor
          shape={textEditorShape}
          screenToCanvas={screenToCanvas}
          canvasToScreen={canvasToScreen}
          onConfirm={handleTextConfirm}
          onCancel={handleTextCancel}
        />
      )}
    </div>
  );
};

interface TextEditorProps {
  shape: TextShape;
  screenToCanvas: (x: number, y: number) => Point;
  canvasToScreen: (x: number, y: number) => Point;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

const TextEditor: React.FC<TextEditorProps> = ({
  shape,
  canvasToScreen,
  onConfirm,
  onCancel,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  
  const screenPos = canvasToScreen(shape.x, shape.y);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);
  
  const handleBlur = () => {
    onConfirm(text);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };
  
  return (
    <textarea
      ref={inputRef}
      className="text-editor"
      style={{
        left: screenPos.x,
        top: screenPos.y,
        minWidth: 100,
        minHeight: shape.fontSize * 1.5,
        fontSize: shape.fontSize,
        color: shape.style.strokeColor,
        backgroundColor: 'transparent',
      }}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="输入文本..."
    />
  );
};

export default Canvas;
