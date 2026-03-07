import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6" data-testid="error-boundary">
          <div className="max-w-md w-full border-2 border-red-800 bg-zinc-950 p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2 font-display">SOMETHING WENT WRONG</h2>
            <p className="text-zinc-400 text-sm mb-6 font-mono">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold flex items-center gap-2 border border-cyan-500"
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4" /> RETRY
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold flex items-center gap-2 border border-zinc-600"
                data-testid="button-go-home"
              >
                <Home className="w-4 h-4" /> GO HOME
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
