import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ComingSoon } from "@/components/marketing/coming-soon";

export const metadata: Metadata = {
  title: "Developers",
};

export default function DevelopersPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />
      <ComingSoon
        eyebrow="Developers"
        title="Developer docs are coming soon"
        description="API references, SDKs, and integration guides are on the way. Check back soon, or get in touch if you have a specific integration in mind."
      />
      <Footer variant="simple" />
    </div>
  );
}
