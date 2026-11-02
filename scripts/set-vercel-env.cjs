const fs = require("fs");
const path = require("path");

async function main() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local does not exist");
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN is not in environment");
  }

  const teamId = "team_4lk9b9zLb6bhdpLtH2gwAtUQ";
  const projectId = "life-dashboard";

  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  const localEnv = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      localEnv[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }

  const targetKeys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ALLOWED_EMAIL",
    "APP_TIMEZONE",
    "CRON_SECRET",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
    "REMINDER_TO",
  ];

  for (const k of targetKeys) {
    if (!localEnv[k]) {
      throw new Error(`Missing required key in .env.local: ${k}`);
    }
  }

  const variables = targetKeys.map((k) => ({
    key: k,
    value: localEnv[k],
    target: ["production", "preview"],
    type: k.includes("SECRET") || k.includes("PASSWORD") || k.includes("KEY") ? "encrypted" : "plain",
  }));

  // Also APP_URL
  variables.push({
    key: "APP_URL",
    value: "https://life.rhrony05.me",
    target: ["production", "preview"],
    type: "plain",
  });

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}&upsert=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(variables),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to set env vars (${res.status}): ${text}`);
  }

  console.log(`Successfully synced ${variables.length} environment variables to Vercel.`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
