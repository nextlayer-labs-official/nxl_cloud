"use client";

import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onDelete: () => void;
  onOpen: () => void;
  onSelectAll: () => void;
  onEscape: () => void;
  /** Disable entirely while a modal is open (modals own their own Escape-close) or outside the plain browse view. */
  enabled: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

/**
 * Delete = delete current selection, Enter = open focused/selected item,
 * Ctrl/Cmd+A = select all, Escape = clear selection. Deliberately does NOT
 * bind Backspace (risks colliding with browser back-navigation) and bails
 * out entirely when focus is in an editable element (search box, rename
 * input, any modal field) so typing there behaves normally.
 */
export function useKeyboardShortcuts({
  onDelete,
  onOpen,
  onSelectAll,
  onEscape,
  enabled,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      if (e.key === "Delete") {
        e.preventDefault();
        onDelete();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onOpen();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        onSelectAll();
      } else if (e.key === "Escape") {
        onEscape();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onDelete, onOpen, onSelectAll, onEscape]);
}
