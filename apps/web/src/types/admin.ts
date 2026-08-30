export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  suspendedAt: string | null;
  memberCount: number;
  owner: { name: string; email: string } | null;
  plan: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  billingCycle: "MONTHLY" | "ANNUAL" | null;
  currentPeriodEnd: string | null;
  discountPercent: number | null;
  freeUntil: string | null;
  storageLimitGbOverride: number | null;
  planStorageLimitGb: number | null;
  creditBalanceCents: number;
  storageUsedBytes: number;
  /** Non-null once mapped to a reseller — self-serve billing is locked for this org; only the partner or an admin can change its plan. */
  partner: { id: string; name: string; code: string } | null;
}

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: string;
  emailVerifiedAt: string | null;
}

export interface AdminPendingAccessRequest {
  id: string;
  resourceType: "FILE" | "FOLDER";
  resourceName: string;
  message: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string; email: string };
}

export interface AdminOrganizationDetail {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  suspendedAt: string | null;
  storageUsedBytes: number;
  /** Soft-deleted files still sitting in S3 (still billed by the provider) until permanently purged from this org's trash. */
  storageTrashedBytes: number;
  fileCount: number;
  folderCount: number;
  sharedByOrgCount: number;
  sharedIntoOrgCount: number;
  /** Non-null once mapped to a reseller — self-serve billing is locked for this org; only the partner or an admin can change its plan. */
  partner: { id: string; name: string; code: string; email: string } | null;
  members: AdminMember[];
  pendingAccessRequests: AdminPendingAccessRequest[];
  subscription: {
    id: string;
    status: SubscriptionStatus;
    billingCycle: "MONTHLY" | "ANNUAL";
    currentPeriodEnd: string | null;
    discountPercent: number | null;
    freeUntil: string | null;
    storageLimitGbOverride: number | null;
    creditBalanceCents: number;
    plan: {
      id: string;
      name: string;
      priceMonthlyCents: number | null;
      priceYearlyCents: number | null;
      storageLimitGb: number | null;
    };
  } | null;
}

export interface AdminTransaction {
  id: string;
  amountCents: number;
  currency: string;
  billingCycle: "MONTHLY" | "ANNUAL";
  createdAt: string;
  plan: { name: string };
}

export interface AdminPlan {
  id: string;
  name: string;
  priceMonthlyCents: number | null;
  priceYearlyCents: number | null;
  storageLimitGb: number | null;
  features: string[];
  isDefault: boolean;
  trialEnabled: boolean;
  trialDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverview {
  organizations: { total: number; active: number; suspended: number };
  totalUsers: number;
  totalStorageUsedBytes: number;
  /** Soft-deleted files still sitting in S3 (still billed by the provider) until permanently purged from trash — not counted in totalStorageUsedBytes or any customer's active quota. */
  totalTrashedBytes: number;
  subscriptionsByStatus: Record<SubscriptionStatus, number>;
  /** Derived from currently-ACTIVE subscriptions' plan pricing — an estimate, not a guaranteed recurring charge (billing is one-time orders, not auto-renewing subscriptions). */
  estimatedMrrCents: number;
  revenue: { allTimeCents: number; last30dCents: number };
  signups: { last7d: number; last30d: number };
}

export interface AdminPartner {
  id: string;
  name: string;
  email: string;
  code: string;
  suspendedAt: string | null;
  createdAt: string;
  organizationCount: number;
  walletBalanceCents: number;
}

export interface AdminPartnerDetail {
  id: string;
  name: string;
  email: string;
  code: string;
  suspendedAt: string | null;
  createdAt: string;
  walletBalanceCents: number;
  organizations: {
    id: string;
    name: string;
    slug: string;
    subscription: {
      id: string;
      status: SubscriptionStatus;
      billingCycle: "MONTHLY" | "ANNUAL";
      plan: { name: string };
    } | null;
    storageUsedBytes: number;
    /** null = unlimited plan, no finite quota to compare usage against. */
    storageLimitBytes: number | null;
  }[];
}

/** Storage quota vs. usage rolled up across every customer mapped to this partner — see AdminService.getPartnerUsageSummary for how it's computed. */
export interface AdminPartnerUsageSummary {
  customerCount: number;
  totalQuotaBytes: number;
  totalUsedBytes: number;
  totalFreeBytes: number;
  /** Customers on a plan with no storage cap — excluded from totalQuotaBytes since they don't contribute a finite number. */
  unlimitedCount: number;
}

/** One plan's list price alongside this partner's negotiated override, if admin has set one. */
export interface AdminPartnerPricingRow {
  planId: string;
  planName: string;
  listPriceMonthlyCents: number | null;
  listPriceYearlyCents: number | null;
  partnerPriceMonthlyCents: number | null;
  partnerPriceYearlyCents: number | null;
}

export type PartnerWalletTransactionType = "CREDIT" | "DEBIT";

export interface AdminPartnerWalletTransaction {
  id: string;
  type: PartnerWalletTransactionType;
  amountCents: number;
  balanceAfterCents: number;
  note: string | null;
  createdAt: string;
  createdBy: { name: string; email: string } | null;
  organization: { name: string; slug: string } | null;
  plan: { name: string } | null;
}

export interface AdminPartnerWallet {
  balanceCents: number;
  transactions: AdminPartnerWalletTransaction[];
}

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  organization: { name: string; slug: string };
  actor: { name: string; email: string } | null;
}
