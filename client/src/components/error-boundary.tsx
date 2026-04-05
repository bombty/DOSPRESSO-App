import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isChunkLoadError } from "@/lib/lazy-with-retry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Yakalanan hata:", error, errorInfo);
    // Dobody'ye crash raporu gönder
    try {
      fetch("/api/system/crash-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.message, componentStack: errorInfo.componentStack?.slice(0, 500),
          url: window.location.pathname, role: sessionStorage.getItem("userRole") || "unknown",
        }),
      }).catch(() => {});
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6" data-testid="error-boundary-fallback">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Bir hata oluştu</h2>
                <p className="text-sm text-muted-foreground">
                  Beklenmeyen bir hata meydana geldi. Lütfen sayfayı yeniden yüklemeyi deneyin.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button onClick={this.handleRetry} variant="outline" data-testid="button-error-retry">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tekrar Dene
                </Button>
                <Button onClick={this.handleReload} data-testid="button-error-reload">
                  Sayfayı Yenile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export class LazyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[LazyErrorBoundary] Chunk yükleme hatası:", error, errorInfo);
  }

  handleRetry = () => {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunk = isChunkLoadError(this.state.error);

      return (
        <div className="flex items-center justify-center min-h-[50vh] p-6" data-testid="lazy-error-boundary-fallback">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center space-y-4">
              {isChunk ? (
                <WifiOff className="h-12 w-12 mx-auto text-muted-foreground" />
              ) : (
                <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
              )}
              <div className="space-y-2">
                <h2 className="text-lg font-semibold" data-testid="text-lazy-error-title">
                  {isChunk ? "Sayfa yüklenemedi" : "Bir hata oluştu"}
                </h2>
                <p className="text-sm text-muted-foreground" data-testid="text-lazy-error-description">
                  {isChunk
                    ? "Sayfa bileşenleri yüklenirken bir sorun oluştu. İnternet bağlantınızı kontrol edip tekrar deneyin."
                    : "Beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button onClick={this.handleRetry} variant="outline" data-testid="button-lazy-retry">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isChunk ? "Yeniden Dene" : "Tekrar Dene"}
                </Button>
                <Button onClick={this.handleReload} data-testid="button-lazy-reload">
                  Sayfayı Yenile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
