// ABOUTME: Clickable host action button with a visible key-shortcut label.
// ABOUTME: Shortcut dispatch is owned by useHostInput; this button fires the same onClick handler.

import styles from './HostActionButton.module.css';

interface HostActionButtonProps {
  keyName: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function HostActionButton({
  keyName,
  label,
  onClick,
  disabled,
}: HostActionButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.key}>{keyName}</span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
