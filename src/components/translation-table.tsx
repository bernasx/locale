import { useLayoutEffect, useRef } from 'react';
import { Braces, Copy, FileJson2, MoreHorizontal, ArrowDownToLine, Upload, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { canSetString, fullPath, isMissing, keyLabel, namespace, rowValue, type Language, type Project, type TranslationRow } from '@/lib/translations';

export function LanguageMark({ code }: { code: string }) {
  return <span className={`language-mark lang-${code.split('-')[0]}`}>{code.split('-')[0].toUpperCase()}</span>;
}

function TranslationCell({ language, row, onEdit, onFocus, onBlur }: { language: Language; row: TranslationRow; onEdit: (code: string, row: TranslationRow, value: string) => void; onFocus: () => void; onBlur: () => void }) {
  const value = rowValue(language, row);
  const editable = canSetString(language.files.find(file => file.name === row.fileName)?.data, row.path);
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { if (input.current) { input.current.style.height = 'auto'; input.current.style.height = `${Math.max(36, Math.min(input.current.scrollHeight, 180))}px`; } }, [value]);
  return <td className={`translation-cell ${isMissing(value) ? 'missing-cell' : ''}`}>
    {editable ? <><textarea ref={input} aria-label={fullPath(language.code, row)} title={fullPath(language.code, row)} placeholder="Add a translation…" value={typeof value === 'string' ? value : ''} onChange={e => onEdit(language.code, row, e.target.value)} onFocus={onFocus} onBlur={onBlur} dir="auto" spellCheck lang={language.code} rows={1} /><div className="cell-meta"><span title={fullPath(language.code, row)}>{fullPath(language.code, row)}</span><button title="Copy full key path" aria-label={`Copy ${fullPath(language.code, row)}`} onClick={async () => { try { await navigator.clipboard.writeText(fullPath(language.code, row)); toast.success('Key path copied'); } catch { toast.error('Clipboard unavailable. The full path is shown when you focus the translation.'); } }}><Copy size={12} /></button></div></> : <div className="structure-conflict"><span>Different JSON structure</span><small>Preserved as imported. Edit the source file to change its type.</small></div>}
  </td>;
}

export function TranslationTable({ project, rows, onEdit, setEditing, onImport, onExport, onRemoveLanguage }: { project: Project; rows: TranslationRow[]; onEdit: (code: string, row: TranslationRow, value: string) => void; setEditing: (id: string | null) => void; onImport: (code: string) => void; onExport: (code: string) => void; onRemoveLanguage: (code: string) => void }) {
  return <div className="translation-table-scroll"><table className="translation-table"><thead><tr><th className="key-column"><div><span>TRANSLATION KEY</span><span className="little-badge">{rows.length}</span></div></th>{project.languages.map((language, index) => <th key={language.code}><div className="table-language-heading"><LanguageMark code={language.code} /><div><strong>{language.name}</strong><small>{language.code}{index === 0 && <span>First language</span>}</small></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Options for ${language.name}`}><MoreHorizontal size={16} /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onImport(language.code)}><Upload /> Import files</DropdownMenuItem><DropdownMenuItem onSelect={() => onExport(language.code)}><ArrowDownToLine /> Export this language</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onSelect={() => onRemoveLanguage(language.code)}><Trash2 /> Remove language</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="key-cell"><div><Braces size={14} /><span><strong title={keyLabel(row.path)}>{keyLabel(row.path)}</strong><small><FileJson2 size={10} /> {namespace(row.fileName)}</small></span></div></td>{project.languages.map(language => <TranslationCell key={language.code} language={language} row={row} onEdit={onEdit} onFocus={() => setEditing(row.id)} onBlur={() => setEditing(null)} />)}</tr>)}</tbody></table>{!rows.length && <div className="table-empty"><Check size={27} /><h3>Nothing here at the moment.</h3><p>Try another search or translation filter.</p></div>}</div>;
}
