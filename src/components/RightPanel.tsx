import React from 'react';
import { Shape, BorderStyle } from '../types';
import { getShapeTypeIcon, formatNumber } from '../utils';
import { useUIStore, useProjectStore, useSelectionStore, useToolStore } from '../store';

const RightPanel: React.FC = () => {
  const { rightPanelTab, setRightPanelTab } = useUIStore();
  const {
    shapes,
    getShape,
    getSortedShapes,
    updateShape,
    removeShape,
    moveToTop,
    moveToBottom,
    moveUp,
    moveDown,
  } = useProjectStore();
  const { selectedShapeIds, selectShape, clearSelection } = useSelectionStore();

  const sortedShapes = [...getSortedShapes()].filter((s) => s.type !== 'group').reverse();
  const hasSelection = selectedShapeIds.length > 0;
  const singleSelection = selectedShapeIds.length === 1;

  const selectedShape = singleSelection ? getShape(selectedShapeIds[0]) : null;

  const handleVisibilityToggle = (e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    const shape = getShape(shapeId);
    if (shape) {
      updateShape(shapeId, { visible: !shape.visible });
    }
  };

  const handleLockToggle = (e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    const shape = getShape(shapeId);
    if (shape) {
      updateShape(shapeId, { locked: !shape.locked });
    }
  };

  const handleDeleteShape = (e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    removeShape(shapeId);
    if (selectedShapeIds.includes(shapeId)) {
      clearSelection();
    }
  };

  const handlePropertyChange = (key: string, value: any) => {
    if (!selectedShape) return;
    
    if (key.startsWith('style.')) {
      const styleKey = key.split('.')[1] as keyof typeof selectedShape.style;
      updateShape(selectedShape.id, {
        style: { ...selectedShape.style, [styleKey]: value },
      });
    } else {
      updateShape(selectedShape.id, { [key]: value });
    }
  };

  return (
    <div className="right-panel">
      <div className="right-panel-tabs">
        <button
          className={`tab-btn ${rightPanelTab === 'layers' ? 'active' : ''}`}
          onClick={() => setRightPanelTab('layers')}
        >
          图层
        </button>
        <button
          className={`tab-btn ${rightPanelTab === 'properties' ? 'active' : ''}`}
          onClick={() => setRightPanelTab('properties')}
        >
          属性
        </button>
      </div>

      <div className="tab-content">
        {rightPanelTab === 'layers' ? (
          <>
            {sortedShapes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">暂无图层</div>
              </div>
            ) : (
              sortedShapes.map((shape) => (
                <div
                  key={shape.id}
                  className={`layer-item ${selectedShapeIds.includes(shape.id) ? 'selected' : ''} ${shape.locked ? 'locked' : ''}`}
                  onClick={() => selectShape(shape.id)}
                  style={{ opacity: shape.visible ? 1 : 0.5 }}
                >
                  <div className="layer-preview">
                    {getShapeTypeIcon(shape.type)}
                  </div>
                  <div className="layer-name">{shape.name}</div>
                  <div className="layer-btns">
                    <button
                      className={`layer-btn ${!shape.visible ? 'hidden' : ''}`}
                      onClick={(e) => handleVisibilityToggle(e, shape.id)}
                      title={shape.visible ? '隐藏' : '显示'}
                    >
                      {shape.visible ? '👁' : '👁‍🗨'}
                    </button>
                    <button
                      className={`layer-btn ${shape.locked ? 'hidden' : ''}`}
                      onClick={(e) => handleLockToggle(e, shape.id)}
                      title={shape.locked ? '解锁' : '锁定'}
                    >
                      {shape.locked ? '🔒' : '🔓'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            {!hasSelection ? (
              <div className="no-properties">
                选择一个图形以编辑属性
              </div>
            ) : !singleSelection ? (
              <div className="no-properties">
                已选择 {selectedShapeIds.length} 个图形
              </div>
            ) : selectedShape ? (
              <div className="properties-panel">
                <div className="prop-group">
                  <div className="prop-group-title">位置与尺寸</div>
                  
                  <div className="prop-row">
                    <label className="prop-label">X</label>
                    <input
                      type="number"
                      className="prop-input"
                      value={formatNumber(selectedShape.x)}
                      onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="prop-row">
                    <label className="prop-label">Y</label>
                    <input
                      type="number"
                      className="prop-input"
                      value={formatNumber(selectedShape.y)}
                      onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="prop-row">
                    <label className="prop-label">宽度</label>
                    <input
                      type="number"
                      className="prop-input"
                      value={formatNumber(selectedShape.width)}
                      onChange={(e) => handlePropertyChange('width', Math.max(1, parseFloat(e.target.value) || 1))}
                    />
                  </div>
                  
                  <div className="prop-row">
                    <label className="prop-label">高度</label>
                    <input
                      type="number"
                      className="prop-input"
                      value={formatNumber(selectedShape.height)}
                      onChange={(e) => handlePropertyChange('height', Math.max(1, parseFloat(e.target.value) || 1))}
                    />
                  </div>
                  
                  <div className="prop-row">
                    <label className="prop-label">旋转</label>
                    <input
                      type="number"
                      className="prop-input"
                      value={formatNumber(selectedShape.rotation)}
                      onChange={(e) => handlePropertyChange('rotation', parseFloat(e.target.value) || 0)}
                    />
                    <span style={{ fontSize: '12px', color: '#909090' }}>°</span>
                  </div>
                </div>

                <div className="prop-group">
                  <div className="prop-group-title">样式</div>
                  
                  <div className="prop-row">
                    <label className="prop-label">填充色</label>
                    <input
                      type="color"
                      className="color-input"
                      value={
                        selectedShape.style.fillColor === 'transparent' || 
                        selectedShape.style.fillColor === 'rgba(255, 255, 255, 0)'
                          ? '#ffffff'
                          : selectedShape.style.fillColor
                      }
                      onChange={(e) => handlePropertyChange('style.fillColor', e.target.value)}
                    />
                  </div>
                  
                  <div className="prop-row">
                    <label className="prop-label">边框色</label>
                    <input
                      type="color"
                      className="color-input"
                      value={selectedShape.style.strokeColor}
                      onChange={(e) => handlePropertyChange('style.strokeColor', e.target.value)}
                    />
                  </div>
                  
                  <div className="prop-row">
                    <label className="prop-label">边框粗细</label>
                    <input
                      type="number"
                      className="prop-input"
                      value={selectedShape.style.strokeWidth}
                      min={0}
                      max={50}
                      onChange={(e) => handlePropertyChange('style.strokeWidth', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="prop-row">
                    <label className="prop-label">边框样式</label>
                    <select
                      className="border-style-select"
                      value={selectedShape.style.strokeStyle}
                      onChange={(e) => handlePropertyChange('style.strokeStyle', e.target.value as BorderStyle)}
                    >
                      <option value="solid">实线</option>
                      <option value="dashed">虚线</option>
                      <option value="dotted">点线</option>
                    </select>
                  </div>
                  
                  <div className="prop-row">
                    <label className="prop-label">透明度</label>
                    <input
                      type="range"
                      className="prop-slider"
                      min={0}
                      max={1}
                      step={0.1}
                      value={selectedShape.style.opacity}
                      onChange={(e) => handlePropertyChange('style.opacity', parseFloat(e.target.value))}
                    />
                    <span className="prop-slider-value">
                      {Math.round(selectedShape.style.opacity * 100)}%
                    </span>
                  </div>
                </div>

                {selectedShape.type === 'rectangle' && (
                  <div className="prop-group">
                    <div className="prop-group-title">矩形</div>
                    <div className="prop-row">
                      <label className="prop-label">圆角</label>
                      <input
                        type="number"
                        className="prop-input"
                        value={(selectedShape as any).cornerRadius || 0}
                        min={0}
                        onChange={(e) => handlePropertyChange('cornerRadius', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}

                {selectedShape.type === 'text' && (
                  <div className="prop-group">
                    <div className="prop-group-title">文本</div>
                    <div className="prop-row">
                      <label className="prop-label">字号</label>
                      <input
                        type="number"
                        className="prop-input"
                        value={(selectedShape as any).fontSize || 16}
                        min={8}
                        max={200}
                        onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value) || 16)}
                      />
                    </div>
                  </div>
                )}

                <div className="prop-group">
                  <div className="prop-group-title">图层顺序</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="icon-btn" onClick={() => moveToTop(selectedShape.id)} title="置顶">
                      ⤴
                    </button>
                    <button className="icon-btn" onClick={() => moveUp(selectedShape.id)} title="上移一层">
                      ↑
                    </button>
                    <button className="icon-btn" onClick={() => moveDown(selectedShape.id)} title="下移一层">
                      ↓
                    </button>
                    <button className="icon-btn" onClick={() => moveToBottom(selectedShape.id)} title="置底">
                      ⤵
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default RightPanel;
