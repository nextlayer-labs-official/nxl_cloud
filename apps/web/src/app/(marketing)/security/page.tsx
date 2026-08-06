import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ComingSoon } from "@/components/marketing/coming-soon";

export const metadata: Metadata = {
  title: "Security",
};

export default function SecurityPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />
      <ComingSoon
        eyebrow="Security"
        title="Our security page is on its way"
        description="Detailed information on encryption, compliance certifications, and access controls is coming soon. In the meantime, our team is happy to answer any security questions directly."
      />
      <Footer variant="simple" />
    </div>
  );
}
