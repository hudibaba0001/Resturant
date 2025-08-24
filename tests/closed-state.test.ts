import { describe, it, expect } from 'vitest';

function canAdd(isClosed: boolean, hasItems = true) {
  const disabled = isClosed || !hasItems;
  return !disabled;
}

describe('closed state', () => {
  it('disables cart actions when closed', () => {
    expect(canAdd(true, true)).toBe(false);
    expect(canAdd(true, false)).toBe(false);
  });
  it('allows when open and has items', () => {
    expect(canAdd(false, true)).toBe(true);
  });
});
