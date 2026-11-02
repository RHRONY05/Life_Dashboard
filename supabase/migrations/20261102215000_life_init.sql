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
