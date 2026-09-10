import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Distributor",
  robots: { index: false, follow: false },
};

export default function DistributorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
