/**
 * Domain logic for agent audit logging (07 §6).
 */

const SENSITIVE_KEY_REGEX = /key|secret|token|password|authorization/i;

/**
 * Sanitises tool arguments:
 * - Drops keys matching /key|secret|token|password|authorization/i
 * - Strings > 200 chars are cut to 200 chars and end with …
 * - Arrays > 20 items keep the first 20 plus {"_truncated": <rest>}
 * - If the JSON is still > 2048 bytes → { "_truncated": true, "keys": [top-level keys] }
 */
export function sanitiseArgs(args: unknown): unknown {
  if (args === null || args === undefined) {
    return {};
  }

  function clean(val: unknown): unknown {
    if (typeof val === "string") {
      if (val.length > 200) {
        return val.slice(0, 199) + "…";
      }
      return val;
    }

    if (Array.isArray(val)) {
      if (val.length > 20) {
        const sliced = val.slice(0, 20).map(clean);
        sliced.push({ _truncated: val.length - 20 });
        return sliced;
      }
      return val.map(clean);
    }

    if (typeof val === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (SENSITIVE_KEY_REGEX.test(k)) {
          continue;
        }
        out[k] = clean(v);
      }
      return out;
    }

    return val;
  }

  const sanitised = clean(args);
  const json = JSON.stringify(sanitised);

  if (Buffer.byteLength(json, "utf8") > 2048) {
    const topKeys =
      typeof args === "object" && args !== null
        ? Object.keys(args).filter((k) => !SENSITIVE_KEY_REGEX.test(k))
        : [];
    return {
      _truncated: true,
      keys: topKeys,
    };
  }

  return sanitised;
}

/**
 * Builds a human-readable summary (≤ 200 chars) for an agent tool call.
 */
export function summarise(
  tool: string,
  args: Record<string, unknown> = {},
  result?: Record<string, unknown> | null,
  error?: string | null
): string {
  if (tool === "auth" || error === "revoked_key") {
    return "revoked key used";
  }

  let text = "";

  switch (tool) {
    case "add_task":
      text = `add_task "${args.title || ""}" → ${args.day || "today"}`;
      break;

    case "complete_task":
    case "reopen_task":
    case "update_task": {
      const title =
        (result?.title as string) ||
        (typeof args.taskId === "string" ? args.taskId.slice(0, 8) : "");
      text = `${tool} "${title}"`;
      break;
    }

    case "move_task": {
      const title =
        (result?.title as string) ||
        (typeof args.taskId === "string" ? args.taskId.slice(0, 8) : "");
      text = `move_task "${title}" → ${args.day || ""}`;
      break;
    }

    case "create_list":
      text = `create_list "${args.name || ""}"`;
      break;

    case "add_list_item":
      text = `add_list_item "${args.title || ""}" → ${args.list || ""}`;
      break;

    case "move_to_list": {
      const title =
        (result?.title as string) ||
        (typeof args.taskId === "string" ? args.taskId.slice(0, 8) : "");
      text = `move_to_list "${title}" → ${args.list || ""}`;
      break;
    }

    case "create_tracker": {
      const count = Array.isArray(args.items)
        ? args.items.length
        : (result?.itemCount as number) || 0;
      text = `create_tracker "${args.name || ""}" (${count} items)`;
      break;
    }

    case "add_tracker_items": {
      const count = Array.isArray(args.items)
        ? args.items.length
        : (result?.added as number) || 0;
      text = `add_tracker_items ${count} items`;
      break;
    }

    case "set_item_status": {
      const title =
        (result?.title as string) ||
        (typeof args.itemId === "string" ? args.itemId.slice(0, 8) : "");
      text = `set_item_status "${title}" → ${args.status || ""}`;
      break;
    }

    case "schedule_item": {
      const title =
        ((result?.task as { title?: string })?.title ||
          (result?.title as string)) ||
        (typeof args.itemId === "string" ? args.itemId.slice(0, 8) : "");
      text = `schedule_item "${title}" → ${args.day || ""}`;
      break;
    }

    case "add_money_entry": {
      const kindStr =
        args.kind === "lent"
          ? "lent"
          : args.kind === "borrowed"
          ? "borrowed"
          : args.kind === "received"
          ? "paid back"
          : "paid";
      text = `add_money_entry ${args.personName || ""} ${kindStr} ৳${args.amount || 0}`;
      break;
    }

    case "add_expense": {
      const notePart = args.note ? ` "${args.note}"` : "";
      text = `add_expense ৳${args.amount || 0} ${args.category || ""}${notePart}`;
      break;
    }

    case "add_payment_todo":
      text = `add_payment_todo "${args.title || ""}" ৳${args.amount || 0}`;
      break;

    case "mark_payment_paid": {
      const title =
        ((result?.todo as { title?: string })?.title ||
          (result?.title as string)) ||
        (args.todo as string) ||
        "";
      text = `mark_payment_paid "${title}"`;
      break;
    }

    case "add_renewal":
      text = `add_renewal "${args.name || ""}"`;
      break;

    case "update_renewal": {
      const name =
        (result?.name as string) ||
        (args.name as string) ||
        (typeof args.renewalId === "string" ? args.renewalId.slice(0, 8) : "");
      text = `update_renewal "${name}"`;
      break;
    }

    case "mark_renewed": {
      const name =
        (result?.name as string) ||
        (typeof args.renewalId === "string" ? args.renewalId.slice(0, 8) : "");
      const date = (result?.renewsOn as string) || "";
      text = `mark_renewed "${name}" → ${date}`;
      break;
    }

    case "mark_ended": {
      const name =
        (result?.name as string) ||
        (typeof args.renewalId === "string" ? args.renewalId.slice(0, 8) : "");
      text = `mark_ended "${name}"`;
      break;
    }

    case "create_note":
      text = `create_note "${args.title || ""}"${args.parent ? ` in ${args.parent}` : ""}`;
      break;

    case "append_to_note": {
      const lines =
        typeof args.markdown === "string" ? args.markdown.split("\n").length : 0;
      text = `append_to_note "${args.note || ""}"${args.underHeading ? ` under ${args.underHeading}` : ""} (+${lines} lines)`;
      break;
    }

    case "replace_note_section":
      text = `replace_note_section "${args.note || ""}" ${args.heading || ""}`;
      break;

    case "update_note":
      text = `update_note "${args.note || ""}"${args.title ? " (renamed)" : ""}`;
      break;

    default: {
      // Read tools and generic tools
      const mainArg =
        (result?.name as string) ||
        (args.trackerId as string) ||
        (args.note as string) ||
        (args.personName as string) ||
        (args.day as string) ||
        (args.query as string);

      if (mainArg) {
        text = `${tool} "${mainArg}"`;
      } else {
        text = tool;
      }
      break;
    }
  }

  if (text.length > 200) {
    return text.slice(0, 199) + "…";
  }

  return text;
}
