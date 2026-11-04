"use client";

import { useState, useEffect } from "react";
import { ApiKeyDto, AuditRowDto, LinkDto, Scope } from "@/lib/schemas";
import { KeyTable } from "./KeyTable";
import { KeyDialog } from "./KeyDialog";
import { AuditTable } from "./AuditTable";
import { LinkDialog, renderLinkIcon } from "./LinkDialog";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { showToast } from "@/components/ui/Toast";
import {
  Bot,
  Activity,
  Link as LinkIcon,
  Mail,
  Copy,
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface SettingsClientProps {
  initialKeys: ApiKeyDto[];
  initialAudit: { rows: AuditRowDto[]; hasMore: boolean };
  initialLinks: LinkDto[];
  reminderEmail: string;
}

export function SettingsClient({
  initialKeys,
  initialAudit,
  initialLinks,
  reminderEmail,
}: SettingsClientProps) {
  // Navigation anchor
  const [activeHash, setActiveHash] = useState("agents");

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace("#", "");
      if (hash) setActiveHash(hash);
    }
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://life.rhrony05.me";

  function handleCopyEndpoint() {
    navigator.clipboard.writeText(`${appUrl}/api/mcp`);
    showToast("MCP endpoint copied");
  }
  // Keys state
  const [keys, setKeys] = useState<ApiKeyDto[]>(initialKeys);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyDto | null>(null);
  const [revoking, setRevoking] = useState(false);

  function handleKeyCreated(newKey: { id: string; name: string; prefix: string; scopes: Scope[] }) {
    setKeys((prev) => [
      {
        id: newKey.id,
        name: newKey.name,
        prefix: newKey.prefix,
        scopes: newKey.scopes,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        revokedAt: null,
      },
      ...prev,
    ]);
  }

  async function handleConfirmRevoke() {
    if (!keyToRevoke) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/keys/${keyToRevoke.id}/revoke`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to revoke key");
      }
      const updated = await res.json();
      setKeys((prev) =>
        prev.map((k) => (k.id === keyToRevoke.id ? updated : k))
      );
      showToast(`${keyToRevoke.name}'s key revoked`);
      setKeyToRevoke(null);
    } catch {
      showToast("Couldn't revoke key");
    } finally {
      setRevoking(false);
    }
  }

  // Audit state
  const [auditRows, setAuditRows] = useState<AuditRowDto[]>(initialAudit.rows);
  const [hasMoreAudit, setHasMoreAudit] = useState(initialAudit.hasMore);
  const [loadingMoreAudit, setLoadingMoreAudit] = useState(false);
  const [agentFilter, setAgentFilter] = useState("");

  const availableAgents = Array.from(
    new Set(auditRows.map((r) => r.keyName))
  ).sort();

  async function handleLoadMoreAudit() {
    if (auditRows.length === 0 || loadingMoreAudit) return;
    setLoadingMoreAudit(true);
    const lastId = auditRows[auditRows.length - 1].id;
    try {
      const res = await fetch(`/api/audit?before=${lastId}`);
      if (!res.ok) throw new Error("Failed to load audit");
      const data = await res.json();
      setAuditRows((prev) => [...prev, ...data.rows]);
      setHasMoreAudit(data.hasMore);
    } catch {
      showToast("Couldn't load more activity");
    } finally {
      setLoadingMoreAudit(false);
    }
  }

  // Links state
  const [links, setLinks] = useState<LinkDto[]>(initialLinks);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkToEdit, setLinkToEdit] = useState<LinkDto | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<LinkDto | null>(null);
  const [deletingLink, setDeletingLink] = useState(false);

  function handleSaveLink(saved: LinkDto) {
    setLinks((prev) => {
      const exists = prev.some((l) => l.id === saved.id);
      if (exists) {
        return prev.map((l) => (l.id === saved.id ? saved : l));
      }
      return [...prev, saved];
    });
    showToast(linkToEdit ? "Link updated" : "Link added");
  }

  async function handleConfirmDeleteLink() {
    if (!linkToDelete) return;
    setDeletingLink(true);
    try {
      const res = await fetch(`/api/links/${linkToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete link");
      setLinks((prev) => prev.filter((l) => l.id !== linkToDelete.id));
      showToast("Link deleted");
      setLinkToDelete(null);
    } catch {
      showToast("Couldn't delete link");
    } finally {
      setDeletingLink(false);
    }
  }

  // Email reminders state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  async function handleSendTestEmail() {
    setSendingEmail(true);
    setEmailStatus("idle");
    try {
      const res = await fetch("/api/email/test", { method: "POST" });
      if (!res.ok) {
        setEmailStatus("error");
      } else {
        setEmailStatus("success");
      }
    } catch {
      setEmailStatus("error");
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="settings">
      {/* Sidebar navigation (Desktop) */}
      <nav className="snav hidden md:flex">
        <a
          href="#agents"
          className={activeHash === "agents" ? "on" : ""}
          onClick={() => setActiveHash("agents")}
        >
          <Bot className="w-4 h-4" />
          Agents
        </a>
        <a
          href="#activity"
          className={activeHash === "activity" ? "on" : ""}
          onClick={() => setActiveHash("activity")}
        >
          <Activity className="w-4 h-4" />
          Activity
        </a>
        <a
          href="#links"
          className={activeHash === "links" ? "on" : ""}
          onClick={() => setActiveHash("links")}
        >
          <LinkIcon className="w-4 h-4" />
          Quick links
        </a>
        <a
          href="#email"
          className={activeHash === "email" ? "on" : ""}
          onClick={() => setActiveHash("email")}
        >
          <Mail className="w-4 h-4" />
          Email reminders
        </a>
      </nav>

      {/* Main content sections */}
      <div className="flex flex-col gap-10">
        {/* AGENTS */}
        <section id="agents" className="scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Agents</h2>
              <p className="text-xs text-ink-3 mt-0.5">
                Agents connect to your MCP server with their own key. They can&apos;t delete anything.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="endpoint">
                <span suppressHydrationWarning>{appUrl}/api/mcp</span>
                <button
                  type="button"
                  onClick={handleCopyEndpoint}
                  className="iconbtn sm"
                  aria-label="Copy URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </span>
              <button
                type="button"
                onClick={() => setKeyDialogOpen(true)}
                className="btn btn-primary"
              >
                <KeyRound className="w-4 h-4" />
                New key
              </button>
            </div>
          </div>

          <KeyTable
            keys={keys}
            onRevoke={(k) => setKeyToRevoke(k)}
            onNewKey={() => setKeyDialogOpen(true)}
          />
        </section>

        {/* ACTIVITY */}
        <section id="activity" className="scroll-mt-6">
          <AuditTable
            rows={auditRows}
            hasMore={hasMoreAudit}
            onLoadMore={handleLoadMoreAudit}
            agentFilter={agentFilter}
            onFilterChange={setAgentFilter}
            availableAgents={availableAgents}
            loadingMore={loadingMoreAudit}
          />
        </section>

        {/* QUICK LINKS */}
        <section id="links" className="scroll-mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Quick links</h2>
              <p className="text-xs text-ink-3">Shown on Today. Up to 12.</p>
            </div>
            <div className="flex items-center gap-2">
              {links.length >= 12 && (
                <span className="text-xs text-ink-3">12 links is the maximum</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setLinkToEdit(null);
                  setLinkDialogOpen(true);
                }}
                disabled={links.length >= 12}
                className="btn btn-secondary"
              >
                <Plus className="w-4 h-4" />
                Add link
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            {links.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-3">
                No quick links yet. Add up to 12 links to your tools and profiles.
              </div>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {links.map((link) => (
                  <div key={link.id} className="lrow">
                    <span className="ic">{renderLinkIcon(link.icon)}</span>
                    <div className="t">
                      <b>{link.title}</b>
                      <span>{link.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkToEdit(link);
                        setLinkDialogOpen(true);
                      }}
                      className="iconbtn sm"
                      aria-label="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkToDelete(link)}
                      className="iconbtn sm hover:text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* EMAIL REMINDERS */}
        <section id="email" className="scroll-mt-6">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-ink">Email reminders</h2>
            <p className="text-xs text-ink-3 mt-0.5">
              Every morning around 08:00, when something renews or ends, a short email goes to{" "}
              <b className="text-ink font-semibold">{reminderEmail}</b>.
            </p>
          </div>

          <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sendingEmail}
              className="btn btn-secondary"
            >
              <Send className="w-4 h-4" />
              {sendingEmail ? "Sending…" : "Send test email"}
            </button>

            {emailStatus === "success" && (
              <span className="banner banner-info flex items-center gap-2 text-xs py-1.5 px-3">
                <CheckCircle2 className="w-4 h-4 text-info flex-shrink-0" />
                Sent. Check your inbox.
              </span>
            )}

            {emailStatus === "error" && (
              <span className="banner banner-danger flex items-center gap-2 text-xs py-1.5 px-3">
                <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
                Couldn&apos;t send. Check GMAIL_APP_PASSWORD.
              </span>
            )}
          </div>
        </section>
      </div>

      {/* New / Show-Once Key Dialog */}
      <KeyDialog
        open={keyDialogOpen}
        onClose={() => setKeyDialogOpen(false)}
        onCreated={handleKeyCreated}
      />

      {/* Revoke confirmation dialog */}
      <Dialog
        open={keyToRevoke !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setKeyToRevoke(null);
        }}
      >
        <DialogContent>
          <h2 className="text-lg font-bold text-ink mb-1">
            Revoke {keyToRevoke?.name}&apos;s key?
          </h2>
          <p className="text-sm text-ink-3 mb-6">
            {keyToRevoke?.name} loses access immediately. Its activity log stays.
          </p>
          <div className="dialog-foot flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setKeyToRevoke(null)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRevoke}
              disabled={revoking}
              className="btn btn-danger"
            >
              {revoking ? "Revoking…" : "Revoke"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Dialog */}
      <LinkDialog
        open={linkDialogOpen}
        link={linkToEdit}
        onClose={() => {
          setLinkDialogOpen(false);
          setLinkToEdit(null);
        }}
        onSave={handleSaveLink}
      />

      {/* Delete link confirmation dialog */}
      <Dialog
        open={linkToDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setLinkToDelete(null);
        }}
      >
        <DialogContent>
          <h2 className="text-lg font-bold text-ink mb-1">
            Delete “{linkToDelete?.title}”?
          </h2>
          <p className="text-sm text-ink-3 mb-6">
            This can&apos;t be undone.
          </p>
          <div className="dialog-foot flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setLinkToDelete(null)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteLink}
              disabled={deletingLink}
              className="btn btn-danger"
            >
              {deletingLink ? "Deleting…" : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
