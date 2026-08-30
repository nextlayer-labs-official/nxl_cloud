"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Building2, Check, Info, Loader2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  PartnerChangeRequest,
  PartnerInfo,
  Plan,
  SubscriptionInfo,
  SubscriptionStatus,
  Transaction,
} from "@/types/portal";
import { CheckoutConfirmationModal } from "./checkout-confirmation-modal";
import { usePortal } from "./portal-context";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIALING: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELED: "Canceled",
};

type BillingCycle = "MONTHLY" | "ANNUAL";

interface Usage {
  usedBytes: number;
  limitBytes: number | null;
}

function priceForCycle(plan: Plan, cycle: BillingCycle): number | null {
  return cycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
}

function formatPrice(cents: number | null, cycle: BillingCycle): string {
  if (cents === null) return "Custom";
  return `₹${(cents / 100).toFixed(2)}/${cycle === "ANNUAL" ? "yr" : "mo"}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type SettingsTab = "profile" | "billing" | "security" | "danger";

const TABS: { key: SettingsTab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "billing", label: "Plan & billing" },
  { key: "security", label: "Security" },
  { key: "danger", label: "Danger zone" },
];

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
    <div>
      <h2 className="text-foreground text-[20px] font-semibold">{title}</h2>
      <p className="text-ink-450 mt-1 mb-6 text-sm">{description}</p>
      {children}
    </div>
  );
}

function SubsectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">{children}</h3>;
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

function SettingsRow({
  label,
  value,
  description,
  actionLabel,
  onAction,
}: {
  label: string;
  value?: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-0">
        <div className="text-foreground text-[14px] font-medium">{label}</div>
        {description && <div className="text-ink-450 mt-0.5 text-[13px]">{description}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {value && <span className="text-ink-450 text-[14px]">{value}</span>}
        <button
          type="button"
          onClick={onAction}
          className="text-foreground hover:text-primary cursor-pointer text-[13px] font-semibold underline underline-offset-2"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function EditFieldModal({
  label,
  value,
  type = "text",
  onClose,
  onSave,
}: {
  label: string;
  value: string;
  type?: string;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
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
    const trimmed = draft.trim();
    if (!trimmed) {
      setError(`${label} can't be empty.`);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Couldn't update ${label.toLowerCase()}.`);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
      >
        <h2 className="text-foreground mb-4 text-[17px] font-semibold">Edit {label.toLowerCase()}</h2>
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="border-input bg-background w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none"
        />
        {error && <p className="text-error-text mt-2.5 text-[13px]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function ChangePasswordModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
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
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      await onSave(currentPassword, newPassword);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update your password.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
      >
        <h2 className="text-foreground mb-4 text-[17px] font-semibold">Change password</h2>
        <div className="flex flex-col gap-4">
          <Field
            id="cp-current"
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <Field
            id="cp-new"
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
          <Field
            id="cp-confirm"
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-error-text mt-3 text-[13px]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteAccountModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
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
    if (confirmText !== "DELETE") {
      setError('Type "DELETE" to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await onConfirm(password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-error-text mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="text-foreground text-[17px] font-semibold">Delete account</h2>
            <p className="text-ink-450 mt-1 text-[13px]">
              This permanently deletes your account and every file and folder in your workspace. This cannot
              be undone.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-4">
          <Field
            id="da-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <Field id="da-confirm" label='Type "DELETE" to confirm' value={confirmText} onChange={setConfirmText} />
        </div>
        {error && <p className="text-error-text mt-3 text-[13px]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={deleting}
            className="bg-error-text flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete my account
          </button>
        </div>
      </form>
    </div>
  );
}

function PartnerCodeCard({
  title = "Have a partner code?",
  description = "Map your workspace to a reseller — they'll manage your plan from here on.",
  buttonLabel = "Apply",
  className,
  onApply,
  applying,
  error,
}: {
  title?: string;
  description?: string;
  buttonLabel?: string;
  className?: string;
  onApply: (code: string) => void;
  applying: boolean;
  error: string | null;
}) {
  const [code, setCode] = useState("");
  return (
    <div
      className={cn(
        "border-border-subtle flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-foreground text-[13px] font-semibold">{title}</div>
        <div className="text-ink-450 text-[12px]">{description}</div>
        {error && <div className="text-error-text mt-1 text-[12px]">{error}</div>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) onApply(code.trim());
        }}
        className="flex shrink-0 items-center gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="PARTNER CODE"
          className="border-input bg-background w-40 rounded-lg border px-3 py-2 text-[13px] font-mono uppercase outline-none"
        />
        <button
          type="submit"
          disabled={applying || !code.trim()}
          className="border-input hover:bg-surface-muted flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-semibold disabled:opacity-60"
        >
          {applying && <Loader2 className="h-3 w-3 animate-spin" />}
          {buttonLabel}
        </button>
      </form>
    </div>
  );
}

/** Shown once a leave/switch request has been filed but not yet resolved — replaces the normal managed-by actions until the current partner responds. */
function PartnerChangeRequestBanner({
  partnerName,
  request,
  onCancel,
  canceling,
}: {
  partnerName: string;
  request: PartnerChangeRequest;
  onCancel: () => void;
  canceling: boolean;
}) {
  const isRejected = request.status === "REJECTED";
  const actionDescription = request.newPartner
    ? `switch to ${request.newPartner.name}`
    : "leave this partner";

  return (
    <div
      className={cn(
        "mt-4 rounded-lg border px-4 py-3",
        isRejected ? "border-error-border bg-error-bg" : "border-warn/30 bg-warn/10",
      )}
    >
      <p className={cn("text-[13px] font-medium", isRejected ? "text-error-text" : "text-ink-700")}>
        {isRejected
          ? `${partnerName} declined your request to ${actionDescription}.`
          : `Your request to ${actionDescription} is awaiting approval from ${partnerName}.`}
      </p>
      <button
        type="button"
        onClick={onCancel}
        disabled={canceling}
        className={cn(
          "mt-2 flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold disabled:opacity-60",
          isRejected ? "text-error-text" : "text-ink-450 hover:text-foreground",
        )}
      >
        {canceling ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        {isRejected ? "Dismiss" : "Cancel request"}
      </button>
    </div>
  );
}

function PartnerManagedNotice({
  partner,
  changeRequest,
  onRequestSwitch,
  onRequestRemoval,
  onCancelRequest,
  applying,
  removing,
  canceling,
  switchError,
}: {
  partner: PartnerInfo;
  changeRequest: PartnerChangeRequest | null;
  onRequestSwitch: (code: string) => void;
  onRequestRemoval: () => void;
  onCancelRequest: () => void;
  applying: boolean;
  removing: boolean;
  canceling: boolean;
  switchError: string | null;
}) {
  const hasActiveRequest = changeRequest && (changeRequest.status === "PENDING" || changeRequest.status === "REJECTED");

  return (
    <div className="border-border-subtle bg-surface-muted-2 rounded-xl border p-5">
      <div className="flex items-start gap-3">
        <div className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Building2 className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-foreground text-[15px] font-semibold">Managed by {partner.name}</div>
          <p className="text-ink-450 mt-1 text-[13px]">
            Your plan is managed by this partner — upgrades, downgrades, and billing changes go through
            them, not this page. Contact{" "}
            <a href={`mailto:${partner.email}`} className="text-primary underline underline-offset-2">
              {partner.email}
            </a>{" "}
            to make changes.
          </p>

          {hasActiveRequest && changeRequest ? (
            <PartnerChangeRequestBanner
              partnerName={partner.name}
              request={changeRequest}
              onCancel={onCancelRequest}
              canceling={canceling}
            />
          ) : (
            <button
              type="button"
              onClick={onRequestRemoval}
              disabled={removing}
              className="text-ink-450 hover:text-error-text mt-3 flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold disabled:opacity-60"
            >
              {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              Request to leave this partner
            </button>
          )}
        </div>
      </div>

      {!hasActiveRequest && (
        <PartnerCodeCard
          title="Switch to a different partner?"
          description={`Requesting a switch needs ${partner.name}'s approval before it takes effect.`}
          buttonLabel="Request switch"
          className="mt-4"
          onApply={onRequestSwitch}
          applying={applying}
          error={switchError}
        />
      )}
    </div>
  );
}

