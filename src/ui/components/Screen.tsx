import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  /** Where the back button goes; defaults to browser history. */
  backTo?: string;
  showBack?: boolean;
  testId?: string;
  right?: ReactNode;
}

/** Every screen has home + back navigation. */
export function Screen({ children, backTo, showBack = true, testId, right }: Props) {
  const navigate = useNavigate();
  return (
    <main className="screen" data-testid={testId}>
      <nav className="topbar">
        <button className="icon-btn" aria-label="home" data-testid="nav-home" onClick={() => navigate('/')}>🏠</button>
        <span className="spacer" />
        {right}
        {showBack && (
          <button
            className="icon-btn"
            aria-label="back"
            data-testid="nav-back"
            onClick={() => (backTo ? navigate(backTo) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
          >
            ➡️
          </button>
        )}
      </nav>
      {children}
    </main>
  );
}
