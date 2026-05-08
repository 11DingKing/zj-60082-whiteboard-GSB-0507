export type ToolType =
  | "select"
  | "rectangle"
  | "circle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "line"
  | "arrow"
  | "pen"
  | "text"
  | "connector";

export type BorderStyle = "solid" | "dashed" | "dotted";

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeStyle {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: BorderStyle;
  opacity: number;
}

export interface BaseShape {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  style: ShapeStyle;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  name: string;
  groupId?: string;
}

export interface RectangleShape extends BaseShape {
  type: "rectangle";
  cornerRadius: number;
}

export interface CircleShape extends BaseShape {
  type: "circle";
}

export interface EllipseShape extends BaseShape {
  type: "ellipse";
}

export interface TriangleShape extends BaseShape {
  type: "triangle";
}

export interface DiamondShape extends BaseShape {
  type: "diamond";
}

export interface LineShape extends BaseShape {
  type: "line";
  points: Point[];
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  points: Point[];
  arrowHeadLength: number;
}

export interface PenShape extends BaseShape {
  type: "pen";
  points: Point[];
  pressure: number[];
}

export interface TextShape extends BaseShape {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: CanvasTextAlign;
}

export interface ConnectorShape extends BaseShape {
  type: "connector";
  startShapeId: string;
  startPosition: Point;
  endShapeId?: string;
  endPosition: Point;
  controlPoints: Point[];
}

export interface GroupShape extends BaseShape {
  type: "group";
  children: string[];
}

export type Shape =
  | RectangleShape
  | CircleShape
  | EllipseShape
  | TriangleShape
  | DiamondShape
  | LineShape
  | ArrowShape
  | PenShape
  | TextShape
  | ConnectorShape
  | GroupShape;

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface CanvasState {
  offsetX: number;
  offsetY: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  showGrid: boolean;
}

export interface ToolState {
  currentTool: ToolType;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: BorderStyle;
  opacity: number;
  fontSize: number;
  cornerRadius: number;
}

export interface SelectionState {
  selectedShapeIds: string[];
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  isSelecting: boolean;
  selectionBox: BoundingBox | null;
  isResizing: boolean;
  resizeHandle: string;
  isRotating: boolean;
}

export interface DrawingState {
  isDrawing: boolean;
  drawingShapeId: string | null;
  startPoint: Point;
  currentPoint: Point;
  penPoints: Point[];
}

export interface HistoryState {
  past: string[];
  future: string[];
  maxHistory: number;
}

export interface UIState {
  leftPanelCollapsed: boolean;
  leftPanelTab: "projects" | "templates";
  rightPanelTab: "layers" | "properties";
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
  } | null;
  modals: {
    newProject: boolean;
    renameProject: boolean;
    deleteProject: boolean;
    export: boolean;
  };
}

export interface SmartGuide {
  type: "horizontal" | "vertical";
  position: number;
  category?: "edge" | "center" | "spacing";
}

export interface MouseState {
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
  isDown: boolean;
  isMiddleDown: boolean;
  isRightDown: boolean;
  ctrlPressed: boolean;
  shiftPressed: boolean;
  altPressed: boolean;
  spacePressed: boolean;
}
