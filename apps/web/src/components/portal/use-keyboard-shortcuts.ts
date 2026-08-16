"use client";

import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onDelete: () => void;
  onOpen: () => void;
  onSelectAll: () => void;
  onEscape: () => void;
  /** Arrow Up/Down move the keyboard focus cursor through the ordered item list; `extend` (Shift held) extends the selection range from the last anchor instead of just moving focus. */
  onMoveFocus: (direction: "up" | "down", extend: boolean) => void;
  /** F2 — starts renaming the focused/single-selected item. */
  onRename: () => void;
  /** Space — quick-preview the focused/selected file. */
  onPreview: () => void;
  /** Ctrl/Cmd+X — mark the current selection to be moved. */
  onCut: () => void;
  /** Ctrl/Cmd+V — move whatever was cut into the current folder. */
  onPaste: () => void;
  /** Disable entirely while a modal is open (modals own their own Escape-close) or outside the plain browse view. */
  enabled: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

/**
 * Delete = delete current selection, Enter = open focused/selected item,
 * Ctrl/Cmd+A = select all, Escape = clear selection, Arrow Up/Down = move the
 * keyboard focus cursor (Shift extends the selection range), F2 = rename,
 * Space = quick preview, Ctrl/Cmd+X / Ctrl/Cmd+V = cut/paste-move. Deliberately
 * does NOT bind Backspace (risks colliding with browser back-navigation) or
 * Ctrl/Cmd+C (there's no backend file-duplication capability, so a "copy"
 * shortcut that doesn't actually copy would be a confusing half-feature).
 * Bails out entirely when focus is in an editable element (search box,
 * rename input, any modal field) so typing there behaves normally.
 */
export function useKeyboardShortcuts({
  onDelete,
  onOpen,
  onSelectAll,
  onEscape,
  onMoveFocus,
  onRename,
  onPreview,
  onCut,
  onPaste,
  enabled,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      const meta = e.ctrlKey || e.metaKey;

      if (e.key === "Delete") {
        e.preventDefault();
        onDelete();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onOpen();
      } else if (meta && e.key.toLowerCase() === "a") {
        e.preventDefault();
        onSelectAll();
      } else if (e.key === "Escape") {
        onEscape();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onMoveFocus("down", e.shiftKey);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onMoveFocus("up", e.shiftKey);
      } else if (e.key === "F2") {
        e.preventDefault();
        onRename();
      } else if (e.key === " ") {
        e.preventDefault();
        onPreview();
      } else if (meta && e.key.toLowerCase() === "x") {
        e.preventDefault();
        onCut();
      } else if (meta && e.key.toLowerCase() === "v") {
        e.preventDefault();
        onPaste();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onDelete, onOpen, onSelectAll, onEscape, onMoveFocus, onRename, onPreview, onCut, onPaste]);
}
