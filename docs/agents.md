# Connecting AI Agents to Life Dashboard

Life Dashboard exposes a remote Model Context Protocol (MCP) server at `/api/mcp` using the official Streamable HTTP transport. This document explains how Muhammad Rony's agents (**Antigravity**, **Claude Code**, and **Muse**) connect, authenticate, and interact with the system safely.

---

## 1. Server Architecture & Endpoints

- **Primary Production URL**: `https://life.rhrony05.me/api/mcp`
- **Fallback / Vercel URL**: `https://life-rony.vercel.app/api/mcp`
- **Protocol**: Model Context Protocol (MCP) standard over stateless Streamable HTTP.
- **Authentication**: `Authorization: Bearer ld_<43_characters>`
- **Safety Boundary**: Agents operate under scoped permissions and rate limits (30 calls/minute, 1,000 calls/day). Agents get **zero delete capabilities** across the entire API.

---

## 2. Generating an API Key

1. Log into Life Dashboard as owner (`muhammadrony147@gmail.com`).
2. Navigate to **Settings** (`/settings`) → **API Keys**.
3. Click **New key**.
4. Type or select the agent's preset name (e.g. `Antigravity`, `Muse`, or `Claude Code`).
5. Choose appropriate scopes (new keys default to read-only).
6. Click **Create key** and copy the revealed secret (`ld_...`). The raw secret is shown **only once** and never stored in plain text.

---

## 3. Client Configuration

### A. Google Antigravity
Add to your project's `.gemini/antigravity/mcp_config.json` (or workspace configuration):

```json
{
  "mcpServers": {
    "life-dashboard": {
      "serverUrl": "https://life-rony.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ld_YOUR_ANTIGRAVITY_KEY"
      }
    }
  }
}
```

### B. Claude Code
Run in your terminal:

```bash
claude mcp add --transport http life-dashboard https://life-rony.vercel.app/api/mcp --header "Authorization: Bearer ld_YOUR_CLAUDE_CODE_KEY"
```

### C. Muse / Generic Streamable HTTP Clients
Configure in your agent's settings or MCP connection manager:
- **Server URL**: `https://life-rony.vercel.app/api/mcp`
- **Transport**: `Streamable HTTP`
- **Headers**:
  - `Authorization`: `Bearer ld_YOUR_MUSE_KEY`
  - `Content-Type`: `application/json`

---

## 4. Recommended Agent Scopes

| Agent | Purpose | Recommended Scopes |
|---|---|---|
| **Muse** | Daily planning, habits, money logging, and notes | `tasks:read`, `tasks:write`, `trackers:read`, `trackers:write`, `money:read`, `money:write`, `renewals:read`, `links:read`, `notes:read`, `notes:write` |
| **Antigravity** | Architecture, trackers, automation, system tasks | `tasks:read`, `tasks:write`, `trackers:read`, `trackers:write`, `renewals:read`, `renewals:write`, `money:read`, `links:read` |
| **Claude Code** | Terminal coding, task execution, tracker updates | `tasks:read`, `tasks:write`, `trackers:read`, `trackers:write`, `renewals:read`, `renewals:write`, `money:read`, `links:read` |

---

## 5. Agent Operating Rules & Best Practices

1. **Call `whoami` First**: Verify which agent identity, permissions, and user ID you are operating under.
2. **Never Invent IDs**: Always retrieve IDs from `get_board`, `list_tasks`, `get_tracker`, or `list_notes` before calling update tools.
3. **No Delete Tools**: Agents have read and write tools, but no delete tools. If an item needs deletion, ask Rony to remove it manually in the UI.
4. **Dates are in Asia/Dhaka**: When scheduling or querying tasks, use calendar dates in `Asia/Dhaka` (`YYYY-MM-DD`). Never move tasks backwards into the past.
5. **Rate Limits**: Requests are capped at 30 tool calls per rolling 60 seconds and 1,000 per rolling 24 hours. Cache board state where possible.

---

## 6. Ready-to-Paste Routine: Muse's NeetCode 150 Routine

Paste this prompt directly into Muse's system instructions or daily cron trigger:

```text
You have access to Rony's Life Dashboard via the `life-dashboard` MCP server.
You are responsible for managing his daily NeetCode 150 progress.

Daily Routine:
1. Every morning at 11:00 AM (Asia/Dhaka):
   - Call `get_tracker` for tracker "NeetCode 150".
   - Find the next two items whose status is "todo".
   - Call `schedule_item` for each item with `day: "today"`.
   - Remind Rony in chat: "Today's 2 NeetCode problems have been added to your Today board."

2. When Rony tells you "Done" or confirms he finished a problem:
   - Call `set_item_status` with `itemId` and `status: "done"`.
   - Confirm to Rony with the problem name and updated tracker progress percentage.
```
