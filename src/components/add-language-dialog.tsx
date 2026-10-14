import { useState } from 'react';
import { ArrowRight, FileJson2, Globe2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { addLanguage, languageName, languageOptions, normalizeLocale, type Project } from '@/lib/translations';

export function AddLanguageDialog({ project, onClose, onCreate, onImport }: {
  project: Project;
  onClose: () => void;
  onCreate: (project: Project) => void;
  onImport: (code: string) => void;
}) {
  const available = languageOptions.filter(([code]) => !project.languages.some(language => language.code === code));
  const sources = project.languages.filter(language => language.files.length);
  const [code, setCode] = useState<string>(available[0]?.[0] ?? 'custom');
  const [customCode, setCustomCode] = useState('');
  const [sourceCode, setSourceCode] = useState(sources[0]?.code ?? '');
  const [error, setError] = useState('');
  const selectedCode = code === 'custom' ? customCode : code;
  const source = sources.find(language => language.code === sourceCode);

  return <Dialog open onOpenChange={open => !open && onClose()}>
    <DialogContent>
      <form className="dialog-form" onSubmit={event => {
        event.preventDefault();
        try {
          const updated = addLanguage(project, selectedCode, sourceCode || undefined);
          onCreate(updated);
          toast.success(`${languageName(normalizeLocale(selectedCode))} is ready to translate`);
          onClose();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create this language.'); }
      }}>
        <div className="dialog-icon sage"><Globe2 size={24} /></div>
        <DialogHeader>
          <DialogTitle>Another way to say hello.</DialogTitle>
          <DialogDescription>Add a language or dialect. No files needed — you can start translating right here.</DialogDescription>
        </DialogHeader>
        <div className="form-field">
          <label htmlFor="new-language">Language / dialect</label>
          <select id="new-language" className="native-select" value={code} onChange={event => { setCode(event.target.value); setError(''); }}>
            {available.map(([value, label]) => <option key={value} value={value}>{label} · {value}</option>)}
            <option value="custom">Another language or dialect…</option>
          </select>
          {code === 'custom' && <Input aria-label="Custom language code" placeholder="Language code, e.g. de-CH" value={customCode} onChange={event => { setCustomCode(event.target.value); setError(''); }} autoFocus />}
        </div>
        {sources.length > 0 && <div className="form-field">
          <label htmlFor="language-source">Start with keys from</label>
          <select id="language-source" className="native-select" value={sourceCode} onChange={event => setSourceCode(event.target.value)}>
            {sources.map(language => <option key={language.code} value={language.code}>{language.name} · {language.code}</option>)}
            <option value="">Start without files</option>
          </select>
        </div>}
        <div className="language-setup-note"><FileJson2 size={21} /><p>{source
          ? <>We’ll copy {source.files.length === 1 ? 'the file and its keys' : `all ${source.files.length} files and their keys`}, with every translation left blank. The original language stays as it is.</>
          : <>Your language will start without files. {project.languages.length ? 'Existing project keys will appear in its column, ready to fill in.' : 'Import translation keys into any language when you’re ready.'}</>}</p></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="button" className="import-instead" onClick={() => { onImport(code === 'custom' ? '' : code); onClose(); }}>Already have JSON files? Import them <ArrowRight size={16} /></button>
        <DialogFooter><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!selectedCode.trim()}><Plus /> Create language</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
