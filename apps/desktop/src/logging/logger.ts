// ABOUTME: JS façade for the session error log. Fire-and-forget error/warn emitters.
// ABOUTME: Builds entries with a fresh timestamp and the shared SESSION_ID and invokes Rust.

import { invoke } from '@tauri-apps/api/core';
import { SESSION_ID } from './sessionId';

type Level = 'error' | 'warn';

export interface LogOptions {
  stack?: string;
  context?: unknown;
}

interface Entry {
  timestamp: string;
  level: Level;
  source: string;
  message: string;
  stack?: string;
  context?: unknown;
  sessionId: string;
}

let warned = false;

function emit(
  level: Level,
  source: string,
  message: string,
  opts?: LogOptions
): void {
  if (import.meta.env.MODE === 'test') return;

  const entry: Entry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    sessionId: SESSION_ID,
  };
  if (opts?.stack !== undefined) entry.stack = opts.stack;
  if (opts?.context !== undefined) entry.context = opts.context;

  invoke('log_event', { entry }).catch((err: unknown) => {
    if (!warned) {
      warned = true;
      console.warn('[logger] write failed', err);
    }
  });
}

export const logger = {
  error(source: string, message: string, opts?: LogOptions): void {
    emit('error', source, message, opts);
  },
  warn(source: string, message: string, opts?: LogOptions): void {
    emit('warn', source, message, opts);
  },
};
