import { cn } from "@/lib/utils";

interface PlaceholderVisualProps {
  label: string;
  className?: string;
}

/**
 * Stand-in for real product screenshots/photos, which weren't part of the design
 * export — every visual in the source is one of these mono-labeled gray boxes.
 * Swap for next/image once real assets are supplied.
 */
export function PlaceholderVisual({ label, className }: PlaceholderVisualProps) {
  return (
    <div
      className={cn(
        "bg-surface-muted text-ink-400 flex items-center justify-center font-mono text-xs",
        className,
      )}
    >
      {label}
    </div>
  );
}
