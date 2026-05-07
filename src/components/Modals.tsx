import React, { useState, useEffect, useRef } from 'react';
import { useUIStore, useProjectStore, useHistoryStore, useSelectionStore, useCanvasStore } from '../store';
import { addProject, saveShapes, deleteProject as deleteProjectFromDB, renameProject as renameProjectInDB } from '../db';

export const NewProjectModal: React.FC = () => {
  const { modals, closeModal } = useUIStore();
  const { createProject, shapes, currentProjectId } = useProjectStore();
  const { clearHistory } = useHistoryStore();
  const { clearSelection } = useSelectionStore();
  
  const [name, setName] = useState('未命名项目');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modals.newProject && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [modals.newProject]);

  const handleConfirm = async () => {
    if (!name.trim()) return;
    
    if (currentProjectId && shapes.length > 0) {
      await saveShapes(currentProjectId, shapes);
    }
    
    const project = createProject(name.trim());
    await addProject(project);
    
    clearHistory();
    clearSelection();
    closeModal('newProject');
    setName('未命名项目');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      closeModal('newProject');
    }
  };

  if (!modals.newProject) return null;

  return (
    <div className="modal-overlay" onClick={() => closeModal('newProject')}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">新建项目</div>
        <input
          ref={inputRef}
          type="text"
          className="modal-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入项目名称"
        />
        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={() => closeModal('newProject')}>
            取消
          </button>
          <button className="modal-btn primary" onClick={handleConfirm}>
            创建
          </button>
        </div>
      </div>
    </div>
  );
};

export const RenameProjectModal: React.FC = () => {
  const { modals, closeModal } = useUIStore();
  const { projects, currentProjectId, renameProject } = useProjectStore();
  
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modals.renameProject && currentProjectId) {
      const project = projects.find((p) => p.id === currentProjectId);
      if (project) {
        setName(project.name);
      }
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [modals.renameProject, projects, currentProjectId]);

  const handleConfirm = async () => {
    if (!name.trim() || !currentProjectId) return;
    
    renameProject(currentProjectId, name.trim());
    
    await renameProjectInDB(currentProjectId, name.trim());
    
    closeModal('renameProject');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      closeModal('renameProject');
    }
  };

  if (!modals.renameProject) return null;

  return (
    <div className="modal-overlay" onClick={() => closeModal('renameProject')}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">重命名项目</div>
        <input
          ref={inputRef}
          type="text"
          className="modal-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入新名称"
        />
        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={() => closeModal('renameProject')}>
            取消
          </button>
          <button className="modal-btn primary" onClick={handleConfirm}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
};

