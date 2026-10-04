import { useMemo, type ReactNode } from 'react';
import { instruction } from '../../curriculum/content';

export function Feedback({ kind, children, testId }: { kind: 'ok' | 'try' | 'info'; children: ReactNode; testId?: string }) {
  return (
    <div className={`feedback ${kind}`} role="status" aria-live="polite" data-testid={testId ?? `feedback-${kind}`}>
      {children}
    </div>
  );
}

const PRAISE = ['well_done', 'great', 'excellent'];

/** Rotating gentle praise: أَحْسَنْتَ! / رَائِعٌ! / مُمْتَازٌ! */
export function Praise({ fixed }: { fixed?: string }) {
  const id = useMemo(() => fixed ?? PRAISE[Math.floor(Math.random() * PRAISE.length)], [fixed]);
  return <span lang="ar">{instruction(id).text} ⭐</span>;
}

export function Confetti() {
  const items = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.6, e: ['⭐', '✨', '🌟', '👏'][i % 4] })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {items.map((it, i) => (
        <i key={i} style={{ left: `${it.left}%`, animationDelay: `${it.delay}s` }}>{it.e}</i>
      ))}
    </div>
  );
}

export function Stars({ n = 3 }: { n?: number }) {
  return (
    <div className="stars-row" aria-label={`${n} stars`}>
      {Array.from({ length: n }, (_, i) => <span key={i}>⭐</span>)}
    </div>
  );
}
