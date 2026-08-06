"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { resolveNavGroup } from "@/constants/navigation";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navGroup = resolveNavGroup(pathname);

  return (
    <header className="border-border-subtle bg-background sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6">
        <Link
          href="/"
          className="text-foreground text-[19px] font-bold tracking-[-0.02em] whitespace-nowrap"
        >
          Nextlayer Cloud
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="border-input text-foreground nav:hidden cursor-pointer rounded-lg border bg-transparent px-3 py-2 text-sm font-semibold"
        >
          Menu
        </button>

        <nav className="nav:flex hidden items-center gap-6 text-[15px] font-medium">
          {navGroup.links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={link.href === pathname ? "text-primary" : "text-foreground"}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav:flex hidden items-center gap-4">
          <Link href="/login" className="text-foreground text-[15px] font-medium whitespace-nowrap">
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-primary text-primary-foreground hover:bg-brand-hover rounded-lg px-5 py-2.5 text-[15px] font-semibold whitespace-nowrap"
          >
            Start free trial
          </Link>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-border-subtle nav:hidden flex flex-col gap-4 border-t px-6 py-4 text-[15px] font-medium">
          {navGroup.links.map((link) => (
            <Link key={link.label} href={link.href} className="text-foreground">
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="text-foreground">
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-primary text-primary-foreground hover:bg-brand-hover rounded-lg px-5 py-2.5 text-center font-semibold"
          >
            Start free trial
          </Link>
        </div>
      )}
    </header>
  );
}
