"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { parseTrackerItemsText } from "@/lib/domain/trackers";
import { TrackerSummaryDto } from "@/lib/schemas";
import { toast } from "sonner";

interface NewTrackerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrackerCreated: (tracker: TrackerSummaryDto) => void;
}

export function NewTrackerDialog({
  open,
  onOpenChange,
  onTrackerCreated,
}: NewTrackerDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live item count
  const { itemCount, parseError } = useMemo(() => {
    if (!itemsText.trim()) return { itemCount: 0, parseError: null };
    try {
      const parsed = parseTrackerItemsText(itemsText);
      return { itemCount: parsed.length, parseError: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid items format";
      return { itemCount: 0, parseError: msg };
    }
  }, [itemsText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (parseError) {
      setErrorMsg(parseError);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/trackers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          itemsText: itemsText.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErrorMsg(
            data?.details?.message ||
              `You already have a tracker named "${trimmedName}"`
          );
          return;
        }
        if (res.status === 400) {
          setErrorMsg(data?.details?.message || "Invalid input data");
          return;
        }
        throw new Error(data?.message || "Failed to create tracker");
      }

      const created: TrackerSummaryDto = await res.json();
      toast.success(`Created tracker "${created.name}"`);
      setName("");
      setDescription("");
      setItemsText("");
      onOpenChange(false);
      onTrackerCreated(created);
    } catch (err) {
      console.error("Error creating tracker:", err);
      toast.error("Couldn't create tracker. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New tracker</DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-2.5 rounded text-sm bg-[var(--danger-soft)] text-[var(--danger-text)] font-medium">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tracker-name"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]"
            >
              Name
            </label>
            <input
              id="tracker-name"
              type="text"
              required
              maxLength={80}
              placeholder="e.g. NeetCode 150, Thesis reading list"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full px-3 py-2 text-sm rounded bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--frame)]"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tracker-desc"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]"
            >
              Description <span className="text-[var(--ink-3)] font-normal">(optional)</span>
            </label>
            <input
              id="tracker-desc"
              type="text"
              maxLength={300}
              placeholder="Short note about goals or timeline"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--frame)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="tracker-items"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]"
              >
                Items <span className="text-[var(--ink-3)] font-normal">(optional paste)</span>
              </label>
              {itemCount > 0 && (
                <span className="text-xs font-mono text-[var(--ink-3)]">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              )}
            </div>
            <textarea
              id="tracker-items"
              rows={6}
              placeholder={`Items (optional) — one per line; ## Group starts a group; add | url for a link\n\n## Arrays & Hashing\n1. Contains Duplicate | https://leetcode.com/...\n2. Valid Anagram`}
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--frame)] resize-y"
            />
            {parseError && (
              <p className="text-xs text-[var(--danger-text)] font-medium mt-0.5">
                {parseError}
              </p>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !name.trim() || !!parseError}
            >
              {submitting ? "Creating…" : "Create tracker"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
