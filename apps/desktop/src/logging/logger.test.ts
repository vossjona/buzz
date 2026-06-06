// ABOUTME: Unit tests for the session-error-log JS logger façade.
// ABOUTME: Verifies entry shape, fire-and-forget contract, and single-warning failure handling.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const invokeMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

describe('logger', () => {
  beforeEach(() => {
    vi.resetModules();
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
    vi.stubEnv('MODE', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sends an error entry with required fields', async () => {
    const { logger } = await import('./logger');

    logger.error('spotify.player', 'Playback failed');
    await Promise.resolve();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    const [command, payload] = invokeMock.mock.calls[0];
    expect(command).toBe('log_event');
    const entry = (payload as { entry: Record<string, unknown> }).entry;
    expect(entry.level).toBe('error');
    expect(entry.source).toBe('spotify.player');
    expect(entry.message).toBe('Playback failed');
    expect(entry.sessionId).toEqual(expect.any(String));
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('sends a warn entry with optional stack and context', async () => {
    const { logger } = await import('./logger');

    logger.warn('spotify.api', 'Rate limited', {
      context: { status: 429, retryAfter: 3 },
      stack: 'Error: …',
    });
    await Promise.resolve();

    const entry = invokeMock.mock.calls[0][1].entry;
    expect(entry.level).toBe('warn');
    expect(entry.context).toEqual({ status: 429, retryAfter: 3 });
    expect(entry.stack).toBe('Error: …');
  });

  it('never throws when invoke rejects', async () => {
    invokeMock.mockRejectedValue(new Error('boom'));
    const { logger } = await import('./logger');

    expect(() => logger.error('x', 'y')).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });

  it('warns on console exactly once when invoke repeatedly fails', async () => {
    invokeMock.mockRejectedValue(new Error('boom'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { logger } = await import('./logger');

    logger.error('x', 'y');
    logger.error('x', 'y');
    logger.error('x', 'y');
    await new Promise((r) => setTimeout(r, 0));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toBe('[logger] write failed');
  });

  it('is a no-op in test mode', async () => {
    vi.stubEnv('MODE', 'test');
    const { logger } = await import('./logger');

    logger.error('x', 'y');
    await Promise.resolve();

    expect(invokeMock).not.toHaveBeenCalled();
  });
});
