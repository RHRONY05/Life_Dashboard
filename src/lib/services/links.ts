import { Ctx, assertScope } from "@/lib/ctx";
import {
  CreateLinkInput,
  LinkDto,
  UpdateLinkInput,
} from "@/lib/schemas";
import { ConflictError, NotFoundError } from "@/lib/errors";

interface RawLinkRow {
  id: string;
  user_id: string;
  title: string;
  url: string;
  icon: string;
  position: number;
  created_at: string;
}

function mapLinkRow(row: RawLinkRow): LinkDto {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    icon: row.icon,
    position: row.position,
    createdAt: row.created_at,
  };
}

/**
 * Lists quick links for the current user in position order.
 */
export async function listLinks(ctx: Ctx): Promise<LinkDto[]> {
  assertScope(ctx, "links:read");

  const { data, error } = await ctx.db
    .from("links")
    .select("id, user_id, title, url, icon, position, created_at")
    .eq("user_id", ctx.userId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Failed to list quick links: ${error.message}`);
  }

  return ((data || []) as RawLinkRow[]).map(mapLinkRow);
}

/**
 * Creates a quick link (max 12).
 */
export async function createLink(
  ctx: Ctx,
  input: CreateLinkInput
): Promise<LinkDto> {
  // Check count
  const { count, error: countErr } = await ctx.db
    .from("links")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId);

  if (countErr) {
    throw new Error(`Failed to check link count: ${countErr.message}`);
  }

  if ((count ?? 0) >= 12) {
    throw new ConflictError("limit_reached");
  }

  // Find max position
  const { data: posData } = await ctx.db
    .from("links")
    .select("position")
    .eq("user_id", ctx.userId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = (posData?.[0]?.position ?? 0) + 1;

  const { data, error: insertErr } = await ctx.db
    .from("links")
    .insert({
      user_id: ctx.userId,
      title: input.title.trim(),
      url: input.url.trim(),
      icon: input.icon ?? "link",
      position: nextPos,
    })
    .select("id, user_id, title, url, icon, position, created_at")
    .single();

  if (insertErr || !data) {
    throw new Error(`Failed to create quick link: ${insertErr?.message}`);
  }

  return mapLinkRow(data as RawLinkRow);
}

/**
 * Updates a quick link.
 */
export async function updateLink(
  ctx: Ctx,
  id: string,
  input: UpdateLinkInput
): Promise<LinkDto> {
  const updates: {
    title?: string;
    url?: string;
    icon?: string;
  } = {};
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.url !== undefined) updates.url = input.url.trim();
  if (input.icon !== undefined) updates.icon = input.icon;

  const { data, error } = await ctx.db
    .from("links")
    .update(updates)
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select("id, user_id, title, url, icon, position, created_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update quick link: ${error.message}`);
  }

  if (!data) {
    throw new NotFoundError("Quick link not found");
  }

  return mapLinkRow(data as RawLinkRow);
}

/**
 * Deletes a quick link.
 */
export async function deleteLink(ctx: Ctx, id: string): Promise<void> {
  const { data, error } = await ctx.db
    .from("links")
    .delete()
    .eq("id", id)
    .eq("user_id", ctx.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to delete quick link: ${error.message}`);
  }

  if (!data) {
    throw new NotFoundError("Quick link not found");
  }
}
