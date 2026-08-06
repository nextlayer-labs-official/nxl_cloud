import type { ContactIntent } from "@/types/marketing";

export const CONTACT_INTENTS: ContactIntent[] = [
  {
    id: "sales",
    label: "Sales",
    emailLabel: "Work email",
    messageLabel: "Tell us about your team",
    altContact: "Or call us at +1 (415) 555-0182",
    showCompany: true,
  },
  {
    id: "support",
    label: "Support",
    emailLabel: "Account email",
    messageLabel: "Describe your issue",
    altContact: "Or visit our Help Center",
    showCompany: false,
  },
  {
    id: "general",
    label: "General",
    emailLabel: "Email",
    messageLabel: "Message",
    altContact: "",
    showCompany: false,
  },
];

export const DEFAULT_CONTACT_INTENT_ID = "general";
