import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { useProjectStore, useUIStore, useCanvasStore, useSelectionStore, useHistoryStore } from '../store';
import { getAllProjects, getShapesByProject, saveShapes } from '../db';
import {
  CATEGORIES,
  TemplateCategory,
  Template,
  getTemplatesByCategory,
  templateToShapes,
} from '../templates';
import { generateId } from '../utils';

type LeftPanelTab = 'projects' | 'templates';

const LeftPanel: React.FC = () => {
  const { leftPanelCollapsed, toggleLeftPanel, openModal } = useUIStore();
  const {
    projects,
    currentProjectId,
    shapes,
    setProjects,
    setCurrentProject,
    createProject,
    setShapes,
    addShape,
    getNextZIndex,
  } = useProjectStore();
  const { offsetX, offsetY, zoom } = useCanvasStore();
  const { clearSelection, selectShape } = useSelectionStore();
  const { clearHistory, saveState } = useHistoryStore();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeftPanelTab>('projects');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('flowchart');

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

  const handleInsertTemplate = (template: Template) => {
    const container = document.querySelector('.canvas-container');
    let centerX = 400;
    let centerY = 300;
    if (container) {
      const rect = container.getBoundingClientRect();
      centerX = (rect.width / 2 - offsetX) / zoom;
      centerY = (rect.height / 2 - offsetY) / zoom;
    }

    const newShapes = templateToShapes(template, { x: centerX, y: centerY });

    const groupId = generateId();
    const zIndexStart = getNextZIndex();
    const childIds: string[] = [];

    newShapes.forEach((shape, idx) => {
      const shapeWithZ = { ...shape, zIndex: zIndexStart + idx, groupId };
      addShape(shapeWithZ);
      childIds.push(shapeWithZ.id);
    });

    addShape({
      id: groupId,
      type: 'group',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      rotation: 0,
      style: {
        fillColor: 'transparent',
        strokeColor: 'transparent',
        strokeWidth: 0,
        strokeStyle: 'solid',
        opacity: 1,
      },
      visible: true,
      locked: false,
      zIndex: zIndexStart + newShapes.length,
      name: template.name,
      children: childIds,
    } as any);

    saveState([...useProjectStore.getState().shapes]);
    clearSelection();
    selectShape(groupId);
  };

  if (leftPanelCollapsed) {
    return (
      <div className="left-panel collapsed">
        <div className="left-panel-header">
          <button className="icon-btn" onClick={toggleLeftPanel} title="展开项目面板">
            ◀
          </button>
        </div>
      </div>
    );
  }

  const currentTemplates = getTemplatesByCategory(activeCategory);

  return (
    <div className="left-panel">
      <div className="left-panel-header">
        <span>项目列表</span>
        <button className="icon-btn" onClick={toggleLeftPanel} title="收起项目面板">
          ▶
        </button>
      </div>

      <div className="left-panel-tabs">
        <button
          className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          项目
        </button>
        <button
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          模板
        </button>
      </div>

      {activeTab === 'projects' ? (
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
      ) : (
        <div className="template-panel">
          <div className="template-categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`template-category-btn ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.key)}
                title={cat.label}
              >
                <span className="template-category-icon">{cat.icon}</span>
                <span className="template-category-label">{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="template-list">
            {currentTemplates.map((template) => (
              <div
                key={template.id}
                className="template-item"
                onClick={() => handleInsertTemplate(template)}
                title={`插入「${template.name}」模板`}
              >
                <div className="template-item-icon">
                  {CATEGORIES.find((c) => c.key === template.category)?.icon || '📋'}
                </div>
                <div className="template-item-name">{template.name}</div>
                <div className="template-item-count">
                  {template.shapes.length} 个图形
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftPanel;
