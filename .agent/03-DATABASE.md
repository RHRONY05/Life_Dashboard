# 03 — Database

Lives in the **existing** Supabase project `vocab` (ref `vnadntttnwylvarcqwhe`), next to Vocab's
`words` and `quiz_attempts`. **Never alter, drop or query Vocab's tables or functions.** Every object
below is new, and their names don't clash with Vocab's (the trigger function is `life_set_updated_at`,
not Vocab's `set_updated_at`).

One migration: `supabase/migrations/<timestamp>_life_init.sql`. Before applying, run `list_tables`
and confirm that none of these table names exist yet.

```sql
-- ============ shared ============
create function public.life_set_updated_at() returns trigger language plpgsql
set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- ============ trackers (before tasks: tasks reference tracker_items) ============
create table public.trackers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (length(name) between 1 and 80),
  description  text check (length(description) <= 300),
  created_by   text not null default 'owner' check (length(created_by) between 1 and 40),
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index trackers_user_name_unique on public.trackers (user_id, lower(name));

create table public.tracker_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tracker_id  uuid not null references public.trackers(id) on delete cascade,
  title       text not null check (length(title) between 1 and 200),
  group_name  text check (length(group_name) <= 80),
  url         text check (url ~ '^https?://' and length(url) <= 500),
  note        text check (length(note) <= 1000),
  status      text not null default 'todo' check (status in ('todo','done','skipped')),
  done_at     timestamptz,
  position    int not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((status = 'done') = (done_at is not null))
);
create index tracker_items_tracker on public.tracker_items (tracker_id, position);

-- ============ lists (Rony's own, undated sections on Today) ============
create table public.task_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (length(name) between 1 and 40),
  position    int not null,                                -- order of the lists on Today
  created_by  text not null default 'owner' check (length(created_by) between 1 and 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index task_lists_user_name_unique on public.task_lists (user_id, lower(name));

-- ============ tasks (a task lives EITHER on a day OR in a list) ============
create table public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title            text not null check (length(title) between 1 and 200),
  note             text check (length(note) <= 1000),
  due_on           date,                                  -- calendar day in APP_TIMEZONE (board task)
  list_id          uuid references public.task_lists(id) on delete cascade,   -- list item
  done_at          timestamptz,
  position         int not null,                          -- order inside its day or list (append = max+1)
  moved_count      int not null default 0 check (moved_count >= 0),
  tracker_item_id  uuid unique references public.tracker_items(id) on delete set null,
  created_by       text not null default 'owner' check (length(created_by) between 1 and 40),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((due_on is null) <> (list_id is null))            -- exactly one home
);
create index tasks_user_day on public.tasks (user_id, due_on, position);
create index tasks_list on public.tasks (list_id, position) where list_id is not null;
create index tasks_user_open on public.tasks (user_id, due_on) where done_at is null;

-- ============ money ============
create table public.people (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (length(name) between 1 and 60),
  created_at  timestamptz not null default now()
);
create unique index people_user_name_unique on public.people (user_id, lower(name));

create table public.iou_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_id    uuid not null references public.people(id) on delete cascade,
  kind         text not null check (kind in ('lent','borrowed','received','paid')),
  amount_bdt   int not null check (amount_bdt between 1 and 10000000),   -- whole taka, always positive
  note         text check (length(note) <= 200),
  occurred_on  date not null,
  created_by   text not null default 'owner' check (length(created_by) between 1 and 40),
  created_at   timestamptz not null default now()
);
create index iou_entries_person on public.iou_entries (person_id, occurred_on desc, created_at desc);

-- ============ spending ============
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount_bdt   int not null check (amount_bdt between 1 and 10000000),   -- whole taka
  category     text not null check (category in
                 ('food','transport','study','bills','health','shopping','fun','other')),
  note         text check (length(note) <= 120),
  spent_on     date not null,                                            -- calendar day in APP_TIMEZONE
  created_by   text not null default 'owner' check (length(created_by) between 1 and 40),
  created_at   timestamptz not null default now()
);
create index expenses_user_day on public.expenses (user_id, spent_on desc, created_at desc);

-- one row per user; only the monthly budget for now
create table public.user_settings (
  user_id             uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  monthly_budget_bdt  int check (monthly_budget_bdt between 1 and 10000000),   -- null = no budget
  updated_at          timestamptz not null default now()
);

-- ============ renewals ============
create table public.renewals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name                text not null check (length(name) between 1 and 80),
  category            text not null check (category in ('subscription','hosting','domain','credit')),
  project             text check (length(project) <= 60),          -- e.g. "CineReserve"
  manage_url          text check (manage_url ~ '^https?://' and length(manage_url) <= 500),
  amount              numeric(10,2) check (amount >= 0),           -- null = unknown; 0 = free
  currency            text not null default 'BDT' check (currency in ('BDT','USD')),
  cycle               text not null check (cycle in ('monthly','yearly','one_time','free')),
  renews_on           date,                                        -- next renewal / end date
  auto_renew          boolean not null default false,              -- true: you will be charged; false: it just ends
  remind_days_before  int not null default 7 check (remind_days_before between 0 and 60),
  status              text not null default 'active' check (status in ('active','ended')),
  notes               text check (length(notes) <= 500),
  created_by          text not null default 'owner' check (length(created_by) between 1 and 40),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (cycle = 'free' or renews_on is not null)                  -- only "free" may have no date
);
create index renewals_user_date on public.renewals (user_id, status, renews_on);

-- one row per reminder actually sent (makes the daily cron idempotent)
create table public.reminder_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  renewal_id  uuid not null references public.renewals(id) on delete cascade,
  renews_on   date not null,
  stage       text not null check (stage in ('early','day_before','today','overdue')),
  sent_at     timestamptz not null default now(),
  unique (renewal_id, renews_on, stage)
);

-- ============ quick links ============
create table public.links (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title        text not null check (length(title) between 1 and 40),
  url          text not null check (url ~ '^https?://' and length(url) <= 500),
  icon         text not null default 'link' check (icon in
                 ('link','book-open','graduation-cap','briefcase','user','github','linkedin','globe','code','mail')),
  position     int not null,
  created_at   timestamptz not null default now()
);

-- ============ agents ============
create table public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null check (length(name) between 1 and 40),     -- "Muse", "Antigravity", "Claude Code"
  prefix        text not null check (length(prefix) = 11),               -- "ld_" + first 8 chars, for display
  key_hash      text not null unique check (length(key_hash) = 64),      -- sha256 hex of the full key
  scopes        text[] not null check (cardinality(scopes) >= 1),
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);
create unique index api_keys_active_name on public.api_keys (user_id, lower(name)) where revoked_at is null;

create table public.agent_audit (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  key_id       uuid references public.api_keys(id) on delete set null,
  key_name     text not null,                       -- copied, so the log survives key changes
  tool         text not null,                       -- e.g. "add_task"; "auth" for failed auth on a known key
  result       text not null check (result in ('ok','denied','error','rate_limited')),
  summary      text not null check (length(summary) <= 200),   -- human line, e.g. add_task "NeetCode: Two Sum"
  args         jsonb not null default '{}',         -- sanitised (07-LOGIC.md §6), ≤ 2 KB
  error        text check (length(error) <= 300),
  duration_ms  int not null default 0,
  created_at   timestamptz not null default now()
);
create index agent_audit_user_time on public.agent_audit (user_id, created_at desc);
create index agent_audit_key_time on public.agent_audit (key_id, created_at desc);

-- ============ triggers ============
create trigger task_lists_updated_at    before update on public.task_lists    for each row execute function public.life_set_updated_at();
create trigger trackers_updated_at      before update on public.trackers      for each row execute function public.life_set_updated_at();
create trigger tracker_items_updated_at before update on public.tracker_items for each row execute function public.life_set_updated_at();
create trigger tasks_updated_at         before update on public.tasks         for each row execute function public.life_set_updated_at();
create trigger renewals_updated_at      before update on public.renewals      for each row execute function public.life_set_updated_at();
create trigger user_settings_updated_at before update on public.user_settings for each row execute function public.life_set_updated_at();

-- ============ RLS ============
alter table public.task_lists    enable row level security;
alter table public.trackers      enable row level security;
alter table public.tracker_items enable row level security;
alter table public.tasks         enable row level security;
alter table public.people        enable row level security;
alter table public.iou_entries   enable row level security;
alter table public.expenses      enable row level security;
alter table public.user_settings enable row level security;
alter table public.renewals      enable row level security;
alter table public.reminder_log  enable row level security;
alter table public.links         enable row level security;
alter table public.api_keys      enable row level security;
alter table public.agent_audit   enable row level security;

create policy "own task lists"    on public.task_lists    for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own trackers"      on public.trackers      for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own tracker items" on public.tracker_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own tasks"         on public.tasks         for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own people"        on public.people        for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own iou entries"   on public.iou_entries   for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own expenses"      on public.expenses      for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own settings"      on public.user_settings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own renewals"      on public.renewals      for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own links"         on public.links         for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- the owner may read these through the UI; only server code (service role) writes them
create policy "read own reminder log" on public.reminder_log for select to authenticated using ((select auth.uid()) = user_id);
create policy "read own audit"        on public.agent_audit  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own api keys select"   on public.api_keys     for select to authenticated using ((select auth.uid()) = user_id);
create policy "own api keys insert"   on public.api_keys     for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own api keys revoke"   on public.api_keys     for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
```

## Rules
- **Ownership.** Every row has `user_id`. Services always filter by `ctx.userId` and set it explicitly on insert, even with the RLS client.
- **Tasks.** A task has exactly one home: a day (`due_on`) **or** a list (`list_id`). `position` = (max position in that home) + 1 on insert **and** on every move. Moving day → day or list → day changes `due_on`/`list_id`, `position` and `moved_count` (+1). Moving day → list or list → list sets `list_id`, clears `due_on`, new position, and does **not** count as "moved". A done task can't be moved (409). Un-ticking sets `done_at = null`. Reordering inside a home swaps `position` with the neighbour (up/down).
- **Lists.** Max 8 per user; names unique (case-insensitive). Deleting a list deletes its items (UI confirms with the count). "Clear done" deletes the list's done items. A linked tracker item can live in a list too (same sync rules). Board queries filter `due_on is not null`; list queries filter `list_id`.
- **Linked tasks ⇄ tracker items.** Completing a task with a `tracker_item_id` sets that item to `done` (same `done_at`) in the same service call. Un-ticking it sets the item back to `todo`. Changing an item's status updates its linked task the same way (`skipped` → the task is marked done, since nothing is left to do). Each item has at most one task (`unique`). Scheduling an item that already has an **open** task moves that task. If its task is done, scheduling returns 409.
- **Tracker items.** `position` is append-order across the whole tracker. Group order = order of first appearance.
- **Money.** `amount_bdt` is always positive; the sign comes from `kind` (07-LOGIC.md §3). People are found by `lower(name)` and created on first use. Deleting a person deletes their entries (UI confirms with the count). Entries can't be edited, only deleted and re-added.
- **Spending.** `amount_bdt` is always positive. Lending, borrowing and paying people back are IOUs, not spending. `spent_on` may be in the past but not in the future. Edits may change amount, category, note and date. `user_settings` is upserted on first save of a budget; clearing the budget sets it to null.
- **Renewals.** `renews_on` is the next date something happens (charge or end). "Renewed" moves it one cycle forward (07 §4). "Ended" sets `status = 'ended'` and keeps the row. Changing `renews_on` by hand is allowed (PATCH). Old `reminder_log` rows stay and are simply never matched again.
- **Links.** At most 12. `position` = append order. No reordering in v1 (delete and re-add).
- **API keys.** At most 10 active keys. Revoking sets `revoked_at` (never deleted). Name must be unique among active keys. `scopes` values must come from the scope list in `05-MCP-AND-KEYS.md`.
- **Audit.** Insert-only, from the agent path. The UI reads the latest 50 with "Load more". Rows older than 90 days are deleted by the daily cron.

## Derived values (computed in code, not stored)
| Value | Rule |
|---|---|
| Board day of a task | `due_on` compared with today in `APP_TIMEZONE` (07 §1); list items have no day |
| "Older unfinished" | `due_on < yesterday` and `done_at is null` |
| Tracker progress | done / (total − skipped), shown as "52 / 150" and a percent (skipped items are excluded from both numbers) |
| Person balance | Σ signed amounts (07 §3). > 0 they owe me, < 0 I owe them |
| Spent today / this week / this month, budget left, category bars | 07 §3b |
| Renewal state, days left, monthly equivalent | 07 §4 |

## Canvas (second migration, V3b)
`supabase/migrations/<timestamp>_life_canvas.sql`. Before applying: `list_tables` shows no `notes`,
and `select id from storage.buckets` shows no `life-notes`. One new table (14 in total) and one
private bucket. The storage policies only match `bucket_id = 'life-notes'`, so Vocab is not affected.

```sql
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (length(title) between 1 and 120),
  doc         jsonb check (doc is null or octet_length(doc::text) <= 1000000),   -- TipTap JSON; null = only body_md (agent-created)
  body_md     text not null default '' check (length(body_md) <= 200000),        -- Markdown mirror: search, MCP, copy
  created_by  text not null default 'owner' check (length(created_by) between 1 and 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index notes_user_updated on public.notes (user_id, updated_at desc);
create trigger notes_updated_at before update on public.notes for each row execute function public.life_set_updated_at();
alter table public.notes enable row level security;
create policy "own notes" on public.notes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('life-notes', 'life-notes', false, 1048576, array['image/webp','image/png','image/jpeg','image/gif']);

-- objects live at <user_id>/<note_id>/<uuid>.<ext>
create policy "life-notes own read"   on storage.objects for select to authenticated
  using (bucket_id = 'life-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "life-notes own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'life-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "life-notes own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'life-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

Rules:
- **Scratch is not in the database.** Only saved notes are.
- `doc` and `body_md` are written together by the browser on every save (the editor serialises Markdown, 07 §8.3). An agent's `create_note` writes only `body_md` with `doc = null`; the editor builds `doc` from the Markdown when the note is first opened, and the next save stores it.
- Max **300 notes** per user (service check → 409 `limit_reached`). Max **30 images** per note.
- Saving uses optimistic concurrency: PATCH sends `baseUpdatedAt`; if it differs from the row's `updated_at` → 409 `stale` (04).
- Images: uploaded through the owner route only (owner session client, so the policies above apply). Deleting a note deletes `<user_id>/<note_id>/` from the bucket. After each save, files in the note's folder that the doc no longer references and that are older than 10 minutes are deleted (07 §8.5).
- `reset.ts` also deletes the e2e user's `notes` rows and every object under `<e2e user id>/` in `life-notes`.

