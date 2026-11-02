import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SettingsPage() {
  return (
    <div className="page max-w-[1440px] mx-auto p-4 md:p-8">
      <div className="page-head flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight">
          SETTINGS
        </h1>
        <span className="sub text-ink-3 text-sm font-medium">
          Agents, API keys, activity log, and quick links
        </span>
      </div>
      <EmptyState
        illustration="agents-empty"
        title="Settings & Agents"
        description="Configure your personal AI agents (Muse, Antigravity, Claude Code), manage quick links, and test morning email reminders."
      />
    </div>
  );
}
