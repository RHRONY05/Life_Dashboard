"use client";

import { ApiKeyDto, Scope } from "@/lib/schemas";
import { Illustration } from "@/components/illustrations";
import { KeyRound } from "lucide-react";

interface KeyTableProps {
  keys: ApiKeyDto[];
  onRevoke: (key: ApiKeyDto) => void;
  onNewKey: () => void;
}

function renderScopeChips(scopes: Scope[]) {
  const chips: { label: string; isWrite: boolean }[] = [];

  if (scopes.includes("tasks:write")) {
    chips.push({ label: "tasks rw", isWrite: true });
  } else if (scopes.includes("tasks:read")) {
    chips.push({ label: "tasks r", isWrite: false });
  }

  if (scopes.includes("trackers:write")) {
    chips.push({ label: "trackers rw", isWrite: true });
  } else if (scopes.includes("trackers:read")) {
    chips.push({ label: "trackers r", isWrite: false });
  }

  if (scopes.includes("money:write")) {
    chips.push({ label: "money rw", isWrite: true });
  } else if (scopes.includes("money:read")) {
    chips.push({ label: "money r", isWrite: false });
  }

  if (scopes.includes("renewals:write")) {
    chips.push({ label: "renewals rw", isWrite: true });
  } else if (scopes.includes("renewals:read")) {
    chips.push({ label: "renewals r", isWrite: false });
  }

  if (scopes.includes("notes:write")) {
    chips.push({ label: "notes rw", isWrite: true });
  } else if (scopes.includes("notes:read")) {
    chips.push({ label: "notes r", isWrite: false });
  }

  if (scopes.includes("links:read")) {
    chips.push({ label: "links r", isWrite: false });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c.label}
          className={`scope ${c.isWrite ? "w" : ""}`}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "never";
  const now = new Date();
  const d = new Date(dateStr);
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function KeyTable({ keys, onRevoke, onNewKey }: KeyTableProps) {
  if (keys.length === 0) {
    return (
      <div className="card empty text-center py-10 px-4">
        <Illustration
          name="agents-empty"
          size="md"
          className="mx-auto mb-2.5"
        />
        <h3 className="font-semibold text-ink text-base mb-1">
          No agents yet
        </h3>
        <p className="text-ink-3 text-sm mb-4">
          Make a key to connect Muse, Antigravity or Claude Code.
        </p>
        <button onClick={onNewKey} className="btn btn-primary mx-auto">
          <KeyRound className="w-4 h-4" />
          New key
        </button>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Key</th>
              <th>Can do</th>
              <th>Last used</th>
              <th>Created</th>
              <th className="text-right"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const isRevoked = k.revokedAt !== null;
              return (
                <tr key={k.id} className={isRevoked ? "revoked" : ""}>
                  <td>
                    <b className={isRevoked ? "text-ink-3 font-normal" : "font-semibold text-ink"}>
                      {k.name}
                    </b>
                  </td>
                  <td className="font-mono text-ink-2">
                    {k.prefix}…
                  </td>
                  <td>{renderScopeChips(k.scopes)}</td>
                  <td className="text-ink-3">{formatRelative(k.lastUsedAt)}</td>
                  <td className="text-ink-3">{formatDate(k.createdAt)}</td>
                  <td className="text-right">
                    {isRevoked ? (
                      <span className="text-ink-3 text-xs">
                        revoked {formatDate(k.revokedAt!)}
                      </span>
                    ) : (
                      <button
                        onClick={() => onRevoke(k)}
                        className="btn btn-ghost btn-sm text-danger hover:bg-danger-soft"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-[var(--line)]">
        {keys.map((k) => {
          const isRevoked = k.revokedAt !== null;
          return (
            <div key={k.id} className="p-3.5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <b className={isRevoked ? "text-ink-3 font-normal text-sm" : "font-semibold text-ink text-sm"}>
                    {k.name}
                  </b>
                  <div className="text-xs text-ink-3 font-mono mt-0.5">
                    {k.prefix}… · {isRevoked ? `revoked ${formatDate(k.revokedAt!)}` : `used ${formatRelative(k.lastUsedAt)}`}
                  </div>
                </div>
                {!isRevoked && (
                  <button
                    onClick={() => onRevoke(k)}
                    className="btn btn-ghost btn-sm text-danger text-xs px-2 h-8"
                  >
                    Revoke
                  </button>
                )}
              </div>
              <div>{renderScopeChips(k.scopes)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
