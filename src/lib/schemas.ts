import { z } from "zod";

export const DayRefSchema = z.string().min(1);

export const CreateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be 200 characters or less"),
    note: z
      .string()
      .max(1000, "Note must be 1000 characters or less")
      .nullable()
      .optional(),
    dueOn: DayRefSchema.optional(),
    listId: z.string().uuid().optional(),
  })
  .refine(
    (data) => (data.dueOn !== undefined) !== (data.listId !== undefined),
    { message: "Must provide exactly one of dueOn or listId" }
  );

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const MoveToSchema = z.union([
  z.enum(["today", "tomorrow"]),
  z.object({ listId: z.string().uuid() }),
]);

export type MoveToInput = z.infer<typeof MoveToSchema>;

export const UpdateTaskSchema = z.union([
  z.object({ done: z.boolean() }),
  z.object({ moveTo: MoveToSchema }),
  z.object({ reorder: z.enum(["up", "down"]) }),
  z.object({
    title: z.string().trim().min(1).max(200).optional(),
    note: z.string().max(1000).nullable().optional(),
  }),
]);

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const MoveUnfinishedSchema = z.object({
  from: z.literal("yesterday_and_older"),
  to: z.literal("today"),
});

export type MoveUnfinishedInput = z.infer<typeof MoveUnfinishedSchema>;

export const CreateListSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(40, "Name must be 40 characters or less"),
});

export type CreateListInput = z.infer<typeof CreateListSchema>;

export const UpdateListSchema = z.union([
  z.object({
    name: z.string().trim().min(1).max(40),
  }),
  z.object({
    reorder: z.enum(["up", "down"]),
  }),
]);

export type UpdateListInput = z.infer<typeof UpdateListSchema>;

export interface TaskDto {
  id: string;
  title: string;
  note: string | null;
  dueOn: string | null;
  listId: string | null;
  done: boolean;
  doneAt: string | null;
  position: number;
  movedCount: number;
  createdBy: string;
  trackerItemId: string | null;
}

export interface TaskListDto {
  id: string;
  name: string;
  position: number;
  createdBy: string;
  open: TaskDto[];
  done: TaskDto[];
}

export const CreateNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must be 120 characters or less"),
  doc: z.record(z.string(), z.unknown()).nullable().optional(),
  bodyMd: z
    .string()
    .max(200000, "Markdown body must be 200,000 characters or less")
    .optional()
    .default(""),
  parentId: z.string().uuid().nullable().optional(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.object({
  baseUpdatedAt: z.string().min(1, "baseUpdatedAt is required"),
  title: z.string().trim().min(1).max(120).optional(),
  doc: z.record(z.string(), z.unknown()).nullable().optional(),
  bodyMd: z.string().max(200000).optional(),
  parentId: z.string().uuid().nullable().optional(),
  pinned: z.boolean().optional(),
});

export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

export interface NoteSummaryDto {
  id: string;
  title: string;
  parentId: string | null;
  pinned: boolean;
  snippet: string;
  createdBy: string;
  updatedAt: string;
  path?: string;
}

export interface NoteDto extends NoteSummaryDto {
  doc: Record<string, unknown> | null;
  bodyMd: string;
  path: string;
  createdAt: string;
  prevBy: string | null;
  prevAt: string | null;
}

// ============ Agent Page Tools Schemas (V3d, V8) ============

export const AgentListNotesSchema = z.object({
  query: z.string().min(1).max(100).optional(),
});

export const AgentGetNoteSchema = z.object({
  note: z.string().min(1, "note is required"),
});

export const AgentCreateNoteSchema = z.object({
  title: z.string().trim().min(1, "title is required").max(120),
  markdown: z.string().max(200000).optional(),
  parent: z.string().optional(),
});

export const AgentAppendToNoteSchema = z.object({
  note: z.string().min(1, "note is required"),
  markdown: z.string().min(1, "markdown is required").max(50000),
  underHeading: z.string().optional(),
});

export const AgentReplaceNoteSectionSchema = z.object({
  note: z.string().min(1, "note is required"),
  heading: z.string().min(1, "heading is required"),
  markdown: z.string().max(200000),
  expectedUpdatedAt: z.string().min(1, "expectedUpdatedAt is required"),
});

export const AgentUpdateNoteSchema = z
  .object({
    note: z.string().min(1, "note is required"),
    title: z.string().trim().min(1).max(120).optional(),
    markdown: z.string().max(200000).optional(),
    expectedUpdatedAt: z.string().optional(),
  })
  .refine((data) => data.title !== undefined || data.markdown !== undefined, {
    message: "At least one of title or markdown must be provided",
  });

// ============ Trackers ============

export const CreateTrackerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or less"),
  description: z
    .string()
    .max(300, "Description must be 300 characters or less")
    .nullable()
    .optional(),
  itemsText: z
    .string()
    .max(20000, "Items text must be 20,000 characters or less")
    .optional(),
});

export type CreateTrackerInput = z.infer<typeof CreateTrackerSchema>;

