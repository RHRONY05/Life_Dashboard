import { requireOwner } from "@/lib/auth";
import { listKeys } from "@/lib/services/keys";
import { listAudit } from "@/lib/services/audit";
import { listLinks } from "@/lib/services/links";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireOwner();

  const [keys, audit, links] = await Promise.all([
    listKeys(ctx).catch(() => []),
    listAudit(ctx, { limit: 50 }).catch(() => ({ rows: [], hasMore: false })),
    listLinks(ctx).catch(() => []),
  ]);

  const reminderEmail =
    process.env.REMINDER_TO ||
    (ctx.actor.type === "owner" ? ctx.actor.email : "") ||
    "muhammadrony147@gmail.com";

  return (
    <div className="page max-w-[1440px] mx-auto p-4 md:p-8">
      <div className="page-head flex items-center gap-3 mb-6">
        <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight text-ink">
          Settings
        </h1>
      </div>

      <SettingsClient
        initialKeys={keys}
        initialAudit={audit}
        initialLinks={links}
        reminderEmail={reminderEmail}
      />
    </div>
  );
}
