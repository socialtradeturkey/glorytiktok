-- Ensure the existing admin Auth identity has a matching profile row.
insert into public.profiles (id, email, display_name, role)
select id, email, coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)), 'admin'::public.app_role
from auth.users
where lower(email) = 'murathand08@gmail.com'
limit 1
on conflict (id) do update set email = excluded.email, role = 'admin'::public.app_role, updated_at = now();
