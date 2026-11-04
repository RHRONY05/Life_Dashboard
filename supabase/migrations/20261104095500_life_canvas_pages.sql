-- Canvas pages (03-DATABASE.md "Canvas pages", V3c)
alter table public.notes
  add column parent_id     uuid references public.notes(id) on delete cascade,   -- null = top level
  add column pinned        boolean not null default false,
  add column prev_doc      jsonb check (prev_doc is null or octet_length(prev_doc::text) <= 1000000),  -- page before the last agent edit
  add column prev_body_md  text check (prev_body_md is null or length(prev_body_md) <= 200000),
  add column prev_by       text check (prev_by is null or length(prev_by) between 1 and 40),         -- agent key name
  add column prev_at       timestamptz;

create index notes_user_parent on public.notes (user_id, parent_id);
