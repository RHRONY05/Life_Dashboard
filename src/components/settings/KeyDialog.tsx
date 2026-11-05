"use client";

import { useState } from "react";
import { Scope } from "@/lib/schemas";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import {
  Check,
  Copy,
  KeyRound,
  AlertTriangle,
} from "lucide-react";

interface KeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (key: { id: string; name: string; prefix: string; scopes: Scope[] }, secret: string) => void;
}

const AGENT_PRESETS: Record<string, Scope[]> = {
  Muse: [
    "tasks:read",
    "tasks:write",
    "trackers:read",
    "trackers:write",
    "money:read",
    "money:write",
    "renewals:read",
    "links:read",
    "notes:read",
    "notes:write",
  ],
  Antigravity: [
    "tasks:read",
    "tasks:write",
    "trackers:read",
    "trackers:write",
    "renewals:read",
    "renewals:write",
    "money:read",
    "links:read",
  ],
  "Claude Code": [
    "tasks:read",
    "tasks:write",
    "trackers:read",
    "trackers:write",
    "renewals:read",
    "renewals:write",
    "money:read",
    "links:read",
  ],
};

const DEFAULT_SCOPES: Scope[] = [
  "tasks:read",
  "trackers:read",
  "money:read",
  "renewals:read",
  "links:read",
  "notes:read",
];

