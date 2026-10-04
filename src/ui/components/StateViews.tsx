import { Component, type ReactNode } from 'react';

export function Loading({ label = '' }: { label?: string }) {
  return (
    <div className="card center" data-testid="loading" role="status" aria-busy="true">
      <div style={{ fontSize: 64 }} aria-hidden>⏳</div>
      {label && <p className="parent">{label}</p>}
    </div>
  );
}

interface EBState { error: Error | null }

/** Any runtime error shows a friendly screen with a way home — never a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('Screen error', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen" data-testid="error-state">
        <div className="card center">
          <div style={{ fontSize: 80 }} aria-hidden>🙈</div>
          <p className="title" lang="ar">حَاوِلْ مَرَّةً أُخْرَى</p>
          <p className="parent">Something went wrong on this screen. Your progress is saved.</p>
          <button
            className="btn"
            onClick={() => {
              this.setState({ error: null });
              window.location.hash = '#/';
            }}
          >
            🏠
          </button>
        </div>
      </main>
    );
  }
}
