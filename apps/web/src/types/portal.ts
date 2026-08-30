export interface PortalUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;
}

export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface PartnerInfo {
  id: string;
  name: string;
  code: string;
  email: string;
}

export interface PortalOrganization {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
  /** Non-null once mapped to a reseller — while set, self-serve checkout (billing.service.ts createOrder) is locked and only this partner or a platform admin can change the plan. */
  partner: PartnerInfo | null;
}

export type PartnerChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** A filed request to leave (newPartner: null) or switch away from the org's current partner — needs that partner's approval, doesn't apply on its own. */
export interface PartnerChangeRequest {
  id: string;
  status: PartnerChangeRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  newPartner: PartnerInfo | null;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  isShared: boolean;
  isStarred: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  isStarred: boolean;
}

export interface BreadcrumbEntry {
  id: string;
  name: string;
}

export interface TrashedFile extends FileItem {
  deletedAt: string;
}

export interface TrashedFolder extends FolderItem {
  deletedAt: string;
}

/** "OWNER" means it's genuinely yours; "VIEWER"/"EDITOR" means you're browsing a folder someone else shared with you. */
export type AccessLevel = "OWNER" | "VIEWER" | "EDITOR";

export interface FolderContents {
  accessLevel: AccessLevel;
  folders: FolderItem[];
  files: FileItem[];
}

/** A grantee who already has an account (ACTIVE, real access) or was invited by email and hasn't signed up yet (PENDING, no access until they register — see claimPendingGrants). */
export interface ResourcePermission {
  id: string;
  accessLevel: "VIEWER" | "EDITOR";
  status: "ACTIVE" | "PENDING";
  user: { id: string; name: string; email: string } | null;
  pendingEmail: string | null;
}

export type AccessRequestStatus = "PENDING" | "GRANTED" | "DENIED";

/** GET :id/access-status — whether the current user can open a resource, and (if not) whether they've already asked. */
export interface AccessStatus {
  hasAccess: boolean;
  accessLevel?: AccessLevel;
  name: string;
  requestStatus?: AccessRequestStatus | null;
}

export interface AccessRequest {
  id: string;
  message: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string; email: string };
}

export interface SharedWithMeResults {
  folders: (FolderItem & { sharedByOrgName: string })[];
  files: (FileItem & { sharedByOrgName: string })[];
}

export interface SearchResults {
  folders: (FolderItem & { parentName: string })[];
  files: (FileItem & { parentName: string })[];
}

export interface Plan {
  id: string;
  name: string;
  priceMonthlyCents: number | null;
  priceYearlyCents: number | null;
  storageLimitGb: number | null;
  features: string[];
}

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export interface SubscriptionInfo {
  id: string;
  status: SubscriptionStatus;
  billingCycle: "MONTHLY" | "ANNUAL";
  currentPeriodEnd: string | null;
  discountPercent: number | null;
  freeUntil: string | null;
  creditBalanceCents: number;
  plan: Plan;
}

export interface Transaction {
  id: string;
  amountCents: number;
  currency: string;
  billingCycle: "MONTHLY" | "ANNUAL";
  createdAt: string;
  plan: { name: string };
}
