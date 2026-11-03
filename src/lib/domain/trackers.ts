import { InvalidInputError } from "@/lib/errors";

export interface ParsedTrackerItem {
  title: string;
  groupName: string | null;
  url: string | null;
}

export interface TrackerProgress {
  done: number;
  total: number;
  pct: number;
}

/**
 * Parses itemsText in paste format (07 §5):
 * - Trim lines, skip empty lines.
 * - `## <text>` sets the current group (<= 80 chars).
 * - Strip leading `- `, `* `, or `<n>. `.
 * - If line contains ` | `, part after the last ` | ` is url if starting with http(s)://.
 *   Otherwise the whole line is the title.
 * - Title cut to 200 chars.
 * - More than 300 items -> throws InvalidInputError.
 */
export function parseTrackerItemsText(itemsText: string): ParsedTrackerItem[] {
  const lines = itemsText.split(/\r?\n/);
  let currentGroup: string | null = null;
  const items: ParsedTrackerItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("##")) {
      currentGroup = line.replace(/^##\s*/, "").trim().slice(0, 80) || null;
      continue;
    }

    // Strip leading list bullet or numbering: `- `, `* `, `1. `, `12. `
    const content = line.replace(/^([*\-]|\d+\.)\s+/, "").trim();
    if (!content) continue;

    let title = content;
    let url: string | null = null;

    const lastPipeIndex = content.lastIndexOf(" | ");
    if (lastPipeIndex !== -1) {
      const candidateUrl = content.slice(lastPipeIndex + 3).trim();
      if (/^https?:\/\//i.test(candidateUrl)) {
        url = candidateUrl;
        title = content.slice(0, lastPipeIndex).trim();
      }
    }

    title = title.slice(0, 200);

    items.push({
      title,
      groupName: currentGroup,
      url,
    });

    if (items.length > 300) {
      throw new InvalidInputError("Max 300 items at a time", {
        reason: "too_many_items",
        count: items.length,
      });
    }
  }

  return items;
}

/**
 * Progress calculation (07 §5):
 * done: count(status === 'done')
 * total: count(status !== 'skipped')
 * percent: round(done / total * 100) (0 when total === 0)
 */
export function calculateTrackerProgress(
  items: Array<{ status: "todo" | "done" | "skipped" | string }>
): TrackerProgress {
  const done = items.filter((item) => item.status === "done").length;
  const total = items.filter((item) => item.status !== "skipped").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return { done, total, pct };
}
