"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  Server,
  Globe,
  Gift,
  MoreHorizontal,
  Check,
  Flag,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import { RenewalDto } from "@/lib/schemas";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
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
  DialogFooter,
} from "@/components/ui/Dialog";
import clsx from "clsx";

interface RenewalRowProps {
  renewal: RenewalDto;
  onEdit: (renewal: RenewalDto) => void;
  onRenewed?: (renewal: RenewalDto) => void;
  onEnded?: (renewal: RenewalDto) => void;
  onDelete: (renewal: RenewalDto) => void;
}

export function RenewalRow({
  renewal,
  onEdit,
  onRenewed,
  onEnded,
  onDelete,
}: RenewalRowProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getCategoryIcon = () => {
    switch (renewal.category) {
      case "subscription":
        return <RefreshCw className="w-4 h-4" />;
      case "hosting":
        return <Server className="w-4 h-4" />;
      case "domain":
        return <Globe className="w-4 h-4" />;
      case "credit":
        return <Gift className="w-4 h-4" />;
      default:
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  const renderCost = () => {
    if (renewal.amount === null && renewal.cycle !== "free") {
      return null;
    }
    if (renewal.cycle === "free" || renewal.amount === 0) {
      return (
        <div className="cost num font-semibold text-sm">
          Free
          {renewal.renewsOn && <small className="block text-ink-3 text-xs font-normal">until it ends</small>}
        </div>
      );
    }

    const curr = renewal.currency === "USD" ? "$" : "৳";
    const amtStr =
      renewal.currency === "USD"
        ? `${curr}${renewal.amount!.toFixed(2)}`
        : `${curr}${Math.round(renewal.amount!).toLocaleString("en-IN")}`;

    if (renewal.category === "credit") {
      return (
        <div className="cost num font-semibold text-sm">
          {amtStr} credit
          <small className="block text-ink-3 text-xs font-normal">one-time</small>
        </div>
      );
    }

    let cycleLabel = "";
    if (renewal.cycle === "monthly") cycleLabel = "/ month";
    else if (renewal.cycle === "yearly") cycleLabel = "/ year";
    else if (renewal.cycle === "one_time") cycleLabel = "one-time";

    return (
      <div className="cost num font-semibold text-sm">
        {amtStr}
        {cycleLabel && <small className="block text-ink-3 text-xs font-normal">{cycleLabel}</small>}
      </div>
    );
  };

  const isOverdue = renewal.state === "overdue";
  const badgeVariant =
    renewal.state === "overdue"
      ? "danger"
      : renewal.state === "due_soon"
      ? "warn"
      : "neutral";

  const isRecurring =
    renewal.cycle === "monthly" || renewal.cycle === "yearly";

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await onDelete(renewal);
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="rrow">
        {/* Category Icon */}
        <span className={clsx("ic", isOverdue && "over")}>
          {getCategoryIcon()}
        </span>

        {/* Title, Project & Action Line */}
        <div className="t min-w-0">
          <b className="flex items-center gap-2 font-semibold text-sm truncate">
            <span>{renewal.name}</span>
            {renewal.project && (
              <Badge variant="neutral" className="font-normal text-xs">
                {renewal.project}
              </Badge>
            )}
          </b>
          <span className="block text-xs text-ink-3 truncate mt-0.5">
            {renewal.actionLine}
            {renewal.notes ? ` · ${renewal.notes}` : ""}
          </span>
        </div>

        {/* Cost */}
        <div className="min-w-0">{renderCost()}</div>

        {/* Due Badge */}
        <div>
          {renewal.dueLabel && (
            <Badge variant={badgeVariant}>{renewal.dueLabel}</Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="acts flex items-center justify-end gap-1.5">
          {renewal.status === "active" && isRecurring && onRenewed && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRenewed(renewal)}
              className="h-8 text-xs font-medium"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Renewed
            </Button>
          )}

          {renewal.status === "active" && !isRecurring && onEnded && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEnded(renewal)}
              className="h-8 text-xs font-medium"
            >
              <Flag className="w-3.5 h-3.5 mr-1" />
              Mark ended
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                size="sm"
                aria-label="More options"
                className="h-8 w-8"
              >
                <MoreHorizontal className="w-4 h-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(renewal)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {renewal.status === "active" && onEnded && (
                <DropdownMenuItem onClick={() => onEnded(renewal)}>
                  <Flag className="w-4 h-4 mr-2" />
                  Mark ended
                </DropdownMenuItem>
              )}
              {renewal.manageUrl && (
                <DropdownMenuItem
                  onClick={() => window.open(renewal.manageUrl!, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open manage page
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                danger
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete renewal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-2 my-2">
            Delete &ldquo;{renewal.name}&rdquo;?
          </p>
          <DialogFooter className="mt-4 flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-danger hover:bg-danger/90 text-white border-none"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
