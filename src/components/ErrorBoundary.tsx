import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8">
          <h1 className="text-xl font-bold text-red-600 mb-4">Oops, something went wrong.</h1>
          <pre className="text-sm bg-red-50 text-red-900 p-4 rounded-lg overflow-auto">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
