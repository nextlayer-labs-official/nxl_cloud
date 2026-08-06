export interface PartnerPanel {
  title: string;
  items: string[];
  cta: string;
}

export const PARTNER_PANELS: PartnerPanel[] = [
  {
    title: "Technology Partners",
    items: [
      "Build deep integrations with our API",
      "Get listed in our integrations directory",
      "Co-marketing opportunities",
    ],
    cta: "Apply as technology partner",
  },
  {
    title: "Reseller Partners",
    items: [
      "Resell Nextlayer Cloud to your customers",
      "Volume discount pricing",
      "Dedicated partner support",
    ],
    cta: "Apply as reseller",
  },
];

export const PARTNER_LOGOS = ["Okta", "Slack", "Zapier", "DocuSign", "HubSpot"];
