import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { addLanguage, canSetString, collectRows, createDemo, editTranslation, fullPath, getAtPath, keyLabel, newProject, normalizeLocale, parseTranslationFile, serializeFile, setString, stringLeaves } from '../src/lib/translations';
import { createZip } from '../src/lib/export';

describe('JSON import and round-trip editing', () => {
  it('keeps nested objects, arrays, numbers, booleans, null, empty objects, and interpolation intact', () => {
    const original = { meters: { smart_meter: 'Hello, {{name}}!' }, list: ['One', { nested: 'Two' }, 42], enabled: true, count: 3, empty: {}, nullable: null, blank: '' };
    const file = parseTranslationFile('common.json', JSON.stringify(original, null, '\t') + '\n');
    file.data = setString(file.data, ['meters', 'smart_meter'], 'Olá, {{name}}!');
    file.data = setString(file.data, ['list', 1, 'nested'], 'Dois');
    expect(JSON.parse(serializeFile(file))).toEqual({ ...original, meters: { smart_meter: 'Olá, {{name}}!' }, list: ['One', { nested: 'Dois' }, 42] });
    expect(serializeFile(file)).toContain('\n\t"meters"');
    expect(serializeFile(file).endsWith('\n')).toBe(true);
    expect(stringLeaves(file.data)).toHaveLength(4);
  });
  it('accepts a UTF-8 BOM and preserves files with no editable strings', () => {
    const file = parseTranslationFile('config.json', '\uFEFF{"enabled":true,"items":[],"count":4}');
    expect(stringLeaves(file.data)).toEqual([]);
    expect(JSON.parse(serializeFile(file))).toEqual({ enabled: true, items: [], count: 4 });
  });
  it.each(['[]', 'null', '"hello"', '123', '{"bad":}'])('rejects invalid or non-object JSON: %s', content => {
    expect(() => parseTranslationFile('common.json', content)).toThrow();
  });
  it.each(['../common.json', 'nested/common.json', 'bad\\common.json', 'words.txt', '.json'])('rejects unsafe or unsupported file names: %s', name => {
    expect(() => parseTranslationFile(name, '{}')).toThrow();
  });
  it('distinguishes literal dotted keys from nested keys', () => {
    const file = parseTranslationFile('common.json', '{"a.b":"literal","a":{"b":"nested"}}');
    const edited = setString(file.data, ['a.b'], 'Edited');
    expect(getAtPath(edited, ['a', 'b'])).toBe('nested');
    expect(getAtPath(edited, ['a.b'])).toBe('Edited');
    expect(keyLabel(['a.b'])).toBe('["a.b"]');
  });
  it('treats prototype-like keys as ordinary own keys without pollution', () => {
    const data = parseTranslationFile('common.json', '{"__proto__":{"polluted":"no"},"constructor":"literal"}').data;
    const result = setString(data, ['__proto__', 'polluted'], 'yes');
    expect(getAtPath(result, ['__proto__', 'polluted'])).toBe('yes');
    expect(getAtPath({}, ['constructor'])).toBeUndefined();
    expect(Object.hasOwn({}, 'polluted')).toBe(false);
    expect(JSON.parse(JSON.stringify(result))['__proto__'].polluted).toBe('yes');
  });
  it('does not overwrite incompatible existing data', () => {
    expect(canSetString({ meters: 42 }, ['meters', 'smart_meter'])).toBe(false);
    expect(() => setString({ meters: 42 }, ['meters', 'smart_meter'], 'Oops')).toThrow();
    expect(canSetString({ values: { '0': 'object key' } }, ['values', 0])).toBe(false);
  });
  it('creates missing strings and array structure', () => {
    expect(setString({}, ['items', 0, 'label'], 'One')).toEqual({ items: [{ label: 'One' }] });
    expect(setString({}, ['__proto__', 'safe'], 'yes')).toEqual(JSON.parse('{"__proto__":{"safe":"yes"}}'));
  });
});

