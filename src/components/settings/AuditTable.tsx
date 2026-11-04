"use client";

import { AuditRowDto } from "@/lib/schemas";
import { Filter, ChevronDown } from "lucide-react";

interface AuditTableProps {
  rows: AuditRowDto[];
  hasMore: boolean;
  onLoadMore: () => void;
  agentFilter: string;
  onFilterChange: (agent: string) => void;
  availableAgents: string[];
  loadingMore?: boolean;
}

function formatAuditTime(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const timeStr = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isToday) {
    return timeStr;
  }

  const dateStr = d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return `${dateStr} ${timeStr}`;
}

function renderResultBadge(result: AuditRowDto["result"]) {
  switch (result) {
    case "ok":
      return <span className="res ok">ok</span>;
    case "denied":
      return <span className="res denied">denied</span>;
    case "error":
      return <span className="res error">error</span>;
    case "rate_limited":
      return <span className="res rl">rate limited</span>;
    default:
      return <span className="res">{result}</span>;
  }
}

export function AuditTable({
  rows,
  hasMore,
  onLoadMore,
  agentFilter,
  onFilterChange,
  availableAgents,
  loadingMore,
}: AuditTableProps) {
  const filteredRows = agentFilter
    ? rows.filter((r) => r.keyName.toLowerCase() === agentFilter.toLowerCase())
    : rows;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Activity</h2>
          <p className="text-xs text-ink-3">Every call an agent made, newest first.</p>
        </div>

        {/* Filter dropdown */}
        <div className="relative inline-flex items-center">
          <Filter className="w-3.5 h-3.5 absolute left-2.5 text-ink-3 pointer-events-none" />
          <select
            value={agentFilter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="input pl-8 pr-7 h-[34px] text-xs font-medium cursor-pointer appearance-none bg-surface"
          >
            <option value="">All agents</option>
            {availableAgents.map((agent) => (
              <option key={agent} value={agent}>
                {agent}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-ink-3 pointer-events-none" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-3">
            {agentFilter
              ? `${agentFilter} hasn't done anything yet.`
              : "No agent activity yet."}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Agent</th>
                    <th>What</th>
                    <th>Result</th>
                    <th className="text-right">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs text-ink-3 whitespace-nowrap">
                        {formatAuditTime(r.createdAt)}
                      </td>
                      <td className="font-semibold text-ink whitespace-nowrap">
                        {r.keyName}
                      </td>
                      <td className="text-xs">
                        <span className="font-mono text-ink font-medium">
                          {r.summary}
                        </span>
                        {r.error && (
                          <span className="text-danger ml-2 text-xs">
                            ({r.error})
                          </span>
                        )}
                      </td>
                      <td>{renderResultBadge(r.result)}</td>
                      <td className="text-right font-mono text-xs text-ink-3">
                        {r.durationMs.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-[var(--line)]">
              {filteredRows.map((r) => (
                <div key={r.id} className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <b className="font-mono text-xs text-ink">{r.tool}</b>
                      {renderResultBadge(r.result)}
                    </div>
                    <div className="text-xs text-ink-3">
                      {r.keyName} · {formatAuditTime(r.createdAt)} · {r.summary}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-ink-3 flex-shrink-0">
                    {r.durationMs}ms
                  </span>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="p-2.5 border-t border-[var(--line)] flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="btn btn-ghost btn-sm text-xs"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