export const DeleteProjectModal: React.FC = () => {
  const { modals, closeModal } = useUIStore();
  const { projects, currentProjectId, setCurrentProject, setShapes, setProjects } = useProjectStore();
  const { clearHistory } = useHistoryStore();
  const { clearSelection } = useSelectionStore();

  const currentProject = currentProjectId ? projects.find((p) => p.id === currentProjectId) : null;

  const handleConfirm = async () => {
    if (!currentProjectId) return;
    
    await deleteProjectFromDB(currentProjectId);
    
    const newProjects = projects.filter((p) => p.id !== currentProjectId);
    setProjects(newProjects);
    
    if (newProjects.length > 0) {
      setCurrentProject(newProjects[0].id);
    } else {
      setCurrentProject('');
      setShapes([]);
    }
    
    clearHistory();
    clearSelection();
    closeModal('deleteProject');
  };

  if (!modals.deleteProject) return null;

  return (
    <div className="modal-overlay" onClick={() => closeModal('deleteProject')}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">删除项目</div>
        <p style={{ marginBottom: '16px', color: '#b0b0b0' }}>
          确定要删除项目 <strong style={{ color: '#e0e0e0' }}>"{currentProject?.name}"</strong> 吗？
        </p>
        <p style={{ marginBottom: '16px', color: '#909090', fontSize: '13px' }}>
          此操作无法撤销，所有画布内容将被永久删除。
        </p>
        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={() => closeModal('deleteProject')}>
            取消
          </button>
          <button className="modal-btn primary" onClick={handleConfirm} style={{ backgroundColor: '#dc2626' }}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

export const ExportModal: React.FC = () => {
  const { modals, closeModal } = useUIStore();
  const { shapes, currentProjectId } = useProjectStore();
  const { offsetX, offsetY, zoom } = useCanvasStore();
  const { selectedShapeIds } = useSelectionStore();

  const [exportMode, setExportMode] = useState<'all' | 'selection'>('all');
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png');

  const handleExport = async () => {
    const exportShapes = exportMode === 'selection'
      ? shapes.filter((s) => selectedShapeIds.includes(s.id))
      : shapes;

    if (exportShapes.length === 0) {
      alert('没有可导出的图形');
      return;
    }

    if (exportFormat === 'png') {
      await exportAsPNG(exportShapes);
    } else {
      exportAsSVG(exportShapes);
    }

    closeModal('export');
  };

  const exportAsPNG = async (exportShapes: typeof shapes) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const padding = 20;
    const scale = 2;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    exportShapes.forEach((shape) => {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + shape.width);
      maxY = Math.max(maxY, shape.y + shape.height);
    });

    const width = (maxX - minX + padding * 2) * scale;
    const height = (maxY - minY + padding * 2) * scale;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    ctx.scale(scale, scale);
    ctx.translate(padding - minX, padding - minY);

    exportShapes
      .sort((a, b) => a.zIndex - b.zIndex)
      .forEach((shape) => {
        drawShape(ctx, shape);
      });

    const dataUrl = canvas.toDataURL('image/png');
    downloadFile(dataUrl, 'whiteboard.png');
  };

  const exportAsSVG = (exportShapes: typeof shapes) => {
    const padding = 20;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    exportShapes.forEach((shape) => {
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + shape.width);
      maxY = Math.max(maxY, shape.y + shape.height);
    });

    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const offsetX = padding - minX;
    const offsetY = padding - minY;

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#1a1a2e"/>
`;

    exportShapes
      .sort((a, b) => a.zIndex - b.zIndex)
      .forEach((shape) => {
        svgContent += shapeToSVG(shape, offsetX, offsetY) + '\n';
      });

    svgContent += '</svg>';

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    downloadFile(url, 'whiteboard.svg');
    URL.revokeObjectURL(url);
  };

  const drawShape = (ctx: CanvasRenderingContext2D, shape: typeof shapes[0]) => {
    ctx.globalAlpha = shape.style.opacity;
    ctx.fillStyle = shape.style.fillColor;
    ctx.strokeStyle = shape.style.strokeColor;
    ctx.lineWidth = shape.style.strokeWidth;

    switch (shape.style.strokeStyle) {
      case 'dashed': ctx.setLineDash([8, 4]); break;
      case 'dotted': ctx.setLineDash([2, 2]); break;
      default: ctx.setLineDash([]);
    }

    ctx.save();
    if (shape.rotation !== 0) {
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((shape.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    switch (shape.type) {
      case 'rectangle':
        const r = (shape as any).cornerRadius || 0;
        if (r > 0) {
          const radius = Math.min(r, shape.width / 2, shape.height / 2);
          ctx.beginPath();
          ctx.moveTo(shape.x + radius, shape.y);
          ctx.lineTo(shape.x + shape.width - radius, shape.y);
          ctx.quadraticCurveTo(shape.x + shape.width, shape.y, shape.x + shape.width, shape.y + radius);
          ctx.lineTo(shape.x + shape.width, shape.y + shape.height - radius);
          ctx.quadraticCurveTo(shape.x + shape.width, shape.y + shape.height, shape.x + shape.width - radius, shape.y + shape.height);
          ctx.lineTo(shape.x + radius, shape.y + shape.height);
          ctx.quadraticCurveTo(shape.x, shape.y + shape.height, shape.x, shape.y + shape.height - radius);
          ctx.lineTo(shape.x, shape.y + radius);
          ctx.quadraticCurveTo(shape.x, shape.y, shape.x + radius, shape.y);
          ctx.closePath();
        } else {
          ctx.beginPath();
          ctx.rect(shape.x, shape.y, shape.width, shape.height);
        }
        if (shape.style.fillColor !== 'transparent') ctx.fill();
        if (shape.style.strokeWidth > 0) ctx.stroke();
        break;

      case 'circle':
        const cr = Math.min(shape.width, shape.height) / 2;
        ctx.beginPath();
        ctx.arc(shape.x + shape.width / 2, shape.y + shape.height / 2, cr, 0, Math.PI * 2);
        if (shape.style.fillColor !== 'transparent') ctx.fill();
        if (shape.style.strokeWidth > 0) ctx.stroke();
        break;

      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(
          shape.x + shape.width / 2,
          shape.y + shape.height / 2,
          shape.width / 2,
          shape.height / 2,
          0, 0, Math.PI * 2
        );
        if (shape.style.fillColor !== 'transparent') ctx.fill();
        if (shape.style.strokeWidth > 0) ctx.stroke();
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(shape.x + shape.width / 2, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(shape.x, shape.y + shape.height);
        ctx.closePath();
        if (shape.style.fillColor !== 'transparent') ctx.fill();
        if (shape.style.strokeWidth > 0) ctx.stroke();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(shape.x + shape.width / 2, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height / 2);
        ctx.lineTo(shape.x + shape.width / 2, shape.y + shape.height);
        ctx.lineTo(shape.x, shape.y + shape.height / 2);
        ctx.closePath();
        if (shape.style.fillColor !== 'transparent') ctx.fill();
        if (shape.style.strokeWidth > 0) ctx.stroke();
        break;

      case 'line':
      case 'arrow':
        const lineShape = shape as any;
        if (lineShape.points && lineShape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(lineShape.points[0].x, lineShape.points[0].y);
          for (let i = 1; i < lineShape.points.length; i++) {
            ctx.lineTo(lineShape.points[i].x, lineShape.points[i].y);
          }
          ctx.stroke();

          if (shape.type === 'arrow') {
            const start = lineShape.points[lineShape.points.length - 2];
            const end = lineShape.points[lineShape.points.length - 1];
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const arrowLength = 15;
            const arrowAngle = Math.PI / 6;

            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowLength * Math.cos(angle - arrowAngle),
              end.y - arrowLength * Math.sin(angle - arrowAngle)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - arrowLength * Math.cos(angle + arrowAngle),
              end.y - arrowLength * Math.sin(angle + arrowAngle)
            );
            ctx.stroke();
          }
        }
        break;

      case 'pen':
        const penShape = shape as any;
        if (penShape.points && penShape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(penShape.points[0].x, penShape.points[0].y);
          for (let i = 1; i < penShape.points.length; i++) {
            ctx.lineTo(penShape.points[i].x, penShape.points[i].y);
          }
          ctx.stroke();
        }
        break;

      case 'text':
        const textShape = shape as any;
        ctx.font = `${textShape.fontSize}px ${textShape.fontFamily || '-apple-system, sans-serif'}`;
        ctx.textAlign = textShape.textAlign || 'left';
        ctx.textBaseline = 'top';
        const lines = textShape.text.split('\n');
        const lineHeight = textShape.fontSize * 1.2;
        lines.forEach((line: string, i: number) => {
          ctx.fillText(line, shape.x, shape.y + i * lineHeight);
        });
        break;
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  };

  const shapeToSVG = (shape: typeof shapes[0], offsetX: number, offsetY: number): string => {
    let result = '';
    const x = shape.x + offsetX;
    const y = shape.y + offsetY;
    const opacity = shape.style.opacity;

    if (opacity === 0) return '';

    const style = `fill="${shape.style.fillColor === 'transparent' ? 'none' : shape.style.fillColor}" 
      stroke="${shape.style.strokeColor}" 
      stroke-width="${shape.style.strokeWidth}"
      ${shape.style.strokeStyle === 'dashed' ? 'stroke-dasharray="8,4"' : ''}
      ${shape.style.strokeStyle === 'dotted' ? 'stroke-dasharray="2,2"' : ''}
      opacity="${opacity}"`;

    const cx = x + shape.width / 2;
    const cy = y + shape.height / 2;
    const transform = shape.rotation !== 0 
      ? ` transform="rotate(${shape.rotation}, ${cx}, ${cy})"` 
      : '';

    switch (shape.type) {
      case 'rectangle':
        const r = (shape as any).cornerRadius || 0;
        result = `<rect x="${x}" y="${y}" width="${shape.width}" height="${shape.height}" 
          ${r > 0 ? `rx="${r}"` : ''} ${style}${transform}/>`;
        break;

      case 'circle':
        const cr = Math.min(shape.width, shape.height) / 2;
        result = `<circle cx="${cx}" cy="${cy}" r="${cr}" ${style}${transform}/>`;
        break;

      case 'ellipse':
        result = `<ellipse cx="${cx}" cy="${cy}" rx="${shape.width / 2}" ry="${shape.height / 2}" 
          ${style}${transform}/>`;
        break;

      case 'triangle':
        const tx = x + shape.width / 2;
        result = `<polygon points="${tx},${y} ${x + shape.width},${y + shape.height} ${x},${y + shape.height}" 
          ${style}${transform}/>`;
        break;

      case 'diamond':
        const dx = x + shape.width / 2;
        const dy = y + shape.height / 2;
        result = `<polygon points="${dx},${y} ${x + shape.width},${dy} ${dx},${y + shape.height} ${x},${dy}" 
          ${style}${transform}/>`;
        break;

      case 'line':
      case 'arrow':
        const lineShape = shape as any;
        if (lineShape.points && lineShape.points.length >= 2) {
          const pointsStr = lineShape.points.map((p: any) => `${p.x + offsetX},${p.y + offsetY}`).join(' ');
          result = `<polyline points="${pointsStr}" fill="none" stroke="${shape.style.strokeColor}" 
            stroke-width="${shape.style.strokeWidth}" opacity="${opacity}"/>`;
        }
        break;

      case 'pen':
        const penShape = shape as any;
        if (penShape.points && penShape.points.length >= 2) {
          const pointsStr = penShape.points.map((p: any) => `${p.x + offsetX},${p.y + offsetY}`).join(' ');
          result = `<polyline points="${pointsStr}" fill="none" stroke="${shape.style.strokeColor}" 
            stroke-width="${shape.style.strokeWidth}" opacity="${opacity}"
            stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        break;

      case 'text':
        const textShape = shape as any;
        const fontSize = textShape.fontSize || 16;
        const fontFamily = textShape.fontFamily || '-apple-system, sans-serif';
        const lines = textShape.text.split('\n');
        const lineHeight = fontSize * 1.2;
        
        lines.forEach((line: string, i: number) => {
          result += `<text x="${x}" y="${y + i * lineHeight}" 
            font-family="${fontFamily}" font-size="${fontSize}" 
            fill="${shape.style.strokeColor}" opacity="${opacity}">${line}</text>\n`;
        });
        break;
    }

    return result;
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!modals.export) return null;

  return (
    <div className="modal-overlay" onClick={() => closeModal('export')}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">导出</div>

        <div className="export-options">
          <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>格式</div>
          <label className="export-option">
            <input
              type="radio"
              name="format"
              checked={exportFormat === 'png'}
              onChange={() => setExportFormat('png')}
            />
            PNG (位图)
          </label>
          <label className="export-option">
            <input
              type="radio"
              name="format"
              checked={exportFormat === 'svg'}
              onChange={() => setExportFormat('svg')}
            />
            SVG (矢量)
          </label>
        </div>

        <div className="export-options">
          <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '13px' }}>范围</div>
          <label className="export-option">
            <input
              type="radio"
              name="range"
              checked={exportMode === 'all'}
              onChange={() => setExportMode('all')}
            />
            整个画布 ({shapes.length} 个图形)
          </label>
          <label className="export-option" style={{ opacity: selectedShapeIds.length > 0 ? 1 : 0.5 }}>
            <input
              type="radio"
              name="range"
              checked={exportMode === 'selection'}
              onChange={() => setExportMode('selection')}
              disabled={selectedShapeIds.length === 0}
            />
            仅选中 ({selectedShapeIds.length} 个图形)
          </label>
        </div>

        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={() => closeModal('export')}>
            取消
          </button>
          <button className="modal-btn primary" onClick={handleExport}>
            导出
          </button>
        </div>
      </div>
    </div>
  );
};

const Modals: React.FC = () => {
  return (
    <>
      <NewProjectModal />
      <RenameProjectModal />
      <DeleteProjectModal />
      <ExportModal />
    </>
  );
};

export default Modals;