describe('projects, language codes, and exports', () => {
  it('creates a language without any uploaded files', () => {
    const original = newProject('From scratch');
    const updated = addLanguage(original, ' pt-pt ');
    expect(updated.languages).toEqual([{ code: 'pt-PT', name: expect.any(String), files: [] }]);
    expect(original.languages).toEqual([]);
  });
  it('copies namespace structure with blank strings and preserves other JSON values', () => {
    const project = newProject('Structured files');
    const file = parseTranslationFile('common.json', '{"__proto__":{"text":"Safe"},"list":["One",{"label":"Two","count":2}],"enabled":true,"nil":null,"empty":{},"dotted.key":"Literal"}\n');
    project.languages = [{ code: 'en', name: 'English', files: [file] }];
    const updated = addLanguage(project, 'de-CH', 'en');
    const generated = updated.languages[1].files[0];
    expect(generated.data).toEqual(JSON.parse('{"__proto__":{"text":""},"list":["",{"label":"","count":2}],"enabled":true,"nil":null,"empty":{},"dotted.key":""}'));
    expect(generated.indent).toEqual(file.indent);
    expect(generated.trailingNewline).toBe(true);
    expect(getAtPath(file.data, ['list', 1, 'label'])).toBe('Two');
    expect(getAtPath(file.data, ['__proto__', 'text'])).toBe('Safe');
  });
  it('rejects duplicate dialects and invalid language codes without changing the project', () => {
    const project = createDemo();
    expect(() => addLanguage(project, 'pt-pt')).toThrow('already in this project');
    expect(() => addLanguage(project, 'invalid_locale')).toThrow('valid language code');
    expect(() => addLanguage(project, 'de', 'missing')).toThrow('existing language');
    expect(project.languages).toHaveLength(3);
  });
  it('exports all generated files with blank translations and edited values', async () => {
    const project = addLanguage(createDemo(), 'fr', 'en');
    const row = collectRows(project).find(row => row.path.join('.') === 'meters.smart_meter')!;
    const updated = editTranslation(project, 'fr', row, 'Compteur intelligent');
    const zip = await JSZip.loadAsync(await (await createZip(updated, 'fr')).arrayBuffer());
    expect(Object.values(zip.files).filter(file => !file.dir)).toHaveLength(2);
    const common = JSON.parse(await zip.file('fr/common.json')!.async('string'));
    expect(common.meters.smart_meter).toBe('Compteur intelligent');
    expect(common.welcome.title).toBe('');
    expect(JSON.parse(await zip.file('fr/navigation.json')!.async('string')).home).toBe('');
  });
  it('uses filename namespaces and only changes the selected language', () => {
    const project = createDemo();
    const row = collectRows(project).find(row => row.path.join('.') === 'meters.smart_meter')!;
    expect(fullPath('en', row)).toBe('en.common.meters.smart_meter');
    const edited = editTranslation(project, 'en', row, 'My meter');
    expect(getAtPath(edited.languages[0].files[0].data, row.path)).toBe('My meter');
    expect(getAtPath(project.languages[0].files[0].data, row.path)).toBe('Smart meter');
    expect(edited.languages[1]).toBe(project.languages[1]);
  });
  it('normalizes dialect codes and rejects invalid locale paths', () => {
    expect(normalizeLocale(' pt-pt ')).toBe('pt-PT');
    expect(normalizeLocale('zh-hant')).toBe('zh-Hant');
    expect(() => normalizeLocale('../en')).toThrow();
    expect(() => normalizeLocale('')).toThrow();
  });
  it('unions rows and creates a missing namespace when a translation is filled', () => {
    const project = createDemo();
    project.languages[2].files = [];
    const row = collectRows(project)[0];
    const edited = editTranslation(project, 'es', row, 'Nuevo texto');
    expect(edited.languages[2].files[0].name).toBe('common.json');
    expect(getAtPath(edited.languages[2].files[0].data, row.path)).toBe('Nuevo texto');
    expect(collectRows(edited)).toHaveLength(15);
  });
  it('exports edited JSON in language folders for the whole project', async () => {
    const project = createDemo();
    const row = collectRows(project)[0];
    const edited = editTranslation(project, 'en', row, 'Updated title');
    const blob = await createZip(edited);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const files = Object.values(zip.files).filter(file => !file.dir);
    expect(files).toHaveLength(6);
    const exported = JSON.parse(await zip.file('en/common.json')!.async('string'));
    expect(exported.welcome.title).toBe('Updated title');
    expect(exported.messages.hello).toBe('Hello, {{name}}!');
  });
  it('can export only one dialect', async () => {
    const blob = await createZip(createDemo(), 'pt-PT');
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.values(zip.files).filter(file => !file.dir).map(file => file.name)).toEqual(['pt-PT/common.json', 'pt-PT/navigation.json']);
  });
});
