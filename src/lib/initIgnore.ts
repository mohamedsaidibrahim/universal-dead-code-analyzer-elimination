import fs from 'fs-extra';
import path from 'path';

const TEMPLATE = `# Default ignore patterns (similar to .gitignore semantics)
node_modules/
dist/
coverage/
**/*.spec.ts
**/*.test.ts
**/__tests__/**
**/generated/**
`;

export async function ensureDefaultIgnore(cwd: string) {
  const target = path.join(cwd, '.analyzerignore');
  if (!(await fs.pathExists(target))) {
    await fs.writeFile(target, TEMPLATE, 'utf8');
  }
}
