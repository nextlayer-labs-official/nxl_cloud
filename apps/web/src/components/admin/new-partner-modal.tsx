"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/common/form-field";
import { api, ApiError } from "@/lib/api-client";

interface NewPartnerModalProps {
  onClose: () => void;
  onCreated: () => void;
}

/** Slugifies a partner name into a starting-point code — kept editable since the customer types this in by hand. */
function suggestCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 16);
}

export function NewPartnerModal({ onClose, onCreated }: NewPartnerModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
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

  function handleNameChange(value: string) {
    setName(value);
    if (!codeTouched) setCode(suggestCode(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await api.post("/admin/partners", { name, email, code: code.trim(), password });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't onboard this partner.");
      setCreating(false);
    }
  }

  const codeValid = /^[A-Za-z0-9-]{3,32}$/.test(code.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
      >
        <h2 className="text-foreground mb-1 text-[17px] font-semibold">Onboard partner</h2>
        <p className="text-ink-450 mb-5 text-[13px]">
          Creates a reseller login — customers enter their code to map their workspace to this partner.
        </p>

        <div className="flex flex-col gap-4">
          <FormField
            id="p-name"
            label="Partner name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          <FormField
            id="p-email"
            label="Login email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="p-code" className="text-ink-700 text-[13px] font-semibold">
              Partner code
            </label>
            <input
              id="p-code"
              value={code}
              onChange={(e) => {
                setCodeTouched(true);
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="ACME2026"
              required
              className="border-input rounded-lg border px-3.5 py-[11px] text-sm font-mono uppercase"
            />
            <p className="text-ink-450 text-[12px]">
              What their customers type into Settings — letters, numbers, hyphens, 3-32 characters.
            </p>
          </div>
          <FormField
            id="p-password"
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
            disabled={creating || !name || !email || !codeValid || password.length < 8}
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
