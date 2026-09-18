"use client";

import { useMemo, useState } from "react";
import { Globe, Layers, type LucideIcon, Minus, Monitor, Plus, Sparkles, Wrench } from "lucide-react";

import { CHANGELOG_ENTRIES, type ChangelogPlatform } from "@/constants/whats-new";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const PLATFORM_META: Record<ChangelogPlatform, { label: string; icon: LucideIcon }> = {
  web: { label: "Web", icon: Globe },
  desktop: { label: "Desktop", icon: Monitor },
};

const SECTION_ICONS: Record<string, LucideIcon> = {
  "New Features": Sparkles,
  Improvements: Wrench,
};

type FilterValue = "all" | ChangelogPlatform;

export function WhatsNewTimeline() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [expandedId, setExpandedId] = useState<string | null>(CHANGELOG_ENTRIES[0]?.id ?? null);

  // Only show a filter for a platform that actually has shipped entries —
  // e.g. don't show "Desktop" until something's really been released there.
  const filters = useMemo<{ value: FilterValue; label: string; icon: LucideIcon }[]>(() => {
    const platformsInUse = new Set(CHANGELOG_ENTRIES.map((entry) => entry.platform));
    const platformFilters = (Object.keys(PLATFORM_META) as ChangelogPlatform[])
      .filter((platform) => platformsInUse.has(platform))
      .map((platform) => ({ value: platform as FilterValue, ...PLATFORM_META[platform] }));
    return [{ value: "all" as FilterValue, label: "All Updates", icon: Layers }, ...platformFilters];
  }, []);

  const entries = useMemo(
    () => (filter === "all" ? CHANGELOG_ENTRIES : CHANGELOG_ENTRIES.filter((entry) => entry.platform === filter)),
    [filter],
  );

  return (
    <div className="mx-auto max-w-[1000px] px-6 pb-24 sm:px-10">
      <div className="grid gap-8 sm:grid-cols-[200px_1fr]">
        <div className="flex flex-row gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
          {filters.map((item) => {
            const Icon = item.icon;
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium whitespace-nowrap transition-colors sm:rounded-lg",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          {entries.map((entry) => {
            const PlatformIcon = PLATFORM_META[entry.platform].icon;
            const expanded = expandedId === entry.id;

            return (
              <div key={entry.id} className="border-border-subtle bg-surface-muted rounded-xl border">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : entry.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-background border-border-subtle flex size-8 shrink-0 items-center justify-center rounded-lg border">
                      <PlatformIcon className="text-muted-foreground size-4" />
                    </span>
                    <span className="text-foreground text-[15px] font-semibold">{entry.title}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-ink-450 text-[13px] font-medium whitespace-nowrap">
                      {formatDate(entry.date)}
                    </span>
                    <span className="border-border-subtle bg-background flex size-6 items-center justify-center rounded-md border">
                      {expanded ? (
                        <Minus className="text-muted-foreground size-3.5" />
                      ) : (
                        <Plus className="text-muted-foreground size-3.5" />
                      )}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div className="flex flex-col gap-4 px-5 pb-5">
                    {entry.sections.map((section) => {
                      const SectionIcon = SECTION_ICONS[section.heading] ?? Sparkles;
                      return (
                        <div key={section.heading}>
                          <div className="text-foreground mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                            <SectionIcon className="size-3.5" />
                            {section.heading}:
                          </div>
                          <ul className="text-muted-foreground flex flex-col gap-1.5 text-[14px] leading-relaxed">
                            {section.items.map((item) => (
                              <li key={item} className="flex gap-2">
                                <span className="mt-2 size-1 shrink-0 rounded-full bg-current" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
