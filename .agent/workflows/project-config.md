---
description: Set up the builder for this project once (MCP servers, permission grants, tools), then report what Rony must still do
---

Rony runs this **once, before Goal 1**, so the build is never stopped by a disabled MCP server,
a permission prompt or a localhost prompt. It configures everything the whole project needs (all
milestones). It does **not** build anything. Turning servers off later is Rony's call: he will ask
for it (see "Turn off" at the bottom).

## What this project needs
| Kind | Needed | Used for |
|---|---|---|
| MCP server | `supabase` | V0 checks, V2 migration + advisors, types, every later schema change (shared project `vocab`) |
| MCP server | `vercel` | V2 project + env vars + domain, every deploy and prod check from V2 on |
| MCP server | `github-mcp-server` | V1 private repo `RHRONY05/Life_Dashboard` (fallback: `gh` CLI) |
| MCP server | `chrome-devtools` | Browser checks of each AC, `lighthouse_audit` in V8 and V10 |
| MCP server | `shadcn` | V1 primitives (fallback: `npx shadcn@latest add …`) |
| Execute/read URL | `localhost`, `127.0.0.1`, `[::1]` | Dev server, Playwright, DevTools checks (IPv4 and IPv6) |
| Execute/read URL | `life.rhrony05.me`, `life-rony.vercel.app`, `*.vercel.app` | Prod checks and preview deploys |
| Execute/read URL | `vocab.rhrony05.me` | V2 AC: Vocab still works |
| Read URL | `github.com`, `npmjs.com`, `nextjs.org`, `supabase.com`, `modelcontextprotocol.io`, `vercel.com` | Reading current docs and READMEs (V0) |
| CLI | `node` ≥ 20, `npm`, `npx`, `git`, `gh` (optional) | Everything |
| Secret (human) | `GMAIL_APP_PASSWORD` in `.env.local` | Only from V6; see PROGRESS human steps |

The other secrets are copied file to file from `D:\Projects\Vocab_App\.env.local` in V0, so they are not human steps.

## Steps
1. Find out which builder you are and use its section below. Never touch another builder's files.
2. For each MCP server in the table: if it exists, enable it; if it is missing, **don't invent its
   config**. Put it on the "Needs Rony" list with what it needs (an access token, an OAuth login).
   You may add a server whose config needs no secret (e.g. `chrome-devtools`, `shadcn` via `npx`).
3. Write the permission grants **in this project's config only**: a wildcard for every server in the
   table, plus the URLs. Never edit global or user-wide grants.
4. Check the result for real: call one read-only tool on each server (`supabase` → `list_projects`,
   `vercel` → list projects, `github-mcp-server` → get the `RHRONY05` user, `chrome-devtools` →
   `list_pages`, `shadcn` → list registries) and run `node -v`, `git --version`, `gh --version`.
   If a change only takes effect after a restart of the builder, say so instead of guessing.
5. Write a **Builder setup** table into `.agent/PROGRESS.md` (under "Environment facts"): item ·
   ✅/❌ · what you did / what Rony must do · date + builder. Add each ❌ to "Human steps".
6. Stop and give Rony the report:
   - ✅ **Done:** servers enabled, grants written (file path), tools that answered.
   - ❌ **Needs Rony:** missing servers, logins, restarts, secrets, each with the exact step.
   - Then: "When the ❌ list is empty, paste Goal 1 from `.agent/GOAL.md`."

## Antigravity
- Servers: `agy mcp list`, then `agy mcp enable <name>` (or set `"disabled": false` for that entry in
  `~/.gemini/config/mcp_config.json`). This file is shared by all projects: only flip `disabled` on
  the servers above, don't change or remove other entries.
- Grants: the project file in `~/.gemini/config/projects/` whose content points at
  `D:\Projects\Life_Dashboard` (if none does, it's a ❌: ask Rony to open the folder in Antigravity
  once). Add to `permissionGrants.permissionGrants.allow`, keeping what is already there:
  ```json
  "mcp(supabase/*)", "mcp(vercel/*)", "mcp(github-mcp-server/*)", "mcp(chrome-devtools/*)", "mcp(shadcn/*)",
  "execute_url(localhost)", "execute_url(127.0.0.1)", "execute_url([::1])",
  "read_url(localhost)", "read_url(127.0.0.1)", "read_url([::1])",
  "execute_url(life.rhrony05.me)", "read_url(life.rhrony05.me)",
  "execute_url(life-rony.vercel.app)", "read_url(life-rony.vercel.app)",
  "execute_url(*.vercel.app)", "read_url(*.vercel.app)",
  "execute_url(vocab.rhrony05.me)", "read_url(vocab.rhrony05.me)",
  "read_url(github.com)", "read_url(npmjs.com)", "read_url(nextjs.org)", "read_url(supabase.com)",
  "read_url(modelcontextprotocol.io)", "read_url(vercel.com)"
  ```
  If a pattern such as `*.vercel.app` is rejected, use the exact host and note it in the report.
- Never edit `globalPermissionGrants` in `~/.gemini/config/config.json`.

## Claude Code
- Servers: `claude mcp list`. Missing ones are a ❌ with the `claude mcp add …` command to run.
- Grants: `.claude/settings.local.json` in this project (create it; it's git-ignored), under
  `permissions.allow`: `mcp__supabase`, `mcp__vercel`, `mcp__github-mcp-server`,
  `mcp__chrome-devtools`, `mcp__shadcn`, `WebFetch(domain:<host>)` for each URL above, and
  `Bash(npm *)`, `Bash(npx *)`, `Bash(git *)`, `Bash(gh *)`, `Bash(node *)`.
- Never edit `~/.claude/settings.json`.

## Codex
- Servers: `codex mcp list`. Codex keeps servers in `~/.codex/config.toml`; a missing one is a ❌
  with the `codex mcp add …` command, unless it needs no secret.
- Approvals are set by how Rony starts Codex, not by a file in this project: say in the report which
  approval mode the build needs (no prompts for MCP calls, shell and network) and don't change the
  user-wide config.

## Turn off (only when Rony asks)
Do the reverse for the servers he names (or all of the above): disable them (`agy mcp disable <name>`
or the builder's equivalent) and leave the grants unless he asks to remove them too. Update the
Builder setup table.
