import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppProvider } from './context/AppContext.tsx';
import './index.css';

interface ErrorBoundaryState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  // React 19 ships Component as an interface (not a concrete class) in its
  // bundled TypeScript types, so `state` and `props` are not automatically
  // inherited as instance members.  Declaring them explicitly here satisfies
  // TypeScript 5.8 without emitting any extra runtime code.
  declare props: Readonly<{ children: ReactNode }>;
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-zinc-950 text-white p-8 gap-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-zinc-400 text-sm text-center max-w-sm">{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-semibold transition-all"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);
