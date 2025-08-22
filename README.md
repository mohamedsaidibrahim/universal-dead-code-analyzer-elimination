# universal-dead-code-analyzer-elimination

> 🚀 Detect and eliminate unused code in TypeScript/JavaScript projects safely and efficiently.

Detect and optionally **remove unused code** across TypeScript/JavaScript projects. Includes detectors for **Cypress custom commands** and **Playwright fixtures**. Safe defaults, CI-friendly reports, and an ignore file for precise scoping.


---

## 📦 Installation

```bash
npm install -g universal-unused-code-analyzer
```

Or run without installing globally:

```bash
npx universal-unused-code-analyzer src/
```

---

## 🏃 Usage

### Basic Analysis

Analyze your project without making changes:

```bash
universal-unused-code-analyzer src/
```

This will scan all `.ts`, `.tsx`, `.js`, and `.jsx` files in the `src/` folder and report unused items.

### Report Mode (Safe-First)

Generate a report instead of modifying files:

```bash
universal-unused-code-analyzer src/ --report
```

Choose a report format:

```bash
universal-unused-code-analyzer src/ --report --report-format json
universal-unused-code-analyzer src/ --report --report-format md
```

- **JSON** → machine-readable, great for CI/CD.
- **Markdown** → human-readable, ideal for PR comments.

### Delete Mode (Aggressive Cleanup)

⚠️ Use with caution. Always start with `--report` first.

```bash
universal-unused-code-analyzer src/ --delete
```

This removes unused members directly from your source files.

---

## 🎯 Features

- **Dead/Unused Code Detection**
  - Functions, classes, variables, constants, enums, types, interfaces.
  - Named & default exports.
  - **Cypress commands**: Detects `Cypress.Commands.add("foo")` not used as `cy.foo(...)`.
  - **Playwright fixtures**: Declared but never injected.
  - **React components**: Unused PascalCase components.
  - **Tree-shaken export graph**: Finds unused exports.

- **File Exclusions**
  - Always ignores `node_modules/`.
  - Supports `.analyzerignore` (works like `.gitignore`).
  - Generate a template:

    ```bash
    universal-unused-code-analyzer --init-ignore
    ```

- **Reports**
  - JSON, Markdown, and CLI summary.
  - Example summary: `Found 12 unused members across 5 files.`

- **Safety First**
  - Default mode is non-destructive.
  - `.analyzerignore` lets you control scope.
  - Clear, colorized logs for confidence.

---

## ⚙️ Example Workflow

1. Initialize ignore rules:
   ```bash
   universal-unused-code-analyzer --init-ignore
   ```

2. Run safe report:
   ```bash
   universal-unused-code-analyzer src/ --report --report-format md
   ```

3. Review the report, update `.analyzerignore` if needed.

4. When confident, clean up:
   ```bash
   universal-unused-code-analyzer src/ --delete
   ```

---

## CLI Options

- `targets...` Files or globs to analyze (defaults to `src/**/*.{ts,tsx,js,jsx}` and `tests/**/*.{ts,tsx,js,jsx}`)
- `-r, --report` Report only (default true)
- `-f, --report-format <json|md>` Output format (default `md`)
- `-d, --delete` Delete unused members (destructive)
- `--cwd <dir>` Working directory
- `--init-ignore` Create a default `.analyzerignore` in project root
- `--out <file>` Write report to a file


## What It Detects

- Unused **functions, classes, methods, variables, enums, types, interfaces**, and certain **default exports** (heuristic)
- Unused **exported symbols** that are **never referenced/imported** elsewhere (simple tree-shake heuristic)
- Unused **React components** (PascalCase) not found in any JSX
- Unused **Cypress custom commands** declared via `Cypress.Commands.add('name', ...)` not referenced as `cy.name(...)`
- Unused **Playwright fixtures** declared through `test.extend<{ name: ... }>()` but never injected in test callbacks like `({ name })

> ⚠ Framework entry files (Next.js `pages/**` or `app/**`) are treated as entrypoints and never flagged.

## Ignore File: `.analyzerignore`

Works like `.gitignore`. Example:

```gitignore
node_modules/
dist/
coverage/
**/*.spec.ts
**/*.test.ts
**/__tests__/**
# Ignore legacy folder
# src/legacy/**
```

Create it with:

```bash
analyzer --init-ignore
```

---


## Safety Practices

1. Start with `--report`. Review the output.
2. Commit your code before running `--delete`.
3. Consider running in CI with JSON report and failing on findings to control adoption.

## CI Examples

### GitHub Actions

```yaml
name: unused-code
on: [push, pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: node ./dist/cli.js --report --report-format json --out analyzer-report.json
      - run: |
          node -e "const r=require('fs').readFileSync('analyzer-report.json','utf8'); const j=JSON.parse(r); if(j.summary.totalUnused>0){console.error('Unused code found');process.exit(1)}"
```

### GitLab CI

```yaml
unused_code:
  image: node:20
  script:
    - npm ci
    - npm run build
    - node ./dist/cli.js --report --report-format json --out analyzer-report.json
    - node -e "const r=require('fs').readFileSync('analyzer-report.json','utf8'); const j=JSON.parse(r); if(j.summary.totalUnused>0){console.error('Unused code found');process.exit(1)}"
  artifacts:
    paths: [analyzer-report.json]
```

---

## Extending with Custom Detectors

Create a new file in `src/lib/detectors/yourDetector.ts` that implements a `scan(globs): Promise<ScanResult>`. Merge its results in `src/lib/UniversalUnusedCodeAnalyzer.ts`..


### PR Annotations

The package integrates with GitHub Checks API to annotate unused code inline in pull requests.

---

## 🔐 Safety Tips

- Always start with `--report` before `--delete`.
- Review `.analyzerignore` carefully to avoid accidental removal.
- Commit before running `--delete` for easy rollback.

---

## 🛠 Scripts

For convenience, add scripts to your `package.json`:

```json
{
  "scripts": {
    "analyze": "universal-unused-code-analyzer src/ --report",
    "analyze:delete": "universal-unused-code-analyzer src/ --delete"
  }
}
```

---


## 🙌 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).


## License

MIT @ Mohamed Said Ibrahim

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

---

## Developer Notes

- Built with TypeScript and `ts-morph`.
- Default behavior is non-destructive.
- Deletion is best-effort and may not handle every edge case. Review diffs.
