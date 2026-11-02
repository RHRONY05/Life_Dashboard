import { createClient } from "@/lib/supabase/server";
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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError("Unauthorized: No active session", 401);
  }

  const allowedEmail = process.env.ALLOWED_EMAIL || "muhammadrony147@gmail.com";
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
