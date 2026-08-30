import type { FaqEntry } from "@/types/marketing";

export const FAQ_GROUPS: { title: string; items: FaqEntry[] }[] = [
  {
    title: "Billing",
    items: [
      {
        q: "How does billing work?",
        a: "You're billed per organization, not per seat — pick a plan based on the storage you need. Mid-cycle upgrades are prorated for the time remaining; downgrades take effect at your next renewal.",
      },
      {
        q: "Can I change my billing cycle?",
        a: "Yes, switch between monthly and annual billing anytime from account settings.",
      },
      {
        q: "What happens if I go over my storage limit?",
        a: "Uploads that would push you over your plan's limit are blocked with a clear message — you won't be charged automatically for overage. Delete some files or upgrade to continue.",
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        q: "Is my data encrypted in transit?",
        a: "Yes — all traffic to and from Nextlayer Cloud runs over HTTPS/TLS.",
      },
      {
        q: "How are passwords stored?",
        a: "We never store passwords in plain text — they're hashed with a salted, computationally expensive algorithm before they ever touch the database.",
      },
    ],
  },
  {
    title: "Account & Access",
    items: [
      {
        q: "Can I have multiple admins in my organization?",
        a: "Yes — assign the Admin role to as many members as you need from your organization settings.",
      },
      {
        q: "Can I share files with people outside my organization?",
        a: "Yes — share a file or folder directly with someone's email (as a viewer or editor) or generate a link, optionally password-protected and revocable at any time.",
      },
    ],
  },
];
