import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      <section className="px-10 pt-24 pb-[120px]">
        <div className="mx-auto max-w-[640px]">
          <h1 className="mb-10 text-center text-[36px] font-bold tracking-[-0.02em]">Contact us</h1>
          <ContactForm />
        </div>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
