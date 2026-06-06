// ABOUTME: Application entry point with mode detection for Host/Player windows.
// ABOUTME: Renders HostApp for main window, PlayerApp when opened with ?mode=player.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HostApp } from './HostApp';
import { PlayerApp } from './PlayerApp';
import { installErrorHooks } from './logging/install';
import './styles/global.css';
import './styles/shared.css';

installErrorHooks();

// Detect window mode from URL query parameter
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode') === 'player' ? 'player' : 'host';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find root element');
}

createRoot(rootElement).render(
  <StrictMode>{mode === 'player' ? <PlayerApp /> : <HostApp />}</StrictMode>
);
