"use client";

import { useLinkStatus } from "next/link";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders `icon` normally, but swaps to a spinner while this Link's target
 * route is loading. Must be rendered as a descendant of the <Link> it tracks
 * (useLinkStatus reads context set by the nearest Link ancestor).
 */
export function NavIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus();
  if (pending) return <Loader2 className={cn("animate-spin", className)} />;
  return <Icon className={className} />;
}
