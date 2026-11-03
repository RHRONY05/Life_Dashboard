"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Archive, ChevronLeft } from "lucide-react";
import {
  TrackerDetailDto,
  TrackerSummaryDto,
} from "@/lib/schemas";
import { TrackerCard } from "./TrackerCard";
import { TrackerDetail } from "./TrackerDetail";
import { NewTrackerDialog } from "./NewTrackerDialog";
import { Button } from "@/components/ui/Button";
import { Illustration } from "@/components/illustrations";
import Link from "next/link";
import { toast } from "sonner";

interface TrackersClientProps {
  initialTrackers: TrackerSummaryDto[];
  initialDetail?: TrackerDetailDto | null;
  selectedId?: string;
  isMobileSingleView?: boolean;
}

export function TrackersClient({
  initialTrackers,
  initialDetail,
  selectedId,
  isMobileSingleView = false,
}: TrackersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [trackers, setTrackers] = useState<TrackerSummaryDto[]>(initialTrackers);
  const [showArchived, setShowArchived] = useState(false);
  const [newTrackerOpen, setNewTrackerOpen] = useState(false);

  // Active tracker selection
  const effectiveSelectedId = useMemo(() => {
    if (selectedId) return selectedId;
    const paramId = searchParams.get("id");
    if (paramId) return paramId;
    const active = trackers.filter((t) => !t.archived);
    return active[0]?.id || trackers[0]?.id || null;
  }, [selectedId, searchParams, trackers]);

  const [detail, setDetail] = useState<TrackerDetailDto | null>(
    initialDetail || null
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Filter active / archived trackers
  const visibleTrackers = useMemo(() => {
    return trackers.filter((t) => (showArchived ? t.archived : !t.archived));
  }, [trackers, showArchived]);

  const archivedCount = useMemo(() => {
    return trackers.filter((t) => t.archived).length;
  }, [trackers]);

  // Fetch detail when selection changes
  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/trackers/${id}`);
      if (!res.ok) throw new Error("Failed to load tracker detail");
      const data: TrackerDetailDto = await res.json();
      setDetail(data);
    } catch {
      toast.error("Couldn't load tracker.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    if (!effectiveSelectedId) {
      Promise.resolve().then(() => {
        if (!ignore) setDetail(null);
      });
      return;
    }

    if (detail && detail.tracker.id === effectiveSelectedId) {
      return;
    }

    Promise.resolve().then(() => {
      if (!ignore) setLoadingDetail(true);
    });

    fetch(`/api/trackers/${effectiveSelectedId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TrackerDetailDto | null) => {
        if (!ignore && data) {
          setDetail(data);
        }
      })
      .catch(() => {
        if (!ignore) toast.error("Couldn't load tracker.");
      })
      .finally(() => {
        if (!ignore) setLoadingDetail(false);
      });

    return () => {
      ignore = true;
    };
  }, [effectiveSelectedId, detail]);

  // Refresh tracker list from server
  const refreshTrackers = useCallback(async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        fetch("/api/trackers?archived=0"),
        fetch("/api/trackers?archived=1"),
      ]);
      if (activeRes.ok && archivedRes.ok) {
        const activeData = await activeRes.json();
        const archivedData = await archivedRes.json();
        setTrackers([...(activeData.trackers || []), ...(archivedData.trackers || [])]);
      }
    } catch (err) {
      console.error("Failed to refresh trackers", err);
    }
  }, []);

  const handleSelectTracker = (id: string) => {
    // On small screens, navigate to /trackers/[id]
    if (window.innerWidth < 1024) {
      router.push(`/trackers/${id}`);
    } else {
      // Desktop: update query param in URL without full refresh
      const url = new URL(window.location.href);
      url.pathname = "/trackers";
      url.searchParams.set("id", id);
      window.history.replaceState({}, "", url.toString());
      fetchDetail(id);
    }
  };

  const handleTrackerCreated = (newTracker: TrackerSummaryDto) => {
    setTrackers((prev) => [newTracker, ...prev]);
    handleSelectTracker(newTracker.id);
  };

  const handleTrackerUpdated = (updated: TrackerSummaryDto) => {
    setTrackers((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    if (detail && detail.tracker.id === updated.id) {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              tracker: {
                ...prev.tracker,
                name: updated.name,
                description: updated.description,
                archived: updated.archived,
              },
            }
          : null
      );
    }
  };

  const handleTrackerDeleted = (deletedId: string) => {
    setTrackers((prev) => prev.filter((t) => t.id !== deletedId));
    setDetail(null);
    const remaining = trackers.filter((t) => t.id !== deletedId && !t.archived);
    if (remaining.length > 0) {
      handleSelectTracker(remaining[0].id);
    } else {
      router.push("/trackers");
    }
  };

  // Flattened list of visible item ids in detail for j/k keyboard shortcuts
  const allItemIds = useMemo(() => {
    if (!detail) return [];
    return detail.groups.flatMap((g) => g.items.map((i) => i.id));
  }, [detail]);

  // Keyboard navigation: j, k, x, e
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when inside input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        if (allItemIds.length === 0) return;

        const currentIndex = focusedItemId
          ? allItemIds.indexOf(focusedItemId)
          : -1;

        let nextIndex = 0;
        if (e.key === "j") {
          nextIndex =
            currentIndex < allItemIds.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex =
            currentIndex > 0 ? currentIndex - 1 : allItemIds.length - 1;
        }

        const nextId = allItemIds[nextIndex];
        setFocusedItemId(nextId);
        const itemEl = document.querySelector(`[data-item-id="${nextId}"]`);
        itemEl?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "x" && focusedItemId) {
        e.preventDefault();
        // Toggle done on focused item
        const itemEl = document.querySelector(
          `[data-item-id="${focusedItemId}"] button[role="checkbox"]`
        ) as HTMLElement | null;
        itemEl?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allItemIds, focusedItemId]);

  // Mobile Single View (e.g. /trackers/[id] on mobile)
  if (isMobileSingleView && detail) {
    return (
      <div className="page max-w-[1440px] mx-auto p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/trackers">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Trackers
            </Button>
          </Link>
        </div>

        <TrackerDetail
          trackerId={detail.tracker.id}
          detail={detail}
          onTrackerUpdated={handleTrackerUpdated}
          onTrackerDeleted={handleTrackerDeleted}
          onItemsMutated={() => {
            fetchDetail(detail.tracker.id);
            refreshTrackers();
          }}
          focusedItemId={focusedItemId}
          onItemFocus={setFocusedItemId}
        />
      </div>
    );
  }

  // Empty State when user has 0 trackers ever (10-STATES: trackers-empty)
  if (trackers.length === 0) {
    return (
      <div className="page max-w-[1440px] mx-auto p-3 sm:p-4 md:p-8">
        <div className="page-head flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
              Trackers
            </h1>
            <span className="sub text-[var(--ink-3)] text-sm font-medium hidden sm:inline">
              Lists you work through, one item at a time
            </span>
          </div>
          <Button
            variant="primary"
            onClick={() => setNewTrackerOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New tracker
          </Button>
        </div>

        <div className="py-16 flex flex-col items-center justify-center text-center">
          <Illustration name="trackers-empty" size="lg" className="mb-4" />
          <h2 className="text-lg font-bold text-[var(--ink)] mb-1">
            No trackers yet
          </h2>
          <p className="text-sm text-[var(--ink-3)] max-w-sm mb-6">
            Make a list you want to work through: a problem set, a reading list,
            a course.
          </p>
          <Button
            variant="primary"
            onClick={() => setNewTrackerOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New tracker
          </Button>
        </div>

        <NewTrackerDialog
          open={newTrackerOpen}
          onOpenChange={setNewTrackerOpen}
          onTrackerCreated={handleTrackerCreated}
        />
      </div>
    );
  }

  return (
    <div className="page max-w-[1440px] mx-auto p-3 sm:p-4 md:p-8">
      {/* Page Header */}
      <div className="page-head flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
            Trackers
          </h1>
          <span className="sub text-[var(--ink-3)] text-sm font-medium hidden sm:inline">
            Lists you work through, one item at a time
          </span>
        </div>
        <Button
          variant="primary"
          onClick={() => setNewTrackerOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New tracker
        </Button>
      </div>

      {/* Two-Pane Layout (desktop ≥ 1024px; mobile shows list only or detail only) */}
      <div className="two-pane block lg:grid">
        {/* Left Pane: Tracker List */}
        <div className="mb-6 lg:mb-0">
          <div className="flex flex-col gap-2.5">
            {visibleTrackers.map((t) => (
              <TrackerCard
                key={t.id}
                tracker={t}
                isSelected={detail?.tracker.id === t.id}
                onClick={() => handleSelectTracker(t.id)}
              />
            ))}
          </div>

          {/* Archived Toggle */}
          {archivedCount > 0 && (
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowArchived((prev) => !prev)}
                className="text-xs text-[var(--ink-3)]"
              >
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                {showArchived
                  ? "Back to active"
                  : `Archived (${archivedCount})`}
              </Button>
            </div>
          )}
        </div>

        {/* Right Pane: Detail (Hidden on mobile < 1024px, shown on desktop ≥ 1024px) */}
        <div className="hidden lg:block min-w-0">
          {detail ? (
            <TrackerDetail
              trackerId={detail.tracker.id}
              detail={detail}
              onTrackerUpdated={handleTrackerUpdated}
              onTrackerDeleted={handleTrackerDeleted}
              onItemsMutated={() => {
                fetchDetail(detail.tracker.id);
                refreshTrackers();
              }}
              focusedItemId={focusedItemId}
              onItemFocus={setFocusedItemId}
            />
          ) : loadingDetail ? (
            <div className="card p-12 text-center text-sm text-[var(--ink-3)]">
              Loading tracker…
            </div>
          ) : (
            <div className="card p-12 text-center text-sm text-[var(--ink-3)]">
              Select a tracker to view details
            </div>
          )}
        </div>
      </div>

      <NewTrackerDialog
        open={newTrackerOpen}
        onOpenChange={setNewTrackerOpen}
        onTrackerCreated={handleTrackerCreated}
      />
    </div>
  );
}
