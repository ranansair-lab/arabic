import type { CSSProperties } from 'react';

type Size = 'xl' | 'l' | 'm' | 's';

/** Vowelled Arabic reading target. Text is rendered exactly as given — never stripped. */
export function ArabicText({ text, size = 'l', className = '', style, testId }: { text: string; size?: Size; className?: string; style?: CSSProperties; testId?: string }) {
  return (
    <span lang="ar" dir="rtl" className={`ar-read target-${size} ${className}`} style={style} data-testid={testId}>
      {text}
    </span>
  );
}
