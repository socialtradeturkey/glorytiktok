-- Detailed task creation fields represented by the admin operations form.
alter table public.tasks add column if not exists campaign_name text not null default 'Bağımsız görev';
alter table public.tasks add column if not exists platform text not null default 'web';
alter table public.tasks add column if not exists action_type text not null default 'VISIT';
alter table public.tasks add column if not exists target_url text;
alter table public.tasks add column if not exists verification_method text not null default 'manual_review';
alter table public.tasks add column if not exists fallback_method text not null default 'manual_review';
alter table public.tasks add column if not exists total_quota integer not null default 100 check (total_quota > 0);
alter table public.tasks add column if not exists user_limit integer not null default 1 check (user_limit > 0);
alter table public.tasks add column if not exists estimated_duration_seconds integer not null default 30 check (estimated_duration_seconds between 1 and 86400);
alter table public.tasks add column if not exists youtube_min_watch_seconds integer not null default 30 check (youtube_min_watch_seconds between 0 and 86400);
alter table public.tasks add column if not exists secret_code_display_seconds integer not null default 12 check (secret_code_display_seconds between 1 and 3600);
alter table public.tasks add column if not exists random_code_start_seconds integer not null default 30 check (random_code_start_seconds >= 0);
alter table public.tasks add column if not exists random_code_end_seconds integer not null default 60 check (random_code_end_seconds >= 0);
alter table public.tasks add column if not exists session_duration_seconds integer not null default 900 check (session_duration_seconds > 0);
alter table public.tasks add column if not exists daily_task_limit integer not null default 5 check (daily_task_limit > 0);
alter table public.tasks add column if not exists starts_at timestamptz;
alter table public.tasks add column if not exists ends_at timestamptz;
alter table public.tasks add column if not exists eligibility_rules jsonb not null default '{}'::jsonb;

-- The admin email is an allowlisted identity, while the password remains managed by Supabase Auth.
update public.profiles set role = 'admin', updated_at = now() where lower(email) = 'murathand08@gmail.com';

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), case when lower(new.email) = 'murathand08@gmail.com' then 'admin'::public.app_role else 'user'::public.app_role end)
  on conflict (id) do update set email = excluded.email, role = case when lower(excluded.email) = 'murathand08@gmail.com' then 'admin'::public.app_role else public.profiles.role end, updated_at = now();
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

update public.tasks set estimated_duration_seconds = duration_seconds where estimated_duration_seconds = 30 and duration_seconds <> 30;
update public.tasks set youtube_min_watch_seconds = duration_seconds where youtube_min_watch_seconds = 30 and duration_seconds <> 30;

alter table public.tasks drop constraint if exists tasks_code_window_check;
alter table public.tasks add constraint tasks_code_window_check check (random_code_end_seconds >= random_code_start_seconds);
alter table public.tasks drop constraint if exists tasks_time_window_check;
alter table public.tasks add constraint tasks_time_window_check check (ends_at is null or starts_at is null or ends_at > starts_at);
