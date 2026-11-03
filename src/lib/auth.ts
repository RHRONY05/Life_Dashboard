import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { Ctx } from "@/lib/ctx";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Validates that the request has an active session belonging to ALLOWED_EMAIL.
 * Returns an owner Ctx with RLS-scoped db client.
 */
export async function requireOwner(): Promise<Ctx> {
  const supabase = await createClient();
  const allowedEmail = process.env.ALLOWED_EMAIL || "muhammadrony147@gmail.com";

  try {
    const h = await headers();
    const verifiedUserId = h.get("x-life-user-id");
    const verifiedUserEmail = h.get("x-life-user-email");

    if (verifiedUserId && verifiedUserEmail) {
      if (verifiedUserEmail !== allowedEmail) {
        throw new AuthError("Forbidden: User is not the owner", 401);
      }
      return {
        db: supabase,
        userId: verifiedUserId,
        actor: {
          type: "owner",
          email: verifiedUserEmail,
        },
      };
    }
  } catch (e) {
    if (e instanceof AuthError) throw e;
    // headers() can throw outside request context (e.g. tests); fall back to getUser()
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError("Unauthorized: No active session", 401);
  }

  if (user.email !== allowedEmail) {
    throw new AuthError("Forbidden: User is not the owner", 401);
  }

  return {
    db: supabase,
    userId: user.id,
    actor: {
      type: "owner",
      email: user.email,
    },
  };
}
