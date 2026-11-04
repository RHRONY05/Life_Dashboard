"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
  PaymentTodoDto,
  CreatePaymentTodoInput,
  UpdatePaymentTodoInput,
} from "@/lib/schemas";
import { formatTaka, balanceSentence } from "@/lib/domain/money";
import { todayIn } from "@/lib/domain/dates";

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
import { ToPayView } from "./ToPayView";
import { TodoDialog } from "./TodoDialog";

const DEFAULT_MONEY_OVERVIEW: MoneyOverviewDto = {
  people: [],
  totals: { owedToMe: 0, iOwe: 0, net: 0 },
};

interface MoneyClientProps {
  initialSummary: SpendingSummaryDto;
  initialDays: SpendingDayGroupDto[];
  initialHasMoreSpending: boolean;
  initialMoneyOverview?: MoneyOverviewDto;
  initialPaymentTodos?: PaymentTodoDto[];
}

export function MoneyClient({
  initialSummary,
  initialDays,
  initialHasMoreSpending,
  initialMoneyOverview = DEFAULT_MONEY_OVERVIEW,
  initialPaymentTodos = [],
}: MoneyClientProps) {
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");

  const tabParam = searchParams.get("tab");
  const urlTab: "spending" | "ious" | "topay" =
    tabParam === "ious" ? "ious" : tabParam === "topay" ? "topay" : "spending";

  const [activeTab, setActiveTab] = useState<"spending" | "ious" | "topay">(urlTab);
  const [prevUrlTab, setPrevUrlTab] = useState(urlTab);

  if (urlTab !== prevUrlTab) {
    setPrevUrlTab(urlTab);
    setActiveTab(urlTab);
  }

  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const param = url.searchParams.get("tab");
      const nextTab = param === "ious" ? "ious" : param === "topay" ? "topay" : "spending";
      setActiveTab(nextTab);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ─── SPENDING STATE ───
  const [summary, setSummary] = useState<SpendingSummaryDto>(initialSummary);
  const [days, setDays] = useState<SpendingDayGroupDto[]>(initialDays);
  const [hasMoreSpending, setHasMoreSpending] = useState(
    initialHasMoreSpending
  );
  const [loadingMoreSpending, setLoadingMoreSpending] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [viewedMonth, setViewedMonth] = useState<string | undefined>(
    monthParam ?? undefined
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchCount, setSearchMatchCount] = useState<number | undefined>();
  const [searchMatchTotal, setSearchMatchTotal] = useState<number | undefined>();

  const quickSpendRef = useRef<QuickSpendRef>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── IOUS STATE ───
  const [moneyOverview, setMoneyOverview] =
    useState<MoneyOverviewDto>(initialMoneyOverview || DEFAULT_MONEY_OVERVIEW);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    initialMoneyOverview?.people?.[0]?.id ?? null
  );
  const [personEntries, setPersonEntries] = useState<EntryDto[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [prefilledPersonName, setPrefilledPersonName] = useState("");
  const [prefilledPerson, setPrefilledPerson] = useState<PersonDto | null>(null);
  const [editingEntry, setEditingEntry] = useState<EntryDto | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const selectedPerson =
    moneyOverview?.people?.find((p) => p.id === selectedPersonId) ?? null;

  // ─── TO PAY STATE ───
  const [paymentTodos, setPaymentTodos] =
    useState<PaymentTodoDto[]>(initialPaymentTodos);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<PaymentTodoDto | null>(null);

  const today = todayIn(new Date(), APP_TIMEZONE);
  const openTodoCount = paymentTodos.filter((t) => !t.paidOn).length;

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
    Promise.resolve().then(() => {
      setPaymentTodos(initialPaymentTodos);
    });
  }, [initialPaymentTodos]);

  useEffect(() => {
    if (!selectedPersonId && (moneyOverview?.people?.length ?? 0) > 0) {
      Promise.resolve().then(() => {
        setSelectedPersonId(moneyOverview.people[0].id);
      });
    }
  }, [moneyOverview?.people, selectedPersonId]);

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

  // Debounced search effect
  const isSearching = Boolean(searchQuery.trim());
  useEffect(() => {
    if (!isSearching) {
      Promise.resolve().then(() => {
        setSearchMatchCount(undefined);
        setSearchMatchTotal(undefined);
      });
      // Reload normal list for viewedMonth
      const monthQuery = viewedMonth ? `?month=${viewedMonth}` : "";
      fetch(`/api/spending${monthQuery}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setDays(data.days);
            setHasMoreSpending(data.hasMore);
          }
        })
        .catch(() => {});
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/spending?q=${encodeURIComponent(searchQuery.trim())}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setDays(data.days);
          setSearchMatchCount(data.matchCount);
          setSearchMatchTotal(data.matchTotal);
          setHasMoreSpending(false);
        }
      } catch {
        // Ignored
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, isSearching, viewedMonth]);

  // Keyboard shortcut: 'a' to add, '/' to search
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
        } else if (activeTab === "ious") {
          setPrefilledPersonName("");
          setPrefilledPerson(null);
          setEditingEntry(null);
          setEntryDialogOpen(true);
        } else if (activeTab === "topay") {
          setEditingTodo(null);
          setTodoDialogOpen(true);
        }
      } else if (e.key === "/" && activeTab === "spending") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  const handleTabChange = (id: string) => {
    const next = id === "ious" ? "ious" : id === "topay" ? "topay" : "spending";
    setActiveTab(next);
    const nextUrl =
      next === "spending"
        ? (viewedMonth ? `/money?month=${viewedMonth}` : "/money")
        : `/money?tab=${next}${viewedMonth ? `&month=${viewedMonth}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  };

  // ─── SPENDING HANDLERS ───

  const handleSelectMonth = async (month: string) => {
    setViewedMonth(month);
    const nextUrl =
      activeTab === "spending"
        ? `/money?month=${month}`
        : `/money?tab=${activeTab}&month=${month}`;
    window.history.replaceState(null, "", nextUrl);
    setLoadingMonth(true);
    try {
      const [sumRes, daysRes] = await Promise.all([
        fetch(`/api/spending/summary?month=${month}`, { cache: "no-store" }),
        fetch(`/api/spending?month=${month}`, { cache: "no-store" }),
      ]);
      if (sumRes.ok) {
        setSummary(await sumRes.json());
      }
      if (daysRes.ok) {
        const daysData = await daysRes.json();
        setDays(daysData.days);
        setHasMoreSpending(daysData.hasMore);
      }
    } catch {
      showToast("Failed to load month spending");
    } finally {
      setLoadingMonth(false);
    }
  };

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
    setSummary(data.summary || data);

    // Refresh days list
    const monthQuery = viewedMonth ? `?month=${viewedMonth}` : "";
    const refreshRes = await fetch(`/api/spending${monthQuery}`, { cache: "no-store" });
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
    setSummary(data.summary || data);

    const monthQuery = viewedMonth ? `?month=${viewedMonth}` : "";
    const refreshRes = await fetch(`/api/spending${monthQuery}`, { cache: "no-store" });
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
    setSummary(data.summary || data);

    const monthQuery = viewedMonth ? `?month=${viewedMonth}` : "";
    const refreshRes = await fetch(`/api/spending${monthQuery}`, { cache: "no-store" });
    if (refreshRes.ok) {
      const daysData = await refreshRes.json();
      setDays(daysData.days);
    }

    showToast("Deleted spend");
  };

  const handleLoadMoreSpending = async () => {
    if (loadingMoreSpending || !hasMoreSpending) return;

    const lastDayGroup = days[days.length - 1];
    if (!lastDayGroup) return;

    setLoadingMoreSpending(true);
    try {
      const monthParamStr = viewedMonth ? `&month=${viewedMonth}` : "";
      const res = await fetch(
        `/api/spending?before=${lastDayGroup.day}${monthParamStr}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setDays((prev) => [...prev, ...data.days]);
        setHasMoreSpending(data.hasMore);
      }
    } finally {
      setLoadingMoreSpending(false);
    }
  };

  const handleSaveBudget = async (budget: number | null) => {
    const res = await fetch("/api/settings/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyBudget: budget }),
    });

    if (!res.ok) {
      throw new Error("Failed to save budget");
    }

    const data = await res.json();
    setSummary(data.summary || data);

    if (budget === null) {
      showToast("Removed monthly budget");
    } else {
      showToast(`Set monthly budget to ${formatTaka(budget)}`);
    }
  };

  // ─── TO PAY HANDLERS ───

  const handleSavePaymentTodo = async (
    input: CreatePaymentTodoInput | UpdatePaymentTodoInput
  ) => {
    if (editingTodo) {
      const res = await fetch(`/api/payment-todos/${editingTodo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update payment");
      }
      const updated = await res.json();
      setPaymentTodos((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
      showToast("Updated payment");
    } else {
      const res = await fetch("/api/payment-todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to add payment");
      }
      const created = await res.json();
      setPaymentTodos((prev) => [created, ...prev]);
      showToast(`Added ${created.title} · ${formatTaka(created.amount)}`);
    }
  };

  const handleDeletePaymentTodo = async (todo: PaymentTodoDto) => {
    const res = await fetch(`/api/payment-todos/${todo.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      throw new Error("Failed to delete payment");
    }
    setPaymentTodos((prev) => prev.filter((t) => t.id !== todo.id));
    showToast("Deleted payment");
  };

  const handleMarkPaymentPaid = async (todo: PaymentTodoDto) => {
    try {
      const res = await fetch(`/api/payment-todos/${todo.id}/paid`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || "Failed to mark paid");
        return;
      }

      // Refresh payment todos
      const tRes = await fetch("/api/payment-todos", { cache: "no-store" });
      if (tRes.ok) {
        const tData = await tRes.json();
        setPaymentTodos([...tData.open, ...tData.paid]);
      }

      // Refresh spending summary and days
      const monthQuery = viewedMonth ? `?month=${viewedMonth}` : "";
      const sRes = await fetch(`/api/spending/summary${monthQuery}`, { cache: "no-store" });
      if (sRes.ok) {
        setSummary(await sRes.json());
      }
      const dRes = await fetch(`/api/spending${monthQuery}`, { cache: "no-store" });
      if (dRes.ok) {
        const dData = await dRes.json();
        setDays(dData.days);
        setHasMoreSpending(dData.hasMore);
      }

      showToast(`Paid ${formatTaka(todo.amount)} · logged in Spending`, {
        undoAction: async () => {
          try {
            const undoRes = await fetch(`/api/payment-todos/${todo.id}/unpaid`, {
              method: "POST",
            });
            if (undoRes.ok) {
              const utRes = await fetch("/api/payment-todos", { cache: "no-store" });
              if (utRes.ok) {
                const utData = await utRes.json();
                setPaymentTodos([...utData.open, ...utData.paid]);
              }
              const usRes = await fetch(`/api/spending/summary${monthQuery}`, {
                cache: "no-store",
              });
              if (usRes.ok) setSummary(await usRes.json());
              const udRes = await fetch(`/api/spending${monthQuery}`, {
                cache: "no-store",
              });
              if (udRes.ok) {
                const udData = await udRes.json();
                setDays(udData.days);
                setHasMoreSpending(udData.hasMore);
              }
              showToast("Restored payment");
            }
          } catch {
            showToast("Failed to undo");
          }
        },
        duration: 10000,
      });
    } catch {
      showToast("Failed to mark paid");
    }
  };

  const handleUndoPaymentPaid = async (todo: PaymentTodoDto) => {
    try {
      const res = await fetch(`/api/payment-todos/${todo.id}/unpaid`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || "Failed to undo paid");
        return;
      }
      const tRes = await fetch("/api/payment-todos", { cache: "no-store" });
      if (tRes.ok) {
        const tData = await tRes.json();
        setPaymentTodos([...tData.open, ...tData.paid]);
      }

      const monthQuery = viewedMonth ? `?month=${viewedMonth}` : "";
      const sRes = await fetch(`/api/spending/summary${monthQuery}`, { cache: "no-store" });
      if (sRes.ok) setSummary(await sRes.json());
      const dRes = await fetch(`/api/spending${monthQuery}`, { cache: "no-store" });
      if (dRes.ok) {
        const dData = await dRes.json();
        setDays(dData.days);
        setHasMoreSpending(dData.hasMore);
      }
      showToast("Restored payment");
    } catch {
      showToast("Failed to undo paid");
    }
  };

  // ─── IOUS HANDLERS ───

  const refreshOverview = async (): Promise<MoneyOverviewDto | null> => {
    const res = await fetch("/api/money", { cache: "no-store" });
    if (res.ok) {
      const data: MoneyOverviewDto = await res.json();
      setMoneyOverview(data);
      return data;
    }
    return null;
  };

  const handleAddEntry = async (input: CreateEntryInput) => {
    const res = await fetch("/api/money/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to save entry");
    }

    const data = await res.json();
    const freshOverview = await refreshOverview();

    // Refresh person entries if this person is selected
    const targetPersonId = data.entry.personId;
    if (selectedPersonId === targetPersonId || !selectedPersonId) {
      setSelectedPersonId(targetPersonId);
      const entriesRes = await fetch(
        `/api/money/people/${targetPersonId}`,
        { cache: "no-store" }
      );
      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setPersonEntries(entriesData.entries);
      }
    }

    const updatedPerson =
      freshOverview?.people.find((p: PersonDto) => p.id === targetPersonId) ||
      data.person;
    if (updatedPerson) {
      showToast(`Saved: ${balanceSentence(updatedPerson.name, updatedPerson.balance)}`);
    } else {
      showToast("Saved entry");
    }
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

    const data = await res.json();
    const freshOverview = await refreshOverview();

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

    const updatedPerson =
      freshOverview?.people.find((p: PersonDto) => p.id === selectedPersonId) ||
      data.person;
    if (updatedPerson) {
      showToast(`Updated: ${balanceSentence(updatedPerson.name, updatedPerson.balance)}`);
    } else {
      showToast("Updated entry");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const res = await fetch(`/api/money/entries/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete entry");
    }

    await refreshOverview();

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

  const handleSettle = async (personId: string) => {
    const res = await fetch(`/api/money/people/${personId}/settle`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to settle balance");
    }

    const data = await res.json();
    const freshOverview = await refreshOverview();

    if (selectedPersonId === personId) {
      const entriesRes = await fetch(
        `/api/money/people/${personId}`,
        { cache: "no-store" }
      );
      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setPersonEntries(entriesData.entries);
      }
    }

    const targetPerson =
      freshOverview?.people.find((p: PersonDto) => p.id === personId) ||
      data.person;
    showToast(`Marked ${targetPerson?.name || "person"} as settled.`);
  };

  const handleRenamePerson = async (personId: string, name: string) => {
    const res = await fetch(`/api/money/people/${personId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to rename person");
    }

    const data = await res.json();
    await refreshOverview();
    showToast(`Renamed to ${data.person.name}`);
  };

  const handleDeletePerson = async (personId: string) => {
    const res = await fetch(`/api/money/people/${personId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete person");
    }

    const freshOverview = await refreshOverview();

    // Select the first remaining person
    const remainingPeople = freshOverview?.people || [];
    if (remainingPeople.length > 0) {
      setSelectedPersonId(remainingPeople[0].id);
    } else {
      setSelectedPersonId(null);
      setPersonEntries([]);
    }

    showToast("Deleted person");
  };

  const handleCopyReminder = async (personId: string) => {
    const res = await fetch(`/api/money/people/${personId}/reminder`);
    if (!res.ok) {
      showToast("Failed to generate reminder");
      return;
    }
    const data = await res.json();
    await navigator.clipboard.writeText(data.message);
    showToast("Copied reminder");
  };

  const handleRemindMe = async (
    person: PersonDto,
    when: "today" | "tomorrow"
  ) => {
    const res = await fetch(`/api/money/people/${person.id}/remind-me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ when }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Failed to schedule reminder");
      return;
    }
    showToast(
      `Added reminder to ${when === "today" ? "Today" : "Tomorrow"} for ${person.name}`
    );
  };

  const handleImportComplete = async (summaryRes: {
    people: number;
    entries: number;
  }) => {
    // Refresh Money overview
    const res = await fetch("/api/money", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setMoneyOverview(data);
      if (!selectedPersonId && data.people.length > 0) {
        setSelectedPersonId(data.people[0].id);
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
    showToast(
      `Imported ${summaryRes.people} ${summaryRes.people === 1 ? "person" : "people"} and ${summaryRes.entries} entries.`
    );
  };

  // Calculate today's spend count
  const todayGroup = days.find((d) => d.day === today);
  const todayCount = todayGroup ? todayGroup.expenses.length : 0;

  return (
    <div className="page flex-1 max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-6 relative">
      {loadingMonth && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent animate-pulse z-30" />
      )}
      {/* Header */}
      <div className="page-head flex flex-wrap items-center gap-4 mb-6">
        <h1 className="text-[var(--text-2xl)] font-bold font-display tracking-tight text-[var(--ink)]">
          Money
        </h1>

        <Segmented
          items={[
            { id: "spending", label: "Spending" },
            { id: "ious", label: "IOUs" },
            {
              id: "topay",
              label: "To pay",
              count: openTodoCount > 0 ? openTodoCount : undefined,
            },
          ]}
          value={activeTab}
          onChange={handleTabChange}
        />

        <span className="sub text-[var(--text-sm)] text-[var(--ink-3)] hidden sm:inline">
          {activeTab === "spending"
            ? "What you spend, in taka"
            : activeTab === "ious"
            ? "Who owes whom, in whole taka"
            : "Money you've promised to pay"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {activeTab === "topay" && (
            <button
              type="button"
              onClick={() => {
                setEditingTodo(null);
                setTodoDialogOpen(true);
              }}
              className="btn btn-primary h-9 px-3.5 flex items-center gap-1.5 text-[var(--text-sm)] font-medium"
            >
              <Plus className="w-4 h-4" />
              Add payment
              <kbd className="hidden sm:inline-block ml-1 bg-transparent text-inherit border-current opacity-70 text-[10px] px-1 py-0.5 border rounded">
                A
              </kbd>
            </button>
          )}

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
              <kbd className="hidden sm:inline-block ml-1 bg-transparent text-inherit border-current opacity-70 text-[10px] px-1 py-0.5 border rounded">
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
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[var(--ink-3)]" />
                  Export spending (CSV)
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="/api/export/ious.csv"
                  download
                  className="flex items-center gap-2 cursor-pointer"
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

      {activeTab === "spending" && (
        <>
          {/* Spending Tiles */}
          <SpendTiles
            summary={summary}
            todayCount={todayCount}
            currentMonth={viewedMonth}
            onEditBudget={() => setBudgetDialogOpen(true)}
            onSelectMonth={handleSelectMonth}
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
                onAddExpense={handleAddExpense}
                onFocusInput={() => quickSpendRef.current?.focusAmount()}
                loadingMore={loadingMoreSpending}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchMatchCount={searchMatchCount}
                searchMatchTotal={searchMatchTotal}
                searchInputRef={searchInputRef}
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
      )}

      {activeTab === "ious" && (
        <>
          {/* IOUs Totals */}
          <MoneyTotals
            totals={moneyOverview?.totals || DEFAULT_MONEY_OVERVIEW.totals}
            people={moneyOverview?.people || []}
          />

          {/* IOUs Main Grid */}
          <div className="money-grid grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <PeopleList
              people={moneyOverview?.people || []}
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
            people={moneyOverview?.people || []}
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

      {activeTab === "topay" && (
        <>
          <ToPayView
            todos={paymentTodos}
            today={today}
            onOpenAdd={() => {
              setEditingTodo(null);
              setTodoDialogOpen(true);
            }}
            onMarkPaid={handleMarkPaymentPaid}
            onUndoPaid={handleUndoPaymentPaid}
            onEdit={(todo) => {
              setEditingTodo(todo);
              setTodoDialogOpen(true);
            }}
            onDelete={handleDeletePaymentTodo}
          />

          <TodoDialog
            open={todoDialogOpen}
            onOpenChange={setTodoDialogOpen}
            editingTodo={editingTodo}
            openCount={openTodoCount}
            onSave={handleSavePaymentTodo}
          />
        </>
      )}
    </div>
  );
}
