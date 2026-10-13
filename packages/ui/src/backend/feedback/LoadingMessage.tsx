import { cn } from "cn";

interface LoadingMessageProps {
  label?: string;
  className?: string;
}

export function LoadingMessage({ label = "Loading…", className }: LoadingMessageProps) {
  return (
    <div role="status" aria-live="polite" className={cn("text-muted-foreground flex items-center gap-2 py-6 text-sm", className)}>
      <span aria-hidden className="border-muted-foreground/40 border-t-foreground size-4 animate-spin rounded-full border-2" />
      {label}
    </div>
  );
}
