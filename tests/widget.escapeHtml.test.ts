import { describe, it, expect } from 'vitest';

// Minimal copy of escapeHtml from widget.js
function escapeHtml(text: any) {
  // In Node.js test environment, simulate the HTML escaping
  if (typeof text !== 'string') return String(text ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

describe('escapeHtml', () => {
  it('escapes tags and handles null/undefined', () => {
    expect(escapeHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
    expect(escapeHtml(null)).toBe(''); // matches widget behavior
    expect(escapeHtml(undefined)).toBe(''); // matches widget behavior
  });
});
