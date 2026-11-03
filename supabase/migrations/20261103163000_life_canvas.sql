-- Life Dashboard Canvas (Notes & Storage)
-- Milestone M2: V3b

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
