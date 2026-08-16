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
  "file.shared": "shared a file",
  "file.unshared": "stopped sharing a file",
  "folder.created": "created a folder",
  "folder.renamed": "renamed a folder",
  "folder.moved": "moved a folder",
  "folder.trashed": "deleted a folder",
  "folder.restored": "restored a folder",
  "folder.deleted": "permanently deleted a folder",
  "folder.shared": "shared a folder",
  "folder.unshared": "stopped sharing a folder",
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
