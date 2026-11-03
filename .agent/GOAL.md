# Goal commands (paste into Antigravity, one milestone at a time)

Rony builds Life Dashboard in **5 goals**. Start the next one only after using the previous one.
Each goal stops by itself at the end of its milestone and gives a milestone report
(`workflows/next-task.md` step 9). The milestones are listed in `08-TASKS.md`.

## Step 0: set up the builder (once, before Goal 1)
```
/project-config
```
The builder enables the MCP servers, grants and URLs this project needs (`workflows/project-config.md`)
and gives you a ✅ / ❌ list. Fix the ❌ items (a login, a restart, a missing server), then paste Goal 1.
If you build with Claude Code or Codex instead, run the same workflow in that builder first.

## Goal 1: Foundation + Today page (V0 → V3)
```
Read AGENTS.md and .agent/GOAL.md. Run /next-task for milestone M1 (V0, V1, V2, V3): set up the project, design system, login and first deploy, then build the Today page with the Yesterday/Today/Tomorrow board and my Lists. Stop after V3 and give me the milestone report.
```

## Goal 2: Canvas (V3a → V3b)
```
Read AGENTS.md and .agent/PROGRESS.md. Run /next-task for milestone M2 (V3a, V3b): build the Canvas page, first the Scratch editor that stays in my browser, then saved notes with images. Stop after V3b and give me the milestone report.
```

## Goal 3: Trackers + Money page (V4 → V5)
```
Read AGENTS.md and .agent/PROGRESS.md. Run /next-task for milestone M3 (V4, V5): build Trackers and the Money page (Spending with budget, and IOUs). Stop after V5 and give me the milestone report.
```

## Goal 4: Renewals + Settings (V6 → V7)
```
Read AGENTS.md and .agent/PROGRESS.md. Run /next-task for milestone M4 (V6, V7): build Renewals with the morning reminder email, then Settings (quick links, email test, API keys, activity log). Stop after V7 and give me the milestone report.
```

## Goal 5: Agents + final (V8 → V10)
```
Read AGENTS.md and .agent/PROGRESS.md. Run /next-task for milestone M5 (V8, V9, V10): build the MCP server, connect the agents, run the final checks, and write the learning note. Stop after V10 and give me the final report.
```

## Rules every goal follows (the builder reads them from the docs; repeated here for clarity)
- Work through `08-TASKS.md` in order, one task at a time. For each task: implement it, write the
  tests it names, run `npm run test:all`, check its acceptance criteria in a real browser at
  1440×900 and 390×844 against the matching design file, and (from V2 on) deploy to production
  and run the task's Prod check. Then tick it, update `.agent/PROGRESS.md`, commit and push.
- The Supabase project is the existing `vocab` project. Never touch Vocab's tables.
- Don't make design decisions, and don't add anything from the "Out of scope" list. If something
  is ambiguous, choose the simpler option and log it in PROGRESS.md.
- Stop and ask Rony only for the human steps listed in PROGRESS.md.
- The final report (Goal 5) includes the production URL, the Lighthouse table, the learning note
  `docs/learn/mcp-and-api-keys.md`, and code-flow walkthroughs (request in → response out, which
  files) for: ticking a task on Today, an agent's `add_task` call through `/api/mcp`, and the
  daily reminder email.
