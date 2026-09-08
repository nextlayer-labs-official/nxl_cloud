import type { LegalSection } from "@/types/legal";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "collection",
    title: "1. Information We Collect",
    body: "This policy explains how Nextlayer Labs (\"we\") handles your data on Skylyer. We collect account information (name, email address), your organization/workspace data, the files and folders you upload (both their content and metadata like name and size), and usage data such as an internal activity log of actions taken on your account (sharing, renaming, uploading, and similar). If your organization is on a paid plan while payments are enabled, we also process payment/transaction records for that purchase — see \"Data Sharing\" below for how that's handled.",
  },
  {
    id: "use",
    title: "2. How We Use Information",
    body: "We use collected information to operate the service, provide support, secure your account, send you transactional email (verification, password reset, sharing notifications, billing receipts), and enforce the limits of your plan.",
  },
  {
    id: "cookies",
    title: "3. Cookies We Use",
    body: "Skylyer sets three strictly-necessary, first-party session cookies — one each for a customer account, an admin account, and a partner account — used only to keep you signed in. They're httpOnly (not readable by page scripts) and cleared when you log out.",
    items: [
      "session_token — customer account sign-in",
      "admin_session_token — admin panel sign-in",
      "partner_session_token — partner portal sign-in",
    ],
  },
  {
    id: "sharing",
    title: "4. Data Sharing",
    body: "We do not sell your data. We share it only with the service providers necessary to run Skylyer: our cloud storage provider (stores the actual bytes of files you upload), our email delivery provider (sends transactional email on our behalf), and — only for organizations on a paid plan while payments are enabled — Razorpay, our payment gateway, to process that transaction. We do not store your card or UPI details ourselves. If your workspace is mapped to a reseller partner, that partner can see your plan and usage in order to manage your subscription on your behalf.",
  },
  {
    id: "security",
    title: "5. Security",
    body: "All traffic to and from Skylyer runs over HTTPS/TLS. Sessions use httpOnly cookies, access to your workspace's files is controlled by role- and permission-based access rules, and account/file actions are recorded in an internal audit log.",
  },
  {
    id: "retention",
    title: "6. Data Retention",
    body: "Deleting a file or folder moves it to Trash, where it stays until you either restore it or empty Trash yourself — deletion isn't automatic on any schedule. Your account and workspace data is retained for as long as your account is active. To close your account and request deletion of your data, contact support — this is currently handled directly by our team rather than through a self-serve \"delete my account\" option.",
  },
  {
    id: "rights",
    title: "7. Your Rights",
    body: "You may request access to, correction of, or deletion of your personal data at any time by contacting our support team.",
  },
  {
    id: "changes",
    title: "8. Changes to This Policy",
    body: "We'll update the \"last updated\" date above whenever this policy changes in a way that affects how your data is handled.",
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: "By accessing or using Skylyer, you agree to be bound by these Terms of Service and our Privacy Policy.",
  },
  {
    id: "accounts",
    title: "2. Accounts",
    body: "You are responsible for maintaining the security of your account credentials and for all activity under your account.",
  },
  {
    id: "acceptable-use",
    title: "3. Acceptable Use",
    body: "You agree to use Skylyer within the bounds of our Acceptable Use Policy, which covers prohibited content and conduct in more detail.",
  },
  {
    id: "billing",
    title: "4. Plans & Billing",
    body: "Skylyer is billed per organization/workspace, not per user seat. Paid plans and card payments are only available for self-serve checkout when enabled by Skylyer; when unavailable, checkout says so plainly rather than charging you. Upgrading a paid plan mid-cycle is prorated and charged immediately; downgrading takes effect at your next renewal, not mid-cycle. See our Refund & Cancellation Policy for details on charges, refunds, and cancellation.",
  },
  {
    id: "termination",
    title: "5. Termination",
    body: "Either party may terminate this agreement at any time. Upon termination, access to the service will be revoked and data handled per our Privacy Policy.",
  },
  {
    id: "liability",
    title: "6. Limitation of Liability",
    body: "Nextlayer Labs is not liable for indirect, incidental, or consequential damages arising from use of the service, to the maximum extent permitted by law.",
  },
  {
    id: "changes",
    title: "7. Changes to These Terms",
    body: "We'll update the \"last updated\" date above whenever these terms change materially.",
  },
];

export const ACCEPTABLE_USE_SECTIONS: LegalSection[] = [
  {
    id: "purpose",
    title: "1. Purpose",
    body: "This policy describes what you may not do with Skylyer, alongside the Terms of Service. Violating it can result in content removal, account suspension, or termination.",
  },
  {
    id: "prohibited-content",
    title: "2. Prohibited Content",
    body: "You may not store or distribute using Skylyer:",
    items: [
      "Content that's unlawful where you or your recipients are located",
      "Content that infringes someone else's copyright, trademark, or other intellectual property rights",
      "Malware, viruses, or other code intended to damage or gain unauthorized access to a system",
    ],
  },
  {
    id: "prohibited-conduct",
    title: "3. Prohibited Conduct",
    body: "You may not:",
    items: [
      "Attempt to gain unauthorized access to another account, organization, or any part of the service you weren't granted access to",
      "Probe, scan, or attempt to circumvent any security or rate-limiting measure",
      "Attempt to circumvent your plan's storage limit, e.g. by creating multiple accounts to work around it",
      "Resell or provide access to Skylyer to your own customers without being an approved reseller partner",
    ],
  },
  {
    id: "enforcement",
    title: "4. Enforcement",
    body: "We may suspend or terminate access for violating this policy, consistent with the Terms of Service.",
  },
];

export const REFUND_CANCELLATION_SECTIONS: LegalSection[] = [
  {
    id: "no-automatic-charges",
    title: "1. No Automatic Charges",
    body: "Nothing is charged to you without actively completing checkout yourself. Plans don't auto-renew off a stored card — you won't be charged again for a new period without confirming that payment.",
  },
  {
    id: "upgrades",
    title: "2. Upgrades",
    body: "Upgrading to a higher plan mid-cycle applies immediately. You're charged only the prorated difference: the unused value of your current plan's remaining days is credited against the new plan's prorated cost for those same remaining days.",
  },
  {
    id: "downgrades",
    title: "3. Downgrades",
    body: "Downgrading to a lower plan takes effect at your next renewal, not immediately — you keep your current plan's features for the rest of the period you already paid for, and there's no partial refund for that remaining time.",
  },
  {
    id: "refunds",
    title: "4. Refunds",
    body: "Fees already paid are non-refundable, except where required by applicable law.",
  },
  {
    id: "cancellation",
    title: "5. Cancellation",
    body: "To cancel a subscription, contact support — there's currently no self-serve \"cancel\" button in the product. Since plans don't auto-renew off a stored card in the first place, simply not confirming a renewal payment also means you won't be charged again.",
  },
  {
    id: "partner-managed",
    title: "6. Partner-Managed Plans",
    body: "If your workspace is mapped to a reseller partner, billing, plan changes, and cancellation for your workspace are handled through that partner, not directly with us.",
  },
];

export const LEGAL_LAST_UPDATED = "September 8, 2026";
