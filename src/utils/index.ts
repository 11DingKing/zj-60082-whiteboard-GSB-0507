import { Point, BoundingBox, Shape } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const degToRad = (deg: number): number => {
  return (deg * Math.PI) / 180;
};

export const radToDeg = (rad: number): number => {
  return (rad * 180) / Math.PI;
};

export const roundToStep = (value: number, step: number): number => {
  return Math.round(value / step) * step;
};

export const getDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getMidpoint = (p1: Point, p2: Point): Point => {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
};

export const getAngle = (p1: Point, p2: Point): number => {
  return radToDeg(Math.atan2(p2.y - p1.y, p2.x - p1.x));
};

export const rotatePoint = (point: Point, center: Point, angle: number): Point => {
  const rad = degToRad(angle);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
};

export const rotateBoundingBox = (bbox: BoundingBox, angle: number): BoundingBox => {
  const center = {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  };
  
  const corners = [
    { x: bbox.x, y: bbox.y },
    { x: bbox.x + bbox.width, y: bbox.y },
    { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    { x: bbox.x, y: bbox.y + bbox.height },
  ];
  
  const rotatedCorners = corners.map(c => rotatePoint(c, center, angle));
  
  const xs = rotatedCorners.map(c => c.x);
  const ys = rotatedCorners.map(c => c.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const isPointInRect = (point: Point, rect: BoundingBox): boolean => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
};

export const isPointInCircle = (point: Point, center: Point, radius: number): boolean => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return dx * dx + dy * dy <= radius * radius;
};

export const doRectsOverlap = (r1: BoundingBox, r2: BoundingBox): boolean => {
  return !(
    r1.x + r1.width < r2.x ||
    r2.x + r2.width < r1.x ||
    r1.y + r1.height < r2.y ||
    r2.y + r2.height < r1.y
  );
};

export const unionRects = (r1: BoundingBox, r2: BoundingBox): BoundingBox => {
  const x = Math.min(r1.x, r2.x);
  const y = Math.min(r1.y, r2.y);
  const width = Math.max(r1.x + r1.width, r2.x + r2.width) - x;
  const height = Math.max(r1.y + r1.height, r2.y + r2.height) - y;
  return { x, y, width, height };
};

export const getShapesBoundingBox = (shapes: Shape[]): BoundingBox | null => {
  if (shapes.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  shapes.forEach(shape => {
    const bbox = rotateBoundingBox(
      { x: shape.x, y: shape.y, width: shape.width, height: shape.height },
      shape.rotation
    );
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const simplifyPath = (points: Point[], tolerance: number = 2): Point[] => {
  if (points.length <= 2) return [...points];
  
  const result: Point[] = [];
  let prevPoint = points[0];
  result.push(prevPoint);
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = getDistance(prevPoint, points[i]);
    if (dist >= tolerance) {
      result.push(points[i]);
      prevPoint = points[i];
    }
  }
  
  result.push(points[points.length - 1]);
  return result;
};

export const getBezierControlPoints = (points: Point[]): Point[][] => {
  if (points.length < 2) return [];
  
  const result: Point[][] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i > 0 ? i - 1 : 0];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i < points.length - 2 ? i + 2 : i + 1];
    
    const c1 = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    };
    const c2 = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    };
    
    result.push([c1, c2]);
  }
  
  return result;
};

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const getShapeTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    rectangle: '⬜',
    circle: '⭕',
    ellipse: '⭕',
    triangle: '△',
    diamond: '◆',
    line: '━',
    arrow: '➤',
    pen: '✎',
    text: 'T',
    connector: '⤳',
    group: '📦',
  };
  return icons[type] || '?';
};

export const formatNumber = (num: number, decimals: number = 0): string => {
  return num.toFixed(decimals);
};
