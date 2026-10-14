export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
export type KeyPath = (string | number)[];
export type TranslationFile = { name: string; data: JsonObject; indent: string | number; trailingNewline: boolean };
export type Language = { code: string; name: string; files: TranslationFile[] };
export type Project = { id: string; name: string; description: string; createdAt: number; updatedAt: number; languages: Language[] };
export type TranslationRow = { id: string; fileName: string; path: KeyPath };

export const languageOptions = [
  ['en', 'English'], ['en-US', 'English (United States)'], ['en-GB', 'English (United Kingdom)'],
  ['pt-PT', 'Portuguese (Portugal)'], ['pt-BR', 'Portuguese (Brazil)'], ['es', 'Spanish'],
  ['es-MX', 'Spanish (Mexico)'], ['fr', 'French'], ['fr-CA', 'French (Canada)'], ['de', 'German'],
  ['it', 'Italian'], ['nl', 'Dutch'], ['pl', 'Polish'], ['sv', 'Swedish'], ['da', 'Danish'],
  ['fi', 'Finnish'], ['nb', 'Norwegian Bokmål'], ['cs', 'Czech'], ['ro', 'Romanian'],
  ['tr', 'Turkish'], ['uk', 'Ukrainian'], ['ru', 'Russian'], ['el', 'Greek'], ['ar', 'Arabic'],
  ['he', 'Hebrew'], ['hi', 'Hindi'], ['ja', 'Japanese'], ['ko', 'Korean'],
  ['zh-CN', 'Chinese (Simplified)'], ['zh-TW', 'Chinese (Traditional)'], ['vi', 'Vietnamese'], ['id', 'Indonesian'],
] as const;

export function languageName(code: string) {
  try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code; }
  catch { return code; }
}

export function normalizeLocale(code: string): string {
  const trimmed = code.trim();
  if (!trimmed || trimmed.length > 60) throw new Error('Enter a valid language code, such as en, pt-PT, or zh-Hant.');
  try { return Intl.getCanonicalLocales(trimmed)[0]; }
  catch { throw new Error('Use a valid language code, such as en, pt-PT, or zh-Hant.'); }
}

export function parseTranslationFile(name: string, text: string): TranslationFile {
  if (!name.toLowerCase().endsWith('.json') || /[/\\\x00-\x1f]/.test(name) || name === '.json') throw new Error(`${name}: choose a named .json file.`);
  let data: Json;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); }
  catch { throw new Error(`${name}: this file contains invalid JSON.`); }
  if (data === null || Array.isArray(data) || typeof data !== 'object') throw new Error(`${name}: the top level must be a JSON object.`);
  const indent = text.match(/\n([\t ]+)\S/)?.[1] ?? 2;
  return { name, data, indent, trailingNewline: /\n$/.test(text) };
}

export function stringLeaves(value: Json, path: KeyPath = []): KeyPath[] {
  if (typeof value === 'string') return [path];
  if (!value || typeof value !== 'object') return [];
  return Object.keys(value).flatMap(key => stringLeaves((value as Record<string, Json>)[key], [...path, Array.isArray(value) ? Number(key) : key]));
}

export function getAtPath(data: Json | undefined, path: KeyPath): Json | undefined {
  let current = data;
  for (const part of path) {
    if (!current || typeof current !== 'object' || !Object.hasOwn(current, part)) return undefined;
    current = (current as Record<string | number, Json>)[part];
  }
  return current;
}

export function canSetString(data: Json | undefined, path: KeyPath): boolean {
  let current = data;
  for (const part of path) {
    if (current === undefined) return true;
    if (current === null || typeof current !== 'object' || (Array.isArray(current) !== (typeof part === 'number'))) return false;
    current = Object.hasOwn(current, part) ? (current as Record<string | number, Json>)[part] : undefined;
  }
  return current === undefined || typeof current === 'string';
}

export function setString(data: JsonObject, path: KeyPath, value: string): JsonObject {
  if (!path.length || !canSetString(data, path)) throw new Error('This key conflicts with the existing JSON structure.');
  const clone = structuredClone(data);
  let current: JsonObject | Json[] = clone;
  path.forEach((part, index) => {
    if (index === path.length - 1) {
      Object.defineProperty(current, part, { value, enumerable: true, writable: true, configurable: true });
    } else {
      if (!Object.hasOwn(current, part)) Object.defineProperty(current, part, {
        value: typeof path[index + 1] === 'number' ? [] : {}, enumerable: true, writable: true, configurable: true,
      });
      current = (current as Record<string | number, Json>)[part] as JsonObject | Json[];
    }
  });
  return clone;
}

export function collectRows(project: Project): TranslationRow[] {
  const rows = new Map<string, TranslationRow>();
  for (const language of project.languages) for (const file of language.files) for (const path of stringLeaves(file.data)) {
    const id = JSON.stringify([file.name, path]);
    if (!rows.has(id)) rows.set(id, { id, fileName: file.name, path });
  }
  return [...rows.values()];
}

