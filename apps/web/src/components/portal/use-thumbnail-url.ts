"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

// The API's presigned preview URL is valid 5 minutes (storage.service.ts) —
// treat cache entries as fresh for 4, leaving a margin.
const CACHE_TTL_MS = 4 * 60 * 1000;
const MAX_CONCURRENT = 6;

const cache = new Map<string, { url: string; fetchedAt: number }>();
let inFlight = 0;
const queue: Array<() => void> = [];

function runNext() {
  if (inFlight >= MAX_CONCURRENT) return;
  const next = queue.shift();
  if (next) next();
}

/** Caps simultaneous in-flight preview-url requests so a folder full of images doesn't fire dozens at once. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push(() => {
      inFlight += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          inFlight -= 1;
          runNext();
        });
    });
    runNext();
  });
}

function freshCacheHit(fileId: string): string | null {
  const hit = cache.get(fileId);
  return hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS ? hit.url : null;
}

/** Lazily fetches a presigned thumbnail URL once `active` (in-view + image mimeType), caching per file id. */
export function useThumbnailUrl(fileId: string, active: boolean) {
  const [url, setUrl] = useState<string | null>(() => freshCacheHit(fileId));
  const requested = useRef(false);

  useEffect(() => {
    if (!active || url || requested.current) return;
    const hit = freshCacheHit(fileId);
    if (hit) {
      setUrl(hit);
      return;
    }
    requested.current = true;
    enqueue(() => api.get<{ previewUrl: string }>(`/files/${fileId}/preview-url`))
      .then(({ previewUrl }) => {
        cache.set(fileId, { url: previewUrl, fetchedAt: Date.now() });
        setUrl(previewUrl);
      })
      .catch(() => {
        requested.current = false;
      });
  }, [fileId, active, url]);

  return url;
}
