"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  RenewalDto,
  CreateRenewalInput,
  RenewalsResponseDto,
} from "@/lib/schemas";
import { formatMonthlyTotals } from "@/lib/domain/renewals";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RenewalRow } from "./RenewalRow";
import { RenewalDialog } from "./RenewalDialog";

interface RenewalsClientProps {
  initialData: RenewalsResponseDto;
}

export function RenewalsClient({ initialData }: RenewalsClientProps) {
  const [statusTab, setStatusTab] = useState<"active" | "ended">("active");
  const [renewals, setRenewals] = useState<RenewalDto[]>(initialData.renewals);
  const [monthly, setMonthly] = useState<{ BDT: number; USD: number }>(
    initialData.monthly
  );
  const [counts, setCounts] = useState<{ overdue: number; dueSoon: number }>(
    initialData.counts
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRenewal, setEditingRenewal] = useState<RenewalDto | null>(null);

  // Refetch when tab changes or data changes
  const fetchRenewals = useCallback(async (status: "active" | "ended") => {
    try {
      const res = await fetch(`/api/renewals?status=${status}`);
      if (res.ok) {
        const data: RenewalsResponseDto = await res.json();
        setRenewals(data.renewals);
        setMonthly(data.monthly);
        setCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to fetch renewals:", err);
    }
  }, []);

  const handleTabChange = (val: string) => {
    const nextTab = val as "active" | "ended";
    setStatusTab(nextTab);
    fetchRenewals(nextTab);
  };

  // Keyboard shortcut 'a' to open Add Renewal dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "a" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setEditingRenewal(null);
        setDialogOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSave = async (data: CreateRenewalInput) => {
    if (editingRenewal) {
      const res = await fetch(`/api/renewals/${editingRenewal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to update renewal");
      }
      toast.success("Renewal updated");
    } else {
      const res = await fetch("/api/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to add renewal");
      }
      toast.success(`Added ${data.name}`);
    }
    await fetchRenewals(statusTab);
  };

  const handleRenewed = async (renewal: RenewalDto) => {
    const oldRenewsOn = renewal.renewsOn;
    try {
      const res = await fetch(`/api/renewals/${renewal.id}/renewed`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || "Failed to renew");
        return;
      }
      const updated: RenewalDto = await res.json();
      await fetchRenewals(statusTab);

      // Sonner toast with 10s Undo
      toast(`Next: ${updated.dueLabel || updated.renewsOn}`, {
        duration: 10_000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await fetch(`/api/renewals/${renewal.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ renewsOn: oldRenewsOn }),
              });
              await fetchRenewals(statusTab);
              toast.success("Renewal reverted");
            } catch {
              toast.error("Failed to revert renewal");
            }
          },
        },
      });
    } catch {
      toast.error("Network error");
    }
  };

  const handleEnded = async (renewal: RenewalDto) => {
    try {
      const res = await fetch(`/api/renewals/${renewal.id}/ended`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Failed to mark ended");
        return;
      }
      toast.success(`Marked ${renewal.name} as ended`);
      await fetchRenewals(statusTab);
    } catch {
      toast.error("Network error");
    }
  };

  const handleDelete = async (renewal: RenewalDto) => {
    try {
      const res = await fetch(`/api/renewals/${renewal.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete renewal");
        return;
      }
      toast.success(`Deleted ${renewal.name}`);
      await fetchRenewals(statusTab);
    } catch {
      toast.error("Network error");
    }
  };

  // Group active items per 06-UI & design
  const overdueItems = renewals.filter(
    (r) => r.daysLeft !== null && r.daysLeft < 0
  );
  const next30Items = renewals.filter(
    (r) => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30
  );
  const laterItems = renewals.filter(
    (r) => r.daysLeft !== null && r.daysLeft > 30
  );
  const noDateItems = renewals.filter((r) => r.daysLeft === null);

  const dueSoonInNext30 = next30Items.filter((r) => r.state === "due_soon").length;

  return (
    <div className="page max-w-[1440px] mx-auto p-3 sm:p-4 md:p-8">
      {/* Header */}
      <div className="page-head flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
            Renewals
          </h1>
          <span className="sub num text-ink-3 text-sm font-medium">
            {formatMonthlyTotals(monthly)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Segmented
            value={statusTab}
            onChange={handleTabChange}
            items={[
              { id: "active", label: "Active" },
              { id: "ended", label: "Ended" },
            ]}
          />
          <Button
            variant="primary"
            onClick={() => {
              setEditingRenewal(null);
              setDialogOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add renewal
          </Button>
        </div>
      </div>

      {/* Overdue Banner on Active Tab */}
      {statusTab === "active" && counts.overdue > 0 && (
        <div className="mb-6">
          <Banner variant="danger">
            {counts.overdue} overdue: mark them renewed or ended.
          </Banner>
        </div>
      )}

      {/* Active Tab Content */}
      {statusTab === "active" && (
        <>
          {renewals.length === 0 ? (
            <EmptyState
              illustration="renewals-empty"
              title="No renewals yet."
              description="Add the things that end or charge you: subscriptions, hosting, domains, student credits."
              action={
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingRenewal(null);
                    setDialogOpen(true);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add renewal
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-6">
              {/* 1. Overdue Group */}
              {overdueItems.length > 0 && (
                <div className="r-group">
                  <h3>
                    <span>Overdue</span>
                    <Badge variant="danger">{overdueItems.length} overdue</Badge>
                  </h3>
                  <section className="card bg-surface rounded-lg border border-frame overflow-hidden">
                    {overdueItems.map((renewal) => (
                      <RenewalRow
                        key={renewal.id}
                        renewal={renewal}
                        onEdit={(r) => {
                          setEditingRenewal(r);
                          setDialogOpen(true);
                        }}
                        onRenewed={handleRenewed}
                        onEnded={handleEnded}
                        onDelete={handleDelete}
                      />
                    ))}
                  </section>
                </div>
              )}

              {/* 2. Next 30 Days Group */}
              {next30Items.length > 0 && (
                <div className="r-group">
                  <h3>
                    <span>Next 30 days</span>
                    {dueSoonInNext30 > 0 && (
                      <Badge variant="warn">{dueSoonInNext30} due soon</Badge>
                    )}
                  </h3>
                  <section className="card bg-surface rounded-lg border border-frame overflow-hidden">
                    {next30Items.map((renewal) => (
                      <RenewalRow
                        key={renewal.id}
                        renewal={renewal}
                        onEdit={(r) => {
                          setEditingRenewal(r);
                          setDialogOpen(true);
                        }}
                        onRenewed={handleRenewed}
                        onEnded={handleEnded}
                        onDelete={handleDelete}
                      />
                    ))}
                  </section>
                </div>
              )}

              {/* 3. Later Group */}
              {laterItems.length > 0 && (
                <div className="r-group">
                  <h3>Later</h3>
                  <section className="card bg-surface rounded-lg border border-frame overflow-hidden">
                    {laterItems.map((renewal) => (
                      <RenewalRow
                        key={renewal.id}
                        renewal={renewal}
                        onEdit={(r) => {
                          setEditingRenewal(r);
                          setDialogOpen(true);
                        }}
                        onRenewed={handleRenewed}
                        onEnded={handleEnded}
                        onDelete={handleDelete}
                      />
                    ))}
                  </section>
                </div>
              )}

              {/* 4. No Date Group */}
              {noDateItems.length > 0 && (
                <div className="r-group">
                  <h3>No date</h3>
                  <section className="card bg-surface rounded-lg border border-frame overflow-hidden">
                    {noDateItems.map((renewal) => (
                      <RenewalRow
                        key={renewal.id}
                        renewal={renewal}
                        onEdit={(r) => {
                          setEditingRenewal(r);
                          setDialogOpen(true);
                        }}
                        onRenewed={handleRenewed}
                        onEnded={handleEnded}
                        onDelete={handleDelete}
                      />
                    ))}
                  </section>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Ended Tab Content */}
      {statusTab === "ended" && (
        <>
          {renewals.length === 0 ? (
            <div className="card p-8 text-center text-ink-3 text-sm bg-surface rounded-lg border border-frame">
              Nothing has ended yet.
            </div>
          ) : (
            <section className="card bg-surface rounded-lg border border-frame overflow-hidden">
              {renewals.map((renewal) => (
                <RenewalRow
                  key={renewal.id}
                  renewal={renewal}
                  onEdit={(r) => {
                    setEditingRenewal(r);
                    setDialogOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </section>
          )}
        </>
      )}

      {/* Add / Edit Dialog */}
      <RenewalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        renewal={editingRenewal}
        onSave={handleSave}
      />
    </div>
  );
}
