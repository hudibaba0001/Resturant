import { describe, it, expect } from 'vitest';

// Mock rate limiting logic
function validatePinAttempts(
  pinAttempts: number,
  pinIssuedAt: Date,
  maxAttempts: number = 5,
  attemptWindowMinutes: number = 10
): boolean {
  const now = new Date();
  const attemptWindow = new Date(now.getTime() - attemptWindowMinutes * 60 * 1000);
  
  // Check if we're within the attempt window and have exceeded max attempts
  const isWithinWindow = pinIssuedAt > attemptWindow;
  const hasExceededAttempts = pinAttempts >= maxAttempts;
  
  // Return false if we're within window AND have exceeded attempts
  return !(isWithinWindow && hasExceededAttempts);
}

describe('Handoff rate limiting', () => {
  it('should allow attempts when under limit', () => {
    const result = validatePinAttempts(3, new Date());
    expect(result).toBe(true);
  });

  it('should block attempts when over limit within window', () => {
    const recentTime = new Date();
    const result = validatePinAttempts(5, recentTime);
    expect(result).toBe(false);
  });

  it('should allow attempts when over limit but outside window', () => {
    const oldTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
    const result = validatePinAttempts(5, oldTime);
    expect(result).toBe(true);
  });

  it('should handle edge case of exactly max attempts', () => {
    const recentTime = new Date();
    const result = validatePinAttempts(5, recentTime);
    expect(result).toBe(false);
  });

  it('should handle zero attempts', () => {
    const result = validatePinAttempts(0, new Date());
    expect(result).toBe(true);
  });

  it('should handle very old attempts', () => {
    const veryOldTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const result = validatePinAttempts(10, veryOldTime);
    expect(result).toBe(true);
  });
});
