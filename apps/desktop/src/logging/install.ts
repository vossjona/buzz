// ABOUTME: Installs global error hooks that route uncaught errors through the session logger.
// ABOUTME: Wraps console.error, window.onerror, window.onunhandledrejection, and resource-load errors.

import { logger } from './logger';

let installed = false;

export function installErrorHooks(): void {
  if (installed) return;
  installed = true;

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const [first, ...rest] = args;
    const message = typeof first === 'string' ? first : safeStringify(first);
    logger.error('console', message, {
      context: rest.length > 0 ? rest : undefined,
    });
    originalConsoleError(...args);
  };

  window.onerror = (message, _source, _lineno, _colno, error) => {
    const text = typeof message === 'string' ? message : 'unknown error';
    logger.error('window.onerror', text, { stack: error?.stack });
    return false; // don't suppress default handling
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    if (reason instanceof Error) {
      logger.error('window.onunhandledrejection', reason.message, {
        stack: reason.stack,
      });
    } else {
      logger.error(
        'window.onunhandledrejection',
        typeof reason === 'string' ? reason : safeStringify(reason)
      );
    }
  };

  // Resource-load failures (<img>, <script>, <link>, …) fire `error` on the
  // element and don't bubble, so we listen in the capture phase. Script errors
  // also fire this event but have target === window and are already captured
  // by window.onerror above.
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (!target || target === window || !(target instanceof Element)) return;
      const src =
        (target as HTMLImageElement | HTMLScriptElement).src ??
        (target as HTMLLinkElement).href ??
        null;
      logger.error('window.resource-error', 'Resource failed to load', {
        context: { tagName: target.tagName, src },
      });
    },
    true
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
