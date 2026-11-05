/**
 * @file PixelCloseButton.tsx
 * @description Standardized retro pixel close (X) button for all modals and dialogs — ICE MATRIX edition.
 * Features crisp zero-radius pixel aesthetics, cyan hover state, and keyboard/screen-reader accessibility.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface PixelCloseButtonProps {
  /** Click handler to dismiss or exit the current view/modal. */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Hover tooltip text. Defaults to "Close (Esc)". */
  title?: string;
  /** Screen reader label. Defaults to "Close". */
  ariaLabel?: string;
  /** Lucide icon dimension in pixels. Defaults to 16. */
  size?: number;
  /** Whether the close action is disabled (e.g. during active synthesis). */
  disabled?: boolean;
  /** Optional custom inline style overrides. */
  style?: React.CSSProperties;
  /** Optional custom CSS class name. */
  className?: string;
}

export function PixelCloseButton({
  onClick,
  title = 'Close (Esc)',
  ariaLabel = 'Close',
  size = 16,
  disabled = false,
  style,
  className = '',
}: PixelCloseButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      aria-label={ariaLabel}
      className={className}
      style={{
        background: isHovered && !disabled ? 'rgba(0, 240, 255, 0.15)' : 'rgba(10, 17, 40, 0.7)',
        color: isHovered && !disabled ? '#00f0ff' : '#8199b5',
        border: isHovered && !disabled ? '1px solid #00f0ff' : '1px solid rgba(0, 240, 255, 0.4)',
        boxShadow: isHovered && !disabled ? '0 0 8px rgba(0, 240, 255, 0.4)' : '1px 1px 0px #003366',
        borderRadius: '0px',
        width: '28px',
        height: '28px',
        padding: '0',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        lineHeight: 1,
        flexShrink: 0,
        ...style,
      }}
    >
      <X size={size} />
    </button>
  );
}

