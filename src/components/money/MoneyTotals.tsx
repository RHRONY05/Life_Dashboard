"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { MoneyTotalsDto, PersonDto } from "@/lib/schemas";
import { netSentence } from "@/lib/domain/money";

interface MoneyTotalsProps {
  totals: MoneyTotalsDto;
  people: PersonDto[];
}

export function MoneyTotals({ totals, people }: MoneyTotalsProps) {
  const countOwedToMe = people.filter((p) => p.balance > 0).length;
  const countIOwe = people.filter((p) => p.balance < 0).length;

  return (
    <div className="tiles">
      <div className="tile">
        <div className="tile-k">
          <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--success-text)]" />
          Others owe you
        </div>
        <div className="tile-v pos num text-[var(--success-text)]">
          <span className="taka">৳</span>
          {new Intl.NumberFormat("en-IN").format(Math.round(totals.owedToMe))}
        </div>
        <div className="tile-s">
          {countOwedToMe === 1 ? "1 person" : `${countOwedToMe} people`}
        </div>
      </div>

      <div className="tile">
        <div className="tile-k">
          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--danger-text)]" />
          You owe
        </div>
        <div className="tile-v neg num text-[var(--danger-text)]">
          <span className="taka">৳</span>
          {new Intl.NumberFormat("en-IN").format(Math.round(totals.iOwe))}
        </div>
        <div className="tile-s">
          {countIOwe === 1 ? "1 person" : `${countIOwe} people`}
        </div>
      </div>

      <div className="tile">
        <div className="tile-k">
          <Scale className="w-3.5 h-3.5" />
          Net
        </div>
        <div className="tile-v text-[var(--text-xl)]">
          {netSentence(totals.net)}
        </div>
        <div className="tile-s">after everyone settles</div>
      </div>
    </div>
  );
}
