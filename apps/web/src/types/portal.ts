export interface PortalUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export type MembershipRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export interface PortalOrganization {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
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
