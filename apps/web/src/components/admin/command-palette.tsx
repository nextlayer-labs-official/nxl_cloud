"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { useRouter } from "next/navigation";
import { Building2, CreditCard, Search, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import type { AdminSearchResults } from "@/types/admin";

function formatMoney(cents: number): string {
  return `₹${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Global quick-jump search — Ctrl/Cmd+K anywhere in the admin panel, or clicking the search box in the top bar. Hand-rolled on Radix's Dialog rather than adding the cmdk package for one modal. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const handle = setTimeout(() => {
      api
        .get<AdminSearchResults>(`/admin/search?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .catch(() => setResults({ organizations: [], users: [], payments: [] }));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  const hasResults =
    results && (results.organizations.length > 0 || results.users.length > 0 || results.payments.length > 0);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="border-border-subtle bg-background fixed top-[18%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border shadow-2xl">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="border-border-subtle flex items-center gap-2 border-b px-4 py-3">
            <Search className="text-ink-450 h-4 w-4 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search organizations, users, invoices..."
              className="text-foreground placeholder:text-ink-450 w-full bg-transparent text-[14px] outline-none"
            />
            <kbd className="text-ink-450 border-border-subtle rounded border px-1.5 py-0.5 text-[10px] font-semibold">
              Esc
            </kbd>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {!query.trim() ? (
              <p className="text-ink-450 px-3 py-6 text-center text-[13px]">Start typing to search.</p>
            ) : !results ? (
              <p className="text-ink-450 px-3 py-6 text-center text-[13px]">Searching…</p>
            ) : !hasResults ? (
              <p className="text-ink-450 px-3 py-6 text-center text-[13px]">No results.</p>
            ) : (
              <>
                {results.organizations.length > 0 && (
                  <div className="mb-2">
                    <div className="text-ink-450 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">Organizations</div>
                    {results.organizations.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => go(`/admin/organizations/${org.id}`)}
                        className="hover:bg-surface-muted flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px]"
                      >
                        <Building2 className="text-ink-450 h-4 w-4 shrink-0" />
                        <span className="text-foreground font-medium">{org.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.users.length > 0 && (
                  <div className="mb-2">
                    <div className="text-ink-450 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">Users</div>
                    {results.users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => go("/admin/users")}
                        className="hover:bg-surface-muted flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px]"
                      >
                        <Users className="text-ink-450 h-4 w-4 shrink-0" />
                        <span className="text-foreground font-medium">{user.name}</span>
                        <span className="text-ink-450 truncate">{user.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {results.payments.length > 0 && (
                  <div className="mb-2">
                    <div className="text-ink-450 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">Payments</div>
                    {results.payments.map((payment) => (
                      <button
                        key={payment.id}
                        type="button"
                        onClick={() => go("/admin/billing")}
                        className="hover:bg-surface-muted flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px]"
                      >
                        <CreditCard className="text-ink-450 h-4 w-4 shrink-0" />
                        <span className="text-foreground font-medium">{payment.organization.name}</span>
                        <span className="text-ink-450 ml-auto shrink-0">{formatMoney(payment.amountCents)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
