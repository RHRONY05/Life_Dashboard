-- Cover foreign key on notes(parent_id) for CASCADE performance
create index notes_parent_id on public.notes (parent_id);
