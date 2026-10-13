import type { ReactNode } from "react";
import { cn } from "cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center", className)}>
      <p className="font-medium">{title}</p>
      {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      {action}
    </div>
  );
}
