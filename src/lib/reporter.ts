import type { ScanResult } from './types';

export async function writeReport(result: ScanResult, opts: { format: 'json' | 'md' }) {
  if (opts.format === 'json') {
    return { format: 'json' as const, json: result, content: JSON.stringify(result, null, 2) };
  }
  const lines: string[] = [];
  lines.push(`# Universal Unused Code Analyzer Report`);
  lines.push('');
  lines.push(`**Summary:** Found ${result.summary.totalUnused} unused members across ${result.summary.files} files.`);
  lines.push('');
  if (result.unused.length) {
    lines.push('| Kind | Name | File | Line |');
    lines.push('| --- | --- | --- | ---: |');
    for (const u of result.unused) {
      lines.push(`| ${u.kind} | ${u.name} | ${u.file} | ${u.line} |`);
    }
  } else {
    lines.push('No unused members found. ✅');
  }
  lines.push('');
  lines.push('> Tip: Start with report-only mode, then run with `--delete` once confident.');
  return { format: 'md' as const, content: lines.join('\n') };
}