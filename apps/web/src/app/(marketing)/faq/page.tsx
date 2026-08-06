import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FaqSearch } from "@/components/marketing/faq-search";

export const metadata: Metadata = {
  title: "FAQ",
};

export default function FaqPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />
      <FaqSearch />
      <Footer variant="simple" />
    </div>
  );
}
