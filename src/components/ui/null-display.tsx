import { cn } from "@/lib/utils"

interface NullDisplayProps {
  label?: string
  className?: string
}

/**
 * Consistent display for null/empty values in tables and detail views.
 * Replaces inline `<span className="text-muted-foreground">—</span>` patterns.
 */
export function NullDisplay({ label = "—", className }: NullDisplayProps) {
  return <span className={cn("text-muted-foreground", className)}>{label}</span>
}
