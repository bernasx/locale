import { useRef, useState, type DragEvent } from 'react';
import { ArrowDownToLine, Check, FileJson2, FolderArchive, HardDrive, Languages, Loader2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { downloadFile, downloadZip } from '@/lib/export';
import { languageName, languageOptions, newProject, normalizeLocale, parseTranslationFile, stringLeaves, type Project, type TranslationFile } from '@/lib/translations';

export function ProjectDialog({ open, onClose, onSave, project }: { open: boolean; onClose: () => void; onSave: (project: Project) => void; project?: Project }) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  return <Dialog open={open} onOpenChange={value => !value && onClose()}><DialogContent><form className="dialog-form" onSubmit={event => {
    event.preventDefault(); if (!name.trim()) return;
    onSave(project ? { ...project, name: name.trim(), description: description.trim(), updatedAt: Date.now() } : newProject(name, description));
    onClose();
  }}><div className="dialog-icon peach"><Plus size={23} /></div><DialogHeader><DialogTitle>{project ? 'A little project housekeeping.' : 'Make room for a new project.'}</DialogTitle><DialogDescription>{project ? 'Give your workspace a name that feels right.' : 'A home for your words, in every language. Add a language or import your JSON files next.'}</DialogDescription></DialogHeader><div className="form-field"><label htmlFor="project-name">Project name</label><Input id="project-name" placeholder="e.g. My wonderful website" value={name} onChange={e => setName(e.target.value)} required maxLength={80} autoFocus /></div><div className="form-field"><label htmlFor="project-description">Description <span>Optional</span></label><Textarea id="project-description" placeholder="A few words about what you’re building…" value={description} onChange={e => setDescription(e.target.value)} maxLength={240} /></div><div className="form-hint"><HardDrive size={14} /> Saved only in this browser, on this device.</div><DialogFooter><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!name.trim()}>{project ? 'Save changes' : 'Create project'}<Plus size={15} /></Button></DialogFooter></form></DialogContent></Dialog>;
}

