import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ComingSoon } from "@/components/marketing/coming-soon";

export const metadata: Metadata = {
  title: "Resources",
};

export default function ResourcesPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />
      <ComingSoon
        eyebrow="Resources"
        title="Our resource library is coming soon"
        description="Guides, whitepapers, and customer stories are on the way. In the meantime, check out our blog or FAQ for answers to common questions."
      />
      <Footer variant="simple" />
    </div>
  );
}
