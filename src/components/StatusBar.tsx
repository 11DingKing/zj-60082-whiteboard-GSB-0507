import React, { useState } from 'react';
import { useCanvasStore, useSelectionStore } from '../store';

const StatusBar: React.FC = () => {
  const { offsetX, offsetY, zoom, resetView } = useCanvasStore();
  const { selectedShapeIds } = useSelectionStore();
  
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="bottom-statusbar">
      <div className="status-item">
        <span>缩放:</span>
        <span className="zoom-indicator" onClick={resetView} title="点击重置为 100%">
          {zoomPercent}%
        </span>
      </div>
      
      <div className="status-item">
        <span>画布坐标:</span>
        <span>
          X: {Math.round(-offsetX / zoom)} Y: {Math.round(-offsetY / zoom)}
        </span>
      </div>
      
      <div className="status-item">
        <span>已选择:</span>
        <span>
          {selectedShapeIds.length} 个图形
        </span>
      </div>
      
      <div className="status-item" style={{ marginLeft: 'auto' }}>
        <span style={{ color: '#606060', fontSize: '11px' }}>
          提示: 中键拖拽/空格+左键平移，滚轮缩放
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
