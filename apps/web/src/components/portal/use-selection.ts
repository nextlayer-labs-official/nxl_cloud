"use client";

import { useCallback, useRef, useState } from "react";

export type SelectableType = "file" | "folder";
export interface SelectableItem {
  id: string;
  type: SelectableType;
}

/**
 * Owns multi-select state for the file browser. A plain hook, not a Context —
 * only FileBrowser needs this, unlike BrowserActionsContext which has to
 * reach across sibling components. Handles plain/shift/ctrl-click semantics
 * against a flat, ordered item list (folders first, then files).
 */
export function useSelection() {
  const [selected, setSelected] = useState<Map<string, SelectableType>>(new Map());
  const anchorIndex = useRef<number | null>(null);

  const clear = useCallback(() => {
    setSelected(new Map());
    anchorIndex.current = null;
  }, []);

  const toggle = useCallback((item: SelectableItem, index?: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item.type);
      return next;
    });
    if (index !== undefined) anchorIndex.current = index;
  }, []);

  const selectAll = useCallback((items: SelectableItem[]) => {
    setSelected(new Map(items.map((item) => [item.id, item.type])));
    anchorIndex.current = items.length - 1;
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  /**
   * Returns true if the click was consumed for selection (caller should NOT
   * also open/navigate); false if the caller should proceed with its normal
   * open behavior. Plain click while nothing is selected falls through to
   * "false" (normal open) — once something is selected, plain clicks toggle
   * membership instead, until the selection is cleared.
   */
  const handleItemClick = useCallback(
    (
      item: SelectableItem,
      index: number,
      items: SelectableItem[],
      e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
    ): boolean => {
      if (e.shiftKey && anchorIndex.current !== null) {
        const [start, end] =
          anchorIndex.current < index ? [anchorIndex.current, index] : [index, anchorIndex.current];
        setSelected((prev) => {
          const next = new Map(prev);
          for (let i = start; i <= end; i++) {
            const it = items[i];
            if (it) next.set(it.id, it.type);
          }
          return next;
        });
        return true;
      }
      if (e.ctrlKey || e.metaKey) {
        toggle(item, index);
        return true;
      }
      if (selected.size > 0) {
        toggle(item, index);
        return true;
      }
      return false;
    },
    [selected, toggle],
  );

  return { selected, count: selected.size, isSelected, clear, toggle, selectAll, handleItemClick };
}
