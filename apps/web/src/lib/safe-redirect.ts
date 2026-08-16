/** Only ever follow an internal path (never a bare "//host" or absolute URL) — a `redirect` query param is attacker-controllable. */
export function safeRedirect(target: string | null, fallback = "/portal"): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) return target;
  return fallback;
}
