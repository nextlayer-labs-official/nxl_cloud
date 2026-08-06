import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ComingSoon } from "@/components/marketing/coming-soon";

export const metadata: Metadata = {
  title: "Documentation",
};

export default function DocumentationPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />
      <ComingSoon
        eyebrow="Documentation"
        title="Documentation is coming soon"
        description="Setup guides and platform documentation are on the way. For urgent questions, our support team is ready to help."
      />
      <Footer variant="simple" />
    </div>
  );
}
