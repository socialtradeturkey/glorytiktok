-- YouTube OAuth/API verification and server-issued heartbeat challenges.
-- Deploy the matching Edge Functions before enabling the client flow.

alter table public.tasks add column if not exists youtube_channel_id text;
alter table public.submissions add column if not exists youtube_verified_at timestamptz;
alter table public.submissions add column if not exists heartbeat_seconds integer not null default 0 check (heartbeat_seconds >= 0);
alter table public.submissions add column if not exists heartbeat_nonce text;
alter table public.submissions add column if not exists heartbeat_expires_at timestamptz;
alter table public.submissions add column if not exists heartbeat_completed_at timestamptz;

create index if not exists submissions_heartbeat_idx on public.submissions(heartbeat_nonce) where heartbeat_nonce is not null;

create or replace function public.issue_heartbeat(p_task_id bigint)
returns table (submission_id uuid, nonce text, expires_at timestamptz, duration_seconds integer)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_submission uuid;
  v_nonce text := encode(gen_random_bytes(24), 'hex');
  v_expires timestamptz := now() + interval '15 minutes';
begin
  if v_user is null then raise exception 'auth_required'; end if;
  select * into v_task from public.tasks where id = p_task_id and is_active = true;
  if v_task.id is null then raise exception 'task_not_found'; end if;
  insert into public.submissions(task_id, user_id, watched_seconds, liked, subscribed, heartbeat_nonce, heartbeat_expires_at)
  values (p_task_id, v_user, 0, false, false, v_nonce, v_expires)
  returning id into v_submission;
  return query select v_submission, v_nonce, v_expires, v_task.duration_seconds;
end; $$;

create or replace function public.record_heartbeat(p_nonce text, p_seconds integer)
returns table (seconds integer, completed boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_submission public.submissions%rowtype;
  v_duration integer;
  v_seconds integer;
begin
  select s.* into v_submission from public.submissions s where s.heartbeat_nonce = p_nonce and s.user_id = auth.uid() for update;
  if v_submission.id is null then raise exception 'heartbeat_not_found'; end if;
  if v_submission.heartbeat_expires_at < now() then raise exception 'heartbeat_expired'; end if;
  select duration_seconds into v_duration from public.tasks where id = v_submission.task_id;
  v_seconds := greatest(v_submission.heartbeat_seconds, least(coalesce(p_seconds, 0), v_duration));
  update public.submissions set heartbeat_seconds = v_seconds, watched_seconds = v_seconds,
    heartbeat_completed_at = case when v_seconds >= v_duration then coalesce(heartbeat_completed_at, now()) else heartbeat_completed_at end
    where id = v_submission.id;
  return query select v_seconds, v_seconds >= v_duration;
end; $$;

create or replace function public.verify_submission_code(p_submission_id uuid, p_code text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_valid boolean;
begin
  select encode(digest(p_code, 'sha256'), 'hex') = secret_code_hash into v_valid
    from public.submissions where id = p_submission_id and user_id = auth.uid() and status = 'pending';
  if coalesce(v_valid, false) then
    update public.submissions set secret_code_verified_at = now() where id = p_submission_id;
  end if;
  return coalesce(v_valid, false);
end; $$;

revoke all on function public.issue_heartbeat(bigint) from public;
grant execute on function public.issue_heartbeat(bigint) to authenticated;
revoke all on function public.record_heartbeat(text, integer) from public;
grant execute on function public.record_heartbeat(text, integer) to authenticated;
revoke all on function public.verify_submission_code(uuid, text) from public;
grant execute on function public.verify_submission_code(uuid, text) to authenticated;
