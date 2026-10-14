import JSZip from 'jszip';
import { safeFilename, serializeFile, type Project, type TranslationFile } from './translations';

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export function downloadFile(file: TranslationFile) { downloadBlob(new Blob([serializeFile(file)], { type: 'application/json;charset=utf-8' }), file.name); }
export async function createZip(project: Project, languageCode?: string) {
  const zip = new JSZip();
  const languages = project.languages.filter(language => !languageCode || language.code === languageCode);
  for (const language of languages) for (const file of language.files) zip.file(`${language.code}/${file.name}`, serializeFile(file));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
export async function downloadZip(project: Project, languageCode?: string) {
  const blob = await createZip(project, languageCode);
  downloadBlob(blob, `${safeFilename(project.name)}${languageCode ? `-${languageCode}` : ''}.zip`);
}
