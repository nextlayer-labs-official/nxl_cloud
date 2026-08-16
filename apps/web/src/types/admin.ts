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
  fileCount: number;
  folderCount: number;
  sharedByOrgCount: number;
  sharedIntoOrgCount: number;
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
  subscriptionsByStatus: Record<SubscriptionStatus, number>;
  /** Derived from currently-ACTIVE subscriptions' plan pricing — an estimate, not a guaranteed recurring charge (billing is one-time orders, not auto-renewing subscriptions). */
  estimatedMrrCents: number;
  revenue: { allTimeCents: number; last30dCents: number };
  signups: { last7d: number; last30d: number };
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
