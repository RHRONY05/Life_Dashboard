/**
 * Money (IOUs) domain logic per 07-LOGIC.md §3.
 * Single source of truth for balances, signs, totals, and formatting.
 */

export type IouKind = "lent" | "paid" | "borrowed" | "received";

export class AlreadySettledError extends Error {
  constructor(message = "Person is already settled") {
    super(message);
    this.name = "AlreadySettledError";
  }
}

/**
 * Sign from Rony's perspective:
 * lent (+, they owe more)
 * paid (+, Rony owes less)
 * borrowed (-, Rony owes more)
 * received (-, they owe less)
 */
export function signOfKind(kind: IouKind): 1 | -1 {
  switch (kind) {
    case "lent":
    case "paid":
      return 1;
    case "borrowed":
    case "received":
      return -1;
  }
}

export function signedAmount(kind: IouKind, amount: number): number {
  return signOfKind(kind) * Math.abs(amount);
}

export interface EntryLike {
  kind: IouKind;
  amount: number;
}

export function personBalance(entries: EntryLike[]): number {
  return entries.reduce((acc, entry) => acc + signedAmount(entry.kind, entry.amount), 0);
}

export interface PersonLike {
  balance: number;
}

export interface MoneyTotals {
  owedToMe: number;
  iOwe: number;
  net: number;
}

export function moneyTotals(people: PersonLike[]): MoneyTotals {
  let owedToMe = 0;
  let iOwe = 0;

  for (const p of people) {
    if (p.balance > 0) {
      owedToMe += p.balance;
    } else if (p.balance < 0) {
      iOwe += Math.abs(p.balance);
    }
  }

  const net = owedToMe - iOwe;
  return { owedToMe, iOwe, net };
}

/**
 * Returns entry to settle person's balance to 0.
 * balance > 0: received balance
 * balance < 0: paid |balance|
 * balance === 0: throws AlreadySettledError
 */
export function settleEntry(balance: number): { kind: "received" | "paid"; amount: number } {
  if (balance === 0) {
    throw new AlreadySettledError();
  }
  if (balance > 0) {
    return { kind: "received", amount: balance };
  }
  return { kind: "paid", amount: Math.abs(balance) };
}

/**
 * Bangladeshi taka format: "৳" + en-IN grouping (e.g. ৳12,34,567).
 * Sign is shown with words, not "-".
 */
export function formatTaka(n: number): string {
  const abs = Math.abs(Math.round(n));
  return `৳${new Intl.NumberFormat("en-IN").format(abs)}`;
}

/**
 * Human-readable sentence for person balance.
 * e.g. "Rahim owes you ৳300", "You owe Karim ৳600", "Settled".
 */
export function balanceSentence(balance: number, personName?: string): string {
  if (balance > 0) {
    return personName ? `${personName} owes you ${formatTaka(balance)}` : `owes you ${formatTaka(balance)}`;
  }
  if (balance < 0) {
    return personName ? `You owe ${personName} ${formatTaka(balance)}` : `you owe ${formatTaka(balance)}`;
  }
  return "Settled";
}

/**
 * Human-readable sentence for net total.
 * e.g. "you're owed ৳650", "you owe ৳300", "all settled".
 */
export function netSentence(net: number): string {
  if (net > 0) {
    return `you're owed ${formatTaka(net)}`;
  }
  if (net < 0) {
    return `you owe ${formatTaka(net)}`;
  }
  return "all settled";
}
