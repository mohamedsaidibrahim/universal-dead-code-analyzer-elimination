import { describe, it, expect } from 'vitest';
import { UniversalUnusedCodeAnalyzer } from '../src/lib/UniversalUnusedCodeAnalyzer.js';
import { loadIgnore } from '../src/lib/ignoreLoader.js';
import path from 'path';

describe('analyzer smoke', () => {
    it('runs scan', async () => {
        const cwd = path.resolve('.');
        const ignore = await loadIgnore(cwd);
        const analyzer = new UniversalUnusedCodeAnalyzer({ cwd, ignore });
        const res = await analyzer.scan(['tests/**/*.{ts,tsx}']);
        expect(res).toHaveProperty('unused');
    });
});