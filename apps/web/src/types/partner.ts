export interface PartnerUser {
  id: string;
  name: string;
  email: string;
  code: string;
}

export type PartnerSubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export interface PartnerOrganization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  subscription: {
    id: string;
    status: PartnerSubscriptionStatus;
    billingCycle: "MONTHLY" | "ANNUAL";
    currentPeriodEnd: string | null;
    plan: {
      id: string;
      name: string;
      priceMonthlyCents: number | null;
      priceYearlyCents: number | null;
      storageLimitGb: number | null;
    };
  } | null;
  storageUsedBytes: number;
  /** null = unlimited plan, no finite quota to compare usage against. */
  storageLimitBytes: number | null;
}

export interface PartnerPlan {
  id: string;
  name: string;
  /** What this partner is actually charged — falls back to the plan's own list price when admin hasn't set a negotiated one. */
  priceMonthlyCents: number | null;
  priceYearlyCents: number | null;
  /** The plan's normal customer-facing price, for comparison against the partner's own rate above. */
  listPriceMonthlyCents: number | null;
  listPriceYearlyCents: number | null;
  storageLimitGb: number | null;
  features: string[];
}

/** A customer's request to leave this partner (newPartner: null) or switch straight to a different one — needs this partner's approve/reject. */
export interface PartnerChangeRequestSummary {
  id: string;
  createdAt: string;
  organization: { id: string; name: string; slug: string };
  newPartner: { id: string; name: string; code: string } | null;
}

export type PartnerWalletTransactionType = "CREDIT" | "DEBIT";

export interface PartnerWalletTransaction {
  id: string;
  type: PartnerWalletTransactionType;
  amountCents: number;
  balanceAfterCents: number;
  note: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
  organization: { name: string } | null;
  plan: { name: string } | null;
}

export interface PartnerWallet {
  balanceCents: number;
  transactions: PartnerWalletTransaction[];
}

/** Storage quota vs. usage rolled up across every customer mapped to this partner — see PartnerService.getUsageSummary for how it's computed. */
export interface PartnerUsageSummary {
  customerCount: number;
  totalQuotaBytes: number;
  totalUsedBytes: number;
  totalFreeBytes: number;
  /** Customers on a plan with no storage cap — excluded from totalQuotaBytes since they don't contribute a finite number. */
  unlimitedCount: number;
}
