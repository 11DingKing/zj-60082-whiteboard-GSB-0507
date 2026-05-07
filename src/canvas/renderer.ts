import {
  Shape,
  RectangleShape,
  CircleShape,
  EllipseShape,
  TriangleShape,
  DiamondShape,
  LineShape,
  ArrowShape,
  PenShape,
  TextShape,
  ConnectorShape,
  Point,
  BoundingBox,
} from '../types';
import { degToRad, getBezierControlPoints } from '../utils';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private offsetX: number;
  private offsetY: number;
  private zoom: number;
  private showGrid: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.showGrid = true;
  }

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setTransform(offsetX: number, offsetY: number, zoom: number) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.zoom = zoom;
  }

  setShowGrid(show: boolean) {
    this.showGrid = show;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private applyTransform() {
    this.ctx.resetTransform();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.zoom, this.zoom);
  }

  private applyStyle(shape: Shape) {
    const { style } = shape;
    this.ctx.globalAlpha = style.opacity;
    this.ctx.fillStyle = style.fillColor;
    this.ctx.strokeStyle = style.strokeColor;
    this.ctx.lineWidth = style.strokeWidth;
    
    switch (style.strokeStyle) {
      case 'dashed':
        this.ctx.setLineDash([8, 4]);
        break;
      case 'dotted':
        this.ctx.setLineDash([2, 2]);
        break;
      default:
        this.ctx.setLineDash([]);
    }
  }

  private drawGrid() {
    if (!this.showGrid) return;
    
    this.ctx.save();
    this.ctx.resetTransform();
    
    const gridSize = 20;
    const zoom = this.zoom;
    
    let cellSize = gridSize;
    while (cellSize * zoom < 10) {
      cellSize *= 2;
    }
    
    const startX = Math.floor(-this.offsetX / (cellSize * zoom)) * cellSize;
    const startY = Math.floor(-this.offsetY / (cellSize * zoom)) * cellSize;
    
    this.ctx.globalAlpha = 0.1;
    this.ctx.strokeStyle = '#606060';
    this.ctx.lineWidth = 1;
    
    this.ctx.beginPath();
    
    for (let x = startX; x * zoom + this.offsetX < this.width; x += cellSize) {
      const screenX = x * zoom + this.offsetX;
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.height);
    }
    
    for (let y = startY; y * zoom + this.offsetY < this.height; y += cellSize) {
      const screenY = y * zoom + this.offsetY;
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.width, screenY);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawRectangle(shape: RectangleShape) {
    const { x, y, width, height, cornerRadius } = shape;
    
    this.applyStyle(shape);
    
    if (cornerRadius > 0) {
      const r = Math.min(cornerRadius, width / 2, height / 2);
      this.ctx.beginPath();
      this.ctx.moveTo(x + r, y);
      this.ctx.lineTo(x + width - r, y);
      this.ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      this.ctx.lineTo(x + width, y + height - r);
      this.ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      this.ctx.lineTo(x + r, y + height);
      this.ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      this.ctx.lineTo(x, y + r);
      this.ctx.quadraticCurveTo(x, y, x + r, y);
      this.ctx.closePath();
    } else {
      this.ctx.beginPath();
      this.ctx.rect(x, y, width, height);
    }
    
    if (shape.style.fillColor !== 'transparent') {
      this.ctx.fill();
    }
    if (shape.style.strokeWidth > 0) {
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1;
  }

  private drawCircle(shape: CircleShape) {
    const { x, y, width, height } = shape;
    const radius = Math.min(width, height) / 2;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    this.applyStyle(shape);
    
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    
    if (shape.style.fillColor !== 'transparent') {
      this.ctx.fill();
    }
    if (shape.style.strokeWidth > 0) {
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1;
  }

  private drawEllipse(shape: EllipseShape) {
    const { x, y, width, height } = shape;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radiusX = width / 2;
    const radiusY = height / 2;
    
    this.applyStyle(shape);
    
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    
    if (shape.style.fillColor !== 'transparent') {
      this.ctx.fill();
    }
    if (shape.style.strokeWidth > 0) {
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1;
  }

  private drawTriangle(shape: TriangleShape) {
    const { x, y, width, height } = shape;
    
    this.applyStyle(shape);
    
    this.ctx.beginPath();
    this.ctx.moveTo(x + width / 2, y);
    this.ctx.lineTo(x + width, y + height);
    this.ctx.lineTo(x, y + height);
    this.ctx.closePath();
    
    if (shape.style.fillColor !== 'transparent') {
      this.ctx.fill();
    }
    if (shape.style.strokeWidth > 0) {
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1;
  }

  private drawDiamond(shape: DiamondShape) {
    const { x, y, width, height } = shape;
    
    this.applyStyle(shape);
    
    this.ctx.beginPath();
    this.ctx.moveTo(x + width / 2, y);
    this.ctx.lineTo(x + width, y + height / 2);
    this.ctx.lineTo(x + width / 2, y + height);
    this.ctx.lineTo(x, y + height / 2);
    this.ctx.closePath();
    
    if (shape.style.fillColor !== 'transparent') {
      this.ctx.fill();
    }
    if (shape.style.strokeWidth > 0) {
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1;
  }

  private drawLine(shape: LineShape) {
    const { points } = shape;
    if (points.length < 2) return;
    
    this.applyStyle(shape);
    
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  private drawArrow(shape: ArrowShape) {
    const { points, arrowHeadLength } = shape;
    if (points.length < 2) return;
    
    this.applyStyle(shape);
    
    const start = points[0];
    const end = points[points.length - 1];
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.stroke();
    
    const angle = Math.atan2(end.y - points[points.length - 2].y, end.x - points[points.length - 2].x);
    const arrowAngle = Math.PI / 6;
    
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - arrowHeadLength * Math.cos(angle - arrowAngle),
      end.y - arrowHeadLength * Math.sin(angle - arrowAngle)
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - arrowHeadLength * Math.cos(angle + arrowAngle),
      end.y - arrowHeadLength * Math.sin(angle + arrowAngle)
    );
    this.ctx.stroke();
    
    this.ctx.globalAlpha = 1;
  }

  private drawPen(shape: PenShape) {
    const { points } = shape;
    if (points.length < 2) return;
    
    this.applyStyle(shape);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    const simplifiedPoints = points;
    const controlPoints = getBezierControlPoints(simplifiedPoints);
    
    if (simplifiedPoints.length === 2) {
      this.ctx.beginPath();
      this.ctx.moveTo(simplifiedPoints[0].x, simplifiedPoints[0].y);
      this.ctx.lineTo(simplifiedPoints[1].x, simplifiedPoints[1].y);
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(simplifiedPoints[0].x, simplifiedPoints[0].y);
      
      for (let i = 0; i < simplifiedPoints.length - 1; i++) {
        const cp = controlPoints[i];
        const next = simplifiedPoints[i + 1];
        this.ctx.bezierCurveTo(cp[0].x, cp[0].y, cp[1].x, cp[1].y, next.x, next.y);
      }
      
      this.ctx.stroke();
    }
    
    this.ctx.lineCap = 'butt';
    this.ctx.lineJoin = 'miter';
    this.ctx.globalAlpha = 1;
  }

  private drawText(shape: TextShape) {
    const { x, y, text, fontSize, fontFamily, textAlign } = shape;
    
    this.applyStyle(shape);
    
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = textAlign;
    this.ctx.textBaseline = 'top';
    
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    
    lines.forEach((line, i) => {
      this.ctx.fillText(line, x, y + i * lineHeight);
    });
    
    this.ctx.globalAlpha = 1;
  }

  private drawConnector(shape: ConnectorShape) {
    this.applyStyle(shape);
    
    const start = shape.startPosition;
    const end = shape.endPosition;
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    
    if (shape.controlPoints && shape.controlPoints.length > 0) {
      if (shape.controlPoints.length === 1) {
        this.ctx.quadraticCurveTo(
          shape.controlPoints[0].x,
          shape.controlPoints[0].y,
          end.x,
          end.y
        );
      } else if (shape.controlPoints.length >= 2) {
        this.ctx.bezierCurveTo(
          shape.controlPoints[0].x,
          shape.controlPoints[0].y,
          shape.controlPoints[1].x,
          shape.controlPoints[1].y,
          end.x,
          end.y
        );
      }
    } else {
      this.ctx.lineTo(end.x, end.y);
    }
    
    this.ctx.stroke();
    
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - arrowLength * Math.cos(angle - arrowAngle),
      end.y - arrowLength * Math.sin(angle - arrowAngle)
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - arrowLength * Math.cos(angle + arrowAngle),
      end.y - arrowLength * Math.sin(angle + arrowAngle)
    );
    this.ctx.stroke();
    
    this.ctx.globalAlpha = 1;
  }

  private drawShapeWithRotation(shape: Shape) {
    if (!shape.visible) return;
    
    const { x, y, width, height, rotation, type } = shape;
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    this.ctx.save();
    
    if (rotation !== 0) {
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(degToRad(rotation));
      this.ctx.translate(-centerX, -centerY);
    }
    
    switch (type) {
      case 'rectangle':
        this.drawRectangle(shape as RectangleShape);
        break;
      case 'circle':
        this.drawCircle(shape as CircleShape);
        break;
      case 'ellipse':
        this.drawEllipse(shape as EllipseShape);
        break;
      case 'triangle':
        this.drawTriangle(shape as TriangleShape);
        break;
      case 'diamond':
        this.drawDiamond(shape as DiamondShape);
        break;
      case 'line':
        this.drawLine(shape as LineShape);
        break;
      case 'arrow':
        this.drawArrow(shape as ArrowShape);
        break;
      case 'pen':
        this.drawPen(shape as PenShape);
        break;
      case 'text':
        this.drawText(shape as TextShape);
        break;
      case 'connector':
        this.drawConnector(shape as ConnectorShape);
        break;
    }
    
    this.ctx.restore();
  }

  private isShapeInViewport(shape: Shape): boolean {
    const { x, y, width, height, rotation } = shape;
    
    const bbox = this.getRotatedBoundingBox(x, y, width, height, rotation);
    
    const viewportLeft = -this.offsetX / this.zoom - 50;
    const viewportTop = -this.offsetY / this.zoom - 50;
    const viewportRight = viewportLeft + this.width / this.zoom + 100;
    const viewportBottom = viewportTop + this.height / this.zoom + 100;
    
    return !(
      bbox.x + bbox.width < viewportLeft ||
      bbox.x > viewportRight ||
      bbox.y + bbox.height < viewportTop ||
      bbox.y > viewportBottom
    );
  }

  private getRotatedBoundingBox(x: number, y: number, width: number, height: number, rotation: number): BoundingBox {
    if (rotation === 0) {
      return { x, y, width, height };
    }
    
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const rad = degToRad(rotation);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const corners = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ].map(({ x: px, y: py }) => {
      const dx = px - centerX;
      const dy = py - centerY;
      return {
        x: centerX + dx * cos - dy * sin,
        y: centerY + dx * sin + dy * cos,
      };
    });
    
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    
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
  }

  render(shapes: Shape[]) {
    this.clear();
    this.drawGrid();
    
    this.applyTransform();
    
    const sortedShapes = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
    
    for (const shape of sortedShapes) {
      if (this.isShapeInViewport(shape)) {
        this.drawShapeWithRotation(shape);
      }
    }
  }

  drawSelectionBox(bbox: BoundingBox, selected: boolean = true, rotation: number = 0) {
    this.ctx.save();
    this.applyTransform();
    
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;
    
    if (selected) {
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(degToRad(rotation));
      this.ctx.translate(-centerX, -centerY);
      
      this.ctx.strokeStyle = '#e94560';
      this.ctx.setLineDash([]);
      this.ctx.lineWidth = 1 / this.zoom;
      
      this.ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
      
      const handleSize = 6 / this.zoom;
      const handles = [
        { x: bbox.x, y: bbox.y },
        { x: bbox.x + bbox.width / 2, y: bbox.y },
        { x: bbox.x + bbox.width, y: bbox.y },
        { x: bbox.x, y: bbox.y + bbox.height / 2 },
        { x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2 },
        { x: bbox.x, y: bbox.y + bbox.height },
        { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height },
        { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
      ];
      
      this.ctx.fillStyle = '#fff';
      this.ctx.strokeStyle = '#e94560';
      this.ctx.setLineDash([]);
      
      handles.forEach((h) => {
        this.ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        this.ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      });
      
      const rotateHandleDistance = 20 / this.zoom;
      const rotateHandleRadius = 5 / this.zoom;
      const rotateHandleY = bbox.y - rotateHandleDistance;
      const rotateHandleX = bbox.x + bbox.width / 2;
      
      this.ctx.beginPath();
      this.ctx.moveTo(rotateHandleX, bbox.y);
      this.ctx.lineTo(rotateHandleX, rotateHandleY);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.arc(rotateHandleX, rotateHandleY, rotateHandleRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff';
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      this.ctx.strokeStyle = '#e94560';
      this.ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
      this.ctx.lineWidth = 1 / this.zoom;
      this.ctx.fillStyle = 'rgba(233, 69, 96, 0.1)';
      
      this.ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
      this.ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    }
    
    this.ctx.restore();
  }

  getCanvasContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
