import { describe, it, expect } from 'vitest';

// Minimal copy of escapeHtml from widget.js
function escapeHtml(text: any) {
  const div = global.document?.createElement?.('div');
  if (!div) return String(text ?? '');
  div.textContent = String(text ?? '');
  return div.innerHTML;
}

describe('escapeHtml', () => {
  it('escapes tags and handles null/undefined', () => {
    expect(escapeHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
    expect(escapeHtml(null)).toBe(''); // matches widget behavior
    expect(escapeHtml(undefined)).toBe(''); // matches widget behavior
  });
});
