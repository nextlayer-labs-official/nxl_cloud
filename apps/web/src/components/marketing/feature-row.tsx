import { cn } from "@/lib/utils";
import { PlaceholderVisual } from "@/components/common/placeholder-visual";
import type { FeatureRowData } from "@/types/marketing";

interface FeatureRowProps {
  row: FeatureRowData;
  visualClassName?: string;
  /** Outer wrapper spacing — Home uses pb-only, Features uses symmetric py. */
  className?: string;
}

/** Alternating text/visual row — reused by Home's feature rows and Features page sections. */
export function FeatureRow({
  row,
  visualClassName = "h-[260px]",
  className = "pb-[120px]",
}: FeatureRowProps) {
  return (
    <div
      id={row.id}
      className={cn(
        "border-border-subtle flex items-center gap-16 border-b",
        className,
        row.direction === "row-reverse" && "flex-row-reverse",
      )}
    >
      <div className="flex-1">
        <div className="text-accent-foreground mb-3 text-[13px] font-semibold tracking-[0.06em] uppercase">
          {row.eyebrow}
        </div>
        <h3 className="mb-4 text-[28px] font-bold tracking-[-0.01em]">{row.title}</h3>
        <p className={cn("text-muted-foreground text-base leading-[1.6]", row.points && "mb-5")}>
          {row.body}
        </p>
        {row.points && (
          <div className="flex flex-col gap-2.5">
            {row.points.map((point) => (
              <div key={point} className="text-ink-700 flex gap-2 text-sm">
                <span className="text-primary">—</span>
                {point}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1">
        <PlaceholderVisual
          label={row.visualLabel}
          className={cn("border-border-subtle rounded-2xl border", visualClassName)}
        />
      </div>
    </div>
  );
}
