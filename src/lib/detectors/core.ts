import fg from 'fast-glob';
import path from 'path';
import { Project, Node, SyntaxKind } from 'ts-morph';
import { AnalyzerOptions, ScanResult, UnusedMember } from '../types';

export class CoreDetector {
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

    const unused: UnusedMember[] = [];

    // Build a simple index of all identifiers and their references
    const sourceFiles = this.project.getSourceFiles();

    for (const sf of sourceFiles) {
      // Declarations potentially unused: functions, classes, variables, enums, interfaces, types, default exports
      sf.forEachDescendant((node) => {
        if (Node.isFunctionDeclaration(node) && node.getName()) {
          if (!this.isReferenced(node.getNameNode()!)) unused.push(this.toMember('function', node.getName()!, node));
        } else if (Node.isClassDeclaration(node) && node.getName()) {
          if (!this.isReferenced(node.getNameNode()!)) unused.push(this.toMember('class', node.getName()!, node));
        } else if (Node.isMethodDeclaration(node) && node.getName()) {
          // consider method as unused if class is used but method never referenced (heuristic)
          const nameNode = node.getNameNode();
          if (nameNode && !this.isReferenced(nameNode)) unused.push(this.toMember('method', node.getName(), node));
        } else if (Node.isEnumDeclaration(node)) {
          const n = node.getName();
          if (!this.isReferenced(node.getNameNode())) unused.push(this.toMember('enum', n, node));
        } else if (Node.isTypeAliasDeclaration(node)) {
          const n = node.getName();
          if (!this.isReferenced(node.getNameNode())) unused.push(this.toMember('type', n, node));
        } else if (Node.isInterfaceDeclaration(node)) {
          const n = node.getName();
          if (!this.isReferenced(node.getNameNode())) unused.push(this.toMember('interface', n, node));
        } else if (Node.isVariableDeclaration(node)) {
          const n = node.getName();
          const id = node.getNameNode();
          if (id && !this.isReferenced(id)) unused.push(this.toMember('variable', n, node));
        } else if (Node.isExportAssignment(node)) {
          // default export = export default expr; flag as unused if not imported anywhere (hard; heuristic: if it's a named identifier and unreferenced)
          const expr = node.getExpression();
          if (Node.isIdentifier(expr) && !this.isReferenced(expr)) {
            unused.push(this.toMember('export-default', expr.getText(), node));
          }
        }
      });
    }

    return {
      unused,
      summary: { files: sourceFiles.length, totalUnused: unused.length }
    };
  }

  private isReferenced(idNode: Node): boolean {
    try {
      const refs = (idNode as any).findReferences?.();
      if (!refs) return false;
      let count = 0;
      for (const ref of refs) {
        for (const r of ref.getReferences()) {
          // If the reference is the declaration itself, keep counting but don't treat as usage
          if (!r.isDefinition()) count++;
          if (count > 0) return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private toMember(kind: UnusedMember['kind'], name: string, node: Node): UnusedMember {
    const sf = node.getSourceFile();
    const { line, column } = sf.getLineAndColumnAtPos(node.getStart());
    return { kind, name, file: sf.getFilePath(), line, column };
  }
}