import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

export type OwnerActor = {
  type: "owner";
  email: string;
};

export type AgentActor = {
  type: "agent";
  keyId: string;
  name: string;
  scopes: string[];
};

export type Actor = OwnerActor | AgentActor;

export interface Ctx {
  db: SupabaseClient<Database>;
  userId: string;
  actor: Actor;
}

export class ScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScopeError";
  }
}

/**
 * Asserts that the caller has the required scope.
 * - For owner: always passes (no-op).
 * - For agent: checks that requiredScope is in actor.scopes.
 */
export function assertScope(ctx: Ctx, requiredScope: string): void {
  if (ctx.actor.type === "owner") {
    return;
  }

  if (!ctx.actor.scopes.includes(requiredScope)) {
    throw new ScopeError(
      `Permission denied: Agent '${ctx.actor.name}' lacks scope '${requiredScope}'`
    );
  }
}
