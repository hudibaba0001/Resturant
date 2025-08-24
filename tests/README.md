# Testing Guide

## Quick Start

```bash
npm test          # Run all tests once
npm run test:watch # Run tests in watch mode
```

## Adding New Tests

1. **Widget tests**: Add to `tests/widget.*.test.ts`
2. **API tests**: Add to `tests/api.*.test.ts`
3. **Component tests**: Add to `tests/components.*.test.ts`

## Test Structure

- Use `describe()` for grouping related tests
- Use `it()` for individual test cases
- Use `expect()` for assertions
- Mock external dependencies with `vi.fn()`

## Examples

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyFunction', () => {
  it('should handle normal input', () => {
    expect(myFunction('test')).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(myFunction(null)).toBe('');
  });
});
```
