"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/common/form-field";
import { api, ApiError } from "@/lib/api-client";

interface NewDistributorModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function NewDistributorModal({ onClose, onCreated }: NewDistributorModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
      await api.post("/admin/distributors", { name, email, password });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't onboard this distributor.");
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
        <h2 className="text-foreground mb-1 text-[17px] font-semibold">Onboard distributor</h2>
        <p className="text-ink-450 mb-5 text-[13px]">
          Creates a distributor login. They onboard and manage their own partners, drawing from a wallet
          you fund.
        </p>

        <div className="flex flex-col gap-4">
          <FormField
            id="d-name"
            label="Distributor name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FormField
            id="d-email"
            label="Login email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <FormField
            id="d-password"
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
            Onboard
          </button>
        </div>
      </form>
    </div>
  );
}
