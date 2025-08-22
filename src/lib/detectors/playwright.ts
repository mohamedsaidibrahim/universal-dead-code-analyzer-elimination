import fg from 'fast-glob';
import { Project, Node } from 'ts-morph';
import path from 'path';
import { AnalyzerOptions, ScanResult, UnusedMember } from '../types.js';

/** Heuristic Playwright detector:
 * - Finds fixtures declared in test.extend<{ foo: ... }>() or via expect.extend? No, focus on test.extend.
 * - Marks a fixture as used if it appears as a parameter in a test callback: test('name', ({ foo }) => ...)
 */
export class PlaywrightDetector {
  private readonly project: Project;
  constructor(private readonly opts: AnalyzerOptions) {
    this.project = new Project({
      tsConfigFilePath: path.join(opts.cwd, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
      compilerOptions: { allowJs: true, checkJs: false }
    });
  }

  async scan(globs: string[]): Promise<ScanResult> {
    const files = await fg(globs, { cwd: this.opts.cwd, absolute: true, ignore: ['**/node_modules/**'] });
    const filtered = files.filter((f) => !this.opts.ignore.ignores(f));
    filtered.forEach((f) => this.project.addSourceFileAtPathIfExists(f));

    const declared = new Map<string, UnusedMember>();
    const used = new Set<string>();

    for (const sf of this.project.getSourceFiles()) {
      const text = sf.getFullText();
      // Detect declarations inside test.extend<{ foo: ... }>
      const extendMatch = text.match(/test\.extend\s*<\s*\{([\s\S]*?)\}>/g);
      if (extendMatch) {
        for (const block of extendMatch) {
          const names = Array.from(block.matchAll(/(\w+)\s*:/g))
            .map((m) => m[1])
            .filter((s): s is string => typeof s === 'string');
          for (const name of names) {
            const { line, column } = sf.getLineAndColumnAtPos(text.indexOf(name));
            declared.set(name, { kind: 'playwright-fixture', name, file: sf.getFilePath(), line, column });
          }
        }
      }

      // Detect usage in test callbacks: ({ foo, bar })
      const usage = text.match(/\(\{([^}]*)\}\)/g);
      if (usage) {
        for (const u of usage) {
          const names = u
            .replace(/^[^(]*\(\{/, '')
            .replace(/\}.*$/, '')
            .split(',')
            .map((s) => ((s ?? '').trim().split(':')[0] ?? '').trim())
            .filter(Boolean);
          names.forEach((n) => used.add(n));
        }
      }
    }

    const unused = [...declared.values()].filter((m) => !used.has(m.name));
    return { unused, summary: { files: this.project.getSourceFiles().length, totalUnused: unused.length } };
  }
}