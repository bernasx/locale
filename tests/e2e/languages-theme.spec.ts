import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

test('adds a language with blank keys, saves it, edits it, and exports every namespace', async ({ page }) => {
  await page.goto('/workspace?demo=1');
  await page.getByRole('button', { name: 'Add language', exact: true }).click();
  await expect(page.getByRole('dialog').locator('input[type=file]')).toHaveCount(0);
  await page.getByLabel('Language / dialect').selectOption('de');
  await expect(page.getByLabel('Start with keys from')).toHaveValue('en');
  await page.getByRole('button', { name: 'Create language', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'de.common.welcome.title', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'en.common.welcome.title', exact: true })).toHaveValue('A good place to begin.');
  await page.getByRole('textbox', { name: 'de.common.welcome.title', exact: true }).fill('Ein guter Anfang.');
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'de.common.welcome.title', exact: true })).toHaveValue('Ein guter Anfang.');
  await expect(page.getByRole('textbox', { name: 'de.navigation.home', exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Export files', exact: true }).click();
  await page.getByLabel('What would you like to export?').selectOption('de');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download ZIP/ }).click();
  const zip = await JSZip.loadAsync(await readFile((await (await downloading).path())!));
  expect(JSON.parse(await zip.file('de/common.json')!.async('string')).welcome.title).toBe('Ein guter Anfang.');
  expect(JSON.parse(await zip.file('de/navigation.json')!.async('string')).home).toBe('');
});

test('creates a first language without files and prevents duplicate or invalid dialects', async ({ page }) => {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Project name').fill('No uploads needed');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByRole('button', { name: 'Add language', exact: true }).click();
  await page.getByLabel('Language / dialect').selectOption('custom');
  await page.getByLabel('Custom language code').fill('pt-pt');
  await page.getByRole('button', { name: 'Create language', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your language is ready.' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your language is ready.' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('button', { name: 'Languages' }).click();
  await expect(page.getByText('No files yet. Fill in existing keys in Translations, or import a JSON file.')).toBeVisible();
  await page.getByRole('button', { name: 'Add language', exact: true }).click();
  await page.getByLabel('Language / dialect').selectOption('custom');
  await page.getByLabel('Custom language code').fill('pt-PT');
  await page.getByRole('button', { name: 'Create language', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('already in this project');
  await page.getByLabel('Custom language code').fill('invalid_locale');
  await page.getByRole('button', { name: 'Create language', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('valid language code');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Import files', exact: true }).first().click();
  await page.getByLabel('Language / dialect').selectOption('en');
  await page.getByLabel('Select JSON files').setInputFiles({ name: 'common.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":"Hello"}') });
  await page.getByRole('dialog').getByRole('button', { name: 'Import files', exact: true }).click();
  await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('button', { name: 'Translations' }).click();
  await page.getByRole('textbox', { name: 'pt-PT.common.hello', exact: true }).fill('Olá');
  await expect(page.getByRole('textbox', { name: 'en.common.hello', exact: true })).toHaveValue('Hello');
});

test('dark mode persists across reload and navigation, includes dialogs, and stays responsive', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Change color theme' }).click();
  await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'test-results/home-dark-desktop.png', fullPage: true, animations: 'disabled' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('link', { name: 'Explore the demo' }).click();
  await expect(page.getByRole('textbox', { name: 'en.common.welcome.title', exact: true })).toHaveValue('A good place to begin.');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: 'test-results/editor-dark-desktop.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Add language', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(36, 41, 36)');
  await page.screenshot({ path: 'test-results/language-dialog-dark.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/editor-dark-mobile.png', fullPage: true, animations: 'disabled' });
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Change color theme' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Change color theme' }).click();
  await page.getByRole('menuitemradio', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});

test('system theme follows the device until an explicit preference is selected', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Change color theme' }).click();
  await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Change color theme' }).click();
  await page.getByRole('menuitemradio', { name: 'System', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/home-dark-mobile.png', fullPage: true, animations: 'disabled' });
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('link', { name: 'Open workspace' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
