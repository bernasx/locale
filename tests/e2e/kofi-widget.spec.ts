import { expect, test } from '@playwright/test';

const widgetUrl = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
const widgetScript = `
  window.kofiwidget2 = {
    init: function(label, color, account) {
      this.label = label; this.color = color; this.account = account;
    },
    getHTML: function() {
      return '<a class="kofi-button" style="background-color:' + this.color + '" href="https://ko-fi.com/' + this.account + '" target="_blank">' + this.label + '</a>';
    },
    draw: function() { document.writeln('<main>Document replaced</main>'); }
  };
`;

test('Ko-fi loads after hydration without replacing the page and survives route changes', async ({ page }) => {
  const errors: string[] = [];
  let scriptRequests = 0;
  let documentRequests = 0;
  let releaseScript!: () => void;
  const scriptReady = new Promise<void>(resolve => { releaseScript = resolve; });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests++;
  });
  await page.addInitScript(() => {
    document.write = document.writeln = () => { throw new Error('Document replacement attempted'); };
  });
  await page.route(widgetUrl, async route => {
    scriptRequests++;
    await scriptReady;
    await route.fulfill({ contentType: 'application/javascript', body: widgetScript });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const heading = page.getByRole('heading', { name: 'Edit i18next JSON in one workspace.' });
  await expect(heading).toBeVisible();
  releaseScript();
  const support = page.locator('.home-nav .kofi-widget .kofi-button');
  await expect(support).toHaveText('Support me on Ko-fi');
  await expect(support).toHaveAttribute('href', 'https://ko-fi.com/Q8D224IG19');
  await expect(support).toHaveCSS('background-color', 'rgb(114, 164, 242)');
  await expect(heading).toBeVisible();

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(support).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open workspace' })).toBeVisible();
    const headerFits = await page.locator('.home-nav').evaluate(header => header.scrollWidth <= header.clientWidth);
    expect(headerFits).toBe(true);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('link', { name: 'Open workspace' }).click();
  await expect(page.locator('.workspace-shell')).toBeVisible();
  await expect(page.locator('.kofi-widget')).toHaveCount(0);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(support).toBeVisible();
  await expect(heading).toBeVisible();
  expect(scriptRequests).toBe(1);
  expect(documentRequests).toBe(1);
  expect(errors).toEqual([]);
});

test('Ko-fi script failure leaves a usable support link and homepage', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(widgetUrl, route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Edit i18next JSON in one workspace.' })).toBeVisible();
  const support = page.getByRole('link', { name: 'Support me on Ko-fi', exact: true });
  await expect(support).toBeVisible();
  await expect(support).toHaveAttribute('href', 'https://ko-fi.com/Q8D224IG19');
  await page.getByRole('link', { name: 'Open workspace' }).click();
  await expect(page.locator('.workspace-shell')).toBeVisible();
  expect(errors).toEqual([]);
});
