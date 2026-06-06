// ABOUTME: Player window application component.
// ABOUTME: Receives state from host via Tauri events and displays game state.

import { usePlayerState } from './hooks/usePlayerState';
import { PlayerSetupScreen } from './screens/player/PlayerSetupScreen';
import { PlayerGameScreen } from './screens/player/PlayerGameScreen';
import { PlayerFinalScreen } from './screens/player/PlayerFinalScreen';
import { SequenceOverlay } from './components/SequenceOverlay';

const GAME_START_INTRO_STEPS: [string, string, string] = [
  'Ready',
  'Set',
  'Go!',
];
const TIMEOUT_INTRO_STEPS: [string, string, string] = ['3', '2', '1'];

export function PlayerApp() {
  const { state, isConnected } = usePlayerState();

  // Show connecting state until first event received
  if (!isConnected || !state) {
    return (
      <div className="app playerApp connecting">
        <div className="connectingMessage">
          <h1>Buzz!</h1>
          <p>Connecting to host...</p>
        </div>
      </div>
    );
  }

  const { engineState, screen, lastAnswerResult, spotify, countdown, intro } =
    state;

  return (
    <div className="app playerApp">
      <SequenceOverlay
        steps={GAME_START_INTRO_STEPS}
        currentStep={intro?.kind === 'gameStart' ? intro.step : null}
        color="var(--color-text)"
      />
      <SequenceOverlay
        steps={TIMEOUT_INTRO_STEPS}
        currentStep={intro?.kind === 'answerCountdown' ? intro.step : null}
        color="var(--buzz-color)"
      />
      {screen === 'setup' && <PlayerSetupScreen engineState={engineState} />}
      {screen === 'game' && (
        <PlayerGameScreen
          engineState={engineState}
          lastAnswerResult={lastAnswerResult}
          spotify={spotify}
          countdown={countdown}
        />
      )}
      {screen === 'final' && (
        <PlayerFinalScreen
          teams={engineState.teams}
          roundResults={state.roundResults}
        />
      )}
    </div>
  );
}
