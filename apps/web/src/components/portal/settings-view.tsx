"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Plan, SubscriptionInfo, SubscriptionStatus, Transaction } from "@/types/portal";
import { usePortal } from "./portal-context";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIALING: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELED: "Canceled",
};

type BillingCycle = "MONTHLY" | "ANNUAL";

function priceForCycle(plan: Plan, cycle: BillingCycle): number | null {
  return cycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
}

function formatPrice(cents: number | null, cycle: BillingCycle): string {
  if (cents === null) return "Custom";
  return `₹${(cents / 100).toFixed(2)}/${cycle === "ANNUAL" ? "yr" : "mo"}`;
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
    <div className="border-border-subtle bg-background rounded-2xl border p-6">
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
  const searchParams = useSearchParams();

  const requestedTab = searchParams.get("tab");
  const initialTab: SettingsTab =
    requestedTab && TABS.some((t) => t.key === requestedTab) ? (requestedTab as SettingsTab) : "profile";
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

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

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingActionError, setBillingActionError] = useState<string | null>(null);
  const [billingActionLoading, setBillingActionLoading] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("MONTHLY");

  useEffect(() => {
    Promise.all([
      api.get<Plan[]>("/billing/plans"),
      api.get<SubscriptionInfo | null>("/billing/subscription"),
      api.get<Transaction[]>("/billing/transactions"),
    ])
      .then(([plansData, subscriptionData, transactionsData]) => {
        setPlans(plansData);
        setSubscription(subscriptionData);
        setTransactions(transactionsData);
      })
      .finally(() => setBillingLoading(false));
  }, []);

  async function handleSubscribe(planId: string) {
    setBillingActionError(null);
    setCheckoutStatus(null);
    setBillingActionLoading(planId);
    try {
      const order = await api.post<
        | { scheduled: true; effectiveDate: string; planName: string }
        | { scheduled: false; orderId: string; amount: number; currency: string; keyId: string }
      >("/billing/order", { planId, billingCycle });

      // Downgrades are never charged or switched immediately — they're scheduled for
      // the current period's renewal date instead, so there's no Razorpay checkout to open.
      if (order.scheduled) {
        const [updatedSubscription, updatedTransactions] = await Promise.all([
          api.get<SubscriptionInfo | null>("/billing/subscription"),
          api.get<Transaction[]>("/billing/transactions"),
        ]);
        setSubscription(updatedSubscription);
        setTransactions(updatedTransactions);
        setCheckoutStatus("scheduled");
        setBillingActionLoading(null);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Couldn't load the payment form. Check your connection and try again.");
      }

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
            const [updatedSubscription, updatedTransactions] = await Promise.all([
              api.get<SubscriptionInfo | null>("/billing/subscription"),
              api.get<Transaction[]>("/billing/transactions"),
            ]);
            setSubscription(updatedSubscription);
            setTransactions(updatedTransactions);
            setCheckoutStatus("success");
          } catch {
            setBillingActionError("Payment succeeded but we couldn't confirm it — contact support.");
          } finally {
            setBillingActionLoading(null);
          }
        },
        modal: {
          ondismiss: () => {
            if (!completed) {
              setCheckoutStatus("canceled");
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
    }
  }

  async function handleCancelPendingChange() {
    setBillingActionError(null);
    setBillingActionLoading("cancel-pending");
    try {
      await api.post("/billing/cancel-pending-change");
      const updated = await api.get<SubscriptionInfo | null>("/billing/subscription");
      setSubscription(updated);
    } catch (err) {
      setBillingActionError(
        err instanceof ApiError ? err.message : "Couldn't cancel the scheduled change.",
      );
    } finally {
      setBillingActionLoading(null);
    }
  }

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
      <h1 className="text-foreground mb-6 text-[26px] font-bold tracking-[-0.01em]">Settings</h1>

      <div className="border-border-subtle mb-8 flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "cursor-pointer border-b-2 px-3 py-2.5 text-sm font-semibold",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "text-ink-450 hover:text-foreground border-transparent",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
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
      )}

      {activeTab === "billing" && (
      <SectionCard title="Plan & billing" description="Manage your subscription.">
        {checkoutStatus === "success" && (
          <p className="text-success mb-4 text-[13px]">Subscription updated — thanks!</p>
        )}
        {checkoutStatus === "canceled" && (
          <p className="text-ink-450 mb-4 text-[13px]">Checkout canceled — no changes were made.</p>
        )}
        {checkoutStatus === "scheduled" && (
          <p className="text-success mb-4 text-[13px]">
            Downgrade scheduled — you&apos;ll switch plans at your next renewal.
          </p>
        )}
        {billingLoading ? (
          <div className="bg-surface-muted h-24 animate-pulse rounded-xl" />
        ) : (
          <>
            <div className="border-border-subtle bg-surface-muted-2 mb-5 flex items-center justify-between rounded-xl border p-4">
              <div>
                <div className="text-foreground text-[14px] font-semibold">
                  {subscription?.plan.name ?? "No plan"}
                </div>
                <div className="text-ink-450 text-[13px]">
                  {subscription ? STATUS_LABEL[subscription.status] : "—"}
                  {subscription?.currentPeriodEnd &&
                    ` · ${subscription.status === "TRIALING" ? "trial ends" : "renews"} ${new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
                </div>
                {subscription?.freeUntil && new Date(subscription.freeUntil) > new Date() && (
                  <div className="text-success mt-1 text-[13px] font-medium">
                    Comped until{" "}
                    {new Date(subscription.freeUntil).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                )}
                {!!subscription?.discountPercent && (
                  <div className="text-success mt-1 text-[13px] font-medium">
                    {subscription.discountPercent}% off will apply at your next renewal
                  </div>
                )}
                {subscription?.pendingPlan && (
                  <div className="text-ink-600 mt-1 flex items-center gap-2 text-[13px]">
                    <span>
                      Switching to <span className="font-medium">{subscription.pendingPlan.name}</span> on{" "}
                      {subscription.currentPeriodEnd &&
                        new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelPendingChange}
                      disabled={billingActionLoading === "cancel-pending"}
                      className="text-primary cursor-pointer font-semibold hover:underline disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {billingActionError && (
              <p className="text-error-text mb-4 text-[13px]">{billingActionError}</p>
            )}

            <div className="bg-surface-muted mb-4 inline-flex items-center gap-1 rounded-full p-1">
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

            <div className="flex flex-col gap-3">
              {plans.map((plan) => {
                const isCurrent =
                  subscription?.plan.id === plan.id && subscription.status === "ACTIVE";
                const isPending = subscription?.pendingPlan?.id === plan.id;
                // The discount is org-level, not tied to the current plan specifically — it's
                // honored at checkout regardless of which plan is purchased (see billing.service.ts
                // createOrder), so show the real price on every purchasable row, not just the
                // (non-actionable, already-paid-for) current one.
                const discount = subscription?.discountPercent ?? null;
                const price = priceForCycle(plan, billingCycle);
                return (
                  <div
                    key={plan.id}
                    className="border-border-subtle flex items-center justify-between rounded-xl border p-4"
                  >
                    <div>
                      <div className="text-foreground text-[14px] font-semibold">{plan.name}</div>
                      <div className="text-ink-450 text-[13px]">
                        {discount && price !== null ? (
                          <>
                            <span className="line-through">{formatPrice(price, billingCycle)}</span>{" "}
                            <span className="text-success font-medium">
                              {formatPrice(Math.round((price * (100 - discount)) / 100), billingCycle)}
                            </span>
                          </>
                        ) : (
                          formatPrice(price, billingCycle)
                        )}
                      </div>
                    </div>
                    {price === null ? (
                      <Link
                        href="/contact"
                        className="border-input text-foreground hover:bg-surface-muted rounded-lg border px-3.5 py-2 text-sm font-semibold"
                      >
                        Contact us
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={isPending || billingActionLoading === plan.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold disabled:opacity-60",
                          isCurrent
                            ? "border-input text-foreground hover:bg-surface-muted border"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                        )}
                      >
                        {billingActionLoading === plan.id && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {isPending ? "Scheduled" : isCurrent ? "Renew" : "Subscribe"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <h3 className="text-foreground mb-3 text-[14px] font-semibold">Transaction history</h3>
              {transactions.length === 0 ? (
                <p className="text-ink-450 text-[13px]">No transactions yet.</p>
              ) : (
                <div className="border-border-subtle divide-border-subtle divide-y overflow-hidden rounded-xl border">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
                      <div>
                        <div className="text-foreground font-medium">{tx.plan.name}</div>
                        <div className="text-ink-450">
                          {new Date(tx.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
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
      )}

      {activeTab === "danger" && (
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
      )}
    </div>
  );
}
