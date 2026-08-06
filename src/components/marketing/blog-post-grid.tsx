"use client";

import { useState } from "react";
import { FilterPill } from "@/components/common/filter-pill";
import { PlaceholderVisual } from "@/components/common/placeholder-visual";
import { BLOG_CATEGORIES, BLOG_POSTS } from "@/constants/blog";

export function BlogPostGrid() {
  const [activeCat, setActiveCat] = useState("all");
  const posts = BLOG_POSTS.filter((p) => activeCat === "all" || p.catId === activeCat);

  return (
    <>
      <section className="px-10 pb-8">
        <div className="mx-auto flex max-w-[1080px] flex-wrap gap-2">
          {BLOG_CATEGORIES.map((cat) => (
            <FilterPill
              key={cat.id}
              active={activeCat === cat.id}
              onClick={() => setActiveCat(cat.id)}
              className="px-[18px] py-2"
            >
              {cat.label}
            </FilterPill>
          ))}
        </div>
      </section>

      <section className="px-10 pb-[120px]">
        <div className="mx-auto grid max-w-[1080px] grid-cols-2 gap-6">
          {posts.map((post) => (
            <a
              key={post.title}
              href="#"
              className="border-border flex flex-col overflow-hidden rounded-xl border"
            >
              <PlaceholderVisual label="post image placeholder" className="h-[160px]" />
              <div className="p-5">
                <div className="text-accent-foreground mb-2 text-xs font-semibold">
                  {post.category}
                </div>
                <div className="mb-2 text-base font-semibold">{post.title}</div>
                <div className="text-ink-550 text-[13px]">
                  {post.author} · {post.date} · {post.readTime}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
