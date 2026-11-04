"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Segmented } from "@/components/ui/Segmented";
import {
  RenewalDto,
  CreateRenewalInput,
  RenewalCategoryType,
  RenewalCurrencyType,
  RenewalCycleType,
} from "@/lib/schemas";

interface RenewalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renewal?: RenewalDto | null;
  onSave: (data: CreateRenewalInput) => Promise<void>;
}

interface RenewalFormProps {
  renewal?: RenewalDto | null;
  onClose: () => void;
  onSave: (data: CreateRenewalInput) => Promise<void>;
}

function RenewalForm({ renewal, onClose, onSave }: RenewalFormProps) {
  const isEditing = !!renewal;

  const [name, setName] = useState(renewal?.name || "");
  const [category, setCategory] = useState<RenewalCategoryType>(
    renewal?.category || "subscription"
  );
  const [project, setProject] = useState(renewal?.project || "");
  const [amount, setAmount] = useState<string>(
    renewal?.amount !== null && renewal?.amount !== undefined
      ? String(renewal.amount)
      : ""
  );
  const [currency, setCurrency] = useState<RenewalCurrencyType>(
    renewal?.currency || "USD"
  );
  const [cycle, setCycle] = useState<RenewalCycleType>(
    renewal?.cycle || "monthly"
  );
  const [renewsOn, setRenewsOn] = useState(renewal?.renewsOn || "");
  const [autoRenew, setAutoRenew] = useState(renewal?.autoRenew ?? false);
  const [remindDaysBefore, setRemindDaysBefore] = useState<number>(
    renewal?.remindDaysBefore ?? 7
  );
  const [manageUrl, setManageUrl] = useState(renewal?.manageUrl || "");
  const [notes, setNotes] = useState(renewal?.notes || "");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (cycle !== "free" && !renewsOn) {
      newErrors.renewsOn = "Pick the date it renews or ends";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const parsedAmount =
        amount.trim() === "" ? null : parseFloat(amount);

      await onSave({
        name: name.trim(),
        category,
        project: project.trim() ? project.trim() : null,
        amount:
          parsedAmount !== null && !isNaN(parsedAmount) ? parsedAmount : null,
        currency,
        cycle,
        renewsOn: renewsOn || null,
        autoRenew,
        remindDaysBefore,
        manageUrl: manageUrl.trim() ? manageUrl.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrors({ form: err.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
      {errors.form && (
        <div className="p-2.5 rounded bg-danger-soft text-danger-text text-sm">
          {errors.form}
        </div>
      )}

      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
          placeholder="e.g. ChatGPT Plus, Vercel Pro, rhrony05.me"
          maxLength={80}
          className="input w-full h-9 px-3 rounded-md border border-frame bg-surface text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          autoFocus
        />
        {errors.name && (
          <span className="text-xs text-danger-text font-medium">
            {errors.name}
          </span>
        )}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
          Category
        </label>
        <Segmented
          block
          value={category}
          onChange={(val) => setCategory(val as RenewalCategoryType)}
          items={[
            { id: "subscription", label: "Subscription" },
            { id: "hosting", label: "Hosting" },
            { id: "domain", label: "Domain" },
            { id: "credit", label: "Credit" },
          ]}
        />
      </div>

      {/* Project */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
          Project{" "}
          <span className="text-ink-3 lowercase font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="e.g. CineReserve, Portfolio, Vocab"
          maxLength={60}
          className="input w-full h-9 px-3 rounded-md border border-frame bg-surface text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Cost Row: Amount + Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
            Amount{" "}
            <span className="text-ink-3 lowercase font-normal">(optional)</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input w-full h-9 px-3 rounded-md border border-frame bg-surface text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
            Currency
          </label>
          <Segmented
            block
            value={currency}
            onChange={(val) => setCurrency(val as RenewalCurrencyType)}
            items={[
              { id: "BDT", label: "BDT (৳)" },
              { id: "USD", label: "USD ($)" },
            ]}
          />
        </div>
      </div>

      {/* Cycle */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
          Cycle
        </label>
        <Segmented
          block
          value={cycle}
          onChange={(val) => {
            const nextCycle = val as RenewalCycleType;
            setCycle(nextCycle);
            if (nextCycle === "free" && errors.renewsOn) {
              setErrors((prev) => ({ ...prev, renewsOn: "" }));
            }
          }}
          items={[
            { id: "monthly", label: "Monthly" },
            { id: "yearly", label: "Yearly" },
            { id: "one_time", label: "One-time" },
            { id: "free", label: "Free" },
          ]}
        />
      </div>

      {/* Renews On Date */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
          Renews / ends on{" "}
          {cycle === "free" && (
            <span className="text-ink-3 lowercase font-normal">(optional)</span>
          )}
        </label>
        <input
          type="date"
          value={renewsOn}
          onChange={(e) => {
            setRenewsOn(e.target.value);
            if (errors.renewsOn)
              setErrors((prev) => ({ ...prev, renewsOn: "" }));
          }}
          className="input w-full h-9 px-3 rounded-md border border-frame bg-surface text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {errors.renewsOn && (
          <span className="text-xs text-danger-text font-medium">
            {errors.renewsOn}
          </span>
        )}
      </div>

      {/* Auto Renew Switch */}
      <div className="flex items-center justify-between p-2 rounded-md bg-surface-2 border border-line">
        <div>
          <span className="text-sm font-semibold text-ink block">
            It charges me automatically
          </span>
          <span className="text-xs text-ink-3 block">
            Turn on if payment method is saved and charged by provider
          </span>
        </div>
        <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
      </div>

      {/* Remind Days Before */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
          Remind me
        </label>
        <select
          value={remindDaysBefore}
          onChange={(e) => setRemindDaysBefore(parseInt(e.target.value, 10))}
          className="input w-full h-9 px-3 rounded-md border border-frame bg-surface text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value={0}>On the day</option>
          <option value={1}>1 day before</option>
          <option value={3}>3 days before</option>
          <option value={7}>7 days before</option>
          <option value={14}>14 days before</option>
          <option value={30}>30 days before</option>
        </select>
      </div>

      {/* Manage URL */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
          Manage URL{" "}
          <span className="text-ink-3 lowercase font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={manageUrl}
          onChange={(e) => setManageUrl(e.target.value)}
          placeholder="https://..."
          maxLength={500}
          className="input w-full h-9 px-3 rounded-md border border-frame bg-surface text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
          Notes{" "}
          <span className="text-ink-3 lowercase font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Free credit ends; cancel before charge"
          rows={2}
          maxLength={500}
          className="input w-full p-2.5 rounded-md border border-frame bg-surface text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
      </div>

      <DialogFooter className="mt-2 flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting
            ? "Saving…"
            : isEditing
            ? "Save changes"
            : "Add renewal"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RenewalDialog({
  open,
  onOpenChange,
  renewal,
  onSave,
}: RenewalDialogProps) {
  const isEditing = !!renewal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit renewal" : "Add renewal"}
          </DialogTitle>
        </DialogHeader>

        {open && (
          <RenewalForm
            key={renewal?.id ?? "new"}
            renewal={renewal}
            onClose={() => onOpenChange(false)}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
