import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Log error securely to server/monitoring service here in production if needed.
    // Avoid logging technical details directly in user space
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 ambient-bg text-center">
          <div className="w-full max-w-md bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.06] rounded-2xl p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.4)]">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6 font-semibold">
              !
            </div>
            <h1 className="text-xl font-semibold text-[#EDEDEF] tracking-tight mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-[#8A8F98] mb-6">
              An unexpected error occurred. For security, technical details have been omitted.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#5E6AD2] hover:bg-[#4D5AC2] text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
