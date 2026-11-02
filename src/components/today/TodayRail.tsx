"use client";

import React from "react";
import Link from "next/link";

export function TodayRail() {
  return (
    <aside className="rail hidden lg:flex flex-col gap-4 w-[320px] flex-none">
      {/* Quick Links Card */}
      <section className="card">
        <div className="card-head">
          <h3>Quick links</h3>
          <Link href="/settings#links" className="text-[var(--text-sm)] text-[var(--accent-text)] font-medium">
            Edit
          </Link>
        </div>
        <div className="card-body">
          <p className="text-[var(--text-sm)] text-[var(--ink-3)] m-0">
            Add links to your other tools in Settings.
          </p>
        </div>
      </section>

      {/* Coming Up Card */}
      <section className="card">
        <div className="card-head">
          <h3>Coming up</h3>
          <Link href="/renewals" className="text-[var(--text-sm)] text-[var(--accent-text)] font-medium">
            All renewals →
          </Link>
        </div>
        <div className="card-body">
          <p className="text-[var(--text-sm)] text-[var(--ink-3)] m-0">
            Nothing renews in the next 2 weeks.
          </p>
        </div>
      </section>
    </aside>
  );
}
