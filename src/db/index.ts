import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project, Shape } from '../types';

interface WhiteboardDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-updatedAt': number };
  };
  shapes: {
    key: string;
    value: { id: string; projectId: string; shape: Shape };
    indexes: { 'by-projectId': string };
  };
}

const DB_NAME = 'whiteboard-db';
const DB_VERSION = 1;

let db: IDBPDatabase<WhiteboardDB> | null = null;

export const initDB = async (): Promise<IDBPDatabase<WhiteboardDB>> => {
  if (db) return db;
  
  db = await openDB<WhiteboardDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('by-updatedAt', 'updatedAt');
      }
      
      if (!db.objectStoreNames.contains('shapes')) {
        const shapeStore = db.createObjectStore('shapes', { keyPath: 'id' });
        shapeStore.createIndex('by-projectId', 'projectId');
      }
    },
  });
  
  return db;
};

export const getAllProjects = async (): Promise<Project[]> => {
  const database = await initDB();
  const projects = await database.getAllFromIndex('projects', 'by-updatedAt');
  return projects.reverse();
};

export const getProject = async (id: string): Promise<Project | undefined> => {
  const database = await initDB();
  return database.get('projects', id);
};

export const addProject = async (project: Project): Promise<string> => {
  const database = await initDB();
  return database.add('projects', project);
};

export const updateProject = async (project: Project): Promise<string> => {
  const database = await initDB();
  project.updatedAt = Date.now();
  return database.put('projects', project);
};

export const renameProject = async (id: string, newName: string): Promise<void> => {
  const database = await initDB();
  const project = await database.get('projects', id);
  if (project) {
    project.name = newName;
    project.updatedAt = Date.now();
    await database.put('projects', project);
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  const database = await initDB();
  await database.delete('projects', id);
  
  const tx = database.transaction('shapes', 'readwrite');
  const index = tx.store.index('by-projectId');
  let cursor = await index.openCursor(id);
  
  while (cursor) {
    cursor.delete();
    cursor = await cursor.continue();
  }
  
  await tx.done;
};

export const getShapesByProject = async (projectId: string): Promise<Shape[]> => {
  const database = await initDB();
  const shapeData = await database.getAllFromIndex('shapes', 'by-projectId', projectId);
  return shapeData.map(sd => sd.shape);
};

export const saveShapes = async (projectId: string, shapes: Shape[]): Promise<void> => {
  const database = await initDB();
  const tx = database.transaction('shapes', 'readwrite');
  
  const index = tx.store.index('by-projectId');
  let cursor = await index.openCursor(projectId);
  
  while (cursor) {
    cursor.delete();
    cursor = await cursor.continue();
  }
  
  for (const shape of shapes) {
    await tx.store.add({ id: `${projectId}-${shape.id}`, projectId, shape });
  }
  
  await tx.done;
  
  const project = await getProject(projectId);
  if (project) {
    await updateProject(project);
  }
};

export const getDB = (): IDBPDatabase<WhiteboardDB> | null => db;
