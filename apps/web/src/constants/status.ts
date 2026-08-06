export const STATUS_COMPONENTS = [
  { name: "Storage API", status: "Operational" },
  { name: "Web App", status: "Operational" },
  { name: "Sync Service", status: "Operational" },
  { name: "Authentication", status: "Operational" },
  { name: "Webhooks", status: "Operational" },
];

export const INCIDENTS = [
  {
    date: "Jul 22, 2026",
    title: "Elevated sync latency in EU region",
    resolution:
      "Resolved — root cause was a regional load balancer misconfiguration, fixed within 40 minutes.",
  },
  {
    date: "Jun 14, 2026",
    title: "Brief API rate-limit errors",
    resolution: "Resolved — a deployment rollback restored normal rate limits within 15 minutes.",
  },
  {
    date: "May 3, 2026",
    title: "Scheduled maintenance window",
    resolution: "Completed — no customer impact reported.",
  },
];

export const LAST_UPDATED = "Aug 5, 2026, 9:41 AM UTC";
