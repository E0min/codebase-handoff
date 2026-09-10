import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import sanitize from 'sanitize-html';
import { options, escape, launch } from './common.mjs';

const opts = options(['input', 'output', 'appendix', 'viewer', 'browser', 'title', 'lang']);
if (!opts.input || !opts.output) throw new Error('Usage: node build.mjs --input MAP.md --output MAP.html [--appendix evidence.md] [--viewer architecture.html] [--browser executable] [--title title] [--lang ko]');
const input = path.resolve(opts.input);
const output = path.resolve(opts.output);
const files = [input, ...opts.appendix];
if (new Set(files).size !== files.length || files.includes(output) || (opts.viewer && path.resolve(opts.viewer) === output)) throw new Error('Inputs and output must be distinct.');
const texts = await Promise.all(files.map(f => readFile(f, 'utf8')));
const browser = await launch(opts.browser);
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', r => /^https?:/.test(r.url()) ? r.abort() : r.continue());
  await page.setContent('<!doctype html><html><body></body></html>');
  const mermaidPath = fileURLToPath(new URL('./node_modules/mermaid/dist/mermaid.js', import.meta.url));
  await page.addScriptTag({ path: mermaidPath });
  await page.evaluate(() => mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' }));
  const toc = [];
  let diagrams = 0;
  let headings = 0;
  const sections = [];
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const tokens = marked.lexer(texts[fileIndex]);
    const svgByToken = new Map();
    await Promise.all(marked.walkTokens(tokens, async token => {
      if (token.type === 'html') token.text = escape(token.text);
      if (token.type === 'code' && token.lang?.trim() === 'mermaid') {
        // Render sequentially below: Mermaid shares browser state.
        svgByToken.set(token, null);
      }
      if (token.type === 'image') {
        const url = token.href;
        if (/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(url)) return;
        if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(url)) throw new Error(`Remote/unsupported image: ${url}`);
        const imagePath = path.resolve(path.dirname(files[fileIndex]), decodeURIComponent(url));
        const mime = { '.png': 'png', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.gif': 'gif', '.webp': 'webp' }[path.extname(imagePath).toLowerCase()];
        if (!mime) throw new Error(`Unsupported image (use PNG/JPEG/GIF/WebP): ${url}`);
        token.href = `data:image/${mime};base64,${(await readFile(imagePath)).toString('base64')}`;
      }
      if (token.type === 'link' && !/^[a-z][a-z\d+.-]*:|^\/\//i.test(token.href)) {
        const [filePart, hash] = token.href.split('#');
        const target = filePart ? path.resolve(path.dirname(files[fileIndex]), decodeURIComponent(filePart)) : files[fileIndex];
        const index = files.indexOf(target);
        if (index >= 0) token.href = hash ? `#doc-${index}-${hash}` : `#doc-${index}`;
        else if (filePart) token.href = path.relative(path.dirname(output), target).split(path.sep).map(encodeURIComponent).join('/') + (hash ? `#${hash}` : '');
      }
    }));
    for (const token of svgByToken.keys()) {
      const id = `diagram-${++diagrams}`;
      const svg = await page.evaluate(async ({ id, code }) => (await mermaid.render(id, code)).svg, { id, code: token.text });
      svgByToken.set(token, `<figure class="diagram">${svg}<details><summary>Mermaid source</summary><pre>${escape(token.text)}</pre></details></figure>`);
    }
    const slugs = new Map();
    const renderer = new marked.Renderer();
    renderer.heading = function(token) {
      const text = this.parser.parseInline(token.tokens);
      const label = text.replace(/<[^>]*>/g, '');
      const slug = label.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
      const repeat = slugs.get(slug) || 0;
      slugs.set(slug, repeat + 1);
      const id = `doc-${fileIndex}-${slug}${repeat ? `-${repeat}` : ''}`;
      headings++;
      if (fileIndex === 0 && token.depth <= 2) toc.push(`<a href="#${escape(id)}">${text}</a>`);
      return `<h${token.depth} id="${escape(id)}">${text}</h${token.depth}>`;
    };
    // Keep rendered SVG out of the Markdown sanitizer. Only Mermaid's strict renderer supplies it.
    const diagramSlots = [];
    renderer.code = function(token) {
      if (svgByToken.has(token)) {
        const slot = `handoff-diagram-${diagramSlots.length}`;
        diagramSlots.push([slot, svgByToken.get(token)]);
        return `<div id="${slot}"></div>`;
      }
      return `<pre><code>${escape(token.text)}</code></pre>`;
    };
    let html = sanitize(marked.parser(tokens, { renderer }), {
      allowedTags: [...sanitize.defaults.allowedTags, 'img', 'details', 'summary'],
      allowedAttributes: { '*': ['id'], a: ['href', 'title'], img: ['src', 'alt', 'title'] },
      allowedSchemes: ['https', 'http', 'mailto'],
      allowedSchemesByTag: { img: ['data'] },
      allowProtocolRelative: false
    });
    for (const [slot, svg] of diagramSlots) html = html.replace(`<div id="${slot}"></div>`, svg);
    html = html.replace(/<table>/g, '<div class="table"><table>').replace(/<\/table>/g, '</table></div>');
    sections.push(fileIndex === 0 ? `<article id="doc-0">${html}</article>` : `<details id="doc-${fileIndex}" class="appendix"><summary>${escape(path.basename(files[fileIndex]))}</summary>${html}</details>`);
  }
  let viewer = '';
  if (opts.viewer) {
    const trusted = await readFile(path.resolve(opts.viewer), 'utf8');
    viewer = `<section id="embedded-viewer"><h2>Architecture viewer</h2><iframe title="Architecture viewer" sandbox="allow-scripts" srcdoc="${escape(trusted)}"></iframe></section>`;
    toc.push('<a href="#embedded-viewer">Architecture viewer</a>');
  }
  for (let i = 1; i < files.length; i++) toc.push(`<a href="#doc-${i}">${escape(path.basename(files[i]))}</a>`);
  const title = opts.title || path.basename(input, path.extname(input));
  const manifest = JSON.stringify({ headings, diagrams, appendices: opts.appendix.length, viewers: opts.viewer ? 1 : 0 });
  const html = `<!doctype html>
<html lang="${escape(opts.lang || 'en')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f6f7fb;color:#182236;font:16px/1.8 system-ui,sans-serif}nav{position:fixed;inset:0 auto 0 0;width:260px;overflow:auto;padding:28px 20px;background:#14243c;color:white}nav a{display:block;color:#d8e5f8;text-decoration:none;padding:7px 0;overflow-wrap:anywhere}nav strong{display:block;margin-bottom:18px}main{margin-left:260px;max-width:1300px;padding:40px 48px;min-width:0}article,.appendix{background:white;border:1px solid #dbe1ea;border-radius:10px;padding:28px;margin-bottom:24px}h1,h2,h3{line-height:1.35;scroll-margin-top:20px}h1{font-size:30px}h2{margin-top:38px;font-size:24px}a{color:#205cb3;overflow-wrap:anywhere}p,li,td,th{overflow-wrap:anywhere}pre,.table,.diagram{max-width:100%;overflow:auto}pre{padding:16px;background:#eef2f7;font-size:13px;line-height:1.6}code{font-size:.9em}table{border-collapse:collapse;min-width:100%}th,td{padding:10px 14px;border:1px solid #dbe1ea;text-align:left}th{background:#eef2f7}figure{margin:24px 0;padding:16px;border:1px solid #dbe1ea;border-radius:8px}img{max-width:100%;height:auto}summary{cursor:pointer;font-weight:600}iframe{width:100%;height:850px;border:1px solid #dbe1ea;border-radius:10px;background:white}blockquote{margin:16px 0;padding-left:18px;border-left:3px solid #5481ba;color:#42536a}@media(max-width:760px){nav{position:static;width:auto;max-height:280px}main{margin:0;padding:16px}article,.appendix{padding:18px}h1{font-size:26px}iframe{height:700px}}
</style></head><body><nav aria-label="Contents"><strong>${escape(title)}</strong>${toc.join('')}</nav><main>${sections.join('\n')}${viewer}</main>
<script id="handoff-manifest" type="application/json">${manifest}</script>
<script>
function reveal(){let id;try{id=decodeURIComponent(location.hash.slice(1))}catch{return}const target=document.getElementById(id);if(!target)return;for(let p=target;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;target.scrollIntoView()}
addEventListener('hashchange',reveal);addEventListener('load',reveal);
document.querySelectorAll('.diagram svg').forEach(s=>{s.style.maxWidth='none';s.style.width=(s.viewBox.baseVal.width||640)+'px';s.style.height='auto'});
</script></body></html>`;
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
  console.log(JSON.stringify({ output, ...JSON.parse(manifest), browserValidation: 'not run; use check.mjs' }, null, 2));
} finally { await browser.close(); }
