import { describe, it, expect } from 'vitest';

function conciseReply(txt: string) {
  const res = txt.trim().slice(0, 450);
  return res;
}

describe('chat fallback length', () => {
  it('caps to 450 chars', () => {
    const long = 'x'.repeat(1000);
    expect(conciseReply(long).length).toBe(450);
  });
});
