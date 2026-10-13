import { cn } from "cn";
import { Button } from "@devmentor/ui/components/ui/button";

interface ErrorMessageProps {
  title?: string;
  message: string;
  /** Renders a retry button. Only usable from client components (it's a function). */
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ title = "Something went wrong", message, onRetry, className }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "border-destructive/30 bg-destructive/5 flex flex-col items-start gap-2 rounded-lg border p-4 text-sm",
        className,
      )}
    >
      <p className="text-destructive font-medium">{title}</p>
      <p className="text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
