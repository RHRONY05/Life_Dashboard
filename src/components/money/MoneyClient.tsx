"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, MoreHorizontal, Download, ClipboardPaste } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { showToast } from "@/components/ui/Toast";
import {
  SpendingSummaryDto,
  SpendingDayGroupDto,
  CreateExpenseInput,
  UpdateExpenseInput,
  MoneyOverviewDto,
  PersonDto,
  EntryDto,
  CreateEntryInput,
  UpdateEntryInput,
} from "@/lib/schemas";
import { formatTaka, balanceSentence } from "@/lib/domain/money";
import { todayIn, addDays } from "@/lib/domain/dates";

const APP_TIMEZONE = "Asia/Dhaka";

import { SpendTiles } from "./SpendTiles";
import { QuickSpend, QuickSpendRef } from "./QuickSpend";
import { CategoryBars } from "./CategoryBars";
import { SpendList } from "./SpendList";
import { BudgetDialog } from "./BudgetDialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";

import { MoneyTotals } from "./MoneyTotals";
import { PeopleList } from "./PeopleList";
import { HistoryPane } from "./HistoryPane";
import { EntryDialog } from "./EntryDialog";
import { ImportDialog } from "./ImportDialog";

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
  const [prefilledPerson, setPrefilledPerson] = useState<PersonDto | null>(null);
  const [editingEntry, setEditingEntry] = useState<EntryDto | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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

  const handleUpdateEntry = async (id: string, input: UpdateEntryInput) => {
    const res = await fetch(`/api/money/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update entry");
    }

    const { person } = await res.json();

    const overviewRes = await fetch("/api/money", { cache: "no-store" });
    if (overviewRes.ok) {
      const newOverview = await overviewRes.json();
      setMoneyOverview(newOverview);
    }

    if (selectedPersonId) {
      const entriesRes = await fetch(`/api/money/people/${selectedPersonId}`, {
        cache: "no-store",
      });
      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setPersonEntries(entriesData.entries);
      }
    }

    showToast(`Saved: ${balanceSentence(person.balance, person.name)} now`);
  };

  const handleCopyReminder = async (personId: string) => {
    try {
      const res = await fetch(`/api/money/people/${personId}/reminder`);
      if (!res.ok) {
        throw new Error("Failed to get reminder text");
      }
      const data = await res.json();
      if (data.text) {
        await navigator.clipboard.writeText(data.text);
        showToast("Reminder copied. Paste it in WhatsApp or Messenger.");
      }
    } catch {
      showToast("Couldn't copy reminder");
    }
  };

  const handleRemindMe = async (person: PersonDto, when: "today" | "tomorrow") => {
    try {
      const res = await fetch(`/api/money/people/${person.id}/reminder`);
      if (!res.ok) {
        throw new Error("Failed to get reminder task");
      }
      const data = await res.json();
      const today = todayIn(new Date(), APP_TIMEZONE);
      const targetDate = when === "today" ? today : addDays(today, 1);

      const taskRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.task.title,
          dueOn: targetDate,
        }),
      });

      if (!taskRes.ok) {
        throw new Error("Failed to create reminder task");
      }

      showToast(`Added to ${when === "today" ? "Today" : "Tomorrow"}: ${data.task.title}`);
    } catch {
      showToast("Couldn't create reminder task");
    }
  };

  const handleImportComplete = async (summaryRes: { people: number; entries: number }) => {
    const overviewRes = await fetch("/api/money", { cache: "no-store" });
    if (overviewRes.ok) {
      const newOverview: MoneyOverviewDto = await overviewRes.json();
      setMoneyOverview(newOverview);
      if (newOverview.people.length > 0 && !selectedPersonId) {
        setSelectedPersonId(newOverview.people[0].id);
      }
    }
    if (selectedPersonId) {
      const entriesRes = await fetch(`/api/money/people/${selectedPersonId}`, {
        cache: "no-store",
      });
      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setPersonEntries(entriesData.entries);
      }
    }
    showToast(`Imported ${summaryRes.people} ${summaryRes.people === 1 ? "person" : "people"} and ${summaryRes.entries} entries.`);
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

        <div className="ml-auto flex items-center gap-2">
          {activeTab === "ious" && (
            <button
              type="button"
              onClick={() => {
                setPrefilledPersonName("");
                setPrefilledPerson(null);
                setEditingEntry(null);
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
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="iconbtn p-2 text-[var(--ink-3)] hover:text-[var(--ink)]"
                aria-label="Money menu"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <a
                  href="/api/export/spending.csv"
                  download
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-[var(--ink-3)]" />
                  Export spending (CSV)
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="/api/export/ious.csv"
                  download
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-[var(--ink-3)]" />
                  Export IOUs (CSV)
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setImportDialogOpen(true)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <ClipboardPaste className="w-4 h-4 text-[var(--ink-3)]" />
                Import IOUs from notes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
              onOpenAddEntry={(p) => {
                setPrefilledPerson(p || null);
                setPrefilledPersonName(p?.name || "");
                setEditingEntry(null);
                setEntryDialogOpen(true);
              }}
              onOpenEditEntry={(entry) => {
                setEditingEntry(entry);
                setPrefilledPerson(null);
                setPrefilledPersonName("");
                setEntryDialogOpen(true);
              }}
              onDeleteEntry={handleDeleteEntry}
              onCopyReminder={handleCopyReminder}
              onRemindMe={handleRemindMe}
              mobileExpandedEntries={personEntries}
            />

            <div className="hidden lg:block">
              <HistoryPane
                person={selectedPerson}
                entries={personEntries}
                loadingEntries={loadingEntries}
                onOpenAddEntry={(p) => {
                  setPrefilledPerson(p);
                  setPrefilledPersonName(p.name);
                  setEditingEntry(null);
                  setEntryDialogOpen(true);
                }}
                onOpenEditEntry={(entry) => {
                  setEditingEntry(entry);
                  setPrefilledPerson(null);
                  setPrefilledPersonName("");
                  setEntryDialogOpen(true);
                }}
                onSettle={handleSettle}
                onDeleteEntry={handleDeleteEntry}
                onRenamePerson={handleRenamePerson}
                onDeletePerson={handleDeletePerson}
                onCopyReminder={handleCopyReminder}
                onRemindMe={handleRemindMe}
              />
            </div>
          </div>

          <EntryDialog
            open={entryDialogOpen}
            onOpenChange={setEntryDialogOpen}
            people={moneyOverview.people}
            prefilledPersonName={prefilledPersonName}
            prefilledPerson={prefilledPerson}
            editEntry={editingEntry}
            onSubmit={handleAddEntry}
            onUpdate={handleUpdateEntry}
          />

          <ImportDialog
            open={importDialogOpen}
            onOpenChange={setImportDialogOpen}
            onImportComplete={handleImportComplete}
          />
        </>
      )}
    </div>
  );
}
