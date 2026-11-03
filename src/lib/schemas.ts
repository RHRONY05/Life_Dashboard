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
    .max(200000, "Markdown body must be 200,000 characters or less"),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.object({
  baseUpdatedAt: z.string().min(1, "baseUpdatedAt is required"),
  title: z.string().trim().min(1).max(120).optional(),
  doc: z.record(z.string(), z.unknown()).nullable().optional(),
  bodyMd: z.string().max(200000).optional(),
});

export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

export interface NoteSummaryDto {
  id: string;
  title: string;
  snippet: string;
  createdBy: string;
  updatedAt: string;
}

export interface NoteDto extends NoteSummaryDto {
  doc: Record<string, unknown> | null;
  bodyMd: string;
  createdAt: string;
}

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

