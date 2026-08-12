"use client";

import { useEffect, useRef, useState } from "react";
import { getFileIcon, getPreviewKind } from "@/lib/file-icons";
import { cn } from "@/lib/utils";
import { useThumbnailUrl } from "./use-thumbnail-url";

function useInView<T extends Element>(rootMargin = "200px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

interface FileThumbnailProps {
  fileId: string;
  mimeType: string;
  className?: string;
}

/** Grid-mode thumbnail: real inline image for image files (lazy, viewport-gated), mime-type icon otherwise. */
export function FileThumbnail({ fileId, mimeType, className }: FileThumbnailProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const isImage = getPreviewKind(mimeType) === "image";
  const url = useThumbnailUrl(fileId, inView && isImage);
  const [errored, setErrored] = useState(false);
  const Icon = getFileIcon(mimeType);
  const showImage = isImage && url && !errored;

  return (
    <div
      ref={ref}
      className={cn(
        "bg-surface-muted flex items-center justify-center overflow-hidden rounded-lg",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned URL, not a static asset Next's Image optimizer can handle
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Icon className="text-ink-400 h-8 w-8" />
      )}
    </div>
  );
}
