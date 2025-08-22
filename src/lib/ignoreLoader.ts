import fs from 'fs-extra';
import path from 'path';
import ignoreLib from 'ignore';
import { IgnoreApi } from './types.js';

export async function loadIgnore(cwd: string): Promise<IgnoreApi> {
  const file = path.join(cwd, '.analyzerignore');
  let ig = ignoreLib();
  if (await fs.pathExists(file)) {
    const content = await fs.readFile(file, 'utf8');
    ig = ignoreLib().add(content.split(/\r?\n/));
  } else {
    // built-in safe defaults
    ig = ignoreLib().add(['node_modules/', 'dist/', 'coverage/']);
  }
  return {
    ignores(p: string) {
      const rel = path.relative(cwd, p).replaceAll('\\', '/');
      return ig.ignores(rel);
    }
  };
}