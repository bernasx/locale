import { openDB, type DBSchema } from 'idb';
import type { Project } from './translations';

interface LocaleDatabase extends DBSchema { projects: { key: string; value: Project } }
const database = () => openDB<LocaleDatabase>('locale-workspace', 1, {
  upgrade(db) { db.createObjectStore('projects', { keyPath: 'id' }); },
});
export async function loadProjects() { return (await (await database()).getAll('projects')).sort((a, b) => b.updatedAt - a.updatedAt); }
export async function saveProject(project: Project) { await (await database()).put('projects', project); }
export async function deleteProject(id: string) { await (await database()).delete('projects', id); }
