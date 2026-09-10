# Codebase Handoff

Create a source-grounded handoff for a developer who knows programming but is new to a codebase. The goal is to explain where a change starts, what it affects, and where to investigate a failure.

The skill works with a single repository, a multi-repository service, a library, a CLI, or a batch application. It follows actual entrypoints, imports, configuration, data writes, and asynchronous boundaries. Unsupported conclusions are marked as requiring confirmation.

## Install

Clone the repository into your agent's skill directory. For Codex:

```sh
git clone https://github.com/E0min/codebase-handoff.git ~/.codex/skills/codebase-handoff
```

For Claude Code:

```sh
git clone https://github.com/E0min/codebase-handoff.git ~/.claude/skills/codebase-handoff
```

If that folder already exists, preserve your local changes before updating it. Alternatively, download the repository and copy the complete folder into your agent's skill directory as `codebase-handoff`. Keep `references/`, `scripts/`, and `agents/` with `SKILL.md`.

- Codex: `~/.codex/skills/codebase-handoff`
- Claude Code: `~/.claude/skills/codebase-handoff`
- Other agents: use the host's documented skill directory or load `SKILL.md` explicitly.

The instructions are host-independent; automatic discovery depends on the host. Start a new session if the host caches its skill catalog. Separate forward execution by every supported host has not been verified.

## Use

```text
Use codebase-handoff to explain this repository to a developer inheriting it.
Start with the system map, then trace the most important data-changing flows.
Produce one offline HTML reader and retain the Markdown source.
```

```text
$codebase-handoff 이 서비스의 결제 기능을 관련 레포까지 연결해서 분석해줘.
핵심 흐름, 데이터 변경, 장애 확인 순서와 변경 영향을 설명해줘.
```

The output follows the reader's language. All 15 analysis areas are checked, while document length and the learning sequence adapt to project size. Explicit user formatting takes precedence. Mermaid is the default. Archify is optional and must be installed separately when requested.

## HTML tools

Analysis and Markdown authoring require no bundled runtime. The optional HTML tools require Node.js 22+ and an existing Chrome/Chromium executable.

From `scripts/`:

```sh
npm ci --ignore-scripts
node build.mjs --input /path/to/CODEBASE_MAP.md --output /path/to/CODEBASE_MAP.html --browser /path/to/chrome
node check.mjs --input /path/to/CODEBASE_MAP.html --report /path/to/validation.json --browser /path/to/chrome --screenshots /path/to/screenshots
```

Alternatively, set `CHROME_PATH`. No browser is downloaded automatically. Repeat `--appendix` to embed supporting Markdown files. Use `--viewer` only with a trusted, self-contained architecture viewer. See [HTML delivery](references/html-delivery.md) for input limitations and validation boundaries.

The renderer embeds Mermaid SVG and local raster images, escapes raw Markdown HTML, and rejects remote images. The checker opens the result at desktop and mobile sizes, blocks and records external/sidecar requests, checks internal anchors and diagram counts, and saves screenshots. Inspect those screenshots separately before claiming visual verification. It does not verify application behavior, production deployment, or source-link destinations.

Run integration tests from `scripts/` with `CHROME_PATH` set:

```sh
npm test
```

Test coverage includes Unicode paths, Markdown appendices, four Mermaid types, embedded viewers, offline assets, unsafe Markdown, malformed diagrams, broken anchors, and external request detection. Browser tests have been run on macOS with Chrome. Linux, Windows, and full task execution across different agent hosts remain unverified.

## Contents

- [SKILL.md](SKILL.md): scope, investigation order, evidence rules, delivery workflow.
- [Analysis contract](references/analysis-contract.md): 15 analysis areas, failure boundaries, learning order.
- [HTML delivery](references/html-delivery.md): single-file reading, tool commands, verification limits.
- `scripts/`: reproducible generation, browser checks, integration tests, pinned dependencies.

Project source code and private handoff documents are not part of this skill package.

## License

[MIT](LICENSE). Installed dependencies retain their own licenses.
