import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

if (typeof window === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = require("node:dns");
    if (!dns._lifeDnsPatched) {
      dns._lifeDnsPatched = true;
      const originalLookup = dns.lookup;
      type DnsCb = (
        err: Error | null,
        address: string | Array<{ address: string; family: number }>,
        family?: number
      ) => void;
      dns.lookup = function (hostname: string, options: unknown, callback: unknown) {
        let cb = callback as DnsCb;
        let opts = options;
        if (typeof options === "function") {
          cb = options as DnsCb;
          opts = {};
        }
        if (hostname === "vnadntttnwylvarcqwhe.supabase.co") {
          if (opts && typeof opts === "object" && (opts as { all?: boolean }).all) {
            return cb(null, [{ address: "172.64.149.246", family: 4 }]);
          }
          return cb(null, "172.64.149.246", 4);
        }
        return originalLookup(hostname, options, callback);
      };
    }
  } catch {
    // Ignore in edge / non-node environments
  }
}

export async function createClient() {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = null;
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : [];
        },
        setAll(cookiesToSet) {
          if (!cookieStore) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore?.set(name, value, options)
            );
          } catch {
            // Called from Server Component; ignore.
          }
        },
      },
    }
  );
}
