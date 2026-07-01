import { describe, it, expect } from 'vitest';

describe('Auth API', () => {
  it('has login function', async () => {
    const { login } = await import('../auth');
    expect(typeof login).toBe('function');
  });

  it('has logout function', async () => {
    const { logout } = await import('../auth');
    expect(typeof logout).toBe('function');
  });

  it('has restoreToken function', async () => {
    const { restoreToken } = await import('../auth');
    expect(typeof restoreToken).toBe('function');
  });
});
