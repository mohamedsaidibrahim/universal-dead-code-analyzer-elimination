import { Command } from 'commander';
import chalk from 'chalk';
import { loadIgnore } from './lib/ignoreLoader.js';
import { UniversalUnusedCodeAnalyzer } from './lib/UniversalUnusedCodeAnalyzer.js';
import { writeReport } from './lib/reporter.js';
import { ensureDefaultIgnore } from './lib/initIgnore.js';
import fs from 'fs-extra';
import path from 'path';

const program = new Command();
program
  .name('analyzer')
  .description('Detect and optionally remove unused code in TS/JS projects')
  .argument('[targets...]', 'Files or globs to analyze (defaults to src/**/*.{ts,tsx,js,jsx})')
  .option('-r, --report', 'Report only (no modifications)', true)
  .option('-f, --report-format <format>', 'Report format: json|md', 'md')
  .option('-d, --delete', 'Delete unused members (destructive)')
  .option('--cwd <dir>', 'Working directory', process.cwd())
  .option('--init-ignore', 'Create a default .analyzerignore if not present')
  .option('--out <file>', 'Write report to file (instead of stdout)')
  .action(async (targets: string[], opts) => {
    const cwd = path.resolve(opts.cwd);

    if (opts.initIgnore) {
      await ensureDefaultIgnore(cwd);
      console.log(chalk.green(`✔ .analyzerignore ensured at ${cwd}`));
      return;
    }

    const resolvedTargets = targets.length
      ? targets
      : ['src/**/*.{ts,tsx,js,jsx}', 'tests/**/*.{ts,tsx,js,jsx}'];

    const ignore = await loadIgnore(cwd);
    const analyzer = new UniversalUnusedCodeAnalyzer({ cwd, ignore });

    console.log(chalk.cyan(`▶ Scanning ${resolvedTargets.join(', ')} ...`));

    const result = await analyzer.scan(resolvedTargets);

    if (opts.delete) {
      console.log(chalk.yellow('⚠ Destructive mode enabled: deleting unused members...'));
      const delSummary = await analyzer.deleteUnused(result);
      console.log(chalk.green(`✔ Deleted ${delSummary.deleted} nodes across ${delSummary.filesChanged} files.`));
    }

    const report = await writeReport(result, { format: opts.reportFormat });

    if (opts.out) {
      await fs.outputFile(path.resolve(cwd, opts.out), report.content, 'utf8');
      console.log(chalk.green(`✔ Report written to ${opts.out}`));
    } else {
      if (report.format === 'md') console.log(report.content);
      else console.log(JSON.stringify(report.json, null, 2));
    }

    const summary = result.summary;
    const color = summary.totalUnused > 0 ? chalk.yellow : chalk.green;
    console.log(color(`Summary: Found ${summary.totalUnused} unused members across ${summary.files} files.`));

    process.exitCode = summary.totalUnused > 0 && !opts.delete ? 1 : 0;
  });

program.parseAsync(process.argv);