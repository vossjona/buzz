// ABOUTME: Unit tests for the global error hooks installer.
// ABOUTME: Verifies console.error, onerror, and onunhandledrejection route through the logger.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const loggerError = vi.fn();
vi.mock('./logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerError(...args),
    warn: vi.fn(),
  },
}));

describe('installErrorHooks', () => {
  let originalConsoleError: typeof console.error;
  let originalOnError: typeof window.onerror;
  let originalOnRejection: typeof window.onunhandledrejection;

  beforeEach(() => {
    vi.resetModules();
    loggerError.mockReset();
    originalConsoleError = console.error;
    originalOnError = window.onerror;
    originalOnRejection = window.onunhandledrejection;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    window.onerror = originalOnError;
    window.onunhandledrejection = originalOnRejection;
  });

  it('routes console.error calls through logger.error and preserves the original behavior', async () => {
    const originalSpy = vi.fn();
    console.error = originalSpy;

    const { installErrorHooks } = await import('./install');
    installErrorHooks();

    console.error('boom', { detail: 1 });

    expect(loggerError).toHaveBeenCalledWith(
      'console',
      'boom',
      expect.objectContaining({ context: expect.anything() })
    );
    expect(originalSpy).toHaveBeenCalledWith('boom', { detail: 1 });
  });

  it('routes window.onerror through logger.error with stack', async () => {
    const { installErrorHooks } = await import('./install');
    installErrorHooks();

    const err = new Error('uncaught');
    window.onerror?.call(window, 'uncaught', 'file.js', 1, 1, err);

    expect(loggerError).toHaveBeenCalledWith(
      'window.onerror',
      'uncaught',
      expect.objectContaining({ stack: err.stack })
    );
  });

  it('routes onunhandledrejection through logger.error', async () => {
    const { installErrorHooks } = await import('./install');
    installErrorHooks();

    const reason = new Error('rejected');
    const event = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(event, 'reason', { value: reason });
    window.onunhandledrejection?.call(window, event);

    expect(loggerError).toHaveBeenCalledWith(
      'window.onunhandledrejection',
      'rejected',
      expect.objectContaining({ stack: reason.stack })
    );
  });

  it('routes resource-load errors through logger.error', async () => {
    const { installErrorHooks } = await import('./install');
    installErrorHooks();

    const img = document.createElement('img');
    img.src = 'https://example.invalid/missing.png';
    document.body.appendChild(img);
    const event = new Event('error');
    Object.defineProperty(event, 'target', { value: img });
    window.dispatchEvent(event);

    expect(loggerError).toHaveBeenCalledWith(
      'window.resource-error',
      'Resource failed to load',
      expect.objectContaining({
        context: expect.objectContaining({ tagName: 'IMG' }),
      })
    );

    document.body.removeChild(img);
  });
});
