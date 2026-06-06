// ABOUTME: Styled keyboard hint component for displaying key bindings.
// ABOUTME: Renders a keyboard key with consistent styling.

import styles from './KeyHint.module.css';

interface KeyHintProps {
  keyName: string;
  label?: string;
  /** Whether the key hint is disabled (e.g., eliminated teams) */
  disabled?: boolean;
}

export function KeyHint({ keyName, label, disabled = false }: KeyHintProps) {
  const className = disabled
    ? `${styles.keyHint} ${styles.disabled}`
    : styles.keyHint;
  return (
    <span className={className}>
      <kbd>{keyName}</kbd>
      {label && <span className={styles.keyLabel}>{label}</span>}
    </span>
  );
}
