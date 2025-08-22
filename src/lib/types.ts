export type UnusedKind =
    | 'function'
    | 'class'
    | 'method'
    | 'variable'
    | 'const'
    | 'enum'
    | 'type'
    | 'interface'
    | 'export-default'
    | 'cypress-command'
    | 'playwright-fixture';

export interface UnusedMember {
    kind: UnusedKind;
    name: string;
    file: string;
    line: number;
    column: number;
    note?: string;
}

export interface ScanSummary {
    files: number;
    totalUnused: number;
}

export interface ScanResult {
    unused: UnusedMember[];
    summary: ScanSummary;
}

export interface IgnoreApi {
    ignores: (p: string) => boolean;
}

export interface AnalyzerOptions {
    cwd: string;
    ignore: IgnoreApi;
}