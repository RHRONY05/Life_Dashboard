"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { showToast } from "@/components/ui/Toast";
import {
  SpendingSummaryDto,
  SpendingDayGroupDto,
  CreateExpenseInput,
  UpdateExpenseInput,
  MoneyOverviewDto,
  EntryDto,
  CreateEntryInput,
} from "@/lib/schemas";
import { formatTaka, balanceSentence } from "@/lib/domain/money";

import { SpendTiles } from "./SpendTiles";
import { QuickSpend, QuickSpendRef } from "./QuickSpend";
import { CategoryBars } from "./CategoryBars";
import { SpendList } from "./SpendList";
import { BudgetDialog } from "./BudgetDialog";

import { MoneyTotals } from "./MoneyTotals";
import { PeopleList } from "./PeopleList";
import { HistoryPane } from "./HistoryPane";
import { EntryDialog } from "./EntryDialog";

interface MoneyClientProps {
  initialSummary: SpendingSummaryDto;
  initialDays: SpendingDayGroupDto[];
  initialHasMoreSpending: boolean;
  initialMoneyOverview: MoneyOverviewDto;
}

export function MoneyClient({
  initialSummary,
  initialDays,
  initialHasMoreSpending,
  initialMoneyOverview,
}: MoneyClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "ious" ? "ious" : "spending";

  // ─── SPENDING STATE ───
  const [summary, setSummary] = useState<SpendingSummaryDto>(initialSummary);
  const [days, setDays] = useState<SpendingDayGroupDto[]>(initialDays);
  const [hasMoreSpending, setHasMoreSpending] = useState(
    initialHasMoreSpending
  );
  const [loadingMoreSpending, setLoadingMoreSpending] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);

  const quickSpendRef = useRef<QuickSpendRef>(null);

  // ─── IOUS STATE ───
  const [moneyOverview, setMoneyOverview] =
    useState<MoneyOverviewDto>(initialMoneyOverview);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    initialMoneyOverview.people[0]?.id ?? null
  );
  const [personEntries, setPersonEntries] = useState<EntryDto[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [prefilledPersonName, setPrefilledPersonName] = useState("");

  const selectedPerson =
    moneyOverview.people.find((p) => p.id === selectedPersonId) ?? null;

  // Sync state when props change
  useEffect(() => {
    Promise.resolve().then(() => {
      setSummary(initialSummary);
    });
  }, [initialSummary]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setDays(initialDays);
    });
  }, [initialDays]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setMoneyOverview(initialMoneyOverview);
    });
  }, [initialMoneyOverview]);

  useEffect(() => {
    if (!selectedPersonId && moneyOverview.people.length > 0) {
      Promise.resolve().then(() => {
        setSelectedPersonId(moneyOverview.people[0].id);
      });
    }
  }, [moneyOverview.people, selectedPersonId]);

  // Load entries when selectedPersonId changes
  useEffect(() => {
    if (!selectedPersonId) {
      Promise.resolve().then(() => {
        setPersonEntries([]);
      });
      return;
    }

    let isCancelled = false;
    async function fetchEntries() {
      setLoadingEntries(true);
      try {
        const res = await fetch(`/api/money/people/${selectedPersonId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setPersonEntries(data.entries);
          }
        }
      } catch {
        // Handled
      } finally {
        if (!isCancelled) setLoadingEntries(false);
      }
    }

    fetchEntries();
    return () => {
      isCancelled = true;
    };
  }, [selectedPersonId]);

  // Keyboard shortcut: 'a' to add
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        if (activeTab === "spending") {
          quickSpendRef.current?.focusAmount();
        } else {
          setPrefilledPersonName("");
          setEntryDialogOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  const handleTabChange = (id: string) => {
    if (id === "ious") {
      router.push("/money?tab=ious");
    } else {
      router.push("/money");
    }
  };

  // ─── SPENDING HANDLERS ───

  const handleAddExpense = async (input: CreateExpenseInput) => {
    const res = await fetch("/api/spending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to add spend");
    }

    const data = await res.json();
    setSummary(data.summary);

    // Refresh days list
    const refreshRes = await fetch("/api/spending", { cache: "no-store" });
    if (refreshRes.ok) {
      const daysData = await refreshRes.json();
      setDays(daysData.days);
      setHasMoreSpending(daysData.hasMore);
    }

    const catLabel =
      input.category.charAt(0).toUpperCase() + input.category.slice(1);
    showToast(`Added ${formatTaka(input.amount)} · ${catLabel}`);
  };

  const handleUpdateExpense = async (
    id: string,
    input: UpdateExpenseInput
  ) => {
    const res = await fetch(`/api/spending/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update spend");
    }

    const data = await res.json();
    setSummary(data.summary);

    const refreshRes = await fetch("/api/spending", { cache: "no-store" });
    if (refreshRes.ok) {
      const daysData = await refreshRes.json();
      setDays(daysData.days);
    }

    showToast("Updated spend");
  };

  const handleDeleteExpense = async (id: string) => {
    const res = await fetch(`/api/spending/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete spend");
    }

    const data = await res.json();
    setSummary(data.summary);

    const refreshRes = await fetch("/api/spending", { cache: "no-store" });
    if (refreshRes.ok) {
      const daysData = await refreshRes.json();
      setDays(daysData.days);
    }

    showToast("Deleted spend");
  };

  const handleSaveBudget = async (budget: number | null) => {
    const res = await fetch("/api/settings/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyBudget: budget }),
    });

    if (!res.ok) {
      throw new Error("Failed to update budget");
    }

    const updatedSummary = await res.json();
    setSummary(updatedSummary);
    showToast(budget !== null ? "Budget updated" : "Budget removed");
  };

  const handleLoadMoreSpending = async () => {
    if (!hasMoreSpending || days.length === 0) return;
    const oldestDay = days[days.length - 1].day;
    setLoadingMoreSpending(true);
    try {
      const res = await fetch(`/api/spending?before=${oldestDay}`);
      if (res.ok) {
        const data = await res.json();
        setDays((prev) => [...prev, ...data.days]);
        setHasMoreSpending(data.hasMore);
      }
    } finally {
      setLoadingMoreSpending(false);
    }
  };

  // ─── IOUS HANDLERS ───

  const handleAddEntry = async (input: CreateEntryInput) => {
    const res = await fetch("/api/money/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to add IOU entry");
    }

    const { person } = await res.json();

    // Refresh overview
    const overviewRes = await fetch("/api/money", { cache: "no-store" });
    if (overviewRes.ok) {
      const newOverview = await overviewRes.json();
      setMoneyOverview(newOverview);
    }

    setSelectedPersonId(person.id);

    // Refresh person entries
    const entriesRes = await fetch(`/api/money/people/${person.id}`, {
      cache: "no-store",
    });
    if (entriesRes.ok) {
      const entriesData = await entriesRes.json();
      setPersonEntries(entriesData.entries);
    }

    showToast(`Saved: ${balanceSentence(person.balance, person.name)} now`);
  };

  const handleSettle = async (personId: string) => {
    const res = await fetch(`/api/money/people/${personId}/settle`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error("Failed to settle person");
    }

    const { person } = await res.json();

    const overviewRes = await fetch("/api/money", { cache: "no-store" });
    if (overviewRes.ok) {
      const newOverview = await overviewRes.json();
      setMoneyOverview(newOverview);
    }

    const entriesRes = await fetch(`/api/money/people/${personId}`, {
      cache: "no-store",
    });
    if (entriesRes.ok) {
      const entriesData = await entriesRes.json();
      setPersonEntries(entriesData.entries);
    }

    showToast(`${person.name} settled`);
  };

  const handleDeleteEntry = async (entryId: string) => {
    const res = await fetch(`/api/money/entries/${entryId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete entry");
    }

    const overviewRes = await fetch("/api/money", { cache: "no-store" });
    if (overviewRes.ok) {
      const newOverview = await overviewRes.json();
      setMoneyOverview(newOverview);
    }

    if (selectedPersonId) {
      const entriesRes = await fetch(
        `/api/money/people/${selectedPersonId}`,
        { cache: "no-store" }
      );
      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setPersonEntries(entriesData.entries);
      }
    }

    showToast("Deleted entry");
  };

  const handleRenamePerson = async (personId: string, newName: string) => {
    const res = await fetch(`/api/money/people/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to rename person");
    }

    const updated = await res.json();

    const overviewRes = await fetch("/api/money", { cache: "no-store" });
    if (overviewRes.ok) {
      const newOverview = await overviewRes.json();
      setMoneyOverview(newOverview);
    }

    showToast(`Renamed to ${updated.name}`);
  };

  const handleDeletePerson = async (personId: string) => {
    const res = await fetch(`/api/money/people/${personId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete person");
    }

    const overviewRes = await fetch("/api/money", { cache: "no-store" });
    if (overviewRes.ok) {
      const newOverview: MoneyOverviewDto = await overviewRes.json();
      setMoneyOverview(newOverview);
      setSelectedPersonId(newOverview.people[0]?.id ?? null);
    }

    showToast("Deleted person and entries");
  };

  // Calculate today's spend count
  const todayGroup = days.find(
    (d) => d.day === new Date().toISOString().split("T")[0]
  );
  const todayCount = todayGroup ? todayGroup.expenses.length : 0;

  return (
    <div className="page flex-1 max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="page-head flex flex-wrap items-center gap-4 mb-6">
        <h1 className="text-[var(--text-2xl)] font-bold font-display tracking-tight text-[var(--ink)]">
          Money
        </h1>

        <Segmented
          items={[
            { id: "spending", label: "Spending" },
            { id: "ious", label: "IOUs" },
          ]}
          value={activeTab}
          onChange={handleTabChange}
        />

        <span className="sub text-[var(--text-sm)] text-[var(--ink-3)] hidden sm:inline">
          {activeTab === "spending"
            ? "What you spend, in taka"
            : "Who owes whom, in taka"}
        </span>

        {activeTab === "ious" && (
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => {
                setPrefilledPersonName("");
                setEntryDialogOpen(true);
              }}
              className="btn btn-primary h-9 px-3.5 flex items-center gap-1.5 text-[var(--text-sm)] font-medium"
            >
              <Plus className="w-4 h-4" />
              Add entry
              <kbd className="ml-1 bg-transparent text-inherit border-current opacity-70 text-[10px] px-1 py-0.5 border rounded">
                A
              </kbd>
            </button>
          </div>
        )}
      </div>

      {activeTab === "spending" ? (
        <>
          {/* Spending Tiles */}
          <SpendTiles
            summary={summary}
            todayCount={todayCount}
            onEditBudget={() => setBudgetDialogOpen(true)}
          />

          {/* Spend Main Grid */}
          <div className="spend-grid">
            <section className="card overflow-hidden">
              <QuickSpend
                ref={quickSpendRef}
                onAdd={handleAddExpense}
              />
              <SpendList
                days={days}
                hasMore={hasMoreSpending}
                onLoadMore={handleLoadMoreSpending}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
                onFocusInput={() => quickSpendRef.current?.focusAmount()}
                loadingMore={loadingMoreSpending}
              />
            </section>

            <CategoryBars summary={summary} />
          </div>

          <BudgetDialog
            open={budgetDialogOpen}
            onOpenChange={setBudgetDialogOpen}
            currentBudget={summary.budget}
            onSave={handleSaveBudget}
          />
        </>
      ) : (
        <>
          {/* IOUs Totals */}
          <MoneyTotals
            totals={moneyOverview.totals}
            people={moneyOverview.people}
          />

          {/* IOUs Main Grid */}
          <div className="money-grid grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <PeopleList
              people={moneyOverview.people}
              selectedPersonId={selectedPersonId}
              onSelectPerson={(id) => setSelectedPersonId(id)}
              onSettle={handleSettle}
              onOpenAddEntry={(name) => {
                setPrefilledPersonName(name || "");
                setEntryDialogOpen(true);
              }}
              mobileExpandedEntries={personEntries}
            />

            <div className="hidden lg:block">
              <HistoryPane
                person={selectedPerson}
                entries={personEntries}
                loadingEntries={loadingEntries}
                onSettle={handleSettle}
                onDeleteEntry={handleDeleteEntry}
                onRenamePerson={handleRenamePerson}
                onDeletePerson={handleDeletePerson}
              />
            </div>
          </div>

          <EntryDialog
            open={entryDialogOpen}
            onOpenChange={setEntryDialogOpen}
            people={moneyOverview.people}
            prefilledPersonName={prefilledPersonName}
            onSubmit={handleAddEntry}
          />
        </>
      )}
    </div>
  );
}
