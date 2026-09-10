import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scripts = path.dirname(fileURLToPath(import.meta.url));
const run = (script, args) => spawnSync(process.execPath, [path.join(scripts, script), ...args], { encoding: 'utf8', timeout: 120000 });
test('portable offline reader, diagrams, appendices and rejection of broken input', async () => {
  assert.ok(process.env.CHROME_PATH, 'CHROME_PATH is required for the browser integration test');
  const dir = await mkdtemp(path.join(tmpdir(), 'handoff 한글 '));
  const input = path.join(dir, 'guide.md');
  const appendix = path.join(dir, '근거 자료.md');
  const output = path.join(dir, 'output', 'guide.html');
  const report = path.join(dir, 'report.json');
  const viewer = path.join(dir, 'viewer.html');
  await writeFile(viewer, '<!doctype html><svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><text x="10" y="50">Viewer</text></svg>');
  await writeFile(appendix, '# 세부 근거\n\n[본문](guide.md#개요)\n');
  await writeFile(path.join(dir, 'pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', 'base64'));
  await writeFile(input, `# 개요

[부록](<근거 자료.md#세부-근거>) / [중복 제목](#개요-1)

![local](pixel.png)

<script>throw new Error('UNTRUSTED')</script>

[bad](javascript:alert(1))

| 책임 | 근거 |
| --- | --- |
| Reader | src/reader.ts |

\`\`\`mermaid
flowchart LR
  Client --> API --> Store
\`\`\`

## 개요

\`\`\`mermaid
sequenceDiagram
  Client->>API: Request
  API-->>Client: Result
\`\`\`

\`\`\`mermaid
erDiagram
  USER ||--o{ TASK : owns
\`\`\`

\`\`\`mermaid
stateDiagram-v2
  [*] --> Ready
  Ready --> Done
\`\`\`
`);
  const built = run('build.mjs', ['--input', input, '--output', output, '--appendix', appendix, '--viewer', viewer, '--lang', 'ko']);
  assert.equal(built.status, 0, built.stderr);
  const html = await readFile(output, 'utf8');
  assert.ok(!html.includes('<script>throw'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('data:image/png;base64,'));
  const checked = run('check.mjs', ['--input', output, '--report', report, '--screenshots', path.join(dir, 'screenshots')]);
  assert.equal(checked.status, 0, checked.stdout + checked.stderr + await readFile(report, 'utf8'));
  const data = JSON.parse(await readFile(report, 'utf8'));
  assert.ok(data.passed);
  assert.ok(data.results.every(r => r.diagrams === 4 && r.requests.length === 0 && r.appendixNavigation));
  // Verifier must fail, not silently pass, when the final artifact is damaged.
  await writeFile(output, html.replace('href="#doc-0-개요-1"', 'href="#missing"'));
  const broken = run('check.mjs', ['--input', output, '--report', report]);
  assert.equal(broken.status, 1);
  assert.ok(JSON.parse(await readFile(report, 'utf8')).results.every(r => r.broken.includes('#missing')));
  await writeFile(output, html.replace('</main>', '<img src="https://example.invalid/remote.png"></main>'));
  const remote = run('check.mjs', ['--input', output, '--report', report]);
  assert.equal(remote.status, 1);
  assert.ok(JSON.parse(await readFile(report, 'utf8')).results.every(r => r.requests.includes('https://example.invalid/remote.png')));
  await writeFile(input, '# Bad image\n![remote](https://example.invalid/image.png)');
  assert.notEqual(run('build.mjs', ['--input', input, '--output', output]).status, 0);
  await writeFile(input, '# Invalid diagram\n```mermaid\nnot-a-diagram\n```');
  assert.notEqual(run('build.mjs', ['--input', input, '--output', output]).status, 0);
  console.log(`Integration artifacts: ${dir}`);
});
