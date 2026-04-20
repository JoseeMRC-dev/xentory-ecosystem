import type { CSSProperties } from 'react';

type Signal = 'BUY' | 'SELL' | 'HOLD' | 'PRO';

interface SignalTagProps {
  signal: Signal;
  style?: CSSProperties;
}

const SIGNAL_STYLES: Record<Signal, { bg: string; color: string }> = {
  BUY:  { bg: 'var(--signal-buy-bg)',  color: 'var(--signal-buy-text)'  },
  SELL: { bg: 'var(--signal-sell-bg)', color: 'var(--signal-sell-text)' },
  HOLD: { bg: 'var(--signal-hold-bg)', color: 'var(--signal-hold-text)' },
  PRO:  { bg: 'var(--signal-pro-bg)',  color: 'var(--signal-pro-text)'  },
};

export function SignalTag({ signal, style }: SignalTagProps) {
  const { bg, color } = SIGNAL_STYLES[signal];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 'var(--radius-sm, 2px)',
      background: bg,
      color,
      fontFamily: 'var(--font-sans)',
      fontSize: '9px',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {signal}
    </span>
  );
}
