import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { useProjectStore, useUIStore, useCanvasStore, useSelectionStore, useHistoryStore } from '../store';
import { getAllProjects, getShapesByProject, saveShapes } from '../db';
import { TEMPLATE_CATEGORIES, Template } from '../templates';

const LeftPanel: React.FC = () => {
  const { leftPanelCollapsed, toggleLeftPanel, openModal, leftPanelTab, setLeftPanelTab } = useUIStore();
  const {
    projects,
    currentProjectId,
    shapes,
    setProjects,
    setCurrentProject,
    setShapes,
    addShape,
    getNextZIndex,
    getShapeName,
    groupShapes,
  } = useProjectStore();
  const { resetView } = useCanvasStore();
  const { clearSelection, selectShape } = useSelectionStore();
  const { clearHistory } = useHistoryStore();

  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(TEMPLATE_CATEGORIES[0].id);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectsData = await getAllProjects();
      setProjects(projectsData);
      
      if (projectsData.length > 0 && !currentProjectId) {
        await selectProject(projectsData[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProject = async (projectId: string) => {
    if (currentProjectId && shapes.length > 0) {
      await saveShapes(currentProjectId, shapes);
    }
    
    setCurrentProject(projectId);
    clearSelection();
    resetView();
    clearHistory();
    
    try {
      const projectShapes = await getShapesByProject(projectId);
      setShapes(projectShapes);
    } catch (error) {
      console.error('Failed to load project shapes:', error);
    }
  };

  const handleNewProject = () => {
    openModal('newProject');
  };

  const handleRenameProject = (e: React.MouseEvent, _project: Project) => {
    e.stopPropagation();
  };

  const handleDeleteProject = (e: React.MouseEvent, _project: Project) => {
    e.stopPropagation();
  };

  const insertTemplate = (template: Template) => {
    const { offsetX, offsetY, zoom } = useCanvasStore.getState();
    const defaultViewportWidth = 800;
    const defaultViewportHeight = 600;
    const canvasCenterX = (defaultViewportWidth / 2 - offsetX) / zoom;
    const canvasCenterY = (defaultViewportHeight / 2 - offsetY) / zoom;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    template.shapes.forEach((s) => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    });
    const templateCenterX = minX + (maxX - minX) / 2;
    const templateCenterY = minY + (maxY - minY) / 2;
    const offsetCenterX = canvasCenterX - templateCenterX;
    const offsetCenterY = canvasCenterY - templateCenterY;

    const shapeIds: string[] = [];
    let zIndex = getNextZIndex();

    template.shapes.forEach((templateShape) => {
      const baseShape = {
        id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
        type: templateShape.type,
        x: templateShape.x + offsetCenterX,
        y: templateShape.y + offsetCenterY,
        width: templateShape.width,
        height: templateShape.height,
        rotation: 0,
        style: templateShape.style,
        visible: true,
        locked: false,
        zIndex: zIndex++,
        name: getShapeName(templateShape.type),
      };

      let newShape: any;
      switch (templateShape.type) {
        case 'rectangle':
          newShape = { ...baseShape, cornerRadius: templateShape.cornerRadius ?? 0 };
          break;
        case 'circle':
        case 'ellipse':
        case 'triangle':
        case 'diamond':
          newShape = { ...baseShape };
          break;
        default:
          newShape = { ...baseShape, cornerRadius: 0 };
      }

      addShape(newShape);
      shapeIds.push(newShape.id);
    });

    if (shapeIds.length >= 2) {
      const groupId = groupShapes(shapeIds);
      if (groupId) {
        clearSelection();
        selectShape(groupId);
      }
    } else if (shapeIds.length === 1) {
      selectShape(shapeIds[0]);
    }
  };

  if (leftPanelCollapsed) {
    return (
      <div className="left-panel collapsed">
        <div className="left-panel-header">
          <button className="icon-btn" onClick={toggleLeftPanel} title="展开面板">
            ◀
          </button>
        </div>
      </div>
    );
  }

  const renderProjectsTab = () => (
    <>
      <button className="add-project-btn" onClick={handleNewProject}>
        <span>+</span>
        <span>新建项目</span>
      </button>

      <div className="project-list">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-text">加载中...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">暂无项目，点击上方按钮新建</div>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={`project-item ${currentProjectId === project.id ? 'active' : ''}`}
              onClick={() => selectProject(project.id)}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.name}
              </span>
              <div className="project-item-actions">
                <button
                  className="icon-btn"
                  style={{ width: '20px', height: '20px', fontSize: '12px' }}
                  onClick={(e) => handleRenameProject(e, project)}
                  title="重命名"
                >
                  ✏
                </button>
                <button
                  className="icon-btn"
                  style={{ width: '20px', height: '20px', fontSize: '12px' }}
                  onClick={(e) => handleDeleteProject(e, project)}
                  title="删除"
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderTemplatesTab = () => {
    const currentCategory = TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory);
    return (
      <div className="templates-panel">
        <div className="template-categories">
          {TEMPLATE_CATEGORIES.map((category) => (
            <button
              key={category.id}
              className={`template-category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>

        <div className="template-list">
          <div className="template-category-header">
            {currentCategory?.icon} {currentCategory?.name}
          </div>
          <div className="template-grid">
            {currentCategory?.templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="template-card"
                onClick={() => insertTemplate(template)}
              >
                <div className="template-preview">
                  <span className="template-icon">{template.icon}</span>
                </div>
                <div className="template-name">{template.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="left-panel">
      <div className="left-panel-tabs">
        <button
          className={`left-tab-btn ${leftPanelTab === 'projects' ? 'active' : ''}`}
          onClick={() => setLeftPanelTab('projects')}
        >
          📁 项目
        </button>
        <button
          className={`left-tab-btn ${leftPanelTab === 'templates' ? 'active' : ''}`}
          onClick={() => setLeftPanelTab('templates')}
        >
          📐 模板
        </button>
        <button className="icon-btn" onClick={toggleLeftPanel} title="收起面板" style={{ marginLeft: 'auto' }}>
          ▶
        </button>
      </div>

      {leftPanelTab === 'projects' ? renderProjectsTab() : renderTemplatesTab()}
    </div>
  );
};

export default LeftPanel;
