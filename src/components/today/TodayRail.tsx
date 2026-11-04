"use client";

import React from "react";
import Link from "next/link";
import {
  TrackerSummaryDto,
  SpendingSummaryDto,
  MoneyTotalsDto,
} from "@/lib/schemas";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BudgetBar } from "@/components/money/BudgetBar";
import { formatTaka } from "@/lib/domain/money";

interface TodayRailProps {
  trackers?: TrackerSummaryDto[];
  spendingSummary?: SpendingSummaryDto;
  moneyTotals?: MoneyTotalsDto;
  toPayTotal?: number;
  toPayCount?: number;
  hasOverdueToPay?: boolean;
}

export function TodayRail({
  trackers = [],
  spendingSummary,
  moneyTotals,
  toPayTotal,
  toPayCount = 0,
  hasOverdueToPay = false,
}: TodayRailProps) {
  const activeTrackers = trackers.filter((t) => !t.archived);

  const hasSpending =
    spendingSummary &&
    (spendingSummary.today > 0 ||
      spendingSummary.month > 0 ||
      spendingSummary.budget !== null);

  const hasIOUs =
    moneyTotals && (moneyTotals.owedToMe > 0 || moneyTotals.iOwe > 0);

  const hasToPay = toPayCount > 0;

  const showMoneyBlock = hasSpending || hasIOUs || hasToPay;

  return (
    <aside className="rail hidden lg:flex flex-col gap-4 w-[320px] flex-none">
      {/* 1. Quick Links Card */}
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

      {/* 2. Coming Up Card */}
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

      {/* 3. Money Rail Block (06-UI §TodayRail) */}
      {showMoneyBlock && (
        <section className="card">
          <div className="card-head">
            <h3>Money</h3>
            <Link
              href="/money"
              className="text-[var(--text-sm)] text-[var(--accent-text)] font-medium"
            >
              Open Money →
            </Link>
          </div>
          <div className="card-body flex flex-col gap-3">
            {hasSpending && spendingSummary && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[var(--text-sm)]">
                  <span className="text-[var(--ink-2)]">Spent today</span>
                  <b className="num font-semibold text-[var(--ink)]">
                    {formatTaka(spendingSummary.today)}
                  </b>
                </div>
                <BudgetBar
                  budget={spendingSummary.budget}
                  budgetLeft={spendingSummary.budgetLeft}
                  budgetPct={spendingSummary.budgetPct}
                  monthSpent={spendingSummary.month}
                />
              </div>
            )}

            {hasSpending && hasIOUs && (
              <div className="border-t border-[var(--line)]" />
            )}

            {hasIOUs && moneyTotals && (
              <div className="flex items-center justify-between text-[var(--text-sm)] flex-wrap gap-1">
                {moneyTotals.owedToMe > 0 && (
                  <span className="text-[var(--success-text)] font-medium">
                    Others owe you {formatTaka(moneyTotals.owedToMe)}
                  </span>
                )}
                {moneyTotals.iOwe > 0 && (
                  <span className="text-[var(--danger-text)] font-medium">
                    You owe {formatTaka(moneyTotals.iOwe)}
                  </span>
                )}
              </div>
            )}

            {hasToPay && (
              <>
                {(hasSpending || hasIOUs) && (
                  <div className="border-t border-[var(--line)]" />
                )}
                <Link
                  href="/money?tab=topay"
                  className="flex items-center justify-between text-[var(--text-sm)] group hover:underline"
                >
                  <span className="text-[var(--ink-2)] group-hover:text-[var(--ink)]">
                    To pay
                  </span>
                  <span className="font-semibold">
                    <span
                      className={
                        hasOverdueToPay
                          ? "text-[var(--danger-text)] font-semibold"
                          : "text-[var(--ink)]"
                      }
                    >
                      {formatTaka(toPayTotal ?? 0)}
                    </span>
                    <span className="text-[var(--ink-3)] font-normal">
                      {" · "}
                      {toPayCount}
                    </span>
                  </span>
                </Link>
              </>
            )}
          </div>
        </section>
      )}

      {/* 4. Trackers Rail Block (06-UI §TodayRail: max 4 non-archived trackers) */}
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