export const UpdateTrackerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or less")
    .optional(),
  description: z
    .string()
    .max(300, "Description must be 300 characters or less")
    .nullable()
    .optional(),
  archived: z.boolean().optional(),
});

export type UpdateTrackerInput = z.infer<typeof UpdateTrackerSchema>;

export const AddTrackerItemsSchema = z.union([
  z.object({
    itemsText: z
      .string()
      .min(1, "Items text is required")
      .max(20000, "Items text must be 20,000 characters or less"),
  }),
  z.object({
    items: z
      .array(
        z.object({
          title: z
            .string()
            .trim()
            .min(1, "Title is required")
            .max(200, "Title must be 200 characters or less"),
          groupName: z
            .string()
            .max(80, "Group name must be 80 characters or less")
            .nullable()
            .optional(),
          url: z
            .string()
            .regex(/^https?:\/\//i, "URL must start with http:// or https://")
            .max(500, "URL must be 500 characters or less")
            .nullable()
            .optional(),
          note: z
            .string()
            .max(1000, "Note must be 1000 characters or less")
            .nullable()
            .optional(),
        })
      )
      .min(1, "At least 1 item is required")
      .max(300, "Maximum 300 items allowed"),
  }),
]);

export type AddTrackerItemsInput = z.infer<typeof AddTrackerItemsSchema>;

export const UpdateTrackerItemSchema = z.object({
  status: z.enum(["todo", "done", "skipped"]).optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .optional(),
  groupName: z
    .string()
    .max(80, "Group name must be 80 characters or less")
    .nullable()
    .optional(),
  url: z
    .string()
    .regex(/^https?:\/\//i, "URL must start with http:// or https://")
    .max(500, "URL must be 500 characters or less")
    .nullable()
    .optional(),
  note: z
    .string()
    .max(1000, "Note must be 1000 characters or less")
    .nullable()
    .optional(),
});

export type UpdateTrackerItemInput = z.infer<typeof UpdateTrackerItemSchema>;

export const ScheduleTrackerItemSchema = z.object({
  dueOn: DayRefSchema,
});

export type ScheduleTrackerItemInput = z.infer<
  typeof ScheduleTrackerItemSchema
>;

export interface TrackerSummaryDto {
  id: string;
  name: string;
  description: string | null;
  done: number;
  total: number;
  archived: boolean;
  createdBy?: string;
}

export interface TrackerItemDto {
  id: string;
  trackerId: string;
  title: string;
  groupName: string | null;
  url: string | null;
  note: string | null;
  status: "todo" | "done" | "skipped";
  scheduledOn: string | null; // linked open task's dueOn
  position: number;
}

export interface TrackerGroupDto {
  name: string | null;
  items: TrackerItemDto[];
}

export interface TrackerDetailDto {
  tracker: TrackerSummaryDto;
  groups: TrackerGroupDto[];
}

// ─── SPENDING ───

export const SpendingCategories = [
  "food",
  "transport",
  "study",
  "bills",
  "health",
  "shopping",
  "fun",
  "giving",
  "other",
] as const;

export type SpendingCategory = (typeof SpendingCategories)[number];

export const CreateExpenseSchema = z.object({
  amount: z
    .number()
    .int("Amount must be a whole number")
    .min(1, "Amount must be at least ৳1")
    .max(10_000_000, "Amount must be ৳10,000,000 or less"),
  category: z.enum(SpendingCategories),
  note: z
    .string()
    .max(120, "Note must be 120 characters or less")
    .trim()
    .nullable()
    .optional(),
  spentOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;

export const UpdateExpenseSchema = z.object({
  amount: z
    .number()
    .int("Amount must be a whole number")
    .min(1, "Amount must be at least ৳1")
    .max(10_000_000, "Amount must be ৳10,000,000 or less")
    .optional(),
  category: z.enum(SpendingCategories).optional(),
  note: z
    .string()
    .max(120, "Note must be 120 characters or less")
    .trim()
    .nullable()
    .optional(),
  spentOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
});

export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>;

export const SetBudgetSchema = z.object({
  monthlyBudget: z
    .number()
    .int("Budget must be a whole number")
    .min(1, "Budget must be at least ৳1")
    .max(10_000_000, "Budget must be ৳10,000,000 or less")
    .nullable(),
});

export type SetBudgetInput = z.infer<typeof SetBudgetSchema>;

export interface ExpenseDto {
  id: string;
  amount: number;
  category: SpendingCategory;
  note: string | null;
  spentOn: string;
  createdBy: string;
}

export interface SpendingSummaryDto {
  today: number;
  week: number;
  month: number;
  weekRange: { from: string; to: string };
  monthLabel: string;
  budget: number | null;
  budgetLeft: number | null;
  budgetPct: number | null;
  byCategory: { category: SpendingCategory; amount: number; pct: number }[];
  firstMonth?: string | null;
}

export interface SpendingDayGroupDto {
  day: string;
  total: number;
  expenses: ExpenseDto[];
}

export interface SpendingDaysResponseDto {
  days: SpendingDayGroupDto[];
  hasMore: boolean;
  matchCount?: number;
  matchTotal?: number;
}

// ─── TO PAY (Payment Todos) ───

export const PaymentTodoRepeat = ["none", "monthly"] as const;
export type PaymentTodoRepeatType = (typeof PaymentTodoRepeat)[number];

export const CreatePaymentTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(80, "Title must be 80 characters or less"),
  amount: z
    .number()
    .int("Amount must be a whole number")
    .min(1, "Amount must be at least ৳1")
    .max(10_000_000, "Amount must be ৳10,000,000 or less"),
  category: z.enum(SpendingCategories).default("giving"),
  dueOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .nullable()
    .optional(),
  repeat: z.enum(PaymentTodoRepeat).default("none"),
  note: z
    .string()
    .max(200, "Note must be 200 characters or less")
    .trim()
    .nullable()
    .optional(),
});

export type CreatePaymentTodoInput = z.input<typeof CreatePaymentTodoSchema>;

export const UpdatePaymentTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(80, "Title must be 80 characters or less")
    .optional(),
  amount: z
    .number()
    .int("Amount must be a whole number")
    .min(1, "Amount must be at least ৳1")
    .max(10_000_000, "Amount must be ৳10,000,000 or less")
    .optional(),
  category: z.enum(SpendingCategories).optional(),
  dueOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .nullable()
    .optional(),
  repeat: z.enum(PaymentTodoRepeat).optional(),
  note: z
    .string()
    .max(200, "Note must be 200 characters or less")
    .trim()
    .nullable()
    .optional(),
});