export function namespace(fileName: string) { return fileName.replace(/\.json$/i, ''); }
export function keyLabel(path: KeyPath): string {
  return path.map((part, index) => typeof part === 'number' ? `[${part}]` : /^[\w$-]+$/.test(part) ? `${index ? '.' : ''}${part}` : `[${JSON.stringify(part)}]`).join('');
}
export function fullPath(code: string, row: TranslationRow) { return `${code}.${keyLabel([namespace(row.fileName), ...row.path])}`; }
export function rowValue(language: Language, row: TranslationRow) { return getAtPath(language.files.find(f => f.name === row.fileName)?.data, row.path); }
export function isMissing(value: Json | undefined) { return typeof value !== 'string' || value.trim() === ''; }

export function editTranslation(project: Project, code: string, row: TranslationRow, value: string): Project {
  return { ...project, updatedAt: Date.now(), languages: project.languages.map(language => {
    if (language.code !== code) return language;
    const existing = language.files.find(f => f.name === row.fileName);
    const updated: TranslationFile = { ...(existing ?? { name: row.fileName, indent: 2, trailingNewline: true }), data: setString(existing?.data ?? {}, row.path, value) };
    return { ...language, files: existing ? language.files.map(f => f.name === row.fileName ? updated : f) : [...language.files, updated] };
  }) };
}

export function serializeFile(file: TranslationFile) { return JSON.stringify(file.data, null, file.indent) + (file.trailingNewline ? '\n' : ''); }
export function safeFilename(name: string) { return name.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'translations'; }

export function newProject(name: string, description = ''): Project {
  return { id: crypto.randomUUID(), name: name.trim(), description: description.trim(), createdAt: Date.now(), updatedAt: Date.now(), languages: [] };
}

function emptyStrings(value: Json): Json {
  if (typeof value === 'string') return '';
  if (Array.isArray(value)) return value.map(emptyStrings);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, emptyStrings(child)]));
  return value;
}

export function addLanguage(project: Project, rawCode: string, sourceCode?: string): Project {
  const code = normalizeLocale(rawCode);
  if (project.languages.some(language => normalizeLocale(language.code) === code)) throw new Error(`${languageName(code)} (${code}) is already in this project.`);
  const source = sourceCode ? project.languages.find(language => language.code === sourceCode) : undefined;
  if (sourceCode && !source) throw new Error('Choose an existing language to copy its keys.');
  const language: Language = {
    code,
    name: languageName(code),
    files: source?.files.map(file => ({ ...file, data: emptyStrings(file.data) as JsonObject })) ?? [],
  };
  return { ...project, updatedAt: Date.now(), languages: [...project.languages, language] };
}

export function createDemo(): Project {
  const base = newProject('The good place', 'A little website with a world of possibilities.');
  const data: Record<string, [string, JsonObject, JsonObject]> = {
    en: ['English', {
      welcome: { title: 'A good place to begin.', subtitle: 'Make room for something wonderful.' },
      actions: { get_started: 'Get started', learn_more: 'A little more about us', save: 'Save changes', cancel: 'Cancel' },
      messages: { hello: 'Hello, {{name}}!', saved: 'Your changes are saved.', items_one: '{{count}} item', items_other: '{{count}} items' },
      meters: { smart_meter: 'Smart meter' },
    }, { home: 'Home', about: 'Our story', journal: 'Journal', contact: 'Say hello' }],
    'pt-PT': ['Portuguese (Portugal)', {
      welcome: { title: 'Um bom lugar para começar.', subtitle: 'Dê espaço a algo maravilhoso.' },
      actions: { get_started: 'Começar', learn_more: 'Um pouco mais sobre nós', save: 'Guardar alterações', cancel: 'Cancelar' },
      messages: { hello: 'Olá, {{name}}!', saved: 'As suas alterações foram guardadas.', items_one: '{{count}} item', items_other: '{{count}} itens' },
      meters: { smart_meter: 'Contador inteligente' },
    }, { home: 'Início', about: 'A nossa história', journal: '', contact: 'Diga olá' }],
    es: ['Spanish', {
      welcome: { title: 'Un buen lugar para empezar.', subtitle: 'Haz espacio para algo maravilloso.' },
      actions: { get_started: 'Empezar', learn_more: '', save: 'Guardar cambios', cancel: 'Cancelar' },
      messages: { hello: '¡Hola, {{name}}!', saved: 'Tus cambios se han guardado.', items_one: '{{count}} artículo', items_other: '{{count}} artículos' },
      meters: { smart_meter: 'Contador inteligente' },
    }, { home: 'Inicio', about: 'Nuestra historia', journal: 'Diario', contact: 'Di hola' }],
  };
  return { ...base, id: 'locale-demo', languages: Object.entries(data).map(([code, [name, common, navigation]]) => ({ code, name, files: [
    { name: 'common.json', data: common, indent: 2, trailingNewline: true },
    { name: 'navigation.json', data: navigation, indent: 2, trailingNewline: true },
  ] })) };
}
