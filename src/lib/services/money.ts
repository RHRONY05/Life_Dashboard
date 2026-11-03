import { Ctx, assertScope } from "@/lib/ctx";
import { Database } from "@/types/database";
import {
  CreateEntryInput,
  UpdatePersonInput,
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
} from "@/lib/domain/money";
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
    const balance = personBalance(
      pEntries.map((e) => ({
        kind: e.kind as IouKind,
        amount: e.amount_bdt,
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

    return {
      id: p.id,
      name: p.name,
      balance,
      lastEntryDate,
      entriesCount: pEntries.length,
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

  const entries = (rawEntries || []).map(mapEntry);
  const balance = personBalance(
    entries.map((e) => ({
      kind: e.kind as IouKind,
      amount: e.amount,
    }))
  );

  const personDto: PersonDto = {
    id: person.id,
    name: person.name,
    balance,
    lastEntryDate: entries[0]?.occurredOn ?? null,
    entriesCount: entries.length,
  };

  return {
    person: personDto,
    entries,
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

  const createdBy = ctx.actor.type === "agent" ? ctx.actor.name : "human";

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
  const createdBy = ctx.actor.type === "agent" ? ctx.actor.name : "human";

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
