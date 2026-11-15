-- Local CLI only. Hosted deployments create this user through Auth Admin API/Studio.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('d0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','demo@duken.ai',now(),'{"provider":"email","providers":["email"]}','{}',now(),now())
on conflict (id) do nothing;