export type UpdatePaymentTodoInput = z.infer<typeof UpdatePaymentTodoSchema>;

export interface PaymentTodoDto {
  id: string;
  title: string;
  amount: number;
  category: SpendingCategory;
  dueOn: string | null;
  repeat: PaymentTodoRepeatType;
  note: string | null;
  paidOn: string | null;
  expenseId: string | null;
  nextId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTodosResponseDto {
  open: PaymentTodoDto[];
  paid: PaymentTodoDto[];
  openTotal: number;
}

// ─── MONEY (IOUs) ───

export const IouKinds = ["lent", "paid", "borrowed", "received"] as const;
export type IouKindSchemaType = (typeof IouKinds)[number];

export const CreateEntrySchema = z.object({
  personName: z
    .string()
    .trim()
    .min(1, "Person name is required")
    .max(60, "Person name must be 60 characters or less"),
  kind: z.enum(IouKinds),
  amount: z
    .number()
    .int("Amount must be a whole number")
    .min(1, "Amount must be at least ৳1")
    .max(10_000_000, "Amount must be ৳10,000,000 or less"),
  note: z
    .string()
    .max(200, "Note must be 200 characters or less")
    .trim()
    .nullable()
    .optional(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
});

export type CreateEntryInput = z.infer<typeof CreateEntrySchema>;

export const UpdateEntrySchema = z.object({
  kind: z.enum(IouKinds).optional(),
  amount: z
    .number()
    .int("Amount must be a whole number")
    .min(1, "Amount must be at least ৳1")
    .max(10_000_000, "Amount must be ৳10,000,000 or less")
    .optional(),
  note: z
    .string()
    .max(200, "Note must be 200 characters or less")
    .trim()
    .nullable()
    .optional(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
});

export type UpdateEntryInput = z.infer<typeof UpdateEntrySchema>;

export const ImportIousSchema = z.object({
  text: z.string().max(20_000, "Text must be 20,000 characters or less"),
  commit: z.boolean(),
  directions: z.record(z.string(), z.enum(["owes_me", "i_owe"])).optional(),
  include: z.array(z.number().int()).optional(),
});

export type ImportIousInput = z.infer<typeof ImportIousSchema>;

export const UpdatePersonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Person name is required")
    .max(60, "Person name must be 60 characters or less"),
});

export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;

export interface PersonRecentChipDto {
  signed: number;
  note: string | null;
  occurredOn: string;
}

export interface PersonDto {
  id: string;
  name: string;
  balance: number;
  lastEntryDate: string | null;
  entriesCount?: number;
  recent?: PersonRecentChipDto[];
  lastNote?: string | null;
}

export interface EntryDto {
  id: string;
  personId: string;
  kind: IouKindSchemaType;
  amount: number;
  note: string | null;
  occurredOn: string;
  createdBy: string;
  createdAt: string;
  balanceAfter?: number;
}

export interface MoneyTotalsDto {
  owedToMe: number;
  iOwe: number;
  net: number;
}

export interface MoneyOverviewDto {
  totals: MoneyTotalsDto;
  people: PersonDto[];
}

/** Returns true only if createdBy belongs to an AI agent (not owner or legacy human) */
export function isAgentActor(createdBy?: string | null): boolean {
  return Boolean(createdBy && createdBy !== "owner" && createdBy !== "human");
}


