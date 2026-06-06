// ABOUTME: Renders a single hint atom — a word, an image, or a scalar.
// ABOUTME: Non-broadcast atoms render with visibility:hidden to preserve layout position.

import styles from './AtomToken.module.css';

interface AtomTokenProps {
  content: string;
  broadcast: boolean;
  /** When provided, the token renders as a clickable button (host side). */
  onClick?: () => void;
  /** Presentation variant. "word" for text atoms, "scalar" for year. */
  variant?: 'word' | 'scalar';
}

export function AtomToken({
  content,
  broadcast,
  onClick,
  variant = 'word',
}: AtomTokenProps) {
  const className = [
    styles.atom,
    styles[variant],
    broadcast ? styles.broadcast : styles.hidden,
    onClick ? styles.clickable : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <span className={className}>{content}</span>;
}
