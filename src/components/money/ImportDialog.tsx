"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ImportLineWithExisting } from "@/lib/services/money";
import { formatTaka } from "@/lib/domain/money";
import { Check } from "lucide-react";
import clsx from "clsx";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (summary: { people: number; entries: number }) => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [text, setText] = useState("");
  const [previewLines, setPreviewLines] = useState<ImportLineWithExisting[]>([]);
  const [includedLineNos, setIncludedLineNos] = useState<Set<number>>(new Set());
  const [directions, setDirections] = useState<Record<number, "owes_me" | "i_owe">>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please paste some text to import");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/money/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, commit: false }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to preview import");
      }

      const data: { lines: ImportLineWithExisting[] } = await res.json();
      setPreviewLines(data.lines);

      // Default includes: all lines without error whose person is not already existing
      const initialIncluded = new Set<number>();
      const initialDirections: Record<number, "owes_me" | "i_owe"> = {};

      for (const line of data.lines) {
        if (line.direction) {
          initialDirections[line.lineNo] = line.direction;
        }
        if (!line.error && !line.existing) {
          initialIncluded.add(line.lineNo);
        }
      }

      setIncludedLineNos(initialIncluded);
      setDirections(initialDirections);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse text");
    } finally {
      setLoading(false);
    }
  };

  const toggleInclude = (lineNo: number) => {
    setIncludedLineNos((prev) => {
      const next = new Set(prev);
      if (next.has(lineNo)) {
        next.delete(lineNo);
      } else {
        next.add(lineNo);
      }
      return next;
    });
  };

  const setLineDirection = (lineNo: number, dir: "owes_me" | "i_owe") => {
    setDirections((prev) => ({
      ...prev,
      [lineNo]: dir,
    }));
  };

  // Check if any included valid line is missing a direction
  let unchosenName: string | null = null;
  for (const line of previewLines) {
    if (includedLineNos.has(line.lineNo) && !line.error) {
      if (!directions[line.lineNo]) {
        unchosenName = line.name || `line ${line.lineNo}`;
        break;
      }
    }
  }

  const handleCommit = async () => {
    if (unchosenName) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/money/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          commit: true,
          directions,
          include: Array.from(includedLineNos),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to commit import");
      }

      const summary: { people: number; entries: number } = await res.json();
      onImportComplete(summary);
      onOpenChange(false);
      setStep(1);
      setText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to import");
    } finally {
      setLoading(false);
    }
  };

  const includedCount = includedLineNos.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={clsx(step === 2 ? "max-w-[720px] w-auto" : "max-w-[540px]")}>
        {step === 1 ? (
          <form onSubmit={handlePreview}>
            <DialogHeader>
              <DialogTitle>Import IOUs from notes</DialogTitle>
              <DialogDescription>
                Paste your debts list from your notes app. We’ll parse the names, amounts, and who owes whom.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4">
              <label
                htmlFor="import-textarea"
                className="block text-[var(--text-xs)] font-semibold text-[var(--ink-2)] mb-1.5"
              >
                Notes text
              </label>
              <textarea
                id="import-textarea"
                rows={8}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError(null);
                }}
                placeholder="One person per line:&#10;Saimun dibe = 100 + 75&#10;Majharul pabe- 454 tk&#10;Humayen = 2200 tk - 600 tk&#10;Naif dibe - 70 tk + 500tk(kayes)"
                className="w-full p-3 font-mono text-[var(--text-sm)] bg-[var(--surface-2)] border border-[var(--line)] rounded-md outline-none focus:border-[var(--line-strong)] resize-y"
                autoFocus
                required
              />
              <p className="mt-2 text-[var(--text-2xs)] text-[var(--ink-3)] leading-relaxed">
                Hint: <code>dibe</code> = they owe you, <code>pabe</code> = you owe them · <code>-</code> = paid back · <code>1k</code> = 1000 · <code>(note)</code> after an amount
              </p>

              {error && (
                <p className="mt-2 text-[var(--danger-text)] text-[var(--text-xs)]">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" busy={loading}>
                Preview
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle>Import from your notes</DialogTitle>
              <DialogDescription className="lead">
                dibe = they owe you · pabe = you owe them · − = paid back. Entries are dated today.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 overflow-x-auto max-h-[50vh] overflow-y-auto">
              <table className="imp-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Person</th>
                    <th>Who owes</th>
                    <th>Entries</th>
                    <th style={{ textAlign: "right" }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {previewLines.map((line) => {
                    const isIncluded = includedLineNos.has(line.lineNo);
                    const effectiveDir = directions[line.lineNo] || line.direction;
                    const hasError = Boolean(line.error);
                    const isExisting = Boolean(line.existing);
                    const needsDirection = isIncluded && !hasError && !effectiveDir;

                    let rowBalance = 0;
                    for (const t of line.terms) {
                      rowBalance += t.sign * t.amount;
                    }
                    if (effectiveDir === "i_owe") {
                      rowBalance = -rowBalance;
                    }

                    return (
                      <tr
                        key={line.lineNo}
                        className={clsx(
                          hasError && "bad",
                          isExisting && !isIncluded && "skip",
                          needsDirection && "ask"
                        )}
                      >
                        <td>
                          <button
                            type="button"
                            disabled={hasError}
                            onClick={() => toggleInclude(line.lineNo)}
                            className={clsx(
                              "check w-5 h-5 rounded border border-[var(--line-strong)] grid place-items-center transition-colors",
                              isIncluded && "on bg-[var(--accent)] text-white border-[var(--accent)]",
                              hasError && "opacity-40 cursor-not-allowed"
                            )}
                            aria-label={`Toggle line ${line.lineNo}`}
                          >
                            {isIncluded && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </button>
                        </td>

                        <td>
                          <b>{line.name || "—"}</b>
                          {isExisting && (
                            <div style={{ fontSize: "var(--text-2xs)" }} className="text-[var(--ink-3)]">
                              Already in your list ({formatTaka(line.existing!.balance)}), skipped
                            </div>
                          )}
                          {hasError && (
                            <div style={{ fontSize: "var(--text-2xs)" }} className="text-[var(--danger-text)]">
                              line {line.lineNo} “{line.raw}”: {line.error}
                            </div>
                          )}
                        </td>

                        <td>
                          {!hasError && (
                            <div className="flex items-center gap-1.5">
                              <span className="minseg">
                                <button
                                  type="button"
                                  onClick={() => setLineDirection(line.lineNo, "owes_me")}
                                  className={clsx(
                                    "px-2 py-0.5 text-[var(--text-2xs)] font-medium transition-colors cursor-pointer",
                                    effectiveDir === "owes_me"
                                      ? "on bg-[var(--ink)] text-[var(--bg)] font-bold"
                                      : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                                  )}
                                >
                                  Owes you
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLineDirection(line.lineNo, "i_owe")}
                                  className={clsx(
                                    "px-2 py-0.5 text-[var(--text-2xs)] font-medium transition-colors cursor-pointer",
                                    effectiveDir === "i_owe"
                                      ? "on bg-[var(--ink)] text-[var(--bg)] font-bold"
                                      : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                                  )}
                                >
                                  You owe
                                </button>
                              </span>
                              {!effectiveDir && (
                                <b style={{ fontSize: "var(--text-2xs)" }} className="text-[var(--warn-text)]">
                                  Choose
                                </b>
                              )}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="chips">
                            {line.terms.map((t, idx) => (
                              <i key={idx}>
                                {t.sign > 0 ? "+" : "−"}
                                {new Intl.NumberFormat("en-IN").format(t.amount)}
                                {t.note ? ` (${t.note})` : ""}
                              </i>
                            ))}
                          </div>
                        </td>

                        <td className="num" style={{ textAlign: "right", fontWeight: 650 }}>
                          {!hasError && (
                            <span className={rowBalance >= 0 ? "text-[var(--success-text)]" : "text-[var(--danger-text)]"}>
                              {rowBalance >= 0 ? "+" : "−"}
                              {new Intl.NumberFormat("en-IN").format(Math.abs(rowBalance))}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && (
              <p className="mb-2 text-[var(--danger-text)] text-[var(--text-xs)]">
                {error}
              </p>
            )}

            <DialogFooter className="flex justify-between items-center gap-2 mt-4 pt-2 border-t border-[var(--line)]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCommit}
                busy={loading}
                disabled={Boolean(unchosenName) || includedCount === 0}
                style={{ opacity: Boolean(unchosenName) || includedCount === 0 ? 0.55 : 1 }}
              >
                Import {includedCount} {includedCount === 1 ? "person" : "people"}
              </Button>
            </DialogFooter>

            {unchosenName && (
              <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--warn-text)" }}>
                Choose who owes for {unchosenName} first.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
