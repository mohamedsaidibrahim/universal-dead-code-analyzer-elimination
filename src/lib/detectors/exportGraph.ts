// FILE: src/lib/detectors/exportGraph.ts
import fg from 'fast-glob';
import path from 'path';
import { Project, Node, ExportedDeclarations, SourceFile } from 'ts-morph';
import { AnalyzerOptions, ScanResult, UnusedMember } from '../types';


function isNextEntryFile(abs: string, cwd: string) {
    const rel = path.relative(cwd, abs).replace(/\\/g, '/');
    return (
        /^pages\//.test(rel) ||
        /^src\/pages\//.test(rel) ||
        /^app\//.test(rel) ||
        /^src\/app\//.test(rel)
    );
}

export class ExportGraphDetector {
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

        for (const sf of this.project.getSourceFiles()) {
            if (isNextEntryFile(sf.getFilePath(), this.opts.cwd)) continue; // treat as entrypoint
            const exported = sf.getExportedDeclarations();
            for (const [name, decls] of exported) {
                // For each exported symbol, consider it unused if no non-definition references exist.
                const decl = decls[0];
                if (!decl) continue;
                const id = (decl as any).getNameNode?.() || null;
                let referenced = false;
                try {
                    const refs = (id || decl as any).findReferences?.();
                    if (refs) {
                        for (const ref of refs) {
                            for (const r of ref.getReferences()) {
                                // ignore the declaration and export specifiers in the same file
                                if (r.isDefinition()) continue;
                                referenced = true; break;
                            }
                            if (referenced) break;
                        }
                    }
                } catch { }
                if (!referenced) {
                    const pos = decl.getStart();
                    const { line, column } = sf.getLineAndColumnAtPos(pos);
                    unused.push({ kind: 'exported-symbol', name, file: sf.getFilePath(), line, column });
                }
            }
        }

        return { unused, summary: { files: this.project.getSourceFiles().length, totalUnused: unused.length } };
    }
}
