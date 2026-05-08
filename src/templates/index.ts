import { Shape, Point, ArrowShape, LineShape, TextShape, RectangleShape, BorderStyle } from '../types';
import { generateId } from '../utils';
import flowchartTemplates from './flowchart.json';
import swimlaneTemplates from './swimlane.json';
import sequenceTemplates from './sequence.json';
import orgTemplates from './org.json';

export type TemplateCategory = 'flowchart' | 'swimlane' | 'sequence' | 'org';

export interface TemplateShapeData {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  cornerRadius?: number;
  points?: Point[];
  arrowHeadLength?: number;
}

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  shapes: TemplateShapeData[];
}

export const CATEGORIES: { key: TemplateCategory; label: string; icon: string }[] = [
  { key: 'flowchart', label: '流程图', icon: '📋' },
  { key: 'swimlane', label: '泳道图', icon: '🏊' },
  { key: 'sequence', label: '时序图', icon: '↔️' },
  { key: 'org', label: '组织架构图', icon: '🏗️' },
];

const allTemplates: Template[] = [
  ...flowchartTemplates,
  ...swimlaneTemplates,
  ...sequenceTemplates,
  ...orgTemplates,
] as Template[];

export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return allTemplates.filter((t) => t.category === category);
}

export function getAllTemplates(): Template[] {
  return allTemplates;
}

const defaultStyle: { fillColor: string; strokeColor: string; strokeWidth: number; strokeStyle: BorderStyle; opacity: number } = {
  fillColor: '#1a1a2e',
  strokeColor: '#e94560',
  strokeWidth: 2,
  strokeStyle: 'solid',
  opacity: 1,
};

const laneStyle: { fillColor: string; strokeColor: string; strokeWidth: number; strokeStyle: BorderStyle; opacity: number } = {
  fillColor: '#0f3460',
  strokeColor: '#e94560',
  strokeWidth: 1,
  strokeStyle: 'solid',
  opacity: 0.5,
};

const lineStyle: { fillColor: string; strokeColor: string; strokeWidth: number; strokeStyle: BorderStyle; opacity: number } = {
  fillColor: 'transparent',
  strokeColor: '#909090',
  strokeWidth: 1,
  strokeStyle: 'dashed',
  opacity: 0.6,
};

const textStyle: { fillColor: string; strokeColor: string; strokeWidth: number; strokeStyle: BorderStyle; opacity: number } = {
  fillColor: 'transparent',
  strokeColor: 'transparent',
  strokeWidth: 0,
  strokeStyle: 'solid',
  opacity: 1,
};

function isLaneShape(data: TemplateShapeData, category: TemplateCategory): boolean {
  if (category !== 'swimlane') return false;
  return data.cornerRadius === 0 && data.width >= 400 && data.height <= 100;
}

function isTimelineShape(data: TemplateShapeData, category: TemplateCategory): boolean {
  if (category !== 'sequence') return false;
  return (data.type === 'line' && data.width === 0 && data.height >= 100);
}

export function templateToShapes(template: Template, center: Point): Shape[] {
  const shapesData = template.shapes;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of shapesData) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.width);
    maxY = Math.max(maxY, s.y + s.height);
  }

  const templateCenterX = (minX + maxX) / 2;
  const templateCenterY = (minY + maxY) / 2;
  const offsetX = center.x - templateCenterX;
  const offsetY = center.y - templateCenterY;

  const shapes: Shape[] = [];
  const idMap = new Map<string, string>();

  for (const data of shapesData) {
    const newId = generateId();
    const oldId = `${data.type}-${data.x}-${data.y}`;
    idMap.set(oldId, newId);

    const x = data.x + offsetX;
    const y = data.y + offsetY;

    const isLane = isLaneShape(data, template.category);
    const isTimeline = isTimelineShape(data, template.category);
    const isTextOnly = data.type === 'text' || (data.text && data.width <= 100 && data.height <= 30 && template.category === 'sequence');

    let style = defaultStyle;
    if (isLane) style = laneStyle;
    else if (isTimeline) style = lineStyle;
    else if (isTextOnly) style = textStyle;

    const base = {
      id: newId,
      x,
      y,
      width: data.width || 1,
      height: data.height || 1,
      rotation: 0,
      style,
      visible: true,
      locked: false,
      zIndex: shapes.length,
      name: data.type,
      groupId: undefined,
    };

    if (data.type === 'arrow') {
      const pts = (data.points || [{ x, y }, { x: x + data.width, y: y + data.height }]).map(
        (p) => ({ x: p.x + offsetX, y: p.y + offsetY })
      );
      shapes.push({
        ...base,
        type: 'arrow',
        points: pts,
        arrowHeadLength: data.arrowHeadLength || 10,
      } as ArrowShape);
    } else if (data.type === 'line') {
      const pts = (data.points || [{ x, y }, { x: x + data.width, y: y + data.height }]).map(
        (p) => ({ x: p.x + offsetX, y: p.y + offsetY })
      );
      shapes.push({
        ...base,
        type: 'line',
        points: pts,
      } as LineShape);
    } else if (data.type === 'text' || isTextOnly) {
      shapes.push({
        ...base,
        type: 'text',
        text: data.text || '',
        fontSize: 14,
        fontFamily: '-apple-system, sans-serif',
        textAlign: 'center' as CanvasTextAlign,
        style: isTextOnly ? textStyle : style,
      } as TextShape);
    } else if (data.type === 'rectangle') {
      shapes.push({
        ...base,
        type: 'rectangle',
        cornerRadius: data.cornerRadius || 0,
        style: isLane ? laneStyle : (data.text ? { ...defaultStyle, fillColor: '#16213e' } : defaultStyle),
      } as RectangleShape);
    } else if (data.type === 'circle') {
      shapes.push({ ...base, type: 'circle' } as Shape);
    } else if (data.type === 'ellipse') {
      shapes.push({ ...base, type: 'ellipse' } as Shape);
    } else if (data.type === 'triangle') {
      shapes.push({ ...base, type: 'triangle' } as Shape);
    } else if (data.type === 'diamond') {
      shapes.push({ ...base, type: 'diamond' } as Shape);
    } else {
      shapes.push({
        ...base,
        type: 'rectangle',
        cornerRadius: data.cornerRadius || 0,
      } as RectangleShape);
    }
  }

  return shapes;
}
