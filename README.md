# universal-dead-code-analyzer-elimination

Detect and optionally **remove unused code** across TypeScript/JavaScript projects. Includes detectors for **Cypress custom commands** and **Playwright fixtures**. Safe defaults, CI-friendly reports, and an ignore file for precise scoping.

## Install

```bash
npm i -g universal-unused-code-analyzer
# or project-local
npm i -D universal-unused-code-analyzer
```

## Quickstart

```bash
# Report-only (safe default)
analyzer src/

# JSON report for CI
analyzer src/ --report --report-format json --out analyzer-report.json

# Initialize ignore file\ananalyzer --init-ignore

# Destructive cleanup (after verifying reports)
analyzer src/ --delete
```

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

## Extending with Custom Detectors

Create a new file in `src/lib/detectors/yourDetector.ts` that implements a `scan(globs): Promise<ScanResult>`. Merge its results in `src/lib/UniversalUnusedCodeAnalyzer.ts`..

## Contributing

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