export function KeyDialog({ open, onClose, onCreated }: KeyDialogProps) {
  // Step 1 state
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Scope[]>(DEFAULT_SCOPES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 state
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState("");
  const [activeTab, setActiveTab] = useState<"antigravity" | "claude" | "other">("antigravity");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://life.rhrony05.me";

  function resetForm() {
    setName("");
    setScopes(DEFAULT_SCOPES);
    setLoading(false);
    setError(null);
    setCreatedSecret(null);
    setCreatedName("");
    setActiveTab("antigravity");
    setCopiedKey(false);
    setCopiedSnippet(false);
    setShowConfirmClose(false);
  }

  function handleSelectPreset(presetName: string) {
    setName(presetName);
    if (AGENT_PRESETS[presetName]) {
      setScopes(AGENT_PRESETS[presetName]);
    }
  }

  function toggleScope(scope: Scope) {
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter an agent name.");
      return;
    }
    if (scopes.length === 0) {
      setError("Select at least one scope.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details?.reason === "duplicate_name") {
          setError(`You already have an active key named ${name.trim()}`);
        } else if (data.details?.reason === "limit_reached") {
          setError("Limit of 10 active keys reached. Revoke an old key first.");
        } else {
          setError(data.error || "Failed to create key");
        }
        setLoading(false);
        return;
      }

      onCreated(data.key, data.secret);
      setCreatedSecret(data.secret);
      setCreatedName(data.key.name);
      setLoading(false);
    } catch (err: unknown) {
      setError((err as Error).message || "Network error");
      setLoading(false);
    }
  }

  function handleAttemptClose() {
    if (createdSecret) {
      setShowConfirmClose(true);
    } else {
      resetForm();
      onClose();
    }
  }

  function handleForceClose() {
    resetForm();
    onClose();
  }

  function copyText(text: string, isSnippet = false) {
    navigator.clipboard.writeText(text);
    if (isSnippet) {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  }

  function getSnippet(): string {
    const endpoint = `${appUrl}/api/mcp`;
    if (activeTab === "antigravity") {
      return JSON.stringify(
        {
          mcpServers: {
            "life-dashboard": {
              serverUrl: endpoint,
              headers: {
                Authorization: `Bearer ${createdSecret}`,
              },
            },
          },
        },
        null,
        2
      );
    }
    if (activeTab === "claude") {
      return `claude mcp add --transport http life-dashboard ${endpoint} --header "Authorization: Bearer ${createdSecret}"`;
    }
    return `URL        ${endpoint}\nTransport  Streamable HTTP\nHeader     Authorization: Bearer ${createdSecret}`;
  }

  if (!open) return null;

  return (
    <>
      <Dialog
        open={open && !showConfirmClose}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleAttemptClose();
        }}
      >
        <DialogContent>
          {!createdSecret ? (
            /* Step 1: Create key */
            <form onSubmit={handleSubmit}>
              <DialogTitle className="text-xl font-bold text-ink">New key</DialogTitle>
              <DialogDescription className="text-sm text-ink-3 mt-1 mb-5">
                Give each agent its own key. You can revoke it any time.
              </DialogDescription>

              {error && (
                <div className="banner banner-danger mb-4 text-xs py-2 px-3">
                  {error}
                </div>
              )}

              <div className="field mb-4">
                <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">
                  Agent name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Muse"
                  maxLength={40}
                  required
                  className="input w-full h-10 px-3 text-sm focus:border-accent"
                />
                <div className="flex gap-1.5 mt-2">
                  {["Muse", "Antigravity", "Claude Code"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`chip text-xs ${name === preset ? "on" : ""}`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-semibold text-ink-2 mb-2 uppercase tracking-wide">
                  What can it do?
                </div>
                <div className="scope-grid">
                  <div>Area</div>
                  <div className="c">Read</div>
                  <div className="c">Write</div>

                  {/* Tasks */}
                  <div>Tasks</div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("tasks:read")}
                      role="checkbox"
                      aria-checked={scopes.includes("tasks:read")}
                      aria-label="Tasks read scope"
                      className={`check ${scopes.includes("tasks:read") ? "on" : ""}`}
                    >
                      {scopes.includes("tasks:read") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("tasks:write")}
                      role="checkbox"
                      aria-checked={scopes.includes("tasks:write")}
                      aria-label="Tasks write scope"
                      className={`check ${scopes.includes("tasks:write") ? "on" : ""}`}
                    >
                      {scopes.includes("tasks:write") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Trackers */}
                  <div>Trackers</div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("trackers:read")}
                      role="checkbox"
                      aria-checked={scopes.includes("trackers:read")}
                      aria-label="Trackers read scope"
                      className={`check ${scopes.includes("trackers:read") ? "on" : ""}`}
                    >
                      {scopes.includes("trackers:read") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("trackers:write")}
                      role="checkbox"
                      aria-checked={scopes.includes("trackers:write")}
                      aria-label="Trackers write scope"
                      className={`check ${scopes.includes("trackers:write") ? "on" : ""}`}
                    >
                      {scopes.includes("trackers:write") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Money */}
                  <div>Money</div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("money:read")}
                      role="checkbox"
                      aria-checked={scopes.includes("money:read")}
                      aria-label="Money read scope"
                      className={`check ${scopes.includes("money:read") ? "on" : ""}`}
                    >
                      {scopes.includes("money:read") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("money:write")}
                      role="checkbox"
                      aria-checked={scopes.includes("money:write")}
                      aria-label="Money write scope"
                      className={`check ${scopes.includes("money:write") ? "on" : ""}`}
                    >
                      {scopes.includes("money:write") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Renewals */}
                  <div>Renewals</div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("renewals:read")}
                      role="checkbox"
                      aria-checked={scopes.includes("renewals:read")}
                      aria-label="Renewals read scope"
                      className={`check ${scopes.includes("renewals:read") ? "on" : ""}`}
                    >
                      {scopes.includes("renewals:read") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("renewals:write")}
                      role="checkbox"
                      aria-checked={scopes.includes("renewals:write")}
                      aria-label="Renewals write scope"
                      className={`check ${scopes.includes("renewals:write") ? "on" : ""}`}
                    >
                      {scopes.includes("renewals:write") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Canvas / Notes */}
                  <div>Canvas (Notes)</div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("notes:read")}
                      role="checkbox"
                      aria-checked={scopes.includes("notes:read")}
                      aria-label="Canvas notes read scope"
                      className={`check ${scopes.includes("notes:read") ? "on" : ""}`}
                    >
                      {scopes.includes("notes:read") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("notes:write")}
                      role="checkbox"
                      aria-checked={scopes.includes("notes:write")}
                      aria-label="Canvas notes write scope"
                      className={`check ${scopes.includes("notes:write") ? "on" : ""}`}
                    >
                      {scopes.includes("notes:write") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Quick links */}
                  <div>Quick links</div>
                  <div className="c">
                    <button
                      type="button"
                      onClick={() => toggleScope("links:read")}
                      role="checkbox"
                      aria-checked={scopes.includes("links:read")}
                      aria-label="Quick links read scope"
                      className={`check ${scopes.includes("links:read") ? "on" : ""}`}
                    >
                      {scopes.includes("links:read") && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="c text-ink-3">—</div>
                </div>
                <p className="text-xs text-ink-3 mt-2">
                  Agents can never delete anything.
                </p>
              </div>

              <div className="dialog-foot flex justify-end gap-2 pt-4 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  <KeyRound className="w-4 h-4" />
                  {loading ? "Creating…" : "Create key"}
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Show once secret */
            <div>
              <DialogTitle className="text-xl font-bold text-ink">Key for {createdName}</DialogTitle>
              <div className="banner banner-warn my-3 flex items-center gap-2 text-xs py-2 px-3">
                <KeyRound className="w-4 h-4 flex-shrink-0" />
                <span>Copy this key now. You won&apos;t see it again.</span>
              </div>

              <div className="secret my-3">
                <code className="text-xs break-all">{createdSecret}</code>
                <button
                  type="button"
                  onClick={() => copyText(createdSecret)}
                  className="btn btn-secondary btn-sm flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedKey ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="tabs-line mt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("antigravity")}
                  className={activeTab === "antigravity" ? "on" : ""}
                >
                  Antigravity
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("claude")}
                  className={activeTab === "claude" ? "on" : ""}
                >
                  Claude Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("other")}
                  className={activeTab === "other" ? "on" : ""}
                >
                  Other
                </button>
              </div>

              <div className="snippet">
                {getSnippet()}
              </div>

              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => copyText(getSnippet(), true)}
                  className="btn btn-ghost btn-sm text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedSnippet ? "Copied snippet" : "Copy"}
                </button>
              </div>

              <div className="dialog-foot flex justify-end pt-4 mt-4 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="btn btn-primary px-6"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog before closing show-once key */}
      <Dialog
        open={showConfirmClose}
        onOpenChange={(isOpen) => {
          if (!isOpen) setShowConfirmClose(false);
        }}
      >
        <DialogContent>
          <div className="flex items-center gap-3 text-warning mb-2">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <DialogTitle className="text-lg font-bold text-ink">Did you copy the key?</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-ink-3 mb-6">
            You won&apos;t be able to see or copy this key again after closing.
          </DialogDescription>
          <div className="dialog-foot flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfirmClose(false)}
              className="btn btn-ghost"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleForceClose}
              className="btn btn-primary"
            >
              Yes, close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
