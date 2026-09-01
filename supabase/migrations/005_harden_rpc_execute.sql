-- Restrict SECURITY DEFINER RPCs to the roles that need them.
revoke execute on function public.approve_submission(uuid) from public, anon, authenticated;
grant execute on function public.approve_submission(uuid) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.issue_heartbeat(bigint) from public, anon;
grant execute on function public.issue_heartbeat(bigint) to authenticated;

revoke execute on function public.record_heartbeat(text, integer) from public, anon;
grant execute on function public.record_heartbeat(text, integer) to authenticated;

revoke execute on function public.verify_submission_code(uuid, text) from public, anon;
grant execute on function public.verify_submission_code(uuid, text) to authenticated;
