"use client";

import React from "react";
import Link from "next/link";
import { TrackerSummaryDto } from "@/lib/schemas";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface TodayRailProps {
  trackers?: TrackerSummaryDto[];
}

export function TodayRail({ trackers = [] }: TodayRailProps) {
  const activeTrackers = trackers.filter((t) => !t.archived);

  return (
    <aside className="rail hidden lg:flex flex-col gap-4 w-[320px] flex-none">
      {/* Quick Links Card */}
      <section className="card">
        <div className="card-head">
          <h3>Quick links</h3>
          <Link
            href="/settings#links"
            className="text-[var(--text-sm)] text-[var(--accent-text)] font-medium"
          >
            Edit
          </Link>
        </div>
        <div className="card-body">
          <p className="text-[var(--text-sm)] text-[var(--ink-3)] m-0">
            Add links to your other tools in Settings.
          </p>
        </div>
      </section>

      {/* Coming Up Card */}
      <section className="card">
        <div className="card-head">
          <h3>Coming up</h3>
          <Link
            href="/renewals"
            className="text-[var(--text-sm)] text-[var(--accent-text)] font-medium"
          >
            All renewals →
          </Link>
        </div>
        <div className="card-body">
          <p className="text-[var(--text-sm)] text-[var(--ink-3)] m-0">
            Nothing renews in the next 2 weeks.
          </p>
        </div>
      </section>

      {/* Trackers Rail Block (06-UI §TodayRail: max 4 non-archived trackers) */}
      {activeTrackers.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h3>Trackers</h3>
            <Link
              href="/trackers"
              className="text-[var(--text-sm)] text-[var(--accent-text)] font-medium"
            >
              All trackers →
            </Link>
          </div>
          <div className="card-body flex flex-col gap-3">
            {activeTrackers.slice(0, 4).map((t) => {
              const pct =
                t.total === 0 ? 0 : Math.round((t.done / t.total) * 100);
              return (
                <Link
                  key={t.id}
                  href={`/trackers?id=${t.id}`}
                  className="block group hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center justify-between text-[var(--text-sm)] mb-1">
                    <span className="font-semibold text-[var(--ink)] group-hover:text-[var(--accent-text)]">
                      {t.name}
                    </span>
                    <span className="text-[var(--text-xs)] text-[var(--ink-3)] font-mono">
                      {t.done} / {t.total}
                    </span>
                  </div>
                  <ProgressBar value={pct} />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </aside>
  );
}
