import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { useProjectStore, useUIStore, useCanvasStore, useSelectionStore, useHistoryStore } from '../store';
import { getAllProjects, getShapesByProject, saveShapes } from '../db';

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
  } = useProjectStore();
  const { resetView } = useCanvasStore();
  const { clearSelection } = useSelectionStore();
  const { clearHistory } = useHistoryStore();

  const [loading, setLoading] = useState(true);

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

  const handleRenameProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
  };

  const handleDeleteProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
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

  return (
    <div className="left-panel">
      <div className="left-panel-header">
        <span>项目列表</span>
        <button className="icon-btn" onClick={toggleLeftPanel} title="收起项目面板">
          ▶
        </button>
      </div>

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
    </div>
  );
};

export default LeftPanel;
