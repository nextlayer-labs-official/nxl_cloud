// Generic (not "this file"-scoped, unlike the portal's per-item info-panel.tsx
// Activity tab) since an org's/the platform's log spans many different
// files/folders at once. Shared between organization-detail-view.tsx and
// audit-log-view.tsx so the two admin activity views can't drift apart.
const ACTION_LABELS: Record<string, string> = {
  "file.uploaded": "uploaded a file",
  "file.renamed": "renamed a file",
  "file.moved": "moved a file",
  "file.trashed": "deleted a file",
  "file.restored": "restored a file",
  "file.deleted": "permanently deleted a file",
  "file.shared": "created a share link for a file",
  "file.unshared": "revoked a file's share link",
  "file.shared_with_user": "shared a file with someone",
  "file.unshared_from_user": "removed someone's access to a file",
  "file.access_requested": "requested access to a file",
  "file.access_request_denied": "declined a file access request",
  "file.invited": "invited someone by email to a file",
  "folder.created": "created a folder",
  "folder.renamed": "renamed a folder",
  "folder.moved": "moved a folder",
  "folder.trashed": "deleted a folder",
  "folder.restored": "restored a folder",
  "folder.deleted": "permanently deleted a folder",
  "folder.shared": "created a share link for a folder",
  "folder.unshared": "revoked a folder's share link",
  "folder.shared_with_user": "shared a folder with someone",
  "folder.unshared_from_user": "removed someone's access to a folder",
  "folder.access_requested": "requested access to a folder",
  "folder.access_request_denied": "declined a folder access request",
  "folder.invited": "invited someone by email to a folder",
  "organization.created": "created the organization",
};

export function humanizeAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function auditActionCategory(action: string): "file" | "folder" | "other" {
  if (action.startsWith("file.")) return "file";
  if (action.startsWith("folder.")) return "folder";
  return "other";
}
