import { describe, it, expect, beforeEach } from "vitest";
import { resetUserData, E2E_USER_ID } from "../helpers/reset";
import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import { Ctx } from "@/lib/ctx";
import {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  uploadNoteImage,
  getNoteImageUrl,
  detectImageMimeType,
} from "@/lib/services/notes";
import { ConflictError, InvalidInputError, NotFoundError } from "@/lib/errors";

describe("Notes Integration Tests (09 §Canvas)", () => {
  let ctx: Ctx;

  beforeEach(async () => {
    await resetUserData(E2E_USER_ID);

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );

    ctx = {
      db: supabase,
      userId: E2E_USER_ID,
      actor: { type: "owner", email: "e2e+vocab@gmail.com" },
    };
  });

  it("detects valid image mime types from magic bytes and rejects bad types", () => {
    // 1. PNG magic bytes
    const pngBuf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(detectImageMimeType(pngBuf)).toEqual({
      mime: "image/png",
      ext: "png",
    });

    // 2. JPEG magic bytes
    const jpgBuf = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    expect(detectImageMimeType(jpgBuf)).toEqual({
      mime: "image/jpeg",
      ext: "jpg",
    });

    // 3. GIF magic bytes
    const gifBuf = Buffer.from("GIF89a123456");
    expect(detectImageMimeType(gifBuf)).toEqual({
      mime: "image/gif",
      ext: "gif",
    });

    // 4. WebP magic bytes: RIFF....WEBP
    const webpBuf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectImageMimeType(webpBuf)).toEqual({
      mime: "image/webp",
      ext: "webp",
    });

    // 5. Invalid / text
    const badBuf = Buffer.from("hello world this is text");
    expect(detectImageMimeType(badBuf)).toBeNull();
  });

  it("creates, retrieves, updates, and searches notes", async () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Computer networking notes on TCP" }],
        },
      ],
    };

    // 1. Create note
    const created = await createNote(ctx, {
      title: "TCP Handshake",
      doc,
      bodyMd: "Computer networking notes on TCP handshake mechanism.",
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe("TCP Handshake");
    expect(created.bodyMd).toContain("TCP handshake mechanism");
    expect(created.snippet).toBe(
      "Computer networking notes on TCP handshake mechanism."
    );
    expect(created.createdBy).toBe("owner");

    // 2. Get note by ID
    const fetched = await getNote(ctx, created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.title).toBe("TCP Handshake");
    expect(fetched.doc).toEqual(doc);

    // 3. Update note with optimistic concurrency check
    const updated = await updateNote(ctx, created.id, {
      baseUpdatedAt: created.updatedAt,
      title: "TCP 3-Way Handshake",
      bodyMd: "Updated TCP notes with SYN, SYN-ACK, ACK.",
    });
    expect(updated.title).toBe("TCP 3-Way Handshake");
    expect(updated.bodyMd).toContain("Updated TCP notes");

    // 4. Stale concurrency conflict: saving with old baseUpdatedAt throws 409 stale
    await expect(
      updateNote(ctx, created.id, {
        baseUpdatedAt: created.updatedAt, // outdated timestamp!
        title: "Conflict write",
      })
    ).rejects.toThrow(ConflictError);

    // 5. Search notes
    const searchMatch = await getNotes(ctx, "3-Way");
    expect(searchMatch.notes.length).toBe(1);
    expect(searchMatch.notes[0].title).toBe("TCP 3-Way Handshake");

    const searchMiss = await getNotes(ctx, "NonExistentTopic");
    expect(searchMiss.notes.length).toBe(0);

    // 6. Delete note
    await deleteNote(ctx, created.id);
    await expect(getNote(ctx, created.id)).rejects.toThrow(NotFoundError);
  });

  it("uploads an image and generates a signed URL", async () => {
    // Create a note first
    const note = await createNote(ctx, {
      title: "Note with image",
      bodyMd: "Contains an uploaded diagram.",
    });

    // 1x1 PNG buffer
    const validPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const res = await uploadNoteImage(ctx, note.id, validPng);
    expect(res.ref).toMatch(new RegExp(`^sb:${ctx.userId}/${note.id}/[a-f0-9-]+.png$`));

    // Get signed URL for that image
    const filePath = res.ref.replace("sb:", "");
    const signedUrl = await getNoteImageUrl(ctx, filePath);
    expect(signedUrl).toContain("life-notes");

    // Clean up note (and its image)
    await deleteNote(ctx, note.id);
  });

  it("rejects invalid image uploads", async () => {
    const note = await createNote(ctx, {
      title: "Image validation note",
      bodyMd: "testing upload constraints",
    });

    // 1. Bad file type
    const textBuffer = Buffer.from("this is plain text not an image");
    await expect(uploadNoteImage(ctx, note.id, textBuffer)).rejects.toThrow(
      InvalidInputError
    );

    // 2. File too large (> 1MB)
    const largeBuffer = Buffer.alloc(1048576 + 100);
    // write PNG header so it's not rejected by bad type
    largeBuffer[0] = 0x89;
    largeBuffer[1] = 0x50;
    largeBuffer[2] = 0x4e;
    largeBuffer[3] = 0x47;
    largeBuffer[4] = 0x0d;
    largeBuffer[5] = 0x0a;
    largeBuffer[6] = 0x1a;
    largeBuffer[7] = 0x0a;

    await expect(uploadNoteImage(ctx, note.id, largeBuffer)).rejects.toThrow(
      InvalidInputError
    );

    await deleteNote(ctx, note.id);
  });

  it("handles parentId, hierarchy depth limits, cycle prevention, and pin limits", async () => {
    // 1. Create level 1 note
    const l1 = await createNote(ctx, {
      title: "DevTools",
      bodyMd: "Top level",
    });
    expect(l1.parentId).toBeNull();
    expect(l1.path).toBe("DevTools");

    // 2. Create level 2 note
    const l2 = await createNote(ctx, {
      title: "Backend tips",
      bodyMd: "Level 2",
      parentId: l1.id,
    });
    expect(l2.parentId).toBe(l1.id);
    expect(l2.path).toBe("DevTools / Backend tips");

    // 3. Create level 3 note
    const l3 = await createNote(ctx, {
      title: "Postgres",
      bodyMd: "Level 3",
      parentId: l2.id,
    });
    expect(l3.parentId).toBe(l2.id);
    expect(l3.path).toBe("DevTools / Backend tips / Postgres");

    // 4. Create level 4 note under level 3 -> throws 409 too_deep
    await expect(
      createNote(ctx, {
        title: "RLS",
        bodyMd: "Level 4 should fail",
        parentId: l3.id,
      })
    ).rejects.toThrow(ConflictError);

    // 5. Move l1 under l3 -> throws 409 cycle
    await expect(
      updateNote(ctx, l1.id, {
        baseUpdatedAt: l1.updatedAt,
        parentId: l3.id,
      })
    ).rejects.toThrow(ConflictError);

    // 6. Pin notes: max 5 pins
    const p1 = await updateNote(ctx, l1.id, {
      baseUpdatedAt: l1.updatedAt,
      pinned: true,
    });
    expect(p1.pinned).toBe(true);

    const notesToPin: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const extra = await createNote(ctx, { title: `Pinned Page ${i}`, bodyMd: "" });
      const pinnedExtra = await updateNote(ctx, extra.id, {
        baseUpdatedAt: extra.updatedAt,
        pinned: true,
      });
      expect(pinnedExtra.pinned).toBe(true);
      notesToPin.push(extra.id);
    }

    // 6th pin attempt -> throws 409 limit_reached
    const extra6 = await createNote(ctx, { title: "Pinned Page 6", bodyMd: "" });
    await expect(
      updateNote(ctx, extra6.id, {
        baseUpdatedAt: extra6.updatedAt,
        pinned: true,
      })
    ).rejects.toThrow(ConflictError);

    // 7. Subtree delete: deleting l1 deletes l2 and l3
    await deleteNote(ctx, l1.id);
    await expect(getNote(ctx, l1.id)).rejects.toThrow(NotFoundError);
    await expect(getNote(ctx, l2.id)).rejects.toThrow(NotFoundError);
    await expect(getNote(ctx, l3.id)).rejects.toThrow(NotFoundError);
  });
});
