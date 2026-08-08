"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface BrowserActions {
  openUploadPicker: () => void;
  startNewFolder: () => void;
}

interface BrowserActionsContextValue {
  actions: BrowserActions | null;
  registerActions: (actions: BrowserActions | null) => void;
}

const BrowserActionsContext = createContext<BrowserActionsContextValue | null>(null);

export function BrowserActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<BrowserActions | null>(null);
  return (
    <BrowserActionsContext.Provider value={{ actions, registerActions: setActions }}>
      {children}
    </BrowserActionsContext.Provider>
  );
}

/** Sidebar reads this — null while on a page (e.g. Settings, Trash) with no folder to create/upload into. */
export function useBrowserActions(): BrowserActions | null {
  const ctx = useContext(BrowserActionsContext);
  return ctx?.actions ?? null;
}

/** FileBrowser calls this to make its create/upload actions reachable from the sidebar's "+ New" button. */
export function useRegisterBrowserActions(actions: BrowserActions) {
  // Depend on the setter (stable across renders), not the provider's context
  // value object (which changes identity every time actions are registered) —
  // otherwise this effect would re-fire and re-register in a loop.
  const registerActions = useContext(BrowserActionsContext)?.registerActions;
  const { openUploadPicker, startNewFolder } = actions;
  useEffect(() => {
    registerActions?.({ openUploadPicker, startNewFolder });
    return () => registerActions?.(null);
  }, [registerActions, openUploadPicker, startNewFolder]);
}
