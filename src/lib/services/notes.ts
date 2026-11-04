import { Ctx, assertScope } from "@/lib/ctx";
import { Database, Json } from "@/types/database";
import {
  CreateNoteInput,
  NoteDto,
  NoteSummaryDto,
  UpdateNoteInput,
} from "@/lib/schemas";
import {
  buildTree,
  canMove,
  flattenTree,
  imageRefs,
  unreferencedPaths,
  type NoteSummaryItem,
} from "@/lib/domain/canvas";
import { ConflictError, InvalidInputError, NotFoundError } from "@/lib/errors";

type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

function mapNote(n: NoteRow, path?: string): NoteDto {
  return {
    id: n.id,
    title: n.title,
    parentId: n.parent_id,
    pinned: n.pinned,
    snippet: n.body_md.slice(0, 140),
    doc: n.doc as Record<string, unknown> | null,
    bodyMd: n.body_md,
    path: path || n.title,
    createdBy: n.created_by,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
    prevBy: n.prev_by,
    prevAt: n.prev_at,
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
    .select("id, title, parent_id, pinned, body_md, created_by, updated_at")
    .eq("user_id", ctx.userId)
    .order("updated_at", { ascending: false });

  if (query && query.trim().length > 0) {
    const q = query.trim().slice(0, 100);
    const sanitized = q.replace(/[%_]/g, "\\$&");
    req = req.or(`title.ilike.%${sanitized}%,body_md.ilike.%${sanitized}%`);
  }

  const { data, error } = await req;
  if (error) throw error;

  const summaries: NoteSummaryDto[] = (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    parentId: row.parent_id,
    pinned: row.pinned,
    snippet: row.body_md.slice(0, 140),
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  }));

  return { notes: summaries };
}

async function computeNotePath(ctx: Ctx, note: NoteRow): Promise<string> {
  let current: { id: string; title: string; parent_id: string | null } | null = note;
  const titles = [current.title];
  let depth = 1;

  while (current?.parent_id && depth <= 3) {
    const res = await ctx.db
      .from("notes")
      .select("id, title, parent_id")
      .eq("user_id", ctx.userId)
      .eq("id", current.parent_id)
      .maybeSingle();

    const parentNode = res.data as { id: string; title: string; parent_id: string | null } | null;
    if (!parentNode) break;
    titles.unshift(parentNode.title);
    current = parentNode;
    depth++;
  }

  return titles.join(" / ");
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

  const path = await computeNotePath(ctx, data);
  return mapNote(data, path);
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

  // Validate parentId if provided
  if (input.parentId) {
    const { data: parent, error: parentErr } = await ctx.db
      .from("notes")
      .select("id, parent_id")
      .eq("user_id", ctx.userId)
      .eq("id", input.parentId)
      .maybeSingle();

    if (parentErr) throw parentErr;
    if (!parent) {
      throw new NotFoundError("Parent note not found");
    }

    // Check parent's depth
    let parentDepth = 1;
    let curr = parent;
    while (curr.parent_id && parentDepth <= 3) {
      const { data: ancestor } = await ctx.db
        .from("notes")
        .select("id, parent_id")
        .eq("user_id", ctx.userId)
        .eq("id", curr.parent_id)
        .maybeSingle();
      if (!ancestor) break;
      curr = ancestor;
      parentDepth++;
    }

    if (parentDepth >= 3) {
      throw new ConflictError("too_deep", "Max 3 levels");
    }
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
      body_md: input.bodyMd || "",
      parent_id: input.parentId || null,
      pinned: false,
      created_by: ctx.actor.type === "owner" ? "owner" : ctx.actor.name,
    })
    .select()
    .single();

  if (error) throw error;
  const path = await computeNotePath(ctx, data);
  return mapNote(data, path);
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
    const path = await computeNotePath(ctx, existing);
    throw new ConflictError("stale", "Note has been modified elsewhere", {
      note: mapNote(existing, path),
    });
  }

  // Check pin limit: max 5 pinned pages
  if (input.pinned === true && !existing.pinned) {
    const { count: pinnedCount } = await ctx.db
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .eq("pinned", true);

    if (pinnedCount !== null && pinnedCount >= 5) {
      throw new ConflictError("limit_reached", "You can pin 5 pages.");
    }
  }

  // Check parent move validity if parentId is being changed
  if (input.parentId !== undefined && input.parentId !== existing.parent_id) {
    const { data: allNotes } = await ctx.db
      .from("notes")
      .select("id, title, parent_id, pinned")
      .eq("user_id", ctx.userId);

    const summaries: NoteSummaryItem[] = (allNotes || []).map((n) => ({
      id: n.id,
      title: n.title,
      parentId: n.parent_id,
      pinned: n.pinned,
    }));

    const tree = buildTree(summaries);
    const moveVerdict = canMove(tree, id, input.parentId);
    if (moveVerdict === "cycle") {
      throw new ConflictError("cycle", "Cannot move page under itself");
    }
    if (moveVerdict === "too_deep") {
      throw new ConflictError("too_deep", "Max 3 levels");
    }
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

  const updates: Partial<NoteRow> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.doc !== undefined) updates.doc = (input.doc as Json) ?? null;
  if (input.bodyMd !== undefined) updates.body_md = input.bodyMd;
  if (input.parentId !== undefined) updates.parent_id = input.parentId;
  if (input.pinned !== undefined) updates.pinned = input.pinned;

  // Clear prev_* if older than 7 days
  if (
    existing.prev_at &&
    Date.now() - new Date(existing.prev_at).getTime() > 7 * 24 * 60 * 60 * 1000
  ) {
    updates.prev_doc = null;
    updates.prev_body_md = null;
    updates.prev_by = null;
    updates.prev_at = null;
  }

  const { data: updated, error: updateErr } = await ctx.db
    .from("notes")
    .update(updates)
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  // Clean up unreferenced storage images older than 10 mins (keeping doc, prev_doc, body_md)
  try {
    const folderPath = `${ctx.userId}/${id}`;
    const { data: files } = await ctx.db.storage
      .from("life-notes")
      .list(folderPath);

    if (files && files.length > 0) {
      const activeDoc = (
        input.doc !== undefined ? input.doc : existing.doc
      ) as Record<string, unknown> | null;
      const prevDoc = existing.prev_doc as Record<string, unknown> | null;

      const activeRefs = activeDoc ? imageRefs(activeDoc) : [];
      const prevRefs = prevDoc ? imageRefs(prevDoc) : [];
      const allActiveRefs = new Set([...activeRefs, ...prevRefs]);

      const storageFiles = files.map((f) => ({
        path: `${folderPath}/${f.name}`,
        createdAt: new Date(f.created_at || Date.now()),
      }));

      const toDelete = unreferencedPaths(allActiveRefs, storageFiles, new Date());
      if (toDelete.length > 0) {
        await ctx.db.storage.from("life-notes").remove(toDelete);
      }
    }
  } catch (cleanErr) {
    console.error("Failed to clean up unreferenced images:", cleanErr);
  }

  const path = await computeNotePath(ctx, updated);
  return mapNote(updated, path);
}

