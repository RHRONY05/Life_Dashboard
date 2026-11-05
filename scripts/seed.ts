import { getAdminClient } from "@/lib/supabase/admin";
import { createLink, listLinks } from "@/lib/services/links";
import { Ctx } from "@/lib/ctx";

const SEED_LINKS = [
  {
    title: "Vocab",
    url: "https://vocab.rhrony05.me",
    icon: "book-open",
  },
  {
    title: "Portfolio",
    url: "https://rhrony05.me",
    icon: "globe",
  },
  {
    title: "Upwork",
    url: "https://www.upwork.com/freelancers/~01f208b507aeaa4a11?mp_source=share",
    icon: "briefcase",
  },
  {
    title: "Fiverr",
    url: "https://www.fiverr.com/s/xrrPQvQ",
    icon: "briefcase",
  },
  {
    title: "GitHub",
    url: "https://github.com/RHRONY05",
    icon: "github",
  },
  {
    title: "LinkedIn",
    url: "https://www.linkedin.com/in/rhrony05/",
    icon: "linkedin",
  },
] as const;

async function seed() {
  console.log("=== Seeding Quick Links (V9) ===");
  const admin = getAdminClient();

  const { data: usersData, error: userError } = await admin.auth.admin.listUsers();
  if (userError) throw userError;

  const ownerEmail = process.env.ALLOWED_EMAIL || "muhammadrony147@gmail.com";
  const owner = usersData.users.find((u) => u.email === ownerEmail);
  if (!owner) {
    throw new Error(`Owner user not found with email: ${ownerEmail}`);
  }

  const ctx: Ctx = {
    userId: owner.id,
    actor: {
      type: "owner",
      email: ownerEmail,
    },
    db: admin,
  };

  const existing = await listLinks(ctx);
  const existingUrls = new Set(existing.map((l) => l.url.toLowerCase()));

  let added = 0;
  for (const item of SEED_LINKS) {
    if (existingUrls.has(item.url.toLowerCase())) {
      console.log(`- Skipping already existing link: ${item.title} (${item.url})`);
      continue;
    }

    await createLink(ctx, item);
    console.log(`+ Added link: ${item.title} -> ${item.url} [${item.icon}]`);
    added++;
  }

  const finalLinks = await listLinks(ctx);
  console.log(`\nDone! Total quick links now: ${finalLinks.length} (${added} newly added).`);
  for (const l of finalLinks) {
    console.log(`  ${l.position}. ${l.title} (${l.url}) [icon: ${l.icon}]`);
  }
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
