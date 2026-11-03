import { Ctx, assertScope } from "@/lib/ctx";
import { Database, Json } from "@/types/database";
import {
  CreateNoteInput,
  NoteDto,
  NoteSummaryDto,
  UpdateNoteInput,
} from "@/lib/schemas";
import { imageRefs, unreferencedPaths } from "@/lib/domain/canvas";
import { ConflictError, InvalidInputError, NotFoundError } from "@/lib/errors";

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

function mapNote(n: NoteRow): NoteDto {
  return {
    id: n.id,
    title: n.title,
    snippet: n.body_md.slice(0, 140),
    doc: n.doc as Record<string, unknown> | null,
    bodyMd: n.body_md,
    createdBy: n.created_by,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

export function detectImageMimeType(
  buf: Uint8Array | Buffer
): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // GIF: GIF87a or GIF89a
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return { mime: "image/gif", ext: "gif" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

export async function getNotes(
  ctx: Ctx,
  query?: string
): Promise<{ notes: NoteSummaryDto[] }> {
  assertScope(ctx, "notes:read");

  let req = ctx.db
    .from("notes")
    .select("id, title, body_md, created_by, updated_at")
    .eq("user_id", ctx.userId)
    .order("updated_at", { ascending: false });

  if (query && query.trim().length > 0) {
    const q = query.trim().slice(0, 100);
    // Sanitize ilike special chars if needed, or simple wildcard
    const sanitized = q.replace(/[%_]/g, "\\$&");
    req = req.or(`title.ilike.%${sanitized}%,body_md.ilike.%${sanitized}%`);
  }

  const { data, error } = await req;
  if (error) throw error;

  const summaries: NoteSummaryDto[] = (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    snippet: row.body_md.slice(0, 140),
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  }));

  return { notes: summaries };
}

export async function getNote(ctx: Ctx, id: string): Promise<NoteDto> {
  assertScope(ctx, "notes:read");

  const { data, error } = await ctx.db
    .from("notes")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new NotFoundError("Note not found");
  }

  return mapNote(data);
}

export async function createNote(
  ctx: Ctx,
  input: CreateNoteInput
): Promise<NoteDto> {
  assertScope(ctx, "notes:write");

  // Max 300 notes limit
  const { count, error: countErr } = await ctx.db
    .from("notes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", ctx.userId);

  if (countErr) throw countErr;
  if (count !== null && count >= 300) {
    throw new ConflictError(
      "limit_reached",
      "You have reached the limit of 300 notes."
    );
  }

  if (input.doc) {
    const str = JSON.stringify(input.doc);
    if (Buffer.byteLength(str, "utf8") > 1_000_000) {
      throw new InvalidInputError("Doc exceeds 1MB limit", {
        reason: "too_large",
      });
    }
    const refs = imageRefs(input.doc);
    if (refs.length > 30) {
      throw new InvalidInputError("A note cannot contain more than 30 images", {
        reason: "too_large",
      });
    }
  }

  const { data, error } = await ctx.db
    .from("notes")
    .insert({
      user_id: ctx.userId,
      title: input.title.trim(),
      doc: (input.doc as Json) ?? null,
      body_md: input.bodyMd,
      created_by: ctx.actor.type === "owner" ? "owner" : ctx.actor.name,
    })
    .select()
    .single();

  if (error) throw error;
  return mapNote(data);
}

