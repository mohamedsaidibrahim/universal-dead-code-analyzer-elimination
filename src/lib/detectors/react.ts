import fg from 'fast-glob';
import path from 'path';
import { Project, Node, SyntaxKind } from 'ts-morph';
import { AnalyzerOptions, ScanResult, UnusedMember } from '../types';

export class ReactDetector {
    private readonly project: Project;
    constructor(private readonly opts: AnalyzerOptions) {
        this.project = new Project({
            tsConfigFilePath: path.join(opts.cwd, 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
            compilerOptions: { allowJs: true, checkJs: false, jsx: 1 }
        });
    }

    async scan(globs: string[]): Promise<ScanResult> {
        const files = await fg(globs, { cwd: this.opts.cwd, absolute: true, ignore: ['**/node_modules/**'] });
        const filtered = files.filter((f) => !this.opts.ignore.ignores(f));
        filtered.forEach((f) => this.project.addSourceFileAtPathIfExists(f));

        const jsxUses = new Set<string>();
        for (const sf of this.project.getSourceFiles()) {
            sf.forEachDescendant((n) => {
                if (Node.isJsxOpeningElement(n) || Node.isJsxSelfClosingElement(n)) {
                    const tag = n.getTagNameNode().getText();
                    if (/^[A-Z]/.test(tag)) jsxUses.add(tag);
                }
            });
        }

        const unused: UnusedMember[] = [];

        for (const sf of this.project.getSourceFiles()) {
            sf.forEachDescendant((node) => {
                // function Component() { return <div/> }
                if (Node.isFunctionDeclaration(node) && node.getName() && /^[A-Z]/.test(node.getName()!)) {
                    const name = node.getName()!;
                    if (!jsxUses.has(name)) {
                        const { line, column } = sf.getLineAndColumnAtPos(node.getStart());
                        unused.push({ kind: 'react-component', name, file: sf.getFilePath(), line, column });
                    }
                }
                // const Component = () => (<div/>) or React.FC
                if (Node.isVariableDeclaration(node) && Node.isIdentifier(node.getNameNode())) {
                    const name = node.getName();
                    if (/^[A-Z]/.test(name)) {
                        const init = node.getInitializer();
                        if (init && (init.getKindName().includes('ArrowFunction') || init.getKindName().includes('Function'))) {
                            if (!jsxUses.has(name)) {
                                const { line, column } = sf.getLineAndColumnAtPos(node.getStart());
                                unused.push({ kind: 'react-component', name, file: sf.getFilePath(), line, column });
                            }
                        }
                    }
                }
            });
        }

        return { unused, summary: { files: this.project.getSourceFiles().length, totalUnused: unused.length } };
    }
}
