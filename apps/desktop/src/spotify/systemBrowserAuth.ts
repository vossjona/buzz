// ABOUTME: Production OAuth flow — opens Spotify login in the system browser and
// ABOUTME: catches the 127.0.0.1:8080 redirect with a one-shot local server.

import { start, cancel, onUrl } from '@fabianlars/tauri-plugin-oauth';
import { open } from '@tauri-apps/plugin-shell';
import {
  buildAuthorizeUrl,
  parseCallbackUrl,
  validateOAuthState,
} from './auth';
import { logger } from '../logging/logger';

/** Must match the port in the registered redirect URI (SPOTIFY_CONFIG.redirectUri). */
const CALLBACK_PORT = 8080;

const RESPONSE_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Buzz</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#141021;color:#fff"><div style="text-align:center"><h1>Connected to Spotify ✅</h1><p>You can close this tab and return to Buzz.</p></div></body></html>`;

/** Port of a callback server left over from an abandoned attempt. */
let activePort: number | null = null;

/** Give up on an abandoned browser login so Connect can be retried. */
const FLOW_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Runs the production login flow: local callback server + system browser.
 * Resolves with the Spotify authorization code.
 */
export async function runSystemBrowserOAuthFlow(): Promise<string> {
  // A previous abandoned attempt leaves a server running — replace it.
  if (activePort !== null) {
    await cancel(activePort).catch(() => undefined);
    activePort = null;
  }

  const authorizeUrl = await buildAuthorizeUrl();

  try {
    activePort = await start({
      ports: [CALLBACK_PORT],
      response: RESPONSE_HTML,
    });
  } catch (err) {
    logger.warn('spotify.auth', 'OAuth callback server failed to start', {
      context: { error: String(err) },
    });
    throw new Error(
      'Could not listen on port 8080 for the Spotify login. Close the application using that port and try again.'
    );
  }

  return new Promise<string>((resolve, reject) => {
    let unlisten: (() => void) | undefined;

    const cleanup = async () => {
      clearTimeout(timer);
      unlisten?.();
      if (activePort !== null) {
        await cancel(activePort).catch(() => undefined);
        activePort = null;
      }
    };

    const timer = setTimeout(() => {
      void cleanup().then(() =>
        reject(
          new Error('Login timed out. Click "Connect to Spotify" to try again.')
        )
      );
    }, FLOW_TIMEOUT_MS);

    // Register the listener FIRST, and only then open the browser — so the
    // callback can never arrive before anyone is listening.
    onUrl(async (url) => {
      const { code, state, error } = parseCallbackUrl(url);
      await cleanup();
      if (error) {
        reject(new Error(`Authentication failed: ${error}`));
        return;
      }
      if (!validateOAuthState(state)) {
        reject(
          new Error('Authentication failed: state mismatch. Please try again.')
        );
        return;
      }
      if (!code) {
        reject(
          new Error('Authentication failed: no authorization code received.')
        );
        return;
      }
      resolve(code);
    })
      .then((fn) => {
        unlisten = fn;
        return open(authorizeUrl);
      })
      .catch(async (err) => {
        await cleanup();
        reject(
          err instanceof Error
            ? err
            : new Error('Failed to start the browser login')
        );
      });
  });
}
