import { Project, Node, SyntaxKind } from 'ts-morph';
import path from 'path';
import fg from 'fast-glob';
import { AnalyzerOptions, ScanResult, UnusedMember } from '../types.js';

export class CypressDetector {
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

    const commands = new Map<string, UnusedMember>();
    const used = new Set<string>();

    for (const sf of this.project.getSourceFiles()) {
      sf.forEachDescendant((node) => {
        // Capture: Cypress.Commands.add('foo', ...)
        if (
          Node.isCallExpression(node) &&
          Node.isPropertyAccessExpression(node.getExpression())
        ) {
          const pae = node.getExpression();
          const text = pae.getText();
          if (text === 'Cypress.Commands.add' && node.getArguments().length > 0) {
            const first = node.getArguments()[0]!;
            const name = first.getText().replace(/^['"]|['"]$/g, '');
            const { line, column } = sf.getLineAndColumnAtPos(node.getStart());
            commands.set(name, { kind: 'cypress-command', name, file: sf.getFilePath(), line, column });
          }
        }

        // Capture use: cy.foo(
        if (Node.isPropertyAccessExpression(node)) {
          const exprText = node.getExpression().getText();
          if (exprText === 'cy') {
            used.add(node.getName());
          }
        }
      });
    }

    const unused = [...commands.values()].filter((m) => !used.has(m.name));

    return { unused, summary: { files: this.project.getSourceFiles().length, totalUnused: unused.length } };
  }
}