"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { usePortal } from "./portal-context";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border-subtle bg-background mb-6 rounded-2xl border p-6">
      <h2 className="text-foreground text-[16px] font-semibold">{title}</h2>
      <p className="text-ink-450 mt-1 mb-5 text-sm">{description}</p>
      {children}
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink-700 text-[13px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="border-input bg-background rounded-lg border px-3.5 py-2.5 text-sm outline-none"
      />
    </div>
  );
}

export function SettingsView() {
  const { user, refresh } = usePortal();
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage(null);
    setProfileSaving(true);
    try {
      await api.patch("/auth/me", { name, email });
      await refresh();
      setProfileMessage({ type: "success", text: "Profile updated." });
    } catch (err) {
      setProfileMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "Couldn't update your profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords don't match." });
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ type: "success", text: "Password updated." });
    } catch (err) {
      setPasswordMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "Couldn't update your password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    if (deleteConfirmText !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm.');
      return;
    }
    if (
      !window.confirm(
        "This permanently deletes your account and every file and folder in your workspace. This cannot be undone. Continue?",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete("/auth/me", { password: deletePassword });
      router.replace("/login");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-foreground mb-8 text-[26px] font-bold tracking-[-0.01em]">Settings</h1>

      <form onSubmit={handleSaveProfile}>
        <SectionCard title="Profile" description="Your name and email address.">
          <div className="flex flex-col gap-4">
            <Field id="s-name" label="Name" value={name} onChange={setName} autoComplete="name" />
            <Field
              id="s-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            {profileMessage && (
              <p
                className={
                  profileMessage.type === "success" ? "text-success text-[13px]" : "text-error-text text-[13px]"
                }
              >
                {profileMessage.text}
              </p>
            )}
            <div>
              <button
                type="submit"
                disabled={profileSaving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {profileSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        </SectionCard>
      </form>

      <form onSubmit={handleChangePassword}>
        <SectionCard title="Password" description="Update the password used to sign in.">
          <div className="flex flex-col gap-4">
            <Field
              id="s-current-password"
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <Field
              id="s-new-password"
              label="New password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            <Field
              id="s-confirm-password"
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {passwordMessage && (
              <p
                className={
                  passwordMessage.type === "success" ? "text-success text-[13px]" : "text-error-text text-[13px]"
                }
              >
                {passwordMessage.text}
              </p>
            )}
            <div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </button>
            </div>
          </div>
        </SectionCard>
      </form>

      <form onSubmit={handleDeleteAccount}>
        <div className="border-error-border bg-error-bg rounded-2xl border p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-error-text mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="text-error-text text-[16px] font-semibold">Delete account</h2>
              <p className="text-error-text/80 mt-1 mb-5 text-sm">
                Permanently deletes your account and every file and folder in your workspace.
                This cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <Field
              id="s-delete-password"
              label="Password"
              type="password"
              value={deletePassword}
              onChange={setDeletePassword}
              autoComplete="current-password"
            />
            <Field
              id="s-delete-confirm"
              label='Type "DELETE" to confirm'
              value={deleteConfirmText}
              onChange={setDeleteConfirmText}
            />
            {deleteError && <p className="text-error-text text-[13px]">{deleteError}</p>}
            <div>
              <button
                type="submit"
                disabled={deleting}
                className="bg-error-text flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete my account
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
