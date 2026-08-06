import { cn } from "@/lib/utils";

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Individually-bordered toggle pill — reused (with per-page padding tweaks) by the
 * Blog category filter, Contact intent switch, and Solutions audience segments.
 */
export function FilterPill({ active, onClick, children, className }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border px-[18px] py-[9px] text-sm font-semibold",
        active
          ? "border-primary bg-accent text-accent-foreground"
          : "border-input bg-background text-ink-700",
        className,
      )}
    >
      {children}
    </button>
  );
}
