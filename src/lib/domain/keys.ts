import { createHash, randomBytes } from "node:crypto";
import { SCOPES, Scope } from "@/lib/schemas";

export { SCOPES };
export type { Scope };

export type ToolName =
  | "whoami"
  | "get_board"
  | "list_tasks"
  | "add_task"
  | "update_task"
  | "complete_task"
  | "reopen_task"
  | "move_task"
  | "get_lists"
  | "create_list"
  | "add_list_item"
  | "move_to_list"
  | "list_trackers"
  | "get_tracker"
  | "create_tracker"
  | "add_tracker_items"
  | "set_item_status"
  | "schedule_item"
  | "get_balances"
  | "get_person_history"
  | "add_money_entry"
  | "get_spending"
  | "add_expense"
  | "list_payment_todos"
  | "add_payment_todo"
  | "mark_payment_paid"
  | "list_renewals"
  | "add_renewal"
  | "update_renewal"
  | "mark_renewed"
  | "mark_ended"
  | "list_links"
  | "list_notes"
  | "get_note"
  | "create_note"
  | "append_to_note"
  | "replace_note_section"
  | "update_note";

export const TOOL_SCOPE: Record<ToolName, Scope | null> = {
  whoami: null,
  get_board: "tasks:read",
  list_tasks: "tasks:read",
  add_task: "tasks:write",
  update_task: "tasks:write",
  complete_task: "tasks:write",
  reopen_task: "tasks:write",
  move_task: "tasks:write",
  get_lists: "tasks:read",
  create_list: "tasks:write",
  add_list_item: "tasks:write",
  move_to_list: "tasks:write",
  list_trackers: "trackers:read",
  get_tracker: "trackers:read",
  create_tracker: "trackers:write",
  add_tracker_items: "trackers:write",
  set_item_status: "trackers:write",
  schedule_item: "trackers:write",
  get_balances: "money:read",
  get_person_history: "money:read",
  add_money_entry: "money:write",
  get_spending: "money:read",
  add_expense: "money:write",
  list_payment_todos: "money:read",
  add_payment_todo: "money:write",
  mark_payment_paid: "money:write",
  list_renewals: "renewals:read",
  add_renewal: "renewals:write",
  update_renewal: "renewals:write",
  mark_renewed: "renewals:write",
  mark_ended: "renewals:write",
  list_links: "links:read",
  list_notes: "notes:read",
  get_note: "notes:read",
  create_note: "notes:write",
  append_to_note: "notes:write",
  replace_note_section: "notes:write",
  update_note: "notes:write",
};

/**
 * Generates an API key: "ld_" + 32 bytes base64url (43 chars) = 46 chars total.
 */
export function generateKey(bytes?: Uint8Array): string {
  const b = bytes ?? randomBytes(32);
  const b64 = Buffer.from(b).toString("base64url");
  return `ld_${b64}`;
}

/**
 * First 11 characters ("ld_" + 8 chars) for display.
 */
export function keyPrefix(key: string): string {
  return key.slice(0, 11);
}

/**
 * SHA-256 hex of the full key.
 */
export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Checks whether string matches the API key format: "ld_" followed by 43 base64url characters.
 */
export function looksLikeKey(s: string): boolean {
  return /^ld_[A-Za-z0-9_-]{43}$/.test(s);
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterS: number };

/**
 * Checks rate limits per key:
 * - 30 tool calls per rolling 60 s
 * - 1000 tool calls per rolling 24 h
 * Timestamps should exclude result = 'rate_limited'.
 */
export function rateLimit(timestamps: Date[], now: Date): RateLimitResult {
  const nowMs = now.getTime();

  // Filter and sort descending (newest first)
  const valid = timestamps
    .map((t) => t.getTime())
    .filter((ms) => ms <= nowMs + 15000)
    .sort((a, b) => b - a);

  // Check rolling 60s
  const last60s = valid.filter((ms) => nowMs - ms < 60000);
  if (last60s.length >= 30) {
    // The 30th call from the newest is the oldest of the 30 in the window
    const oldestOf30 = last60s[29];
    const ageS = (nowMs - oldestOf30) / 1000;
    const retryAfterS = Math.max(1, Math.ceil(60 - ageS));
    return { ok: false, retryAfterS };
  }

  // Check rolling 24h (86,400,000 ms)
  const last24h = valid.filter((ms) => nowMs - ms < 86400000);
  if (last24h.length >= 1000) {
    const oldestOf1000 = last24h[999];
    const ageS = (nowMs - oldestOf1000) / 1000;
    const retryAfterS = Math.max(1, Math.ceil(86400 - ageS));
    return { ok: false, retryAfterS };
  }

  return { ok: true };
}
