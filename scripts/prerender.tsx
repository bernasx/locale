import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import App from '../src/app';

let template = await readFile('dist/index.html', 'utf8');
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Locale',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any modern web browser',
  description: 'A private, local i18next translation editor. Import JSON files, edit languages side by side, and export JSON or ZIP files directly in your browser.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};
let homepageMetadata = `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`;
if (process.env.SITE_URL) {
  const siteUrl = new URL(process.env.SITE_URL);
  if (!['https:', 'http:'].includes(siteUrl.protocol)) throw new Error('SITE_URL must start with https:// or http://.');
  const origin = siteUrl.origin;
  homepageMetadata += `<link rel="canonical" href="${origin}/" /><meta property="og:url" content="${origin}/" />`;
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>`);
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /workspace\nSitemap: ${origin}/sitemap.xml\n`);
}
const html = renderToString(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
const homepage = template.replace('<div id="root"><!--app-html--></div>', `<div id="root" data-prerendered="true">${html}</div>`).replace('</head>', `${homepageMetadata}</head>`);
await writeFile('dist/index.html', homepage);
await mkdir('dist/workspace', { recursive: true });
const workspace = template
  .replace(/<title>.*?<\/title>/s, '<title>Workspace — Locale</title>')
  .replace('</head>', '<meta name="robots" content="noindex,nofollow" /></head>');
await writeFile('dist/workspace/index.html', workspace);
console.log('Homepage pre-rendered for SEO. Workspace entry generated.');
