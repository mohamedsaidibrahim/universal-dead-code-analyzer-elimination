#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function runAnalyzer(options = {}) {
  // Set environment variables
  const env = { ...process.env };

  if (options.report) {
    env.REPORT_JSON = options.output || 'analyzer-report.json';
  }

  if (options.exclude && options.exclude.length > 0) {
    env.EXCLUDE_PATTERNS = options.exclude.join(',');
  }

  if (options.entryPoints && options.entryPoints.length > 0) {
    env.ENTRY_POINTS = options.entryPoints.join(',');
  }

  if (options.delete) {
    env.DELETE_UNUSED = 'true';
  }

  if (options.rootDir) {
    env.ROOT_DIR = options.rootDir;
  }

  // Check if the analyzer file exists
  const analyzerPath = path.join(__dirname, 'src', 'lib', 'UniversalUnusedCodeAnalyzer.ts');
  if (!fs.existsSync(analyzerPath)) {
    console.error('Error: Analyzer file not found at', analyzerPath);
    process.exit(1);
  }

  // Run the analyzer using ts-node
  const result = spawnSync('npx', ['ts-node', analyzerPath], {
    env,
    stdio: 'inherit',
    shell: true,
  });

  return result.status;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    report: false,
    output: null,
    exclude: [],
    entryPoints: [],
    delete: false,
    rootDir: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--report':
        options.report = true;
        break;
      case '--out':
      case '--output':
        options.output = args[++i];
        break;
      case '--exclude':
        options.exclude.push(args[++i]);
        break;
      case '--entry-points':
        options.entryPoints.push(args[++i]);
        break;
      case '--delete':
        options.delete = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        // Assume it's a directory path
        if (!arg.startsWith('-')) {
          options.rootDir = path.resolve(arg);
        }
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Universal Unused Code Analyzer CLI

Usage:
  code-analyzer [directory] [options]

Options:
  --report               Generate JSON report
  --out <file>           Output file for report (default: analyzer-report.json)
  --exclude <pattern>    Exclude pattern (can be used multiple times)
  --entry-points <file>  Entry point files (can be used multiple times)
  --delete               Delete unused code (dangerous!)
  --help, -h            Show this help

Examples:
  code-analyzer                          # Analyze current directory
  code-analyzer src/                     # Analyze src directory
  code-analyzer --report                 # Generate report
  code-analyzer --report --out report.json
  code-analyzer --exclude "**/node_modules/**" --exclude "**/dist/**"
  `);
}

// Main execution
try {
  const options = parseArgs();
  const exitCode = runAnalyzer(options);
  process.exit(exitCode);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