export function SettingsView() {
  const { user, organization, refresh } = usePortal();
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedTab = searchParams.get("tab");
  const initialTab: SettingsTab =
    requestedTab && TABS.some((t) => t.key === requestedTab) ? (requestedTab as SettingsTab) : "profile";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingField, setEditingField] = useState<"name" | "email" | "orgName" | null>(null);

  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingActionError, setBillingActionError] = useState<string | null>(null);
  const [billingActionLoading, setBillingActionLoading] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<{ type: "success" | "info"; text: string } | null>(
    null,
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");
  const [confirmingPlan, setConfirmingPlan] = useState<Plan | null>(null);

  const [applyingPartnerCode, setApplyingPartnerCode] = useState(false);
  const [partnerCodeError, setPartnerCodeError] = useState<string | null>(null);
  const [removingPartner, setRemovingPartner] = useState(false);
  const [cancelingPartnerRequest, setCancelingPartnerRequest] = useState(false);
  const [partnerChangeRequest, setPartnerChangeRequest] = useState<PartnerChangeRequest | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Plan[]>("/billing/plans"),
      api.get<SubscriptionInfo | null>("/billing/subscription"),
      api.get<Transaction[]>("/billing/transactions"),
      api.get<Usage>("/organizations/usage"),
      api.get<PartnerChangeRequest | null>("/organizations/partner-change-request"),
    ])
      .then(([plansData, subscriptionData, transactionsData, usageData, changeRequestData]) => {
        setPlans(plansData);
        setSubscription(subscriptionData);
        setTransactions(transactionsData);
        setUsage(usageData);
        setPartnerChangeRequest(changeRequestData);
      })
      .catch(() => setBillingActionError("Couldn't load billing info — try refreshing the page."))
      .finally(() => setBillingLoading(false));
  }, []);

  async function handleSubscribe(planId: string) {
    setBillingActionError(null);
    setCheckoutMessage(null);
    setBillingActionLoading(planId);
    try {
      const order = await api.post<
        | { requiresPayment: true; prorated: boolean; orderId: string; amount: number; currency: string; keyId: string }
        | { requiresPayment: false; planName: string; amountCents: number; creditBalanceCents: number }
      >("/billing/order", { planId, billingCycle });

      // An upgrade fully covered by proration + existing credit needs no
      // payment at all — the plan already switched server-side. (Downgrades
      // never reach this branch — they're blocked outright while a period
      // is still active, see the plan cards' disabled state below.)
      if (!order.requiresPayment) {
        const [updatedSubscription, updatedTransactions, updatedUsage] = await Promise.all([
          api.get<SubscriptionInfo | null>("/billing/subscription"),
          api.get<Transaction[]>("/billing/transactions"),
          api.get<Usage>("/organizations/usage"),
        ]);
        setSubscription(updatedSubscription);
        setTransactions(updatedTransactions);
        setUsage(updatedUsage);
        setCheckoutMessage({
          type: "success",
          text:
            order.amountCents > 0
              ? `Switched to ${order.planName} — ₹${(order.amountCents / 100).toFixed(2)} covered by your account credit.`
              : `Switched to ${order.planName} at no additional charge.`,
        });
        setBillingActionLoading(null);
        setConfirmingPlan(null);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Couldn't load the payment form. Check your connection and try again.");
      }

      setConfirmingPlan(null);
      let completed = false;
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Nextlayer Cloud",
        order_id: order.orderId,
        prefill: { name: user.name, email: user.email },
        theme: { color: "#2563eb" },
        handler: async (response) => {
          completed = true;
          try {
            await api.post("/billing/verify", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            const [updatedSubscription, updatedTransactions, updatedUsage] = await Promise.all([
              api.get<SubscriptionInfo | null>("/billing/subscription"),
              api.get<Transaction[]>("/billing/transactions"),
              api.get<Usage>("/organizations/usage"),
            ]);
            setSubscription(updatedSubscription);
            setTransactions(updatedTransactions);
            setUsage(updatedUsage);
            setCheckoutMessage({
              type: "success",
              text: order.prorated
                ? "Upgraded — the prorated difference was charged. Thanks!"
                : "Subscription updated — thanks!",
            });
          } catch {
            setBillingActionError("Payment succeeded but we couldn't confirm it — contact support.");
          } finally {
            setBillingActionLoading(null);
          }
        },
        modal: {
          ondismiss: () => {
            if (!completed) {
              setCheckoutMessage({ type: "info", text: "Checkout canceled — no changes were made." });
              setBillingActionLoading(null);
            }
          },
        },
      });
      checkout.open();
    } catch (err) {
      setBillingActionError(
        err instanceof ApiError ? err.message : (err as Error).message || "Couldn't start checkout.",
      );
      setBillingActionLoading(null);
      setConfirmingPlan(null);
    }
  }

  async function handleApplyPartnerCode(code: string) {
    setPartnerCodeError(null);
    setApplyingPartnerCode(true);
    try {
      const result = await api.post<
        { status: "mapped"; partner: PartnerInfo } | { status: "pending"; request: PartnerChangeRequest }
      >("/organizations/partner-code", { code });
      if (result.status === "mapped") {
        await refresh();
      } else {
        setPartnerChangeRequest(result.request);
      }
    } catch (err) {
      setPartnerCodeError(err instanceof ApiError ? err.message : "Couldn't apply that code.");
    } finally {
      setApplyingPartnerCode(false);
    }
  }

  async function handleRemovePartnerCode() {
    setRemovingPartner(true);
    try {
      const result = await api.delete<{ status: "pending"; request: PartnerChangeRequest }>(
        "/organizations/partner-code",
      );
      setPartnerChangeRequest(result.request);
    } finally {
      setRemovingPartner(false);
    }
  }

  async function handleCancelPartnerChangeRequest() {
    setCancelingPartnerRequest(true);
    try {
      await api.delete("/organizations/partner-change-request");
      setPartnerChangeRequest(null);
    } finally {
      setCancelingPartnerRequest(false);
    }
  }

  async function handleSaveProfileField(field: "name" | "email", value: string) {
    await api.patch("/auth/me", { [field]: value });
    await refresh();
    setProfileMessage({ type: "success", text: field === "name" ? "Name updated." : "Email updated." });
  }

  async function handleSaveOrgName(value: string) {
    await api.patch("/organizations", { name: value });
    await refresh();
    setProfileMessage({ type: "success", text: "Workspace name updated." });
  }

  async function handleChangePassword(currentPassword: string, newPassword: string) {
    await api.post("/auth/change-password", { currentPassword, newPassword });
    setPasswordMessage({ type: "success", text: "Password updated." });
  }

  async function handleDeleteAccount(password: string) {
    await api.delete("/auth/me", { password });
    router.replace("/login");
  }

  const percentUsed = usage?.limitBytes ? Math.min(100, (usage.usedBytes / usage.limitBytes) * 100) : null;

  return (
    <div>
      <h1 className="text-foreground mb-6 text-[26px] font-bold tracking-[-0.01em]">Settings</h1>

      <div className="bg-surface-muted mb-8 inline-flex items-center gap-1 rounded-full p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
              activeTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-ink-550 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <SectionCard title="Personal account" description="Your name and email address.">
          {profileMessage && (
            <p
              className={cn(
                "mb-4 text-[13px]",
                profileMessage.type === "success" ? "text-success" : "text-error-text",
              )}
            >
              {profileMessage.text}
            </p>
          )}
          <SubsectionLabel>Basics</SubsectionLabel>
          <div className="border-border-subtle divide-border-subtle divide-y rounded-xl border">
            <SettingsRow
              label="Name"
              value={user.name}
              actionLabel="Edit"
              onAction={() => setEditingField("name")}
            />
            <SettingsRow
              label="Email"
              value={user.email}
              actionLabel="Edit"
              onAction={() => setEditingField("email")}
            />
          </div>
        </SectionCard>
      )}

      {activeTab === "profile" && (
        <SectionCard title="Workspace" description="The name shown across your files and in the sidebar.">
          <div className="border-border-subtle divide-border-subtle divide-y rounded-xl border">
            <SettingsRow
              label="Workspace name"
              value={organization.name}
              actionLabel="Edit"
              onAction={() => setEditingField("orgName")}
            />
          </div>
        </SectionCard>
      )}

      {activeTab === "billing" && (
      <SectionCard title="Plan & billing" description="Manage your subscription and storage.">
        {checkoutMessage && (
          <p
            className={cn(
              "mb-4 text-[13px]",
              checkoutMessage.type === "success" ? "text-success" : "text-ink-450",
            )}
          >
            {checkoutMessage.text}
          </p>
        )}
        {billingLoading ? (
          <div className="bg-surface-muted h-32 animate-pulse rounded-xl" />
        ) : (
          <>
            <div className="border-border-subtle bg-surface-muted-2 mb-8 rounded-xl border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-foreground text-[16px] font-semibold">
                    {subscription?.plan.name ?? "No plan"}
                  </div>
                  <div className="text-ink-450 mt-0.5 text-[13px]">
                    {subscription ? STATUS_LABEL[subscription.status] : "—"}
                    {subscription?.currentPeriodEnd &&
                      ` · ${subscription.status === "TRIALING" ? "trial ends" : "renews"} ${formatDate(subscription.currentPeriodEnd)}`}
                  </div>
                </div>
              </div>

              {usage && (
                <div className="mt-4">
                  <div className="bg-surface-muted h-2.5 w-full overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        percentUsed !== null && percentUsed >= 90
                          ? "bg-error-text"
                          : percentUsed !== null && percentUsed >= 70
                            ? "bg-warn"
                            : "bg-primary",
                      )}
                      style={{ width: `${percentUsed ?? 0}%` }}
                    />
                  </div>
                  <div className="text-ink-450 mt-1.5 text-[12px]">
                    {usage.limitBytes === null
                      ? `${formatBytes(usage.usedBytes)} used · unlimited storage`
                      : `${formatBytes(usage.usedBytes)} of ${formatBytes(usage.limitBytes)} used`}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {subscription?.freeUntil && new Date(subscription.freeUntil) > new Date() && (
                  <div className="text-success text-[13px] font-medium">
                    Comped until {formatDate(subscription.freeUntil)}
                  </div>
                )}
                {!!subscription?.discountPercent && (
                  <div className="text-success text-[13px] font-medium">
                    {subscription.discountPercent}% off will apply at your next renewal
                  </div>
                )}
                {!!subscription?.creditBalanceCents && (
                  <div className="text-success text-[13px] font-medium">
                    Account credit: ₹{(subscription.creditBalanceCents / 100).toFixed(2)} (applied to your next
                    charge)
                  </div>
                )}
              </div>
            </div>

            {organization.partner ? (
              <PartnerManagedNotice
                partner={organization.partner}
                changeRequest={partnerChangeRequest}
                onRequestSwitch={handleApplyPartnerCode}
                onRequestRemoval={handleRemovePartnerCode}
                onCancelRequest={handleCancelPartnerChangeRequest}
                applying={applyingPartnerCode}
                removing={removingPartner}
                canceling={cancelingPartnerRequest}
                switchError={partnerCodeError}
              />
            ) : (
              <>
            <PartnerCodeCard
              className="mb-8"
              onApply={handleApplyPartnerCode}
              applying={applyingPartnerCode}
              error={partnerCodeError}
            />

            {billingActionError && (
              <p className="text-error-text mb-4 text-[13px]">{billingActionError}</p>
            )}

            <div className="mb-4 flex items-center justify-between">
              <SubsectionLabel>Available plans</SubsectionLabel>
              <div className="bg-surface-muted inline-flex items-center gap-1 rounded-full p-1">
                {(["MONTHLY", "ANNUAL"] as const).map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={cn(
                      "cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-semibold",
                      billingCycle === cycle
                        ? "bg-background text-foreground shadow-sm"
                        : "text-ink-550 bg-transparent",
                    )}
                  >
                    {cycle === "MONTHLY" ? "Monthly" : "Annual"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent =
                  subscription?.plan.id === plan.id && subscription.status === "ACTIVE";
                // A real mid-cycle switch (proration applies) vs. a fresh purchase/renewal —
                // only meaningful when there's paid time left on a *different* plan.
                const hasSwitchablePlan =
                  !isCurrent &&
                  subscription?.status === "ACTIVE" &&
                  !!subscription.currentPeriodEnd &&
                  new Date(subscription.currentPeriodEnd) > new Date();
                const isUpgrade =
                  hasSwitchablePlan &&
                  (plan.priceMonthlyCents ?? -Infinity) > (subscription?.plan.priceMonthlyCents ?? -Infinity);
                const isDowngrade =
                  hasSwitchablePlan &&
                  (plan.priceMonthlyCents ?? -Infinity) < (subscription?.plan.priceMonthlyCents ?? -Infinity);
                // The discount is org-level, not tied to the current plan specifically — it's
                // honored at checkout regardless of which plan is purchased (see billing.service.ts
                // createOrder), so show the real price on every purchasable row, not just the
                // (non-actionable, already-paid-for) current one.
                const discount = subscription?.discountPercent ?? null;
                const price = priceForCycle(plan, billingCycle);
                const discountedPrice =
                  discount && price !== null ? Math.round((price * (100 - discount)) / 100) : null;

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "border-border-subtle bg-background flex flex-col rounded-2xl border p-5",
                      isCurrent && "border-primary ring-primary/15 ring-2",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-[16px] font-semibold">{plan.name}</span>
                      {isCurrent && (
                        <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold">
                          Current plan
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline gap-1.5">
                      {price === null ? (
                        <span className="text-foreground text-[24px] font-bold">Custom</span>
                      ) : (
                        <>
                          <span className="text-foreground text-[28px] font-bold tracking-[-0.01em]">
                            ₹{((discountedPrice ?? price) / 100).toFixed(2)}
                          </span>
                          <span className="text-ink-450 text-[13px]">
                            /{billingCycle === "ANNUAL" ? "yr" : "mo"}
                          </span>
                        </>
                      )}
                    </div>
                    {discountedPrice !== null && price !== null && (
                      <div className="text-ink-450 text-[12px] line-through">
                        {formatPrice(price, billingCycle)}
                      </div>
                    )}

                    <div className="text-ink-450 mt-2 text-[13px]">
                      {plan.storageLimitGb === null ? "Unlimited storage" : `${plan.storageLimitGb} GB storage`}
                    </div>
                    {isUpgrade && (
                      <div className="text-ink-450 mt-0.5 text-[12px]">Prorated — pay only the difference</div>
                    )}

                    {plan.features.length > 0 && (
                      <ul className="mt-4 flex flex-col gap-2">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="text-ink-600 flex items-start gap-2 text-[13px]">
                            <Check className="text-success mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex-1" />

                    {isDowngrade && subscription?.currentPeriodEnd && (
                      <div className="bg-surface-muted mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5">
                        <Info className="text-ink-450 mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="text-ink-600 text-[12px]">
                          Downgrades take effect at renewal, not immediately — you can switch to {plan.name}{" "}
                          once your current plan ends on {formatDate(subscription.currentPeriodEnd)}.
                        </span>
                      </div>
                    )}

                    <div className="mt-4">
                      {price === null ? (
                        <Link
                          href="/contact"
                          className="border-input text-foreground hover:bg-surface-muted block w-full rounded-lg border px-3.5 py-2 text-center text-sm font-semibold"
                        >
                          Contact us
                        </Link>
                      ) : isDowngrade ? (
                        <button
                          type="button"
                          disabled
                          className="border-input text-ink-450 w-full cursor-not-allowed rounded-lg border px-3.5 py-2 text-sm font-semibold opacity-60"
                        >
                          Downgrade
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingPlan(plan)}
                          disabled={billingActionLoading === plan.id}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold disabled:opacity-60",
                            isCurrent
                              ? "border-input text-foreground hover:bg-surface-muted border"
                              : "bg-primary text-primary-foreground hover:bg-primary/90",
                          )}
                        >
                          {billingActionLoading === plan.id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          {isCurrent ? "Renew" : isUpgrade ? "Upgrade" : "Subscribe"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
              </>
            )}

            <div className="mt-10">
              <SubsectionLabel>Billing history</SubsectionLabel>
              {transactions.length === 0 ? (
                <p className="text-ink-450 text-[13px]">No transactions yet.</p>
              ) : (
                <div className="border-border-subtle divide-border-subtle divide-y overflow-hidden rounded-xl border">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
                      <div>
                        <div className="text-foreground font-medium">{tx.plan.name}</div>
                        <div className="text-ink-450">
                          {formatDate(tx.createdAt)}
                          {" · "}
                          {tx.billingCycle === "ANNUAL" ? "Annual" : "Monthly"}
                        </div>
                      </div>
                      <div className="text-foreground font-semibold">
                        ₹{(tx.amountCents / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SectionCard>
      )}

      {activeTab === "security" && (
        <SectionCard title="Security" description="Manage the password used to sign in.">
          {passwordMessage && (
            <p
              className={cn(
                "mb-4 text-[13px]",
                passwordMessage.type === "success" ? "text-success" : "text-error-text",
              )}
            >
              {passwordMessage.text}
            </p>
          )}
          <SubsectionLabel>Password</SubsectionLabel>
          <div className="border-border-subtle divide-border-subtle divide-y rounded-xl border">
            <SettingsRow
              label="Password"
              value="••••••••"
              actionLabel="Change password"
              onAction={() => setChangingPassword(true)}
            />
          </div>
        </SectionCard>
      )}

      {activeTab === "danger" && (
        <SectionCard title="Danger zone" description="Irreversible account actions.">
          <div className="border-error-border bg-error-bg overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div className="min-w-0">
                <div className="text-error-text text-[14px] font-medium">Delete account</div>
                <div className="text-error-text/80 mt-0.5 text-[13px]">
                  Permanently deletes your account and every file and folder in your workspace.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingAccount(true)}
                className="border-error-border text-error-text hover:bg-error-border/10 shrink-0 cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-semibold"
              >
                Delete account
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      {confirmingPlan && (
        <CheckoutConfirmationModal
          plan={confirmingPlan}
          billingCycle={billingCycle}
          confirming={billingActionLoading === confirmingPlan.id}
          onClose={() => setConfirmingPlan(null)}
          onConfirm={() => handleSubscribe(confirmingPlan.id)}
        />
      )}

      {editingField === "name" && (
        <EditFieldModal
          label="Name"
          value={user.name}
          onClose={() => setEditingField(null)}
          onSave={(value) => handleSaveProfileField("name", value)}
        />
      )}

      {editingField === "email" && (
        <EditFieldModal
          label="Email"
          value={user.email}
          type="email"
          onClose={() => setEditingField(null)}
          onSave={(value) => handleSaveProfileField("email", value)}
        />
      )}

      {editingField === "orgName" && (
        <EditFieldModal
          label="Workspace name"
          value={organization.name}
          onClose={() => setEditingField(null)}
          onSave={handleSaveOrgName}
        />
      )}

      {changingPassword && (
        <ChangePasswordModal
          onClose={() => setChangingPassword(false)}
          onSave={handleChangePassword}
        />
      )}

      {deletingAccount && (
        <DeleteAccountModal onClose={() => setDeletingAccount(false)} onConfirm={handleDeleteAccount} />
      )}
    </div>
  );
}
