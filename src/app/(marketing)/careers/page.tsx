import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ComingSoon } from "@/components/marketing/coming-soon";

export const metadata: Metadata = {
  title: "Careers",
};

export default function CareersPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />
      <ComingSoon
        eyebrow="Careers"
        title="Our open roles are coming soon"
        description="We're building our careers page. In the meantime, reach out through our contact page if you'd like to introduce yourself."
      />
      <Footer variant="simple" />
    </div>
  );
}
