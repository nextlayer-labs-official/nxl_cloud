import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PlaceholderVisual } from "@/components/common/placeholder-visual";
import { BlogPostGrid } from "@/components/marketing/blog-post-grid";
import { FEATURED_POST } from "@/constants/blog";

export const metadata: Metadata = {
  title: "Blog",
};

export default function BlogPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="px-10 pt-[88px] pb-12 text-center">
        <h1 className="text-[40px] font-bold tracking-[-0.02em]">Blog</h1>
      </section>

      {/* Featured post */}
      <section className="px-10 pb-12">
        <a
          href="#"
          className="border-border mx-auto grid max-w-[1080px] grid-cols-[1.1fr_0.9fr] items-center gap-8 rounded-2xl border p-8"
        >
          <PlaceholderVisual label="featured image placeholder" className="h-[240px] rounded-xl" />
          <div>
            <div className="text-accent-foreground mb-2.5 text-xs font-semibold">
              {FEATURED_POST.category}
            </div>
            <h2 className="mb-3 text-2xl font-bold">{FEATURED_POST.title}</h2>
            <p className="text-muted-foreground mb-4 text-sm">{FEATURED_POST.excerpt}</p>
            <div className="text-ink-550 flex items-center gap-2.5 text-[13px]">
              <div className="bg-accent h-7 w-7 rounded-full" />
              <span>
                {FEATURED_POST.author} · {FEATURED_POST.date} · {FEATURED_POST.readTime}
              </span>
            </div>
          </div>
        </a>
      </section>

      <BlogPostGrid />

      <Footer variant="simple" />
    </div>
  );
}
