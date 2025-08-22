import { describe, it, expect } from 'vitest';

function used() { return 1; }
function unusedFn() { return 2; }
const unusedConst = 3;

describe('sample', () => {
  it('works', () => {
    expect(used()).toBe(1);
  });
});