export async function deleteNote(ctx: Ctx, id: string): Promise<void> {
  assertScope(ctx, "notes:write");

  const { data: allUserNotes } = await ctx.db
    .from("notes")
    .select("id, title, parent_id")
    .eq("user_id", ctx.userId);

  const target = allUserNotes?.find((n) => n.id === id);
  if (!target) {
    throw new NotFoundError("Note not found");
  }

  // Find all descendants in the subtree to delete their image folders
  const summaries: NoteSummaryItem[] = (allUserNotes || []).map((n) => ({
    id: n.id,
    title: n.title,
    parentId: n.parent_id,
  }));
  const tree = buildTree(summaries);
  const flat = flattenTree(tree);

  // Find all descendants of target
  function collectSubtreeIds(rootId: string): string[] {
    const ids = [rootId];
    const children = flat.filter((n) => n.parentId === rootId);
    for (const ch of children) {
      ids.push(...collectSubtreeIds(ch.id));
    }
    return ids;
  }

  const subtreeIds = collectSubtreeIds(id);

  // Delete storage objects for all notes in subtree
  for (const noteId of subtreeIds) {
    try {
      const folderPath = `${ctx.userId}/${noteId}`;
      const { data: files } = await ctx.db.storage
        .from("life-notes")
        .list(folderPath);

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${folderPath}/${f.name}`);
        await ctx.db.storage.from("life-notes").remove(filePaths);
      }
    } catch (storageErr) {
      console.error(`Failed to remove storage files for note ${noteId}:`, storageErr);
    }
  }

  // Delete from DB (on delete cascade deletes children in DB)
  const { error: delErr } = await ctx.db
    .from("notes")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("id", id);

  if (delErr) throw delErr;
}

export async function undoAgentEdit(ctx: Ctx, id: string): Promise<NoteDto> {
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

  if (!existing.prev_doc && !existing.prev_body_md) {
    throw new ConflictError("nothing_to_undo", "No agent edit to undo");
  }

  const { data: updated, error: updateErr } = await ctx.db
    .from("notes")
    .update({
      doc: existing.prev_doc,
      body_md: existing.prev_body_md || "",
      prev_doc: null,
      prev_body_md: null,
      prev_by: null,
      prev_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", ctx.userId)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) throw updateErr;

  const path = await computeNotePath(ctx, updated);
  return mapNote(updated, path);
}

export async function uploadNoteImage(
  ctx: Ctx,
  noteId: string,
  buffer: Buffer
): Promise<{ ref: string }> {
  assertScope(ctx, "notes:write");

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

  if (buffer.length > 1_048_576) {
    throw new InvalidInputError("File exceeds 1MB limit", {
      reason: "too_large",
    });
  }

  const detected = detectImageMimeType(buffer);
  if (!detected) {
    throw new InvalidInputError(
      "Only PNG, JPEG, WebP, and GIF images are allowed",
      { reason: "bad_type" }
    );
  }

  const { data: files, error: listErr } = await ctx.db.storage
    .from("life-notes")
    .list(`${ctx.userId}/${noteId}`);

  if (listErr) throw listErr;
  if (files && files.length >= 30) {
    throw new ConflictError(
      "limit_reached",
      "A note can contain at most 30 images."
    );
  }

  const uuid = crypto.randomUUID();
  const filePath = `${ctx.userId}/${noteId}/${uuid}.${detected.ext}`;

  const { error: uploadErr } = await ctx.db.storage
    .from("life-notes")
    .upload(filePath, buffer, {
      contentType: detected.mime,
      upsert: false,
    });

  if (uploadErr) throw uploadErr;

  return { ref: `sb:${filePath}` };
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

