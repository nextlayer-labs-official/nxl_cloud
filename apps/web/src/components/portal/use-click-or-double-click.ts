"use client";

import { useRef } from "react";

/**
 * Disambiguates a single click (fires after a short delay) from a double
 * click (fires immediately and cancels the pending single click) on the same
 * element — used so a file/folder name can both open-on-click and
 * rename-on-double-click without the first click of the double-click firing
 * the open action.
 */
export function useClickOrDoubleClick(
  onSingleClick: (e: React.MouseEvent) => void,
  onDoubleClick: () => void,
  delayMs = 220,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (e: React.MouseEvent) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      onDoubleClick();
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      onSingleClick(e);
    }, delayMs);
  };
}
