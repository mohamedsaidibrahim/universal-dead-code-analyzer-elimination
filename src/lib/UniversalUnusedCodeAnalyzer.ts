import fg from 'fast-glob';
import { CoreDetector } from './detectors/core.js';
import { CypressDetector } from './detectors/cypress.js';
import { PlaywrightDetector } from './detectors/playwright.js';
import { AnalyzerOptions, IgnoreApi, ScanResult, UnusedMember } from './types.js';
import path from 'path';
import { Project, Node } from 'ts-morph';

export class UniversalUnusedCodeAnalyzer {
  private core: CoreDetector;
  private cypress: CypressDetector;
  private pw: PlaywrightDetector;
  constructor(private readonly opts: { cwd: string; ignore: IgnoreApi }) {
    this.core = new CoreDetector(opts);
    this.cypress = new CypressDetector(opts);
    this.pw = new PlaywrightDetector(opts);
  }

  async scan(globs: string[]): Promise<ScanResult> {
    const [core, cypress, pw] = await Promise.all([
      this.core.scan(globs),
      this.cypress.scan(globs),
      this.pw.scan(globs)
    ]);

    const allUnused = [...core.unused, ...cypress.unused, ...pw.unused];
    const files = new Set<string>();
    for (const u of allUnused) files.add(u.file);

    return {
      unused: allUnused.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
      summary: { files: files.size, totalUnused: allUnused.length }
    };
  }

  /**
   * Delete unused members from disk. Currently handles function/class/enum/type/interface/variable
   * via ts-morph, and removes Cypress command registrations.
   */
  async deleteUnused(result: ScanResult) {
    const byFile = new Map<string, UnusedMember[]>();
    for (const u of result.unused) {
      if (!byFile.has(u.file)) byFile.set(u.file, []);
      byFile.get(u.file)!.push(u);
    }

    let deleted = 0;
    let filesChanged = 0;

    for (const [file, items] of byFile) {
      const project = new Project({
        tsConfigFilePath: path.join(this.opts.cwd, 'tsconfig.json'),
        skipAddingFilesFromTsConfig: true,
        compilerOptions: { allowJs: true, checkJs: false }
      });
      const sf = project.addSourceFileAtPathIfExists(file);
      if (!sf) continue;

      // Remove declarations by position matching (line numbers can drift; match by name/kind)
      for (const u of items) {
        const removed = this.removeNodeByKind(sf, u);
        if (removed) deleted++;
      }

      if (deleted > 0) {
        filesChanged++;
        await sf.save();
      }
    }

    return { deleted, filesChanged };
  }

  private removeNodeByKind(sf: any, u: UnusedMember): boolean {
    let removed = false;

    const tryRemove = (node: any) => {
      try {
        node.remove();
        removed = true;
      } catch {}
    };

    sf.forEachDescendant((node: any) => {
      if (removed) return;
      // Core declarations
      if (u.kind === 'function' && Node.isFunctionDeclaration(node) && node.getName() === u.name) tryRemove(node);
      if (u.kind === 'class' && Node.isClassDeclaration(node) && node.getName() === u.name) tryRemove(node);
      if (u.kind === 'enum' && Node.isEnumDeclaration(node) && node.getName() === u.name) tryRemove(node);
      if (u.kind === 'interface' && Node.isInterfaceDeclaration(node) && node.getName() === u.name) tryRemove(node);
      if (u.kind === 'type' && Node.isTypeAliasDeclaration(node) && node.getName() === u.name) tryRemove(node);
      if (u.kind === 'variable' && Node.isVariableDeclaration(node) && node.getName() === u.name) {
        const vd = node.getParent();
        tryRemove(node);
        if (vd && Node.isVariableDeclarationList(vd) && vd.getDeclarations().length === 0) tryRemove(vd);
      }
      // Cypress command registrations
      if (u.kind === 'cypress-command' && Node.isCallExpression(node)) {
        const expr = node.getExpression();
        if (Node.isPropertyAccessExpression(expr) && expr.getText() === 'Cypress.Commands.add') {
          const first = node.getArguments()[0];
          const name = first?.getText()?.replace(/^['"]|['"]$/g, '');
          if (name === u.name) tryRemove(node);
        }
      }
    });

    return removed;
  }
}