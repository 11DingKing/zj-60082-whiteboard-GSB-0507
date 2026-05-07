import React from 'react';
import { ToolType, BorderStyle } from '../types';
import { useToolStore, useSelectionStore, useCanvasStore, useHistoryStore, useProjectStore, useUIStore } from '../store';

const TOOLS: { type: ToolType; icon: string; label: string }[] = [
  { type: 'select', icon: '✋', label: '选择' },
  { type: 'rectangle', icon: '⬜', label: '矩形' },
  { type: 'circle', icon: '⭕', label: '圆形' },
  { type: 'ellipse', icon: '🔵', label: '椭圆' },
  { type: 'triangle', icon: '△', label: '三角形' },
  { type: 'diamond', icon: '◆', label: '菱形' },
  { type: 'line', icon: '━', label: '直线' },
  { type: 'arrow', icon: '➤', label: '箭头' },
  { type: 'pen', icon: '✎', label: '画笔' },
  { type: 'text', icon: 'T', label: '文本' },
];

const Toolbar: React.FC = () => {
  const {
    currentTool,
    fillColor,
    strokeColor,
    strokeWidth,
    strokeStyle,
    opacity,
    fontSize,
    cornerRadius,
    setCurrentTool,
    setFillColor,
    setStrokeColor,
    setStrokeWidth,
    setStrokeStyle,
    setOpacity,
    setFontSize,
    setCornerRadius,
  } = useToolStore();
  
  const { selectedShapeIds, clearSelection } = useSelectionStore();
  const { showGrid, setShowGrid } = useCanvasStore();
  const { canUndo, canRedo, undo, redo } = useHistoryStore();
  const {
    getShape,
    getShapes,
    updateShape,
    groupShapes,
    ungroupShape,
    alignLeft,
    alignCenterHorizontal,
    alignRight,
    alignTop,
    alignCenterVertical,
    alignBottom,
    distributeHorizontally,
    distributeVertically,
  } = useProjectStore();
  const { openModal } = useUIStore();

  const handleUndo = () => {
    if (canUndo) {
      const prevShapes = undo();
      if (prevShapes !== null) {
        useProjectStore.setState({ shapes: prevShapes });
      }
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const nextShapes = redo();
      if (nextShapes !== null) {
        useProjectStore.setState({ shapes: nextShapes });
      }
    }
  };

  const handleGroup = () => {
    if (selectedShapeIds.length >= 2) {
      const groupId = groupShapes(selectedShapeIds);
      if (groupId) {
        clearSelection();
        useSelectionStore.setState({ selectedShapeIds: [groupId] });
      }
    }
  };

  const handleUngroup = () => {
    if (selectedShapeIds.length === 1) {
      const shape = getShape(selectedShapeIds[0]);
      if (shape && shape.type === 'group') {
        const childIds = ungroupShape(shape.id);
        clearSelection();
        childIds.forEach((id) => useSelectionStore.setState({
          selectedShapeIds: [...useSelectionStore.getState().selectedShapeIds, id]
        }));
      }
    }
  };

  const handleAlignLeft = () => {
    alignLeft(selectedShapeIds);
  };

  const handleAlignCenter = () => {
    alignCenterHorizontal(selectedShapeIds);
  };

  const handleAlignRight = () => {
    alignRight(selectedShapeIds);
  };

  const handleAlignTop = () => {
    alignTop(selectedShapeIds);
  };

  const handleAlignMiddle = () => {
    alignCenterVertical(selectedShapeIds);
  };

  const handleAlignBottom = () => {
    alignBottom(selectedShapeIds);
  };

  const handleDistributeHorizontally = () => {
    distributeHorizontally(selectedShapeIds);
  };

  const handleDistributeVertically = () => {
    distributeVertically(selectedShapeIds);
  };

  return (
    <div className="top-toolbar">
      {TOOLS.map((tool) => (
        <button
          key={tool.type}
          className={`tool-btn ${currentTool === tool.type ? 'active' : ''}`}
          onClick={() => setCurrentTool(tool.type)}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}

      <div className="tool-divider" />

      <div className="style-selector">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#909090' }}>填充</span>
          <input
            type="color"
            className="color-input"
            value={fillColor === 'rgba(255, 255, 255, 0)' || fillColor === 'transparent' ? '#ffffff' : fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            style={{ opacity: fillColor === 'transparent' || fillColor === 'rgba(255, 255, 255, 0)' ? 0.3 : 1 }}
          />
          <button
            className="icon-btn"
            onClick={() => setFillColor(fillColor === 'transparent' ? '#ffffff' : 'transparent')}
            title="切换无填充"
            style={{ fontSize: '10px' }}
          >
            {fillColor === 'transparent' ? 'X' : '✓'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#909090' }}>边框</span>
          <input
            type="color"
            className="color-input"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#909090' }}>粗细</span>
          <input
            type="number"
            className="prop-input"
            style={{ width: '50px', padding: '4px 8px' }}
            value={strokeWidth}
            min={0}
            max={50}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value) || 0)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#909090' }}>样式</span>
          <select
            className="border-style-select"
            value={strokeStyle}
            onChange={(e) => setStrokeStyle(e.target.value as BorderStyle)}
          >
            <option value="solid">实线</option>
            <option value="dashed">虚线</option>
            <option value="dotted">点线</option>
          </select>
        </div>
      </div>

      <div className="tool-divider" />

      <div className="style-selector">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#909090' }}>透明度</span>
          <input
            type="range"
            className="prop-slider"
            min={0}
            max={1}
            step={0.1}
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
          />
          <span className="prop-slider-value">{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      <div className="tool-divider" />

      <div className="align-toolbar">
        <button className="tool-btn" onClick={handleAlignLeft} title="左对齐" disabled={selectedShapeIds.length < 2}>
          ⬅
        </button>
        <button className="tool-btn" onClick={handleAlignCenter} title="水平居中" disabled={selectedShapeIds.length < 2}>
          ⟷
        </button>
        <button className="tool-btn" onClick={handleAlignRight} title="右对齐" disabled={selectedShapeIds.length < 2}>
          ➡
        </button>
        <div style={{ width: '4px' }} />
        <button className="tool-btn" onClick={handleDistributeHorizontally} title="等间距水平分布" disabled={selectedShapeIds.length < 3}>
          ⇄
        </button>
        <button className="tool-btn" onClick={handleDistributeVertically} title="等间距垂直分布" disabled={selectedShapeIds.length < 3}>
          ⇅
        </button>
        <div style={{ width: '4px' }} />
        <button className="tool-btn" onClick={handleAlignTop} title="上对齐" disabled={selectedShapeIds.length < 2}>
          ⬆
        </button>
        <button className="tool-btn" onClick={handleAlignMiddle} title="垂直居中" disabled={selectedShapeIds.length < 2}>
          ↕
        </button>
        <button className="tool-btn" onClick={handleAlignBottom} title="下对齐" disabled={selectedShapeIds.length < 2}>
          ⬇
        </button>
      </div>

      <div className="tool-divider" />

      <div className="group-toolbar">
        <button className="tool-btn" onClick={handleGroup} title="分组 (Ctrl+G)" disabled={selectedShapeIds.length < 2}>
          📦
        </button>
        <button className="tool-btn" onClick={handleUngroup} title="取消分组 (Ctrl+Shift+G)" disabled={selectedShapeIds.length !== 1}>
          📤
        </button>
      </div>

      <div className="tool-divider" />

      <div className="style-selector">
        <button
          className="tool-btn"
          onClick={() => setShowGrid(!showGrid)}
          title="显示/隐藏网格"
          style={{ opacity: showGrid ? 1 : 0.4 }}
        >
          ⊞
        </button>
      </div>

      <div className="undo-toolbar">
        <button className="tool-btn" onClick={handleUndo} title="撤销 (Ctrl+Z)" disabled={!canUndo}>
          ↩
        </button>
        <button className="tool-btn" onClick={handleRedo} title="重做 (Ctrl+Y)" disabled={!canRedo}>
          ↪
        </button>
      </div>

      <div className="export-toolbar">
        <button className="tool-btn" onClick={() => openModal('export')} title="导出">
          💾
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
