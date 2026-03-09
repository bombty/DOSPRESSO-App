import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Bir hata oluştu. Lütfen tekrar deneyin.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4" data-testid="error-state">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="text-sm text-muted-foreground text-center max-w-md">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} data-testid="button-retry">
          Tekrar Dene
        </Button>
      )}
    </div>
  );
}
