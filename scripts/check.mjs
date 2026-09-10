import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { options, launch } from './common.mjs';

const opts = options(['input', 'report', 'screenshots', 'browser']);
if (!opts.input || !opts.report) throw new Error('Usage: node check.mjs --input MAP.html --report validation.json [--screenshots directory] [--browser executable]');
const input = path.resolve(opts.input);
if (input === path.resolve(opts.report)) throw new Error('Report cannot overwrite input.');
const browser = await launch(opts.browser);
const results = [];
try {
  for (const [width, height] of [[1440, 1000], [1920, 1080], [390, 844]]) {
    const page = await browser.newPage();
    const requests = [];
    const errors = [];
    await page.setViewport({ width, height });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.startsWith('data:') || url.startsWith('about:') || url === pathToFileURL(input).href) request.continue();
      else { requests.push(url); request.abort(); }
    });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(pathToFileURL(input).href, { waitUntil: 'networkidle0' });
    const dom = await page.evaluate(() => {
      const manifest = JSON.parse(document.querySelector('#handoff-manifest')?.textContent || 'null');
      const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      const broken = [...document.querySelectorAll('a[href^="#"]')].filter(a => {
        try { return !document.getElementById(decodeURIComponent(a.hash.slice(1))); } catch { return true; }
      }).map(a => a.getAttribute('href'));
      const svg = [...document.querySelectorAll('.diagram > svg')];
      return {
        manifest, duplicates, broken,
        headings: document.querySelectorAll('article :is(h1,h2,h3,h4,h5,h6),.appendix :is(h1,h2,h3,h4,h5,h6)').length,
        diagrams: svg.length,
        invisibleDiagrams: svg.filter(e => !e.getAttribute('viewBox') || !e.querySelector('text,foreignObject')).length,
        appendices: document.querySelectorAll('.appendix').length,
        viewers: document.querySelectorAll('iframe').length,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        brokenImages: [...document.images].filter(i => !i.complete || !i.naturalWidth).length
      };
    });
    const appendixIds = await page.$$eval('.appendix', els => els.map(e => e.id));
    let appendixNavigation = true;
    for (const id of appendixIds) {
      await page.evaluate(id => { location.hash = id; }, id);
      await page.waitForFunction(id => document.getElementById(id).open, {}, id).catch(() => { appendixNavigation = false; });
    }
    const frameDiagrams = [];
    for (const frame of page.frames().filter(f => f !== page.mainFrame())) {
      frameDiagrams.push(await frame.$$eval('svg', els => els.filter(e => e.getBoundingClientRect().width > 0).length));
    }
    let screenshot;
    if (opts.screenshots) {
      await mkdir(opts.screenshots, { recursive: true });
      screenshot = path.resolve(opts.screenshots, `${width}.png`);
      await page.evaluate(() => { location.hash = ''; scrollTo(0, 0); });
      await page.screenshot({ path: screenshot });
      const diagram = await page.$('.diagram');
      if (diagram) { await diagram.evaluate(e => e.scrollIntoView()); await page.screenshot({ path: path.resolve(opts.screenshots, `${width}-diagram.png`) }); }
    }
    const countsMatch = dom.manifest && ['headings', 'diagrams', 'appendices', 'viewers'].every(k => dom[k] === dom.manifest[k]);
    const passed = Boolean(countsMatch && !dom.duplicates.length && !dom.broken.length && !dom.horizontalOverflow && !dom.brokenImages && !dom.invisibleDiagrams && appendixNavigation && !requests.length && !errors.length && (!dom.viewers || frameDiagrams.some(n => n > 0)));
    results.push({ width, height, passed, ...dom, appendixNavigation, frameDiagrams, requests, errors, screenshot });
    await page.close();
  }
} finally { await browser.close(); }
const passed = results.every(r => r.passed);
const report = { passed, sha256: createHash('sha256').update(await readFile(input)).digest('hex'), visualReview: 'not performed by script; inspect screenshots', productRuntimeTests: 'not performed', results };
await mkdir(path.dirname(path.resolve(opts.report)), { recursive: true });
await writeFile(opts.report, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed, report: path.resolve(opts.report) }));
if (!passed) process.exitCode = 1;