export async function updateNote(
  ctx: Ctx,
  id: string,
  input: UpdateNoteInput
): Promise<NoteDto> {
  assertScope(ctx, "notes:write");

  const { data: existing, error: fetchErr } = await ctx.db
    .from("notes")
    .select("*")
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!existing) {
    throw new NotFoundError("Note not found");
  }

  // Optimistic concurrency check
  const existingTime = new Date(existing.updated_at).getTime();
  const baseTime = new Date(input.baseUpdatedAt).getTime();
  if (existingTime !== baseTime) {
    throw new ConflictError("stale", "Note has been modified elsewhere", {
      note: mapNote(existing),
    });
  }

  if (input.doc) {
    const str = JSON.stringify(input.doc);
    if (Buffer.byteLength(str, "utf8") > 1_000_000) {
      throw new InvalidInputError("Doc exceeds 1MB limit", {
        reason: "too_large",
      });
    }
    const refs = imageRefs(input.doc);
    if (refs.length > 30) {
      throw new InvalidInputError("A note cannot contain more than 30 images", {
        reason: "too_large",
      });
    }
  }

  const updates: {
    title?: string;
    doc?: Json | null;
    body_md?: string;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.doc !== undefined) updates.doc = (input.doc as Json) ?? null;
  if (input.bodyMd !== undefined) updates.body_md = input.bodyMd;

  const { data: updated, error: updateErr } = await ctx.db
    .from("notes")
    .update(updates)
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Clean up unreferenced storage images older than 10 mins (07 §8.5)
  try {
    const folderPath = `${ctx.userId}/${id}`;
    const { data: files } = await ctx.db.storage
      .from("life-notes")
      .list(folderPath);

    if (files && files.length > 0) {
      const activeDoc = (
        input.doc !== undefined ? input.doc : existing.doc
      ) as Record<string, unknown> | null;
      const activeRefs = activeDoc ? imageRefs(activeDoc) : [];

      const storageFiles = files.map((f) => ({
        path: `${folderPath}/${f.name}`,
        createdAt: new Date(f.created_at || Date.now()),
      }));

      const toDelete = unreferencedPaths(activeRefs, storageFiles, new Date());
      if (toDelete.length > 0) {
        // storage remove takes array of paths relative to bucket
        await ctx.db.storage.from("life-notes").remove(toDelete);
      }
    }
  } catch (cleanErr) {
    // Non-fatal cleanup
    console.error("Failed to clean up unreferenced images:", cleanErr);
  }

  return mapNote(updated);
}

export async function deleteNote(ctx: Ctx, id: string): Promise<void> {
  assertScope(ctx, "notes:write");

  const { data: existing, error: fetchErr } = await ctx.db
    .from("notes")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!existing) {
    throw new NotFoundError("Note not found");
  }

  // Delete all storage objects in <user_id>/<id>/
  try {
    const folderPath = `${ctx.userId}/${id}`;
    const { data: files } = await ctx.db.storage
      .from("life-notes")
      .list(folderPath);

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${folderPath}/${f.name}`);
      await ctx.db.storage.from("life-notes").remove(filePaths);
    }
  } catch (storageErr) {
    console.error("Failed to remove note storage files:", storageErr);
  }

  const { error: delErr } = await ctx.db
    .from("notes")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("id", id);

  if (delErr) throw delErr;
}

export async function uploadNoteImage(
  ctx: Ctx,
  noteId: string,
  buffer: Buffer
): Promise<{ ref: string }> {
  assertScope(ctx, "notes:write");

  // Verify note exists and belongs to user
  const { data: note, error: noteErr } = await ctx.db
    .from("notes")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("id", noteId)
    .maybeSingle();

  if (noteErr) throw noteErr;
  if (!note) {
    throw new NotFoundError("Note not found");
  }

  // File size check: 1MB limit
  if (buffer.length > 1_048_576) {
    throw new InvalidInputError("File exceeds 1MB limit", {
      reason: "too_large",
    });
  }

  // Magic byte validation
  const detected = detectImageMimeType(buffer);
  if (!detected) {
    throw new InvalidInputError(
      "Only PNG, JPEG, WebP, and GIF images are allowed",
      { reason: "bad_type" }
    );
  }

  // Check 30 images limit on the note
  const folderPath = `${ctx.userId}/${noteId}`;
  const { data: files, error: listErr } = await ctx.db.storage
    .from("life-notes")
    .list(folderPath);

  if (listErr) throw listErr;
  if (files && files.length >= 30) {
    throw new ConflictError(
      "limit_reached",
      "A note can hold at most 30 images"
    );
  }

  const imageId = crypto.randomUUID();
  const storagePath = `${folderPath}/${imageId}.${detected.ext}`;

  const { error: uploadErr } = await ctx.db.storage
    .from("life-notes")
    .upload(storagePath, buffer, {
      contentType: detected.mime,
      upsert: false,
    });

  if (uploadErr) throw uploadErr;

  return { ref: `sb:${storagePath}` };
}

export async function getNoteImageUrl(
  ctx: Ctx,
  filePath: string
): Promise<string> {
  assertScope(ctx, "notes:read");

  const expectedPrefix = `${ctx.userId}/`;
  if (!filePath.startsWith(expectedPrefix)) {
    throw new NotFoundError("File not found");
  }

  const { data, error } = await ctx.db.storage
    .from("life-notes")
    .createSignedUrl(filePath, 600);

  if (error || !data?.signedUrl) {
    throw new NotFoundError("File not found");
  }

  return data.signedUrl;
}
