create index if not exists iou_entries_user_id on public.iou_entries (user_id);
create index if not exists links_user_id on public.links (user_id);
create index if not exists reminder_log_user_id on public.reminder_log (user_id);
create index if not exists tracker_items_user_id on public.tracker_items (user_id);
