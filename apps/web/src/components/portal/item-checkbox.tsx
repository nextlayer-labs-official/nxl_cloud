"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ItemCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}

/** Hidden until hovered or checked — a selected-but-unhovered row must still show its checked box. */
export function ItemCheckbox({ checked, onToggle, label, className }: ItemCheckboxProps) {
  return (
    <span
      onClick={(e) => {
        // preventDefault must run synchronously here (not just stopPropagation) —
        // this checkbox sits inside a folder card's <Link>, and a deferred/async
        // preventDefault can't stop the browser's native navigation once it's
        // already been dispatched.
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        "shrink-0 transition-opacity",
        checked ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        className,
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={label} />
    </span>
  );
}
