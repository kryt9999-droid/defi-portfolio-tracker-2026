import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Web app crashed", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="loading-screen">
          <div className="auth-card">
            <p className="eyebrow">Runtime error</p>
            <h1>Something went wrong</h1>
            <p>{this.state.error.message}</p>
            <button
              className="button button-primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
