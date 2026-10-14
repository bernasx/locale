import { useCallback, useEffect, useRef, useState } from 'react';
import { loadProjects, saveProject, deleteProject } from '@/lib/storage';
import type { Project } from '@/lib/translations';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [storageError, setStorageError] = useState('');
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const latestProjects = useRef<Project[]>([]);
  const dirty = useRef(new Map<string, Project>());

  useEffect(() => { let live = true; loadProjects().then(data => {
    if (live) { latestProjects.current = data; setProjects(data); }
  }).catch(() => { if (live) { setStorageError('Browser storage is unavailable. Changes cannot be saved here. Export your files before closing this tab.'); setSaveState('error'); } }).finally(() => { if (live) setLoading(false); });
  return () => { live = false; }; }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current.size) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  const persist = useCallback((project: Project) => {
    dirty.current.set(project.id, project);
    const version = ++revision.current;
    setSaveState('saving');
    queue.current = queue.current.then(async () => {
      try {
        await saveProject(project);
        if (dirty.current.get(project.id) === project) dirty.current.delete(project.id);
        if (version === revision.current) { setSaveState(dirty.current.size ? 'error' : 'saved'); if (!dirty.current.size) setStorageError(''); }
      } catch {
        setSaveState('error');
        setStorageError('We couldn’t save to this browser. Your edits are still here — export a backup or retry saving.');
      }
    });
  }, []);

  const update = useCallback((project: Project) => {
    const next = latestProjects.current.some(p => p.id === project.id) ? latestProjects.current.map(p => p.id === project.id ? project : p) : [...latestProjects.current, project];
    latestProjects.current = next; setProjects(next); persist(project);
  }, [persist]);

  const remove = useCallback(async (id: string) => {
    await queue.current;
    await deleteProject(id);
    dirty.current.delete(id);
    latestProjects.current = latestProjects.current.filter(p => p.id !== id);
    setProjects(latestProjects.current);
  }, []);

  const retry = useCallback(() => { for (const project of dirty.current.values()) persist(project); }, [persist]);
  return { projects, loading, saveState, storageError, update, remove, retry };
}
