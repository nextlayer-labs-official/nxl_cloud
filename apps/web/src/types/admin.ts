export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export interface AdminOrganization {
  id: string;
  customerNumber: number;
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
  customerNumber: number;
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
  /** Bytes by category among currently-active (non-trashed) files — "documents" is an allowlist (mimeType has no shared prefix the way image/video do); "others" is the remainder. */
  storageByCategory: { documents: number; images: number; videos: number; others: number };
  subscriptionsByStatus: Record<SubscriptionStatus, number>;
  /** Derived from currently-ACTIVE subscriptions' plan pricing — an estimate, not a guaranteed recurring charge (billing is one-time orders, not auto-renewing subscriptions). */
  estimatedMrrCents: number;
  revenue: { allTimeCents: number; last30dCents: number };
  /** Trailing 6 calendar months of REALIZED revenue (real captured Payments) + new-org counts — independent of the `period`/`deltas` date range below. */
  revenueTrend: { month: string; label: string; revenueCents: number; newOrgs: number }[];
  signups: { last7d: number; last30d: number };
  period: { from: string; to: string };
  /** % change between the value as of `period.to` and as of `period.from`. `mrr` is the least exact — see AdminService.getOverview's own comment on why it's only an approximation. */
  deltas: { organizations: number; users: number; storageBytes: number; mrr: number };
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
  /** null = a direct partner (admin-managed); set = onboarded by this distributor. */
  distributor: { id: string; name: string } | null;
}

export interface AdminPartnerDetail {
  id: string;
  name: string;
  email: string;
  code: string;
  suspendedAt: string | null;
  createdAt: string;
  walletBalanceCents: number;
  distributor: { id: string; name: string } | null;
  organizations: {
    id: string;
    customerNumber: number;
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
  organization: { name: string; slug: string; customerNumber: number } | null;
  plan: { name: string } | null;
}

export interface AdminPartnerWallet {
  balanceCents: number;
  transactions: AdminPartnerWalletTransaction[];
}

// --- Distributors ---

export interface AdminDistributor {
  id: string;
  name: string;
  email: string;
  suspendedAt: string | null;
  creditEnabled: boolean;
  createdAt: string;
  partnerCount: number;
  walletBalanceCents: number;
}

export interface AdminDistributorDetail {
  id: string;
  name: string;
  email: string;
  suspendedAt: string | null;
  creditEnabled: boolean;
  createdAt: string;
  walletBalanceCents: number;
  partners: {
    id: string;
    name: string;
    email: string;
    code: string;
    suspendedAt: string | null;
    createdAt: string;
    organizationCount: number;
    walletBalanceCents: number;
  }[];
}

export interface AdminDistributorPricingRow {
  planId: string;
  planName: string;
  listPriceMonthlyCents: number | null;
  listPriceYearlyCents: number | null;
  distributorPriceMonthlyCents: number | null;
  distributorPriceYearlyCents: number | null;
}

export interface AdminDistributorWalletTransaction {
  id: string;
  type: PartnerWalletTransactionType;
  amountCents: number;
  balanceAfterCents: number;
  note: string | null;
  createdAt: string;
  createdByAdmin: { name: string; email: string } | null;
  partner: { name: string } | null;
  organization: { name: string; customerNumber: number } | null;
  plan: { name: string } | null;
}

export interface AdminDistributorWallet {
  balanceCents: number;
  transactions: AdminDistributorWalletTransaction[];
}

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  /** Null for a platform-level action with no single associated org (e.g. a settings change). */
  organization: { name: string; slug: string } | null;
  /** Null for an admin-originated action — check `metadata.adminName`/`adminEmail` instead. */
  actor: { name: string; email: string } | null;
  metadata: Record<string, unknown> | null;
}

/** Platform-wide toggles — the Razorpay kill-switch, and which storage provider new uploads go to (see /admin/settings). */
export interface AdminPlatformSettings {
  paymentsEnabled: boolean;
  /** Which configured provider new uploads go to — see StorageService. Existing files keep resolving against whatever provider they were actually uploaded to. */
  defaultStorageProvider: string;
  /** Every provider id actually configured right now — what the picker below should offer. */
  availableStorageProviders: string[];
  updatedAt: string | null;
  updatedByName: string | null;
}

// --- Cross-org admin pages (Users / Billing & Invoices / Storage & Usage / search) ---

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  /** A user can belong to more than one org (a share-invited collaborator, for instance) — real detail/actions still live on each org's own member list. */
  organizations: { id: string; name: string; role: string }[];
}

export interface AdminUserList {
  total: number;
  page: number;
  pageSize: number;
  users: AdminUserListItem[];
}

export interface AdminPaymentListItem {
  id: string;
  organizationId: string;
  planId: string;
  amountCents: number;
  currency: string;
  billingCycle: "MONTHLY" | "ANNUAL";
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  organization: { id: string; name: string };
  plan: { name: string };
}

export interface AdminPaymentList {
  total: number;
  page: number;
  pageSize: number;
  payments: AdminPaymentListItem[];
}

export interface AdminStorageUsage {
  byCategory: { documents: number; images: number; videos: number; others: number };
  organizations: { id: string; name: string; usedBytes: number; limitBytes: number | null }[];
}

export interface AdminSearchResults {
  organizations: { id: string; name: string; slug: string }[];
  users: { id: string; name: string; email: string }[];
  payments: { id: string; amountCents: number; createdAt: string; organization: { id: string; name: string } }[];
}
