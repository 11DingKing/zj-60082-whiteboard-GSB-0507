import { create } from "zustand";
import { Project, Shape, GroupShape } from "../types";
import { generateId, deepClone } from "../utils";

interface ProjectStore {
  projects: Project[];
  currentProjectId: string | null;
  shapes: Shape[];
  shapeCounter: number;

  setProjects: (projects: Project[]) => void;
  setCurrentProject: (id: string) => void;
  createProject: (name: string) => Project;
  renameProject: (id: string, name: string) => void;
  removeProject: (id: string) => void;

  setShapes: (shapes: Shape[]) => void;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  removeShapes: (ids: string[]) => void;

  getShape: (id: string) => Shape | undefined;
  getShapes: (ids: string[]) => Shape[];
  getSortedShapes: () => Shape[];
  getNextZIndex: () => number;
  getShapeName: (type: string) => string;

  groupShapes: (shapeIds: string[]) => string | null;
  ungroupShape: (groupId: string) => string[];

  duplicateShapes: (shapeIds: string[]) => string[];

  moveToTop: (shapeId: string) => void;
  moveToBottom: (shapeId: string) => void;
  moveUp: (shapeId: string) => void;
  moveDown: (shapeId: string) => void;

  alignLeft: (shapeIds: string[]) => void;
  alignCenterHorizontal: (shapeIds: string[]) => void;
  alignRight: (shapeIds: string[]) => void;
  alignTop: (shapeIds: string[]) => void;
  alignCenterVertical: (shapeIds: string[]) => void;
  alignBottom: (shapeIds: string[]) => void;

  distributeHorizontally: (shapeIds: string[]) => void;
  distributeVertically: (shapeIds: string[]) => void;

  updateConnectors: (movedShapeIds: string[]) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProjectId: null,
  shapes: [],
  shapeCounter: 0,

