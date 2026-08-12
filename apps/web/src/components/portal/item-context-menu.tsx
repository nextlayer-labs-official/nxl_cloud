"use client";

import type { LucideIcon } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export interface ContextMenuActionItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

interface ItemContextMenuProps {
  actions: ContextMenuActionItem[];
  children: React.ReactNode;
}

/**
 * One generic right-click menu, reused for file rows/cards, folder
 * rows/cards, and empty-canvas space — each passes a different action list
 * but shares this same rendering + Radix wiring (cursor positioning, native
 * menu suppression, outside-click/scroll/Escape dismissal).
 *
 * Radix's ContextMenuTrigger always renders a literal `<span>` (there's no
 * `asChild` escape hatch on this primitive) — `className="contents"` keeps
 * it layout-transparent so it doesn't disturb flex/grid child positioning.
 * A `<span>` is NOT valid direct `<tbody>` content, so for table rows wrap a
 * `<td>`'s inner content with this rather than the `<tr>` itself.
 */
export function ItemContextMenu({ actions, children }: ItemContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents">{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {actions.flatMap((action, i) => {
          const nodes = [];
          if (action.separatorBefore && i > 0) {
            nodes.push(<ContextMenuSeparator key={`${action.label}-sep`} />);
          }
          nodes.push(
            <ContextMenuItem
              key={action.label}
              destructive={action.destructive}
              disabled={action.disabled}
              onSelect={action.onSelect}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </ContextMenuItem>,
          );
          return nodes;
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
