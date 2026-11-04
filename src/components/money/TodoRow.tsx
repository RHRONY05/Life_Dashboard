"use client";

import React, { useState } from "react";
import {
  Utensils,
  Bus,
  BookOpen,
  Receipt,
  HeartPulse,
  ShoppingBag,
  Gamepad2,
  HandHeart,
  CircleDot,
  Repeat,
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { PaymentTodoDto, SpendingCategory } from "@/lib/schemas";
import { dueState, dueLabel } from "@/lib/domain/money";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

const CATEGORY_ICONS: Record<
  SpendingCategory,
  React.ComponentType<{ className?: string }>
> = {
  food: Utensils,
  transport: Bus,
  study: BookOpen,
  bills: Receipt,
  health: HeartPulse,
  shopping: ShoppingBag,
  fun: Gamepad2,
  giving: HandHeart,
  other: CircleDot,
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatPaidDate(paidOn: string): string {
  const [y, m, d] = paidOn.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `paid ${DOW[date.getUTCDay()]} ${d} ${MON[date.getUTCMonth()]}`;
}

interface TodoRowProps {
  todo: PaymentTodoDto;
  today: string;
  onMarkPaid?: (todo: PaymentTodoDto) => void;
  onUndoPaid?: (todo: PaymentTodoDto) => void;
  onEdit?: (todo: PaymentTodoDto) => void;
  onDelete?: (todo: PaymentTodoDto) => void;
}

export function TodoRow({
  todo,
  today,
  onMarkPaid,
  onUndoPaid,
  onEdit,
  onDelete,
}: TodoRowProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPaid = Boolean(todo.paidOn);
  const Icon = CATEGORY_ICONS[todo.category] || CircleDot;
  const state = dueState(todo, today);
  const label = dueLabel(todo.dueOn, today, state);

  const badgeClass =
    state === "overdue"
      ? "b-danger"
      : state === "due_soon" || label === "due today"
      ? "b-warn"
      : "b-neutral";

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setDeleting(true);
      await onDelete(todo);
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={clsx("todo", isPaid && "paid")}>
        <span className="cic">
          <Icon className="w-4 h-4" />
        </span>

        <div className="t">
          <b>
            {todo.title}
            {todo.repeat === "monthly" && (
              <Repeat className="w-3 h-3 text-[var(--ink-3)] inline-block flex-none" />
            )}
          </b>
          <span>
            {isPaid ? (
              <span>{formatPaidDate(todo.paidOn!)}</span>
            ) : (
              <>
                {label && <span className={clsx("badge", badgeClass)}>{label}</span>}
                {label && todo.note && <span>·</span>}
                {todo.note && <span>{todo.note}</span>}
              </>
            )}
          </span>
        </div>

        <span className={clsx("amt", isPaid && "text-[var(--ink-3)] font-normal")}>
          <span className="taka">৳</span>
          {new Intl.NumberFormat("en-IN").format(todo.amount)}
        </span>

        {!isPaid && onMarkPaid && (
          <button
            type="button"
            onClick={() => onMarkPaid(todo)}
            className="btn btn-secondary btn-sm flex items-center gap-1 flex-none"
            aria-label={`Mark ${todo.title} as paid`}
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mark </span>paid
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="iconbtn sm flex-none"
              aria-label={`Options for ${todo.title}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isPaid ? (
              <>
                {onUndoPaid && (
                  <DropdownMenuItem
                    onClick={() => onUndoPaid(todo)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-[var(--ink-3)]" />
                    Undo paid
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(todo)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 text-[var(--ink-3)]" />
                    Edit note
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <>
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(todo)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4 text-[var(--ink-3)]" />
                    Edit
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-2 text-[var(--danger-text)] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete payment?</DialogTitle>
            <DialogDescription>
              Delete &quot;{todo.title}&quot;?
              {isPaid
                ? " The spending it logged stays."
                : " This payment to-do will be removed."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              busy={deleting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
