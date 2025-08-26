import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  color = "muted",
  children,
}: {
  className?: string;
  color?: "muted" | "primary" | "success" | "destructive";
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    muted: "border-muted bg-muted text-muted-foreground",
    primary: "border-primary bg-primary/10 text-primary",
    success:
      "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        styles[color],
        className
      )}
    >
      {children}
    </span>
  );
}
