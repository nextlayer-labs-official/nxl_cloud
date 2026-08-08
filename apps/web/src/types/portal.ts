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
}

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  folderId: string | null;
  createdAt: string;
}

export interface BreadcrumbEntry {
  id: string;
  name: string;
}

export interface TrashedFile extends FileItem {
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
  seatLimit: number | null;
  features: string[];
}

export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export interface SubscriptionInfo {
  id: string;
  status: SubscriptionStatus;
  billingCycle: "MONTHLY" | "ANNUAL";
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  plan: Plan;
}
