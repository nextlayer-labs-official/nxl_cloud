import type { FaqEntry } from "@/types/marketing";

export const FAQ_GROUPS: { title: string; items: FaqEntry[] }[] = [
  {
    title: "Billing",
    items: [
      {
        q: "How does billing work?",
        a: "You're billed monthly or annually per active user seat, prorated for mid-cycle changes.",
      },
      {
        q: "Can I change my billing cycle?",
        a: "Yes, switch between monthly and annual billing anytime from account settings.",
      },
      {
        q: "What happens on overage?",
        a: "We notify your admin before limits are reached; no surprise charges occur automatically.",
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        q: "Is my data encrypted?",
        a: "Yes, AES-256 at rest and TLS 1.3 in transit, always.",
      },
      {
        q: "Are you SOC 2 compliant?",
        a: "Yes, we are SOC 2 Type II audited annually. Request our whitepaper on the Security page.",
      },
    ],
  },
  {
    title: "Account & Access",
    items: [
      {
        q: "Do you support SSO?",
        a: "Yes, on Business and Enterprise plans, via SAML 2.0 and SCIM provisioning.",
      },
      {
        q: "Can I have multiple admins?",
        a: "Yes, you can assign multiple admin roles with delegated permissions.",
      },
    ],
  },
  {
    title: "Enterprise",
    items: [
      {
        q: "Do you offer custom contracts?",
        a: "Yes, our enterprise team can negotiate custom terms, SLAs, and data residency options.",
      },
    ],
  },
];
