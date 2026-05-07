import { Shape, SmartGuide } from '../types';

export interface SnapLine extends SmartGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  source: 'edge' | 'center' | 'spacing';
}

export interface SnapResult {
  lines: SnapLine[];
  snapX: number | null;
  snapY: number | null;
}

const SNAP_THRESHOLD = 5;

interface ShapeEdges {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

function getShapeEdges(shape: Shape): ShapeEdges {
  return {
    left: shape.x,
    right: shape.x + shape.width,
    top: shape.y,
    bottom: shape.y + shape.height,
    centerX: shape.x + shape.width / 2,
    centerY: shape.y + shape.height / 2,
  };
}

function detectEdgeSnap(
  movingEdges: ShapeEdges,
  staticEdges: ShapeEdges[],
  threshold: number
): { lines: SnapLine[]; snapX: number | null; snapY: number | null } {
  const lines: SnapLine[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  let bestDistX = threshold + 1;
  let bestDistY = threshold + 1;

  for (const se of staticEdges) {
    const xPairs: [number, number][] = [
      [movingEdges.left, se.left],
      [movingEdges.left, se.right],
      [movingEdges.right, se.left],
      [movingEdges.right, se.right],
    ];

    for (const [movingVal, staticVal] of xPairs) {
      const dist = Math.abs(movingVal - staticVal);
      if (dist <= threshold && dist < bestDistX) {
        bestDistX = dist;
        snapX = staticVal - movingVal;
        lines.length = 0;
        const isLeft = movingVal === movingEdges.left;
        lines.push({
          type: 'vertical',
          position: staticVal,
          source: 'edge',
        });
        if (isLeft && Math.abs(movingEdges.right - (staticVal + (movingEdges.right - movingEdges.left))) <= threshold) {
        }
      }
    }

    const yPairs: [number, number][] = [
      [movingEdges.top, se.top],
      [movingEdges.top, se.bottom],
      [movingEdges.bottom, se.top],
      [movingEdges.bottom, se.bottom],
    ];

    for (const [movingVal, staticVal] of yPairs) {
      const dist = Math.abs(movingVal - staticVal);
      if (dist <= threshold && dist < bestDistY) {
        bestDistY = dist;
        snapY = staticVal - movingVal;
        const existingVert = lines.filter((l) => l.type === 'horizontal');
        lines.length = 0;
        lines.push(...existingVert);
        lines.push({
          type: 'horizontal',
          position: staticVal,
          source: 'edge',
        });
      }
    }
  }

  return { lines, snapX, snapY };
}

function detectCenterSnap(
  movingEdges: ShapeEdges,
  staticEdges: ShapeEdges[],
  threshold: number
): { lines: SnapLine[]; snapX: number | null; snapY: number | null } {
  const lines: SnapLine[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  let bestDistX = threshold + 1;
  let bestDistY = threshold + 1;

  for (const se of staticEdges) {
    const distX = Math.abs(movingEdges.centerX - se.centerX);
    if (distX <= threshold && distX < bestDistX) {
      bestDistX = distX;
      snapX = se.centerX - movingEdges.centerX;
      const existing = lines.filter((l) => l.type === 'horizontal');
      lines.length = 0;
      lines.push(...existing);
      lines.push({
        type: 'vertical',
        position: se.centerX,
        source: 'center',
      });
    }

    const distY = Math.abs(movingEdges.centerY - se.centerY);
    if (distY <= threshold && distY < bestDistY) {
      bestDistY = distY;
      snapY = se.centerY - movingEdges.centerY;
      const existing = lines.filter((l) => l.type === 'vertical');
      lines.length = 0;
      lines.push(...existing);
      lines.push({
        type: 'horizontal',
        position: se.centerY,
        source: 'center',
      });
    }
  }

  return { lines, snapX, snapY };
}

function detectEqualSpacingSnap(
  movingShapes: Shape[],
  allShapes: Shape[],
  threshold: number
): SnapLine[] {
  const lines: SnapLine[] = [];
  if (allShapes.length < 3) return lines;

  const movingIds = new Set(movingShapes.map((s) => s.id));
  const staticShapes = allShapes.filter((s) => !movingIds.has(s.id));
  if (staticShapes.length < 2) return lines;

  const movingEdges = movingShapes.map(getShapeEdges);

  const allCenterX = [
    ...staticShapes.map(getShapeEdges).map((e) => e.centerX),
    ...movingEdges.map((e) => e.centerX),
  ].sort((a, b) => a - b);

  const allCenterY = [
    ...staticShapes.map(getShapeEdges).map((e) => e.centerY),
    ...movingEdges.map((e) => e.centerY),
  ].sort((a, b) => a - b);

  if (allCenterX.length >= 3) {
    const gaps: number[] = [];
    for (let i = 1; i < allCenterX.length; i++) {
      gaps.push(allCenterX[i] - allCenterX[i - 1]);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const isEvenlySpaced = gaps.every((g) => Math.abs(g - avgGap) <= threshold);
    if (isEvenlySpaced && avgGap > 1) {
      for (const cx of allCenterX) {
        lines.push({
          type: 'vertical',
          position: cx,
          source: 'spacing',
        });
      }
    }
  }

  if (allCenterY.length >= 3) {
    const gaps: number[] = [];
    for (let i = 1; i < allCenterY.length; i++) {
      gaps.push(allCenterY[i] - allCenterY[i - 1]);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const isEvenlySpaced = gaps.every((g) => Math.abs(g - avgGap) <= threshold);
    if (isEvenlySpaced && avgGap > 1) {
      for (const cy of allCenterY) {
        lines.push({
          type: 'horizontal',
          position: cy,
          source: 'spacing',
        });
      }
    }
  }

  return lines;
}

export function detectSnapLines(
  movingShapes: Shape[],
  allShapes: Shape[],
  _canvasWidth: number,
  _canvasHeight: number
): SnapResult {
  if (movingShapes.length === 0) return { lines: [], snapX: null, snapY: null };

  const movingIds = new Set(movingShapes.map((s) => s.id));
  const staticShapes = allShapes.filter((s) => !movingIds.has(s.id));
  if (staticShapes.length === 0) return { lines: [], snapX: null, snapY: null };

  const allLines: SnapLine[] = [];
  let finalSnapX: number | null = null;
  let finalSnapY: number | null = null;

  const primaryMoving = movingShapes[0];
  const movingEdges = getShapeEdges(primaryMoving);
  const staticEdges = staticShapes.map(getShapeEdges);

  const edgeResult = detectEdgeSnap(movingEdges, staticEdges, SNAP_THRESHOLD);
  const centerResult = detectCenterSnap(movingEdges, staticEdges, SNAP_THRESHOLD);

  if (edgeResult.snapX !== null) {
    finalSnapX = edgeResult.snapX;
    allLines.push(...edgeResult.lines.filter((l) => l.type === 'vertical'));
  }
  if (edgeResult.snapY !== null) {
    finalSnapY = edgeResult.snapY;
    allLines.push(...edgeResult.lines.filter((l) => l.type === 'horizontal'));
  }

  if (centerResult.snapX !== null) {
    if (finalSnapX === null || Math.abs(centerResult.snapX) <= Math.abs(finalSnapX)) {
      finalSnapX = centerResult.snapX;
      const existingVert = allLines.filter((l) => l.type === 'horizontal');
      allLines.length = 0;
      allLines.push(...existingVert);
      allLines.push(...centerResult.lines.filter((l) => l.type === 'vertical'));
    }
  }
  if (centerResult.snapY !== null) {
    if (finalSnapY === null || Math.abs(centerResult.snapY) <= Math.abs(finalSnapY)) {
      finalSnapY = centerResult.snapY;
      const existingHoriz = allLines.filter((l) => l.type === 'vertical');
      allLines.length = 0;
      allLines.push(...existingHoriz);
      allLines.push(...centerResult.lines.filter((l) => l.type === 'horizontal'));
    }
  }

  const spacingLines = detectEqualSpacingSnap(movingShapes, allShapes, SNAP_THRESHOLD);
  const spacingVert = spacingLines.filter((l) => l.type === 'vertical' && !allLines.some((al) => al.type === 'vertical' && al.position === l.position));
  const spacingHoriz = spacingLines.filter((l) => l.type === 'horizontal' && !allLines.some((al) => al.type === 'horizontal' && al.position === l.position));
  allLines.push(...spacingVert, ...spacingHoriz);

  const uniqueLines: SnapLine[] = [];
  const seen = new Set<string>();
  for (const line of allLines) {
    const key = `${line.type}-${line.position}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLines.push(line);
    }
  }

  return { lines: uniqueLines, snapX: finalSnapX, snapY: finalSnapY };
}
