"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/common/form-field";
import { api, ApiError } from "@/lib/api-client";

interface NewCustomerModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function NewCustomerModal({ onClose, onCreated }: NewCustomerModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.post("/admin/customers", {
        name,
        email,
        company: company.trim() || undefined,
        password,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the account.");
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
      >
        <h2 className="text-foreground mb-1 text-[17px] font-semibold">New customer</h2>
        <p className="text-ink-450 mb-5 text-[13px]">
          Creates a full account — same as a self-serve signup, on their behalf.
        </p>

        <div className="flex flex-col gap-4">
          <FormField id="c-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <FormField
            id="c-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <FormField
            id="c-company"
            label="Company (optional)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Defaults to “{name}'s Workspace”"
          />
          <FormField
            id="c-password"
            label="Initial password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error && <p className="text-error-text mt-3 text-[13px]">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || !name || !email || password.length < 8}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
