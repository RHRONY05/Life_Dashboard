---
description: Resume work — pick and complete the next unticked task, then keep going
---

1. Read `AGENTS.md`, `.agent/rules/life-dashboard.md` and `.agent/PROGRESS.md`.
2. In `.agent/08-TASKS.md`, find the first task that is not ticked `[x]`. Mark it `— in progress: <your name>`.
3. Read the docs and design files the task references.
4. Implement it and write the tests it names.
5. Run `npm run test:all` (and `npm run build` when routes changed). Check the task's AC in a real browser. Fix until everything passes.
6. From V2 on: deploy to production (Vercel MCP) and run the task's **Prod check**.
7. Check "Docs follow code" (`rules/life-dashboard.md`): every doc that describes what you changed matches the code. Then tick the task with a one-line note, update PROGRESS.md ("Now" + a session-log entry), commit, push.
8. Continue with the next task **only if it belongs to the same milestone** (`08-TASKS.md` → Milestones) and you are not blocked on a human step.
9. When the milestone's last task is done, **stop** and give Rony the **milestone report** (and save it to `docs/milestones/M<n>.md`):
   - What is now live (production URL + the pages/features), and how to use them in 3–5 lines.
   - Test and Lighthouse results (if any were run in this milestone).
   - A short **code-flow walkthrough** of the milestone's main flow (request in → response out, which files), so he can read the code.
   - Open human steps, and anything you decided that the docs didn't cover.
   - The exact goal command for the next milestone (from `GOAL.md`).
