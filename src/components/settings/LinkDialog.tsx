"use client";

import { useState } from "react";
import { LinkDto, LinkIconType, LinkIcons } from "@/lib/schemas";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import {
  Link as LinkIcon,
  BookOpen,
  GraduationCap,
  Briefcase,
  User,
  Globe,
  Code,
  Mail,
} from "lucide-react";

export function renderLinkIcon(icon: string, className = "w-4 h-4") {
  switch (icon) {
    case "book-open":
      return <BookOpen className={className} />;
    case "graduation-cap":
      return <GraduationCap className={className} />;
    case "briefcase":
      return <Briefcase className={className} />;
    case "user":
      return <User className={className} />;
    case "globe":
      return <Globe className={className} />;
    case "code":
      return <Code className={className} />;
    case "mail":
      return <Mail className={className} />;
    case "github":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      );
    case "linkedin":
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case "link":
    default:
      return <LinkIcon className={className} />;
  }
}

interface LinkDialogProps {
  open: boolean;
  link: LinkDto | null;
  onClose: () => void;
  onSave: (link: LinkDto) => void;
}

function InnerLinkForm({
  link,
  onClose,
  onSave,
}: {
  link: LinkDto | null;
  onClose: () => void;
  onSave: (link: LinkDto) => void;
}) {
  const [title, setTitle] = useState(link?.title || "");
  const [url, setUrl] = useState(link?.url || "https://");
  const [icon, setIcon] = useState<LinkIconType>(
    (link?.icon as LinkIconType) || "link"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();

    if (!trimmedTitle) {
      setError("Please enter a title.");
      return;
    }
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      setError("URL must start with http:// or https://");
      return;
    }

    setLoading(true);
    try {
      const endpoint = link ? `/api/links/${link.id}` : "/api/links";
      const method = link ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          url: trimmedUrl,
          icon,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details?.reason === "limit_reached") {
          setError("12 links is the maximum. Delete an old link first.");
        } else {
          setError(data.error || "Failed to save link");
        }
        setLoading(false);
        return;
      }

      onSave(data);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Network error");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold text-ink">
        {link ? "Edit link" : "Add link"}
      </h2>
      <p className="text-sm text-ink-3 mt-1 mb-5">
        Shown on Today. Up to 12.
      </p>

      {error && (
        <div className="banner banner-danger mb-4 text-xs py-2 px-3">
          {error}
        </div>
      )}

      <div className="field mb-4">
        <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Portfolio"
          maxLength={40}
          required
          className="input w-full h-10 px-3 text-sm focus:border-accent"
        />
      </div>

      <div className="field mb-4">
        <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">
          URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
          maxLength={500}
          required
          className="input w-full h-10 px-3 text-sm focus:border-accent font-mono"
        />
      </div>

      <div className="field mb-6">
        <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">
          Icon
        </label>
        <div className="grid grid-cols-5 gap-2">
          {LinkIcons.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className={`flex flex-col items-center justify-center p-2 rounded-md border text-xs gap-1 transition-all ${
                icon === ic
                  ? "border-accent bg-accent-soft text-accent-text font-semibold"
                  : "border-[var(--line)] bg-surface text-ink-2 hover:bg-surface-2"
              }`}
            >
              {renderLinkIcon(ic, "w-4 h-4")}
              <span className="text-[10px] truncate max-w-full">{ic}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dialog-foot flex justify-end gap-2 pt-4 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

export function LinkDialog({ open, link, onClose, onSave }: LinkDialogProps) {
  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        <InnerLinkForm
          key={link ? link.id : "new"}
          link={link}
          onClose={onClose}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}
