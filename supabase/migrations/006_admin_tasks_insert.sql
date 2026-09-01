-- Allow authenticated admins to publish tasks while keeping direct client inserts protected by RLS.
drop policy if exists tasks_insert_admin on public.tasks;
create policy tasks_insert_admin on public.tasks
  for insert to authenticated
  with check (public.is_admin());
