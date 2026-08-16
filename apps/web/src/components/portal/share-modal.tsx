"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link as LinkIcon, Loader2, UserCheck, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api-client";
import type { AccessRequest, ResourcePermission } from "@/types/portal";

interface ShareModalProps {
  resourceName: string;
  resourceType: "file" | "folder";
  resourceId: string;
  onClose: () => void;
}

/** Only ever opened by the resource's owner (Share is an owner-only action everywhere it's triggered from), so no extra access check is needed here. */
export function ShareModal({ resourceName, resourceType, resourceId, onClose }: ShareModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const permissionsEndpoint =
    resourceType === "file" ? `/files/${resourceId}/permissions` : `/folders/${resourceId}/permissions`;
  const accessRequestsEndpoint =
    resourceType === "file" ? `/files/${resourceId}/access-requests` : `/folders/${resourceId}/access-requests`;

  const [people, setPeople] = useState<ResourcePermission[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [sharing, setSharing] = useState(false);
  const [busyPermissionId, setBusyPermissionId] = useState<string | null>(null);

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [grantLevel, setGrantLevel] = useState<Record<string, "VIEWER" | "EDITOR">>({});

  const loadPeople = useCallback(() => {
    setPeopleLoading(true);
    setPeopleError(null);
    return api
      .get<ResourcePermission[]>(permissionsEndpoint)
      .then(setPeople)
      .catch((err) => {
        setPeopleError(err instanceof ApiError ? err.message : "Couldn't load people with access.");
      })
      .finally(() => setPeopleLoading(false));
  }, [permissionsEndpoint]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const shareLinkEndpoint =
    resourceType === "file" ? `/files/${resourceId}/share` : `/folders/${resourceId}/share`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<{ url: string | null }>(shareLinkEndpoint)
      .then(({ url }) => {
        if (!cancelled) setUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Couldn't check link sharing status.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareLinkEndpoint]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  useEffect(() => {
    let cancelled = false;
    setRequestsLoading(true);
    setRequestsError(null);
    api
      .get<AccessRequest[]>(accessRequestsEndpoint)
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setRequestsError(err instanceof ApiError ? err.message : "Couldn't load access requests.");
        }
      })
      .finally(() => {
        if (!cancelled) setRequestsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessRequestsEndpoint]);

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — select the link above and copy it manually.");
    }
  }

  async function handleToggleLink(enabled: boolean) {
    setToggling(true);
    setError(null);
    try {
      if (enabled) {
        const { url } = await api.post<{ url: string }>(shareLinkEndpoint);
        setUrl(url);
      } else {
        await api.delete(shareLinkEndpoint);
        setUrl(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update link sharing.");
    } finally {
      setToggling(false);
    }
  }

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || sharing) return;
    setSharing(true);
    setPeopleError(null);
    try {
      const updated = await api.post<ResourcePermission[]>(permissionsEndpoint, {
        email: trimmed,
        accessLevel: level,
      });
      setPeople(updated);
      setEmail("");
      setLevel("VIEWER");
    } catch (err) {
      setPeopleError(err instanceof ApiError ? err.message : "Couldn't share with that person.");
    } finally {
      setSharing(false);
    }
  }

  async function handleLevelChange(permissionId: string, accessLevel: "VIEWER" | "EDITOR") {
    setBusyPermissionId(permissionId);
    setPeopleError(null);
    try {
      const updated = await api.patch<ResourcePermission[]>(`${permissionsEndpoint}/${permissionId}`, {
        accessLevel,
      });
      setPeople(updated);
    } catch (err) {
      setPeopleError(err instanceof ApiError ? err.message : "Couldn't update their access.");
    } finally {
      setBusyPermissionId(null);
    }
  }

  async function handleRemovePerson(permissionId: string) {
    setBusyPermissionId(permissionId);
    setPeopleError(null);
    try {
      const updated = await api.delete<ResourcePermission[]>(`${permissionsEndpoint}/${permissionId}`);
      setPeople(updated);
    } catch (err) {
      setPeopleError(err instanceof ApiError ? err.message : "Couldn't remove their access.");
    } finally {
      setBusyPermissionId(null);
    }
  }

  async function handleResolveRequest(requestId: string, decision: "GRANT" | "DENY") {
    setResolvingId(requestId);
    setRequestsError(null);
    try {
      const updated = await api.post<AccessRequest[]>(`${accessRequestsEndpoint}/${requestId}/resolve`, {
        decision,
        accessLevel: decision === "GRANT" ? (grantLevel[requestId] ?? "VIEWER") : undefined,
      });
      setRequests(updated);
      if (decision === "GRANT") await loadPeople();
    } catch (err) {
      setRequestsError(err instanceof ApiError ? err.message : "Couldn't resolve that request.");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-md rounded-2xl border p-6 shadow-2xl"
      >
        <h2 className="text-foreground mb-5 truncate text-[17px] font-semibold">
          Share &quot;{resourceName}&quot;
        </h2>

        {!requestsLoading && requests.length > 0 && (
          <div className="mb-5">
            <p className="text-ink-450 mb-2 text-xs font-semibold tracking-wide uppercase">
              Access requests
            </p>
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id} className="border-input bg-surface-muted-2 rounded-lg border p-2.5">
                  <div className="flex items-start gap-2">
                    <UserCheck className="text-ink-400 mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-[13px] font-medium">{r.requestedBy.name}</div>
                      <div className="text-ink-450 truncate text-[12px]">{r.requestedBy.email}</div>
                      {r.message && <div className="text-ink-600 mt-1 text-[12px] italic">&quot;{r.message}&quot;</div>}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <select
                      value={grantLevel[r.id] ?? "VIEWER"}
                      disabled={resolvingId === r.id}
                      onChange={(e) =>
                        setGrantLevel((prev) => ({ ...prev, [r.id]: e.target.value as "VIEWER" | "EDITOR" }))
                      }
                      className="border-input bg-background text-foreground rounded-md border px-1.5 py-1 text-xs outline-none disabled:opacity-60"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleResolveRequest(r.id, "DENY")}
                      disabled={resolvingId === r.id}
                      className="text-ink-600 hover:bg-background cursor-pointer rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-60"
                    >
                      Deny
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveRequest(r.id, "GRANT")}
                      disabled={resolvingId === r.id}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-60"
                    >
                      {resolvingId === r.id && <Loader2 className="h-3 w-3 animate-spin" />}
                      Grant
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {requestsError && <p className="text-error-text mt-2 text-[13px]">{requestsError}</p>}
          </div>
        )}

        <form onSubmit={handleShare} className="mb-4">
          <p className="text-ink-450 mb-2 text-xs font-semibold tracking-wide uppercase">
            People with access
          </p>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Add a person by email"
              className="border-input bg-surface-muted-2 text-foreground min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
            />
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as "VIEWER" | "EDITOR")}
              className="border-input bg-surface-muted-2 text-foreground shrink-0 rounded-lg border px-2 py-2 text-sm outline-none"
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>
            <button
              type="submit"
              disabled={!email.trim() || sharing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
            </button>
          </div>
          <p className="text-ink-450 mt-2 text-[12px]">
            If they don&apos;t have a Nextlayer Cloud account yet, we&apos;ll invite them by email.
          </p>
          {peopleError && <p className="text-error-text mt-2 text-[13px]">{peopleError}</p>}
        </form>

        {peopleLoading ? (
          <div className="bg-surface-muted mb-5 h-9 animate-pulse rounded-lg" />
        ) : people.length > 0 ? (
          <ul className="mb-5 max-h-[180px] space-y-1 overflow-y-auto">
            {people.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground truncate text-[13px] font-medium">
                      {p.status === "PENDING" ? p.pendingEmail : p.user?.name}
                    </span>
                    {p.status === "PENDING" && (
                      <span className="bg-warn/10 text-warn shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                        Pending
                      </span>
                    )}
                  </div>
                  {p.status === "ACTIVE" && (
                    <div className="text-ink-450 truncate text-[12px]">{p.user?.email}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <select
                    value={p.accessLevel}
                    disabled={busyPermissionId === p.id}
                    onChange={(e) => handleLevelChange(p.id, e.target.value as "VIEWER" | "EDITOR")}
                    className="border-input bg-surface-muted-2 text-foreground rounded-md border px-1.5 py-1 text-xs outline-none disabled:opacity-60"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(p.id)}
                    disabled={busyPermissionId === p.id}
                    aria-label={`Remove ${p.status === "PENDING" ? p.pendingEmail : p.user?.name}`}
                    className="text-ink-400 hover:text-error-text cursor-pointer rounded-md p-1 disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-450 mb-5 text-[13px]">Not shared with anyone yet.</p>
        )}

        <div className="border-border-subtle border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ink-450 text-xs font-semibold tracking-wide uppercase">Anyone with the link</p>
              <p className="text-ink-450 mt-1 text-sm">
                {url ? `Anyone with the link can view this ${resourceType}.` : `Off — only people listed above can open this ${resourceType}.`}
              </p>
            </div>
            {loading ? (
              <div className="bg-surface-muted h-5 w-9 shrink-0 animate-pulse rounded-full" />
            ) : (
              <Switch
                checked={!!url}
                disabled={toggling}
                onCheckedChange={handleToggleLink}
                aria-label="Anyone with the link can view"
              />
            )}
          </div>

          {error && <p className="text-error-text mt-2 text-[13px]">{error}</p>}

          {url && (
            <div className="border-input bg-surface-muted-2 mt-3 flex items-center gap-2 rounded-lg border p-2.5">
              <LinkIcon className="text-ink-400 ml-1 h-4 w-4 shrink-0" />
              <input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="text-ink-700 min-w-0 flex-1 truncate bg-transparent text-sm outline-none"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Done
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!url}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
