import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Label shown in error UI so user knows which section failed */
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level ErrorBoundary that resets on re-render (route change).
 * Use this to wrap individual route sections so one crash doesn't kill the whole app.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[RouteErrorBoundary:${this.props.section ?? "unknown"}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-sm text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "hsl(var(--destructive) / 0.15)" }}>
              <AlertTriangle className="h-6 w-6" style={{ color: "hsl(var(--destructive))" }} />
            </div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary, hsl(var(--foreground)))" }}>
              Erro em {this.props.section || "modulo"}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary, hsl(var(--muted-foreground)))" }}>
              {this.state.error?.message || "Erro inesperado"}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
                style={{
                  background: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
              </button>
              <button
                onClick={() => { window.location.href = "/"; }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
                style={{
                  background: "var(--bg-surface, hsl(var(--muted)))",
                  color: "var(--text-primary, hsl(var(--foreground)))",
                  border: "1px solid var(--border, hsl(var(--border)))",
                }}
              >
                <Home className="h-3.5 w-3.5" /> Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
