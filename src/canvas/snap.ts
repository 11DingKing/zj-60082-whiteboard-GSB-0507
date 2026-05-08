import { Shape } from "../types";

export const SNAP_THRESHOLD = 5;

export interface SnapLine {
  type: "horizontal" | "vertical";
  position: number;
  category: "edge" | "center" | "spacing";
  offset: number;
}

interface ShapeBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

const getShapeBounds = (shape: Shape): ShapeBounds => {
  return {
    left: shape.x,
    right: shape.x + shape.width,
    top: shape.y,
    bottom: shape.y + shape.height,
    centerX: shape.x + shape.width / 2,
    centerY: shape.y + shape.height / 2,
    width: shape.width,
    height: shape.height,
  };
};

export const detectSnapLines = (
  draggingShapes: Shape[],
  otherShapes: Shape[],
  _canvasBounds: { minX: number; maxX: number; minY: number; maxY: number },
): SnapLine[] => {
  if (draggingShapes.length === 0) return [];

  const snapLines: SnapLine[] = [];

  const draggingBounds = draggingShapes.map(getShapeBounds);

  let dragMinX = Infinity,
    dragMaxX = -Infinity;
  let dragMinY = Infinity,
    dragMaxY = -Infinity;

  draggingBounds.forEach((b) => {
    dragMinX = Math.min(dragMinX, b.left);
    dragMaxX = Math.max(dragMaxX, b.right);
    dragMinY = Math.min(dragMinY, b.top);
    dragMaxY = Math.max(dragMaxY, b.bottom);
  });

  const dragCenterX = dragMinX + (dragMaxX - dragMinX) / 2;
  const dragCenterY = dragMinY + (dragMaxY - dragMinY) / 2;
  const dragWidth = dragMaxX - dragMinX;
  const dragHeight = dragMaxY - dragMinY;

  const otherBounds = otherShapes.map(getShapeBounds);

  const checkVerticalAlignment = () => {
    otherBounds.forEach((other) => {
      if (Math.abs(dragMinX - other.left) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "vertical",
          position: other.left,
          category: "edge",
          offset: other.left - dragMinX,
        });
      }
      if (Math.abs(dragMaxX - other.right) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "vertical",
          position: other.right,
          category: "edge",
          offset: other.right - dragMaxX,
        });
      }
      if (Math.abs(dragMinX - other.right) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "vertical",
          position: other.right,
          category: "edge",
          offset: other.right - dragMinX,
        });
      }
      if (Math.abs(dragMaxX - other.left) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "vertical",
          position: other.left,
          category: "edge",
          offset: other.left - dragMaxX,
        });
      }
      if (Math.abs(dragCenterX - other.centerX) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "vertical",
          position: other.centerX,
          category: "center",
          offset: other.centerX - dragCenterX,
        });
      }
    });
  };

  const checkHorizontalAlignment = () => {
    otherBounds.forEach((other) => {
      if (Math.abs(dragMinY - other.top) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "horizontal",
          position: other.top,
          category: "edge",
          offset: other.top - dragMinY,
        });
      }
      if (Math.abs(dragMaxY - other.bottom) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "horizontal",
          position: other.bottom,
          category: "edge",
          offset: other.bottom - dragMaxY,
        });
      }
      if (Math.abs(dragMinY - other.bottom) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "horizontal",
          position: other.bottom,
          category: "edge",
          offset: other.bottom - dragMinY,
        });
      }
      if (Math.abs(dragMaxY - other.top) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "horizontal",
          position: other.top,
          category: "edge",
          offset: other.top - dragMaxY,
        });
      }
      if (Math.abs(dragCenterY - other.centerY) <= SNAP_THRESHOLD) {
        snapLines.push({
          type: "horizontal",
          position: other.centerY,
          category: "center",
          offset: other.centerY - dragCenterY,
        });
      }
    });
  };

  const checkSpacing = () => {
    if (otherBounds.length < 2) return;

    const sortedByX = [...otherBounds].sort((a, b) => a.left - b.left);
    const sortedByY = [...otherBounds].sort((a, b) => a.top - b.top);

    if (sortedByX.length >= 2) {
      const baseSpacing = sortedByX[1].left - sortedByX[0].right;
      let consistentSpacing = true;
      for (let i = 2; i < sortedByX.length; i++) {
        const spacing = sortedByX[i].left - sortedByX[i - 1].right;
        if (Math.abs(spacing - baseSpacing) > SNAP_THRESHOLD) {
          consistentSpacing = false;
          break;
        }
      }

      if (consistentSpacing && baseSpacing > 0) {
        for (let i = 0; i <= sortedByX.length; i++) {
          let targetX: number;
          if (i === 0) {
            targetX = sortedByX[0].left - baseSpacing - dragWidth;
          } else if (i === sortedByX.length) {
            targetX = sortedByX[sortedByX.length - 1].right + baseSpacing;
          } else {
            targetX = sortedByX[i - 1].right + baseSpacing;
          }

          if (Math.abs(dragMinX - targetX) <= SNAP_THRESHOLD) {
            snapLines.push({
              type: "vertical",
              position: dragMinX + (targetX - dragMinX),
              category: "spacing",
              offset: targetX - dragMinX,
            });
            break;
          }
        }
      }
    }

    if (sortedByY.length >= 2) {
      const baseSpacing = sortedByY[1].top - sortedByY[0].bottom;
      let consistentSpacing = true;
      for (let i = 2; i < sortedByY.length; i++) {
        const spacing = sortedByY[i].top - sortedByY[i - 1].bottom;
        if (Math.abs(spacing - baseSpacing) > SNAP_THRESHOLD) {
          consistentSpacing = false;
          break;
        }
      }

      if (consistentSpacing && baseSpacing > 0) {
        for (let i = 0; i <= sortedByY.length; i++) {
          let targetY: number;
          if (i === 0) {
            targetY = sortedByY[0].top - baseSpacing - dragHeight;
          } else if (i === sortedByY.length) {
            targetY = sortedByY[sortedByY.length - 1].bottom + baseSpacing;
          } else {
            targetY = sortedByY[i - 1].bottom + baseSpacing;
          }

          if (Math.abs(dragMinY - targetY) <= SNAP_THRESHOLD) {
            snapLines.push({
              type: "horizontal",
              position: dragMinY + (targetY - dragMinY),
              category: "spacing",
              offset: targetY - dragMinY,
            });
            break;
          }
        }
      }
    }
  };

  const deduplicateSnapLines = (lines: SnapLine[]): SnapLine[] => {
    const unique: SnapLine[] = [];
    const seen = new Set<string>();

    lines.forEach((line) => {
      const key = `${line.type}-${Math.round(line.position)}-${line.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(line);
      }
    });

    return unique;
  };

  checkVerticalAlignment();
  checkHorizontalAlignment();
  checkSpacing();

  return deduplicateSnapLines(snapLines);
};

export const getSnapAdjustment = (
  snapLines: SnapLine[],
): { dx: number; dy: number } => {
  let dx = 0;
  let dy = 0;

  const verticalLines = snapLines.filter((l) => l.type === "vertical");
  const horizontalLines = snapLines.filter((l) => l.type === "horizontal");

  const getBestOffset = (lines: SnapLine[]): number => {
    if (lines.length === 0) return 0;
    const byCategory: Record<string, SnapLine[]> = {
      edge: [],
      center: [],
      spacing: [],
    };
    lines.forEach((l) => byCategory[l.category].push(l));
    const priority = ["center", "edge", "spacing"];
    for (const cat of priority) {
      if (byCategory[cat].length > 0) {
        return byCategory[cat].reduce((best, curr) =>
          Math.abs(curr.offset) < Math.abs(best.offset) ? curr : best,
        ).offset;
      }
    }
    return 0;
  };

  dx = getBestOffset(verticalLines);
  dy = getBestOffset(horizontalLines);

  return { dx, dy };
};
