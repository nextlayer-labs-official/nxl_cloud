"use client";

import { useState } from "react";
import Link from "next/link";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="bg-foreground relative flex items-center justify-center gap-4 px-6 py-2.5 text-sm text-[oklch(0.97_0.005_260)]">
      <span>
        SOC 2 Type II certified —{" "}
        <Link href="#" className="text-[oklch(0.75_0.1_255)]">
          read the report →
        </Link>
      </span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss announcement"
        className="absolute right-6 cursor-pointer border-none bg-transparent text-base leading-none text-[oklch(0.7_0.01_260)]"
      >
        ✕
      </button>
    </div>
  );
}
