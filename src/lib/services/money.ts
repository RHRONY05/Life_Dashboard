import { Ctx, assertScope } from "@/lib/ctx";
import { Database } from "@/types/database";
import {
  CreateEntryInput,
  UpdatePersonInput,
  UpdateEntryInput,
  ImportIousInput,
  PersonDto,
  EntryDto,
  MoneyOverviewDto,
  IouKindSchemaType,
} from "@/lib/schemas";
import {
  personBalance,
  moneyTotals,
  settleEntry,
  IouKind,
  AlreadySettledError,
  withBalances,
  sinceSettled,
  extractRecentAndLastNote,
  reminderText,
  reminderTask,
  parseIouText,
  ImportLine,
  signedAmount,
} from "@/lib/domain/money";
import { IouCsvRow } from "@/lib/domain/csv";
import { todayIn } from "@/lib/domain/dates";
import { ConflictError, InvalidInputError, NotFoundError } from "@/lib/errors";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";

type PersonRow = Database["public"]["Tables"]["people"]["Row"];
type IouEntryRow = Database["public"]["Tables"]["iou_entries"]["Row"];

function mapEntry(row: IouEntryRow): EntryDto {
  return {
    id: row.id,
    personId: row.person_id,
    kind: row.kind as IouKindSchemaType,
    amount: row.amount_bdt,
    note: row.note,
    occurredOn: row.occurred_on,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function getMoneyOverview(ctx: Ctx): Promise<MoneyOverviewDto> {
  assertScope(ctx, "money:read");

  // 1. Fetch people
  const { data: people, error: peopleError } = await ctx.db
    .from("people")
    .select("*")
    .eq("user_id", ctx.userId);

  if (peopleError) throw peopleError;

  // 2. Fetch all entries
  const { data: entries, error: entriesError } = await ctx.db
    .from("iou_entries")
    .select("*")
    .eq("user_id", ctx.userId);

  if (entriesError) throw entriesError;

  // Group entries by person_id
  const entriesByPerson = new Map<string, IouEntryRow[]>();
  for (const entry of entries || []) {
    if (!entriesByPerson.has(entry.person_id)) {
      entriesByPerson.set(entry.person_id, []);
    }
    entriesByPerson.get(entry.person_id)!.push(entry);
  }

  const personDtos: PersonDto[] = (people || []).map((p) => {
    const pEntries = entriesByPerson.get(p.id) || [];
    const mappedEntries = pEntries.map(mapEntry);
    const balance = personBalance(
      mappedEntries.map((e) => ({
        kind: e.kind as IouKind,
        amount: e.amount,
      }))
    );

    let lastEntryDate: string | null = null;
    if (pEntries.length > 0) {
      // Find latest occurred_on, fallback to created_at
      const sorted = [...pEntries].sort((a, b) =>
        b.occurred_on.localeCompare(a.occurred_on)
      );
      lastEntryDate = sorted[0].occurred_on;
    }

    const { recent, lastNote } = extractRecentAndLastNote(mappedEntries);

    return {
      id: p.id,
      name: p.name,
      balance,
      lastEntryDate,
      entriesCount: pEntries.length,
      recent,
      lastNote,
    };
  });

  // Sort people: non-zero first by |balance| desc, then settled by name asc
  personDtos.sort((a, b) => {
    const aSettled = a.balance === 0;
    const bSettled = b.balance === 0;

    if (!aSettled && bSettled) return -1;
    if (aSettled && !bSettled) return 1;

    if (!aSettled && !bSettled) {
      const diff = Math.abs(b.balance) - Math.abs(a.balance);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  const totals = moneyTotals(personDtos.map((p) => ({ balance: p.balance })));

  return {
    totals,
    people: personDtos,
  };
}

export async function getPersonEntries(
  ctx: Ctx,
  personId: string
): Promise<{ person: PersonDto; entries: EntryDto[] }> {
  assertScope(ctx, "money:read");

  const { data: person, error: personError } = await ctx.db
    .from("people")
    .select("*")
    .eq("id", personId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (personError) throw personError;
  if (!person) {
    throw new NotFoundError("Person not found");
  }

  const { data: rawEntries, error: entriesError } = await ctx.db
    .from("iou_entries")
    .select("*")
    .eq("person_id", personId)
    .eq("user_id", ctx.userId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (entriesError) throw entriesError;

  const mappedEntries = (rawEntries || []).map(mapEntry);
  const withB = withBalances(mappedEntries);
  // Sort newest first
  const sortedNewest = [...withB].sort((a, b) => {
    const cmp = b.occurredOn.localeCompare(a.occurredOn);
    if (cmp !== 0) return cmp;
    const aCreated = a.createdAt || "";
    const bCreated = b.createdAt || "";
    return bCreated.localeCompare(aCreated);
  });

  const { recent, lastNote } = extractRecentAndLastNote(mappedEntries);
  const balance = personBalance(
    mappedEntries.map((e) => ({
      kind: e.kind as IouKind,
      amount: e.amount,
    }))
  );

  const personDto: PersonDto = {
    id: person.id,
    name: person.name,
    balance,
    lastEntryDate: sortedNewest[0]?.occurredOn ?? null,
    entriesCount: sortedNewest.length,
    recent,
    lastNote,
  };

  return {
    person: personDto,
    entries: sortedNewest,
  };
}

export async function createEntry(
  ctx: Ctx,
  input: CreateEntryInput,
  clock = new Date()
): Promise<{ entry: EntryDto; person: PersonDto }> {
  assertScope(ctx, "money:write");

  const todayIso = todayIn(clock, APP_TIMEZONE);
  const occurredOn = input.occurredOn || todayIso;

  if (occurredOn > todayIso) {
    throw new InvalidInputError("Cannot log entries for future dates");
  }

  const trimmedName = input.personName.trim();

  // Find or create person (case-insensitive)
  const { data: existingPeople, error: searchError } = await ctx.db
    .from("people")
    .select("*")
    .eq("user_id", ctx.userId)
    .ilike("name", trimmedName);

  if (searchError) throw searchError;

  let personRow: PersonRow;

  if (existingPeople && existingPeople.length > 0) {
    personRow = existingPeople[0];
  } else {
    const { data: newPerson, error: insertPersonError } = await ctx.db
      .from("people")
      .insert({
        user_id: ctx.userId,
        name: trimmedName,
      })
      .select()
      .single();

    if (insertPersonError || !newPerson) {
      throw insertPersonError || new Error("Failed to create person");
    }
    personRow = newPerson;
  }

  const createdBy = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  // Insert entry
  const { data: newEntry, error: insertEntryError } = await ctx.db
    .from("iou_entries")
    .insert({
      user_id: ctx.userId,
      person_id: personRow.id,
      kind: input.kind,
      amount_bdt: input.amount,
      note: input.note || null,
      occurred_on: occurredOn,
      created_by: createdBy,
    })
    .select()
    .single();

  if (insertEntryError || !newEntry) {
    throw insertEntryError || new Error("Failed to create IOU entry");
  }

  // Get updated person balance
  const { person } = await getPersonEntries(ctx, personRow.id);

  return {
    entry: mapEntry(newEntry),
    person,
  };
}

export async function deleteEntry(
  ctx: Ctx,
  entryId: string
): Promise<void> {
  assertScope(ctx, "money:write");

  const { error } = await ctx.db
    .from("iou_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", ctx.userId);

  if (error) {
    throw error;
  }
}

export async function updateEntry(
  ctx: Ctx,
  entryId: string,
  input: UpdateEntryInput,
  clock = new Date()
): Promise<{ entry: EntryDto; person: PersonDto }> {
  assertScope(ctx, "money:write");

  const todayIso = todayIn(clock, APP_TIMEZONE);
  if (input.occurredOn && input.occurredOn > todayIso) {
    throw new InvalidInputError("Cannot log entries for future dates");
  }

  const { data: existing, error: fetchErr } = await ctx.db
    .from("iou_entries")
    .select("*")
    .eq("id", entryId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!existing) {
    throw new NotFoundError("Entry not found");
  }

  const updates: Partial<IouEntryRow> = {};
  if (input.kind !== undefined) updates.kind = input.kind;
  if (input.amount !== undefined) updates.amount_bdt = input.amount;
  if (input.note !== undefined) updates.note = input.note ? input.note.trim() : null;
  if (input.occurredOn !== undefined) updates.occurred_on = input.occurredOn;

  const { data: updated, error: updateErr } = await ctx.db
    .from("iou_entries")
    .update(updates)
    .eq("id", entryId)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw updateErr || new Error("Failed to update entry");
  }

  const { person, entries } = await getPersonEntries(ctx, existing.person_id);
  const updatedEntryDto = entries.find((e) => e.id === entryId) || mapEntry(updated);

  return {
    entry: updatedEntryDto,
    person,
  };
}

export async function getPersonReminder(
  ctx: Ctx,
  personId: string
): Promise<{ text: string; task: { title: string } }> {
  assertScope(ctx, "money:read");

  const { person, entries } = await getPersonEntries(ctx, personId);

  if (person.balance === 0) {
    throw new ConflictError("already_settled");
  }

  const since = sinceSettled(entries);
  const text = person.balance > 0 ? reminderText(person.name, person.balance, since) : "";
  const task = reminderTask(person.name, person.balance);

  return { text, task };
}

export interface ImportLineWithExisting extends ImportLine {
  existing: { personId: string; balance: number } | null;
}

export async function importIous(
  ctx: Ctx,
  input: ImportIousInput,
  clock = new Date()
): Promise<
  | { lines: ImportLineWithExisting[] }
  | { people: number; entries: number }
> {
  assertScope(ctx, "money:write");

  const parsedLines = parseIouText(input.text);

  // Fetch all existing people to know who already exists and their balances
  const { data: peopleRows, error: pErr } = await ctx.db
    .from("people")
    .select("id, name")
    .eq("user_id", ctx.userId);

  if (pErr) throw pErr;

  const { data: allEntries, error: eErr } = await ctx.db
    .from("iou_entries")
    .select("person_id, kind, amount_bdt")
    .eq("user_id", ctx.userId);

  if (eErr) throw eErr;

  const entriesByPerson = new Map<string, { kind: IouKind; amount: number }[]>();
  for (const e of allEntries || []) {
    if (!entriesByPerson.has(e.person_id)) {
      entriesByPerson.set(e.person_id, []);
    }
    entriesByPerson.get(e.person_id)!.push({
      kind: e.kind as IouKind,
      amount: e.amount_bdt,
    });
  }

  const existingMap = new Map<string, { personId: string; balance: number }>();
  for (const p of peopleRows || []) {
    const pEnt = entriesByPerson.get(p.id) || [];
    const bal = personBalance(pEnt);
    existingMap.set(p.name.toLowerCase().trim(), { personId: p.id, balance: bal });
  }

  // Preview mode
  if (!input.commit) {
    const linesWithExisting: ImportLineWithExisting[] = parsedLines.map((line) => {
      const existing = line.name ? existingMap.get(line.name.toLowerCase().trim()) || null : null;
      let effectiveDirection = line.direction;
      if (input.directions && input.directions[line.lineNo]) {
        effectiveDirection = input.directions[line.lineNo];
      }
      let balance = 0;
      for (const t of line.terms) {
        balance += t.sign * t.amount;
      }
      if (effectiveDirection === "i_owe") {
        balance = -balance;
      }
      return {
        ...line,
        direction: effectiveDirection,
        balance,
        existing,
      };
    });

    return { lines: linesWithExisting };
  }

  // Commit mode
  let linesToImport: ImportLine[] = [];
  if (input.include && input.include.length > 0) {
    linesToImport = parsedLines.filter(
      (l) => !l.error && input.include!.includes(l.lineNo)
    );
  } else {
    linesToImport = parsedLines.filter(
      (l) => !l.error && !existingMap.has(l.name.toLowerCase().trim())
    );
  }

  let peopleCreated = 0;
  let entriesCreated = 0;
  const todayIso = todayIn(clock, APP_TIMEZONE);
  const createdBy = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  for (const line of linesToImport) {
    const trimmedName = line.name.trim();
    if (!trimmedName) continue;

    let personId: string;
    const existing = existingMap.get(trimmedName.toLowerCase());
    if (existing) {
      personId = existing.personId;
    } else {
      const { data: newPerson, error: createPErr } = await ctx.db
        .from("people")
        .insert({
          user_id: ctx.userId,
          name: trimmedName,
        })
        .select()
        .single();

      if (createPErr || !newPerson) throw createPErr || new Error("Failed to create person");
      personId = newPerson.id;
      existingMap.set(trimmedName.toLowerCase(), { personId, balance: 0 });
      peopleCreated++;
    }

    const direction =
      (input.directions && input.directions[line.lineNo]) ||
      line.direction ||
      "owes_me";

    for (const term of line.terms) {
      let kind: IouKind;
      if (direction === "owes_me") {
        kind = term.sign === 1 ? "lent" : "received";
      } else {
        kind = term.sign === 1 ? "borrowed" : "paid";
      }

      const { error: insErr } = await ctx.db.from("iou_entries").insert({
        user_id: ctx.userId,
        person_id: personId,
        kind,
        amount_bdt: term.amount,
        note: term.note || "imported",
        occurred_on: todayIso,
        created_by: createdBy,
      });

      if (insErr) throw insErr;
      entriesCreated++;
    }
  }

  return { people: peopleCreated, entries: entriesCreated };
}

export async function renamePerson(
  ctx: Ctx,
  personId: string,
  input: UpdatePersonInput
): Promise<PersonDto> {
  assertScope(ctx, "money:write");

  const trimmedName = input.name.trim();

  // Check if another person already exists with this name (case-insensitive)
  const { data: duplicates, error: dupError } = await ctx.db
    .from("people")
    .select("id")
    .eq("user_id", ctx.userId)
    .ilike("name", trimmedName)
    .neq("id", personId);

  if (dupError) throw dupError;
  if (duplicates && duplicates.length > 0) {
    throw new ConflictError("Person with this name already exists");
  }

  const { data, error } = await ctx.db
    .from("people")
    .update({ name: trimmedName })
    .eq("id", personId)
    .eq("user_id", ctx.userId)
    .select()
    .single();

  if (error || !data) {
    throw error || new NotFoundError("Person not found");
  }

  const { person } = await getPersonEntries(ctx, personId);
  return person;
}

export async function deletePerson(
  ctx: Ctx,
  personId: string
): Promise<void> {
  assertScope(ctx, "money:write");

  const { error } = await ctx.db
    .from("people")
    .delete()
    .eq("id", personId)
    .eq("user_id", ctx.userId);

  if (error) {
    throw error;
  }
}

export async function settlePerson(
  ctx: Ctx,
  personId: string,
  clock = new Date()
): Promise<{ entry: EntryDto; person: PersonDto }> {
  assertScope(ctx, "money:write");

  const { person } = await getPersonEntries(ctx, personId);

  if (person.balance === 0) {
    throw new ConflictError("already_settled");
  }

  let settleData;
  try {
    settleData = settleEntry(person.balance);
  } catch (err) {
    if (err instanceof AlreadySettledError) {
      throw new ConflictError("already_settled");
    }
    throw err;
  }

  const todayIso = todayIn(clock, APP_TIMEZONE);
  const createdBy = ctx.actor.type === "agent" ? ctx.actor.name : "owner";

  const { data: newEntry, error: insertError } = await ctx.db
    .from("iou_entries")
    .insert({
      user_id: ctx.userId,
      person_id: personId,
      kind: settleData.kind,
      amount_bdt: settleData.amount,
      note: "Settled up",
      occurred_on: todayIso,
      created_by: createdBy,
    })
    .select()
    .single();

  if (insertError || !newEntry) {
    throw insertError || new Error("Failed to settle person");
  }

  const { person: updatedPerson } = await getPersonEntries(ctx, personId);

  return {
    entry: mapEntry(newEntry),
    person: updatedPerson,
  };
}

export async function listAllIouEntriesForExport(
  ctx: Ctx
): Promise<IouCsvRow[]> {
  assertScope(ctx, "money:read");

  // Fetch all people
  const { data: people, error: pError } = await ctx.db
    .from("people")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("name", { ascending: true });

  if (pError) throw pError;

  // Fetch all entries
  const { data: rawEntries, error: eError } = await ctx.db
    .from("iou_entries")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("occurred_on", { ascending: true })
    .order("created_at", { ascending: true });

  if (eError) throw eError;

  const entriesByPerson = new Map<string, IouEntryRow[]>();
  for (const entry of rawEntries || []) {
    if (!entriesByPerson.has(entry.person_id)) {
      entriesByPerson.set(entry.person_id, []);
    }
    entriesByPerson.get(entry.person_id)!.push(entry);
  }

  const exportRows: IouCsvRow[] = [];

  for (const person of people || []) {
    const personRawEntries = entriesByPerson.get(person.id) || [];
    const dtos = personRawEntries.map(mapEntry);
    const withBals = withBalances(dtos);

    for (const e of withBals) {
      exportRows.push({
        occurredOn: e.occurredOn,
        personName: person.name,
        kind: e.kind,
        amount: e.amount,
        signed: signedAmount(e.kind, e.amount),
        balanceAfter: e.balanceAfter ?? 0,
        note: e.note,
        createdBy: e.createdBy,
      });
    }
  }

  return exportRows;
}
