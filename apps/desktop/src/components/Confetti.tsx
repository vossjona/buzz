// ABOUTME: Thin wrapper around canvas-confetti for celebratory final screen effects.
// ABOUTME: Fires confetti bursts using winner team colors on mount.

import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { getTeamColor } from '../constants/teams';

interface ConfettiProps {
  winnerTeamIds: string[];
}

export function Confetti({ winnerTeamIds }: ConfettiProps) {
  useEffect(() => {
    const colors = winnerTeamIds.map((id) => getTeamColor(id));
    if (colors.length === 0) return;

    // Initial burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors,
    });

    // Second smaller burst after a delay
    const timer1 = setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.5 },
        colors,
      });
    }, 1500);

    // Third burst
    const timer2 = setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 120,
        origin: { y: 0.4 },
        colors,
      });
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      confetti.reset();
    };
  }, [winnerTeamIds]);

  return null;
}
