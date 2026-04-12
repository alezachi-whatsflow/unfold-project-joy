import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro capturado:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--app-bg, hsl(var(--background)))" }}>
          <div className="w-full max-w-md border rounded-xl p-8 text-center" style={{ background: "var(--bg-card, hsl(var(--card)))", borderColor: "var(--border, hsl(var(--border)))" }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(220, 38, 38, 0.1)" }}>
              <svg
                className="h-8 w-8"
                style={{ color: "#EF4444" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            <h1 className="mb-2 text-2xl font-bold" style={{ color: "var(--text-primary, hsl(var(--foreground)))" }}>
              Erro em App
            </h1>
            <p className="mb-6 text-sm" style={{ color: "var(--text-muted, hsl(var(--muted-foreground)))" }}>
              Ocorreu um erro inesperado. Tente recarregar a página ou volte ao
              início.
            </p>

            {this.state.error && (
              <pre className="mb-6 max-h-32 overflow-auto rounded-lg p-3 text-left text-xs" style={{ background: "var(--bg-card-secondary, hsl(var(--muted)))", color: "var(--text-secondary, hsl(var(--muted-foreground)))" }}>
                {this.state.error.message}
              </pre>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReload}
                className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2"
                style={{ background: "var(--btn-primary-bg, hsl(var(--primary)))", color: "var(--btn-primary-text, #fff)" }}
              >
                Tentar novamente
              </button>
              <button
                onClick={this.handleGoHome}
                className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2"
                style={{ background: "var(--btn-secondary-bg, transparent)", borderColor: "var(--border, hsl(var(--border)))", color: "var(--text-secondary, hsl(var(--muted-foreground)))" }}
              >
                Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