  setProjects: (projects) => {
    set({ projects });
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id });
  },

  createProject: (name) => {
    const project: Project = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      projects: [project, ...state.projects],
      currentProjectId: project.id,
      shapes: [],
    }));

    return project;
  },

  renameProject: (id, name) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, name, updatedAt: Date.now() } : p,
      ),
    }));
  },

  removeProject: (id) => {
    set((state) => {
      const newProjects = state.projects.filter((p) => p.id !== id);
      const shouldClearCurrent = state.currentProjectId === id;

      return {
        projects: newProjects,
        currentProjectId: shouldClearCurrent
          ? newProjects.length > 0
            ? newProjects[0].id
            : null
          : state.currentProjectId,
        shapes: shouldClearCurrent ? [] : state.shapes,
      };
    });
  },

  setShapes: (shapes) => {
    set({ shapes });
  },

  addShape: (shape) => {
    set((state) => ({
      shapes: [...state.shapes, shape],
    }));
  },

  updateShape: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id ? ({ ...s, ...updates } as Shape) : s,
      ),
    }));
  },

  removeShape: (id) => {
    const { shapes } = get();
    const shape = shapes.find((s) => s.id === id);

    const relatedIds: string[] = [id];
    if (shape?.type === "group") {
      relatedIds.push(...(shape as GroupShape).children);
    }

    set((state) => ({
      shapes: state.shapes.filter((s) => !relatedIds.includes(s.id)),
    }));
  },

  removeShapes: (ids) => {
    const { shapes } = get();
    const allIds = new Set<string>();

    ids.forEach((id) => {
      allIds.add(id);
      const shape = shapes.find((s) => s.id === id);
      if (shape?.type === "group") {
        (shape as GroupShape).children.forEach((childId) =>
          allIds.add(childId),
        );
      }
    });

    set((state) => ({
      shapes: state.shapes.filter((s) => !allIds.has(s.id)),
    }));
  },

  getShape: (id) => {
    return get().shapes.find((s) => s.id === id);
  },

  getShapes: (ids) => {
    const { shapes } = get();
    return ids
      .map((id) => shapes.find((s) => s.id === id))
      .filter(Boolean) as Shape[];
  },

  getSortedShapes: () => {
    return [...get().shapes].sort((a, b) => a.zIndex - b.zIndex);
  },

  getNextZIndex: () => {
    const { shapes } = get();
    return shapes.length === 0
      ? 0
      : Math.max(...shapes.map((s) => s.zIndex)) + 1;
  },

  getShapeName: (type) => {
    const { shapeCounter } = get();
    const names: Record<string, string> = {
      rectangle: "矩形",
      circle: "圆形",
      ellipse: "椭圆",
      triangle: "三角形",
      diamond: "菱形",
      line: "直线",
      arrow: "箭头",
      pen: "画笔",
      text: "文本",
      connector: "连接线",
      group: "组",
    };
    const baseName = names[type] || "图形";
    set((state) => ({ shapeCounter: state.shapeCounter + 1 }));
    return `${baseName} ${shapeCounter + 1}`;
  },

  groupShapes: (shapeIds) => {
    if (shapeIds.length < 2) return null;

    const { shapes, getShapeName } = get();
    const groupShapes = shapeIds
      .map((id) => shapes.find((s) => s.id === id))
      .filter(Boolean) as Shape[];

    if (groupShapes.length < 2) return null;

    const groupId = generateId();
    const zIndex = get().getNextZIndex();

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    groupShapes.forEach((shape) => {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + shape.width);
      maxY = Math.max(maxY, shape.y + shape.height);
    });

    const newShapes = [...shapes];
    groupShapes.forEach((shape) => {
      const idx = newShapes.findIndex((s) => s.id === shape.id);
      if (idx >= 0) {
        newShapes[idx] = { ...newShapes[idx], groupId };
      }
    });

    const groupShape: GroupShape = {
      id: groupId,
      type: "group",
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0,
      style: {
        fillColor: "transparent",
        strokeColor: "transparent",
        strokeWidth: 0,
        strokeStyle: "solid",
        opacity: 1,
      },
      visible: true,
      locked: false,
      zIndex,
      name: getShapeName("group"),
      children: shapeIds,
    };

    newShapes.push(groupShape);
    set({ shapes: newShapes });

    return groupId;
  },

  ungroupShape: (groupId) => {
    const { shapes } = get();
    const group = shapes.find((s) => s.id === groupId) as
      | GroupShape
      | undefined;

    if (!group || group.type !== "group") return [];

    const newShapes = shapes
      .filter((s) => s.id !== groupId)
      .map((s) => (s.groupId === groupId ? { ...s, groupId: undefined } : s));

    set({ shapes: newShapes });

    return group.children;
  },

  duplicateShapes: (shapeIds) => {
    const { shapes, getNextZIndex, getShape } = get();
    const newIds: string[] = [];
    const newShapes = [...shapes];
    let zIndex = getNextZIndex();

    const groupIdMap = new Map<string, string>();

    shapeIds.forEach((id) => {
      const shape = getShape(id);
      if (!shape) return;

      const newId = generateId();
      newIds.push(newId);

      if (shape.type === "group") {
        groupIdMap.set(shape.id, newId);
      }

      const clonedShape = deepClone(shape) as Shape;
      clonedShape.id = newId;
      clonedShape.zIndex = zIndex++;
      clonedShape.x += 20;
      clonedShape.y += 20;

      newShapes.push(clonedShape);
    });

    newShapes.forEach((shape) => {
      if (shape.groupId && groupIdMap.has(shape.groupId)) {
        shape.groupId = groupIdMap.get(shape.groupId);
      }

      if (shape.type === "group") {
        const groupShape = shape as GroupShape;
        groupShape.children = groupShape.children
          .map((childId) => {
            const originalChild = shapes.find((s) => s.id === childId);
            if (originalChild) {
              const newChild = newShapes.find(
                (s) =>
                  s.type === originalChild.type &&
                  s.name === originalChild.name &&
                  s.x === originalChild.x + 20 &&
                  s.y === originalChild.y + 20,
              );
              if (newChild) return newChild.id;
            }
            return childId;
          })
          .filter((id) => newShapes.some((s) => s.id === id));
      }
    });

    set({ shapes: newShapes });

    return newIds;
  },

  moveToTop: (shapeId) => {
    const { shapes } = get();
    const maxZ = Math.max(...shapes.map((s) => s.zIndex));
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === shapeId ? { ...s, zIndex: maxZ + 1 } : s,
      ),
    }));
  },

  moveToBottom: (shapeId) => {
    const { shapes } = get();
    const minZ = Math.min(...shapes.map((s) => s.zIndex));
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === shapeId ? { ...s, zIndex: minZ - 1 } : s,
      ),
    }));
  },

  moveUp: (shapeId) => {
    const { shapes } = get();
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((s) => s.id === shapeId);

    if (idx >= 0 && idx < sorted.length - 1) {
      const current = sorted[idx];
      const next = sorted[idx + 1];
      set((state) => ({
        shapes: state.shapes.map((s) => {
          if (s.id === shapeId) return { ...s, zIndex: next.zIndex };
          if (s.id === next.id) return { ...s, zIndex: current.zIndex };
          return s;
        }),
      }));
    }
  },

  moveDown: (shapeId) => {
    const { shapes } = get();
    const sorted = [...shapes].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((s) => s.id === shapeId);

    if (idx > 0) {
      const current = sorted[idx];
      const prev = sorted[idx - 1];
      set((state) => ({
        shapes: state.shapes.map((s) => {
          if (s.id === shapeId) return { ...s, zIndex: prev.zIndex };
          if (s.id === prev.id) return { ...s, zIndex: current.zIndex };
          return s;
        }),
      }));
    }
  },

  alignLeft: (shapeIds) => {
    if (shapeIds.length < 2) return;

    const { getShape, updateShape } = get();
    const shapes = shapeIds
      .map((id) => getShape(id))
      .filter(Boolean) as Shape[];
    if (shapes.length < 2) return;

    const minX = Math.min(...shapes.map((s) => s.x));
    shapes.forEach((shape) => {
      updateShape(shape.id, { x: minX });
    });
  },

  alignCenterHorizontal: (shapeIds) => {
    if (shapeIds.length < 2) return;

    const { getShape, updateShape } = get();
    const shapes = shapeIds
      .map((id) => getShape(id))
      .filter(Boolean) as Shape[];
    if (shapes.length < 2) return;

    const allX = shapes.flatMap((s) => [s.x, s.x + s.width]);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const centerX = minX + (maxX - minX) / 2;

    shapes.forEach((shape) => {
      const shapeCenterX = shape.x + shape.width / 2;
      const deltaX = centerX - shapeCenterX;
      updateShape(shape.id, { x: shape.x + deltaX });
    });
  },

  alignRight: (shapeIds) => {
    if (shapeIds.length < 2) return;

    const { getShape, updateShape } = get();
    const shapes = shapeIds
      .map((id) => getShape(id))
      .filter(Boolean) as Shape[];
    if (shapes.length < 2) return;

    const maxRight = Math.max(...shapes.map((s) => s.x + s.width));
    shapes.forEach((shape) => {
      const newX = maxRight - shape.width;
      updateShape(shape.id, { x: newX });
    });
  },

  alignTop: (shapeIds) => {
    if (shapeIds.length < 2) return;

    const { getShape, updateShape } = get();
    const shapes = shapeIds
      .map((id) => getShape(id))
      .filter(Boolean) as Shape[];
    if (shapes.length < 2) return;

    const minY = Math.min(...shapes.map((s) => s.y));
    shapes.forEach((shape) => {
      updateShape(shape.id, { y: minY });
    });
  },

  alignCenterVertical: (shapeIds) => {
    if (shapeIds.length < 2) return;

    const { getShape, updateShape } = get();
    const shapes = shapeIds
      .map((id) => getShape(id))
      .filter(Boolean) as Shape[];
    if (shapes.length < 2) return;

    const allY = shapes.flatMap((s) => [s.y, s.y + s.height]);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const centerY = minY + (maxY - minY) / 2;

    shapes.forEach((shape) => {
      const shapeCenterY = shape.y + shape.height / 2;
      const deltaY = centerY - shapeCenterY;
      updateShape(shape.id, { y: shape.y + deltaY });
    });
  },

  alignBottom: (shapeIds) => {
    if (shapeIds.length < 2) return;

    const { getShape, updateShape } = get();
    const shapes = shapeIds
      .map((id) => getShape(id))
      .filter(Boolean) as Shape[];
    if (shapes.length < 2) return;

    const maxBottom = Math.max(...shapes.map((s) => s.y + s.height));
    shapes.forEach((shape) => {
      const newY = maxBottom - shape.height;
      updateShape(shape.id, { y: newY });
    });
  },

  distributeHorizontally: (shapeIds) => {
    if (shapeIds.length < 3) return;

    const { getShape, updateShape } = get();
    const shapes = shapeIds
      .map((id) => getShape(id))
      .filter(Boolean) as Shape[];
    if (shapes.length < 3) return;

    const sorted = [...shapes].sort((a, b) => a.x - b.x);

    const totalWidth =
      sorted[sorted.length - 1].x +
      sorted[sorted.length - 1].width -
      sorted[0].x;
    const shapesWidth = sorted.reduce((sum, s) => sum + s.width, 0);
    const spacing = (totalWidth - shapesWidth) / (sorted.length - 1);

    let currentX = sorted[0].x;
    updateShape(sorted[0].id, { x: currentX });
    currentX += sorted[0].width + spacing;

    for (let i = 1; i < sorted.length - 1; i++) {
      updateShape(sorted[i].id, { x: currentX });
      currentX += sorted[i].width + spacing;
    }

    const lastShape = sorted[sorted.length - 1];
    const lastX = totalWidth - lastShape.width + sorted[0].x;
    updateShape(lastShape.id, { x: lastX });
  },

  distributeVertically: (shapeIds) => {
    if (shapeIds.length < 3) return;

    const { getShape, updateShape } = get();
    const shapes = shapeIds
      .map((id) => getShape(id))
      .filter(Boolean) as Shape[];
    if (shapes.length < 3) return;

    const sorted = [...shapes].sort((a, b) => a.y - b.y);

    const totalHeight =
      sorted[sorted.length - 1].y +
      sorted[sorted.length - 1].height -
      sorted[0].y;
    const shapesHeight = sorted.reduce((sum, s) => sum + s.height, 0);
    const spacing = (totalHeight - shapesHeight) / (sorted.length - 1);

    let currentY = sorted[0].y;
    updateShape(sorted[0].id, { y: currentY });
    currentY += sorted[0].height + spacing;

    for (let i = 1; i < sorted.length - 1; i++) {
      updateShape(sorted[i].id, { y: currentY });
      currentY += sorted[i].height + spacing;
    }

    const lastShape = sorted[sorted.length - 1];
    const lastY = totalHeight - lastShape.height + sorted[0].y;
    updateShape(lastShape.id, { y: lastY });
  },

  updateConnectors: (movedShapeIds) => {
    const { shapes, getShape, updateShape } = get();

    const connectorShapes = shapes.filter((s) => s.type === "connector");
    if (connectorShapes.length === 0) return;

    const getNearestEdgePoint = (
      shape: Shape,
      targetPoint: { x: number; y: number },
    ): { x: number; y: number } => {
      const centerX = shape.x + shape.width / 2;
      const centerY = shape.y + shape.height / 2;

      const dx = targetPoint.x - centerX;
      const dy = targetPoint.y - centerY;

      let edgeX = centerX;
      let edgeY = centerY;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx / shape.width > absDy / shape.height) {
        const ratio = shape.width / 2 / absDx;
        edgeX = centerX + (dx > 0 ? shape.width / 2 : -shape.width / 2);
        edgeY = centerY + dy * ratio;
      } else {
        const ratio = shape.height / 2 / absDy;
        edgeX = centerX + dx * ratio;
        edgeY = centerY + (dy > 0 ? shape.height / 2 : -shape.height / 2);
      }

      return { x: edgeX, y: edgeY };
    };

    connectorShapes.forEach((connector) => {
      const conn = connector as any;
      let needsUpdate = false;
      let newStartPos = { ...conn.startPosition };
      let newEndPos = { ...conn.endPosition };

      if (conn.startShapeId && movedShapeIds.includes(conn.startShapeId)) {
        const startShape = getShape(conn.startShapeId);
        if (startShape) {
          newStartPos = getNearestEdgePoint(startShape, conn.endPosition);
          needsUpdate = true;
        }
      }

      if (conn.endShapeId && movedShapeIds.includes(conn.endShapeId)) {
        const endShape = getShape(conn.endShapeId);
        if (endShape) {
          newEndPos = getNearestEdgePoint(endShape, conn.startPosition);
          needsUpdate = true;
        }
      }

      if (
        conn.startShapeId &&
        !movedShapeIds.includes(conn.startShapeId) &&
        conn.endShapeId
      ) {
        const startShape = getShape(conn.startShapeId);
        if (startShape) {
          const currentStart = getNearestEdgePoint(startShape, newEndPos);
          if (
            Math.abs(currentStart.x - conn.startPosition.x) > 1 ||
            Math.abs(currentStart.y - conn.startPosition.y) > 1
          ) {
            newStartPos = currentStart;
            needsUpdate = true;
          }
        }
      }

      if (
        conn.endShapeId &&
        !movedShapeIds.includes(conn.endShapeId) &&
        conn.startShapeId
      ) {
        const endShape = getShape(conn.endShapeId);
        if (endShape) {
          const currentEnd = getNearestEdgePoint(endShape, newStartPos);
          if (
            Math.abs(currentEnd.x - conn.endPosition.x) > 1 ||
            Math.abs(currentEnd.y - conn.endPosition.y) > 1
          ) {
            newEndPos = currentEnd;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        const allX = [newStartPos.x, newEndPos.x];
        const allY = [newStartPos.y, newEndPos.y];
        if (conn.controlPoints) {
          conn.controlPoints.forEach((p: { x: number; y: number }) => {
            allX.push(p.x);
            allY.push(p.y);
          });
        }

        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);

        updateShape(conn.id, {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          startPosition: newStartPos,
          endPosition: newEndPos,
        });
      }
    });
  },
}));
