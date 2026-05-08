import flowcharts from './flowcharts.json';
import swimlanes from './swimlanes.json';
import sequences from './sequences.json';
import orgcharts from './orgcharts.json';
import { Shape } from '../types';

export interface TemplateShape {
  type: Shape['type'];
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
  style: Shape['style'];
}

export interface Template {
  id: string;
  name: string;
  icon: string;
  shapes: TemplateShape[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  templates: Template[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'flowchart',
    name: '流程图',
    icon: '📊',
    templates: flowcharts as Template[],
  },
  {
    id: 'swimlane',
    name: '泳道图',
    icon: '📋',
    templates: swimlanes as Template[],
  },
  {
    id: 'sequence',
    name: '时序图',
    icon: '⏱️',
    templates: sequences as Template[],
  },
  {
    id: 'orgchart',
    name: '组织架构图',
    icon: '🏢',
    templates: orgcharts as Template[],
  },
];