export function ImportDialog({ project, initialCode = '', onClose, onImport }: { project: Project; initialCode?: string; onClose: () => void; onImport: (project: Project) => void }) {
  const [code, setCode] = useState(initialCode || 'en');
  const [customCode, setCustomCode] = useState('');
  const [files, setFiles] = useState<TranslationFile[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [replace, setReplace] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const readVersion = useRef(0);
  const selectedCode = code === 'custom' ? customCode : code;
  let canonicalCode = selectedCode;
  try { canonicalCode = normalizeLocale(selectedCode); } catch { /* Validated on submit. */ }
  const existing = project.languages.find(language => language.code === canonicalCode);
  const replacements = files.filter(file => existing?.files.some(saved => saved.name === file.name));
  const choices = [...languageOptions.map(([value, label]) => [value, label]), ...project.languages.filter(language => !languageOptions.some(([value]) => value === language.code)).map(language => [language.code, language.name])];

  async function readFiles(selected: File[]) {
    if (!selected.length) return;
    const version = ++readVersion.current;
    setBusy(true); setError(''); setReplace(false);
    try {
      const names = new Set<string>();
      const parsed = await Promise.all(selected.map(async file => {
        if (names.has(file.name)) throw new Error(`Two files are named ${file.name}. Import one file per namespace.`);
        names.add(file.name);
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is over 10 MB. Please split large namespaces into smaller files.`);
        return parseTranslationFile(file.name, await file.text());
      }));
      if (version === readVersion.current) setFiles(parsed);
    } catch (cause) { if (version === readVersion.current) { setError(cause instanceof Error ? cause.message : 'Could not read these files. Please try again.'); setFiles([]); } }
    finally { if (version === readVersion.current) setBusy(false); }
  }
  function handleDrop(event: DragEvent) { event.preventDefault(); setDragging(false); void readFiles(Array.from(event.dataTransfer.files)); }

  return <Dialog open onOpenChange={value => !value && onClose()}><DialogContent className="import-dialog"><form className="dialog-form" onSubmit={event => {
    event.preventDefault();
    try {
      const normalized = normalizeLocale(selectedCode);
      if (!files.length || busy || (replacements.length > 0 && !replace)) return;
      const language = project.languages.find(lang => lang.code === normalized);
      const merged = { code: normalized, name: language?.name ?? languageName(normalized), files: [...(language?.files.filter(file => !files.some(incoming => incoming.name === file.name)) ?? []), ...files] };
      onImport({ ...project, updatedAt: Date.now(), languages: language ? project.languages.map(lang => lang.code === normalized ? merged : lang) : [...project.languages, merged] });
      toast.success(`${files.length} ${files.length === 1 ? 'file' : 'files'} imported for ${merged.name}`); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not import files.'); }
  }}><div className="dialog-icon peach"><Upload size={23} /></div><DialogHeader><DialogTitle>A new language. A familiar format.</DialogTitle><DialogDescription>Choose a language or dialect, then select its i18next JSON files. File names become your namespaces.</DialogDescription></DialogHeader><div className="form-field"><label htmlFor="import-language">Language / dialect</label><select id="import-language" className="native-select" value={code} onChange={e => { setCode(e.target.value); setReplace(false); }}>{choices.map(([value, label]) => <option key={value} value={value}>{label} · {value}</option>)}<option value="custom">Another language or dialect…</option></select>{code === 'custom' && <Input aria-label="Custom language code" placeholder="Language code, e.g. de-CH" value={customCode} onChange={e => { setCustomCode(e.target.value); setReplace(false); }} />}</div><div className="form-field"><label>Translation files</label><button type="button" className={`dropzone ${dragging ? 'is-dragging' : ''}`} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}><span className="dropzone-icon">{busy ? <Loader2 className="animate-spin" /> : <Upload />}</span><strong>{files.length ? 'Choose different files' : 'Drop your JSON files here'}</strong><span>or <em>browse files</em> · multiple files welcome</span><small>.json files, up to 10 MB each</small></button><input className="sr-only" tabIndex={-1} aria-label="Select JSON files" ref={input} type="file" accept=".json,application/json" multiple onChange={e => { void readFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }} /></div>{files.length > 0 && <div className="import-file-list">{files.map(file => <div key={file.name}><FileJson2 size={17} /><span>{file.name}<small>{stringLeaves(file.data).length} string keys</small></span><button type="button" aria-label={`Remove ${file.name} from import`} onClick={() => setFiles(files.filter(f => f.name !== file.name))}><X size={15} /></button></div>)}</div>}{replacements.length > 0 && <label className="replace-warning"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} /><span>Replace {replacements.map(file => file.name).join(', ')} for {canonicalCode}. This overwrites the current files and their edits.</span></label>}{error && <p className="form-error" role="alert">{error}</p>}<div className="form-hint"><span className="status-dot" /> Your files stay on your device.</div><DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!files.length || busy || !selectedCode.trim() || (replacements.length > 0 && !replace)}><Upload size={15} />{replacements.length ? 'Replace & import' : 'Import files'}</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function ExportDialog({ project, onClose, initialCode = 'all' }: { project: Project; onClose: () => void; initialCode?: string }) {
  const [scope, setScope] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const languages = project.languages.filter(lang => scope === 'all' || scope === lang.code);
  const count = languages.reduce((sum, lang) => sum + lang.files.length, 0);
  return <Dialog open onOpenChange={value => !value && onClose()}><DialogContent><div className="dialog-icon sage"><FolderArchive size={23} /></div><DialogHeader><DialogTitle>Ready for the world.</DialogTitle><DialogDescription>Take a single file, one language, or the whole project. Your JSON structure stays just as you left it.</DialogDescription></DialogHeader><div className="form-field"><label htmlFor="export-scope">What would you like to export?</label><select id="export-scope" className="native-select" value={scope} onChange={e => setScope(e.target.value)}><option value="all">All languages</option>{project.languages.map(language => <option key={language.code} value={language.code}>{language.name} · {language.code}</option>)}</select></div><div className="export-files">{languages.map(language => <div key={language.code}><div className="export-language"><Languages size={14} /> {language.name}<span>{language.code}</span></div>{!language.files.length && <p className="empty-export-language">No files yet. Add translations or import JSON to export this language.</p>}{language.files.map(file => <div className="export-file" key={file.name}><FileJson2 size={17} /><span>{language.code}/{file.name}</span><Button variant="ghost" size="icon" aria-label={`Download ${language.code}/${file.name}`} onClick={() => { downloadFile(file); toast.success(`${file.name} downloaded`); }}><ArrowDownToLine size={16} /></Button></div>)}</div>)}</div><div className="form-hint"><Check size={15} /> ZIP files are organized into language folders.</div><DialogFooter><Button variant="ghost" onClick={onClose}>Close</Button><Button disabled={busy || !count} onClick={async () => { setBusy(true); try { await downloadZip(project, scope === 'all' ? undefined : scope); toast.success('Your translations are ready to go'); } catch { toast.error('Could not create the ZIP. Try downloading individual files.'); } finally { setBusy(false); } }}>{busy ? <Loader2 className="animate-spin" /> : <ArrowDownToLine />} Download ZIP <span className="button-count">{count}</span></Button></DialogFooter></DialogContent></Dialog>;
}

export function ConfirmDialog({ title, description, onClose, onConfirm }: { title: string; description: string; onClose: () => void; onConfirm: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return <Dialog open onOpenChange={value => !value && !busy && onClose()}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Keep it</Button><Button variant="destructive" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); onClose(); } catch { toast.error('Could not remove this from browser storage. Please try again.'); setBusy(false); } }}> {busy ? 'Removing…' : 'Yes, remove it'}</Button></DialogFooter></DialogContent></Dialog>;
}
