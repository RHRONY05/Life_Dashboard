"use client";

import React from "react";
import Link from "next/link";
import {
  TrackerSummaryDto,
  SpendingSummaryDto,
  MoneyTotalsDto,
  RenewalDto,
  LinkDto,
} from "@/lib/schemas";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { BudgetBar } from "@/components/money/BudgetBar";
import { Badge } from "@/components/ui/Badge";
import { formatTaka } from "@/lib/domain/money";
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

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

interface TodayRailProps {
  trackers?: TrackerSummaryDto[];
  spendingSummary?: SpendingSummaryDto;
  moneyTotals?: MoneyTotalsDto;
  toPayTotal?: number;
  toPayCount?: number;
  hasOverdueToPay?: boolean;
  upcomingRenewals?: RenewalDto[];
  links?: LinkDto[];
}

function getLinkIcon(iconName: string): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  switch (iconName) {
    case "book-open":
      return BookOpen;
    case "graduation-cap":
      return GraduationCap;
    case "briefcase":
      return Briefcase;
    case "user":
      return User;
    case "github":
      return GithubIcon;
    case "linkedin":
      return LinkedinIcon;
    case "globe":
      return Globe;
    case "code":
      return Code;
    case "mail":
      return Mail;
    case "link":
    default:
      return LinkIcon;
  }
}

export function TodayRail({
  trackers = [],
  spendingSummary,
  moneyTotals,
  toPayTotal,
  toPayCount = 0,
  hasOverdueToPay = false,
  upcomingRenewals = [],
  links = [],
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
          {links.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {links.map((link) => {
                const IconComponent = getLinkIcon(link.icon);
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-md bg-surface-2 hover:bg-surface-3 transition-colors text-xs font-semibold text-ink truncate"
                  >
                    <IconComponent className="w-3.5 h-3.5 text-accent-text flex-shrink-0" />
                    <span className="truncate">{link.title}</span>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-[var(--text-sm)] text-[var(--ink-3)] m-0">
              Add links to your other tools in Settings.
            </p>
          )}
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
          {upcomingRenewals.length > 0 ? (
            <div className="flex flex-col gap-2">
              {upcomingRenewals.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-sm py-1 border-b border-line last:border-0"
                >
                  <span className="font-medium text-ink truncate mr-2">
                    {r.name}
                  </span>
                  <Badge
                    variant={
                      r.state === "overdue"
                        ? "danger"
                        : r.state === "due_soon"
                        ? "warn"
                        : "neutral"
                    }
                  >
                    {r.dueLabel}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-sm)] text-[var(--ink-3)] m-0">
              Nothing renews in the next 2 weeks.
            </p>
          )}
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
