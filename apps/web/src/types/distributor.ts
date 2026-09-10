export interface DistributorUser {
  id: string;
  name: string;
  email: string;
}

export type WalletTransactionType = "CREDIT" | "DEBIT";

/** A partner under this distributor — shape matches the admin partner list row. */
export interface DistributorPartner {
  id: string;
  name: string;
  email: string;
  code: string;
  suspendedAt: string | null;
  createdAt: string;
  organizationCount: number;
  walletBalanceCents: number;
}

export interface DistributorWalletTransaction {
  id: string;
  type: WalletTransactionType;
  amountCents: number;
  balanceAfterCents: number;
  note: string | null;
  createdAt: string;
  createdByAdmin: { name: string } | null;
  partner: { name: string } | null;
}

export interface DistributorWallet {
  balanceCents: number;
  creditEnabled: boolean;
  transactions: DistributorWalletTransaction[];
}

/** The distributor's own admin-set per-plan rate (with the plan list price alongside for margin reference). */
export interface DistributorPlan {
  id: string;
  name: string;
  storageLimitGb: number | null;
  features: string[];
  priceMonthlyCents: number | null;
  priceYearlyCents: number | null;
  listPriceMonthlyCents: number | null;
  listPriceYearlyCents: number | null;
}

export interface DistributorPartnerOrganization {
  id: string;
  customerNumber: number;
  name: string;
  slug: string;
  subscription: {
    id: string;
    status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
    billingCycle: "MONTHLY" | "ANNUAL";
    currentPeriodEnd: string | null;
    plan: { id: string; name: string };
  } | null;
  storageUsedBytes: number;
  storageLimitBytes: number | null;
}

export interface DistributorPartnerDetail {
  id: string;
  name: string;
  email: string;
  code: string;
  suspendedAt: string | null;
  createdAt: string;
  walletBalanceCents: number;
  organizations: DistributorPartnerOrganization[];
}

/** One plan's pricing for a partner: the partner's own price, the distributor's rate it falls back to, and the plan list price. */
export interface DistributorPartnerPricingRow {
  planId: string;
  planName: string;
  listPriceMonthlyCents: number | null;
  listPriceYearlyCents: number | null;
  distributorPriceMonthlyCents: number | null;
  distributorPriceYearlyCents: number | null;
  partnerPriceMonthlyCents: number | null;
  partnerPriceYearlyCents: number | null;
}

export interface DistributorPartnerWalletTransaction {
  id: string;
  type: WalletTransactionType;
  amountCents: number;
  balanceAfterCents: number;
  note: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
  createdByDistributor: { name: string } | null;
  organization: { name: string; customerNumber: number } | null;
  plan: { name: string } | null;
}

export interface DistributorPartnerWallet {
  balanceCents: number;
  transactions: DistributorPartnerWalletTransaction[];
}

export interface DistributorPartnerUsageSummary {
  customerCount: number;
  totalQuotaBytes: number;
  totalUsedBytes: number;
  totalFreeBytes: number;
  unlimitedCount: number;
}
