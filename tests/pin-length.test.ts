import { describe, it, expect } from 'vitest';

// Test PIN length validation
describe('PIN validation', () => {
  it('should validate 4-digit PINs', () => {
    const validPins = ['1234', '5678', '9999', '0000'];
    
    validPins.forEach(pin => {
      expect(pin.length).toBe(4);
      expect(/^\d{4}$/.test(pin)).toBe(true);
    });
  });

  it('should reject invalid PINs', () => {
    const invalidPins = ['123', '12345', 'abcd', '12a4', ''];
    
    invalidPins.forEach(pin => {
      const isValid = pin.length === 4 && /^\d{4}$/.test(pin);
      expect(isValid).toBe(false);
    });
  });

  it('should generate valid PINs', () => {
    for (let i = 0; i < 100; i++) {
      const pin = String(Math.floor(1000 + Math.random() * 9000));
      expect(pin.length).toBe(4);
      expect(/^\d{4}$/.test(pin)).toBe(true);
      expect(parseInt(pin)).toBeGreaterThanOrEqual(1000);
      expect(parseInt(pin)).toBeLessThanOrEqual(9999);
    }
  });
});
