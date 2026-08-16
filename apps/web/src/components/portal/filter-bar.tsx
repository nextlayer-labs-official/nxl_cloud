"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { FILE_CATEGORY_LABELS, type FileCategory } from "@/lib/file-icons";
import { cn } from "@/lib/utils";

export type TypeFilter = FileCategory | "all";
export type ModifiedFilter = "any" | "today" | "7d" | "30d" | "year";

export const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All types" },
  ...(Object.keys(FILE_CATEGORY_LABELS) as FileCategory[]).map((key) => ({
    key,
    label: FILE_CATEGORY_LABELS[key],
  })),
];

export const MODIFIED_OPTIONS: { key: ModifiedFilter; label: string }[] = [
  { key: "any", label: "Any time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "year", label: "This year" },
];

/** Cutoff Date for a ModifiedFilter, or null for "any" (no filtering). */
export function modifiedFilterCutoff(filter: ModifiedFilter): Date | null {
  const now = new Date();
  if (filter === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (filter === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (filter === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

function FilterDropdown<T extends string>({
  label,
  active,
  options,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  active: boolean;
  options: { key: T; label: string }[];
  value: T;
  defaultValue: T;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.key === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold",
          active
            ? "border-primary bg-primary/10 text-primary"
            : "border-input text-ink-600 hover:bg-surface-muted",
        )}
      >
        {active ? selected?.label : label}
        {active ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange(defaultValue);
              setOpen(false);
            }}
            className="hover:bg-primary/20 -mr-1 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      {open && (
        <div className="border-border-subtle bg-background absolute top-[calc(100%+6px)] left-0 z-20 min-w-[180px] overflow-hidden rounded-xl border py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onChange(opt.key);
                setOpen(false);
              }}
              className={cn(
                "block w-full cursor-pointer px-3.5 py-2 text-left text-[13px] font-medium",
                opt.key === value ? "text-foreground bg-surface-muted" : "text-ink-600 hover:bg-surface-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterBarProps {
  typeFilter: TypeFilter;
  onTypeFilterChange: (v: TypeFilter) => void;
  modifiedFilter: ModifiedFilter;
  onModifiedFilterChange: (v: ModifiedFilter) => void;
}

/** Drive-style filter chips — Type and Modified — sitting above the file list, distinct from the column-header sort controls (those reorder; these narrow what's shown). */
export function FilterBar({
  typeFilter,
  onTypeFilterChange,
  modifiedFilter,
  onModifiedFilterChange,
}: FilterBarProps) {
  const anyActive = typeFilter !== "all" || modifiedFilter !== "any";
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <FilterDropdown
        label="Type"
        active={typeFilter !== "all"}
        options={TYPE_OPTIONS}
        value={typeFilter}
        defaultValue="all"
        onChange={onTypeFilterChange}
      />
      <FilterDropdown
        label="Modified"
        active={modifiedFilter !== "any"}
        options={MODIFIED_OPTIONS}
        value={modifiedFilter}
        defaultValue="any"
        onChange={onModifiedFilterChange}
      />
      {anyActive && (
        <button
          type="button"
          onClick={() => {
            onTypeFilterChange("all");
            onModifiedFilterChange("any");
          }}
          className="text-ink-450 hover:text-foreground cursor-pointer text-[13px] font-semibold"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
