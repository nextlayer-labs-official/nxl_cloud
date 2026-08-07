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
