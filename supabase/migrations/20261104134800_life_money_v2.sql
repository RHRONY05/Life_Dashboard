-- Life Dashboard: Money v2 migration
-- Adds 'giving' to expenses category check and creates payment_todos table

alter table public.expenses drop constraint expenses_category_check;
alter table public.expenses add constraint expenses_category_check check (category in
  ('food','transport','study','bills','health','shopping','fun','giving','other'));

create table public.payment_todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (length(title) between 1 and 80),
  amount_bdt  int not null check (amount_bdt between 1 and 10000000),
  category    text not null default 'giving' check (category in
                ('food','transport','study','bills','health','shopping','fun','giving','other')),
  due_on      date,
  repeat      text not null default 'none' check (repeat in ('none','monthly')),
  note        text check (length(note) <= 200),
  paid_on     date,                                                   -- null = still to pay
  expense_id  uuid references public.expenses(id) on delete set null, -- the spend Mark paid created
  next_id     uuid references public.payment_todos(id) on delete set null, -- the copy a monthly item created
  created_by  text not null default 'owner' check (length(created_by) between 1 and 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index payment_todos_user_open on public.payment_todos (user_id, paid_on, due_on);
create index payment_todos_expense on public.payment_todos (expense_id);
create index payment_todos_next on public.payment_todos (next_id);
create trigger payment_todos_updated_at before update on public.payment_todos for each row execute function public.life_set_updated_at();
alter table public.payment_todos enable row level security;
create policy "own payment todos" on public.payment_todos for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
