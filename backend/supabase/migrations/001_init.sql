-- Employer Employee Management - Supabase setup
-- Paste this whole file into Supabase Dashboard > SQL Editor > New query.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  role text not null check (role in ('EMPLOYEE', 'EMPLOYER')),
  company_id uuid not null references public.companies(id) on delete cascade,
  avatar_url text,
  jira_account_id text unique,
  jira_display_name text,
  jira_mapped_at timestamptz,
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  type text not null check (type in ('SICK', 'CASUAL', 'ANNUAL', 'UNPAID')),
  start_date date not null,
  end_date date not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reason text not null,
  manager_comment text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.payrolls (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year >= 2000),
  base_salary numeric(12, 2) not null check (base_salary >= 0),
  bonuses numeric(12, 2) not null default 0 check (bonuses >= 0),
  deductions numeric(12, 2) not null default 0 check (deductions >= 0),
  net_salary numeric(12, 2) not null check (net_salary >= 0),
  status text not null default 'UNPAID' check (status in ('PAID', 'UNPAID')),
  created_at timestamptz not null default now(),
  unique (profile_id, month, year)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by_id uuid references public.profiles(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'TODO' check (status in ('TODO', 'IN_PROGRESS', 'DONE')),
  points_reward integer not null default 100 check (points_reward >= 0),
  due_date timestamptz,
  completed_at timestamptz,
  jira_issue_id text unique,
  jira_issue_key text unique,
  jira_issue_url text,
  jira_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  icon text not null,
  points_required integer not null check (points_required >= 0),
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.user_badges (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  content text not null,
  created_by_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists profiles_company_id_idx on public.profiles(company_id);
create index if not exists leave_requests_company_status_idx on public.leave_requests(company_id, status);
create index if not exists leave_requests_profile_idx on public.leave_requests(profile_id);
create index if not exists payrolls_company_idx on public.payrolls(company_id);
create index if not exists payrolls_profile_idx on public.payrolls(profile_id);
create index if not exists tasks_company_idx on public.tasks(company_id);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to_id);
create index if not exists badges_company_points_idx on public.badges(company_id, points_required);
create index if not exists announcements_company_created_idx on public.announcements(company_id, created_at desc);
create index if not exists notifications_profile_read_idx on public.notifications(profile_id, read, created_at desc);

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_is_employer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'EMPLOYER', false)
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.leave_requests enable row level security;
alter table public.payrolls enable row level security;
alter table public.tasks enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Users can read their company" on public.companies;
create policy "Users can read their company"
on public.companies for select
using (id = public.current_company_id());

drop policy if exists "Users can read company profiles" on public.profiles;
create policy "Users can read company profiles"
on public.profiles for select
using (company_id = public.current_company_id());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can read company leaves" on public.leave_requests;
create policy "Users can read company leaves"
on public.leave_requests for select
using (company_id = public.current_company_id());

drop policy if exists "Employees can create own leave requests" on public.leave_requests;
create policy "Employees can create own leave requests"
on public.leave_requests for insert
with check (profile_id = auth.uid() and company_id = public.current_company_id());

drop policy if exists "Employers can update company leave requests" on public.leave_requests;
create policy "Employers can update company leave requests"
on public.leave_requests for update
using (company_id = public.current_company_id() and public.current_user_is_employer())
with check (company_id = public.current_company_id() and public.current_user_is_employer());

drop policy if exists "Users can read own payroll and employers company payroll" on public.payrolls;
create policy "Users can read own payroll and employers company payroll"
on public.payrolls for select
using (
  profile_id = auth.uid()
  or (company_id = public.current_company_id() and public.current_user_is_employer())
);

drop policy if exists "Employers can manage company payroll" on public.payrolls;
create policy "Employers can manage company payroll"
on public.payrolls for all
using (company_id = public.current_company_id() and public.current_user_is_employer())
with check (company_id = public.current_company_id() and public.current_user_is_employer());

drop policy if exists "Users can read company tasks" on public.tasks;
create policy "Users can read company tasks"
on public.tasks for select
using (company_id = public.current_company_id());

drop policy if exists "Employers can create company tasks" on public.tasks;
create policy "Employers can create company tasks"
on public.tasks for insert
with check (company_id = public.current_company_id() and public.current_user_is_employer());

drop policy if exists "Assignees can update own tasks" on public.tasks;
create policy "Assignees can update own tasks"
on public.tasks for update
using (assigned_to_id = auth.uid() and company_id = public.current_company_id())
with check (assigned_to_id = auth.uid() and company_id = public.current_company_id());

drop policy if exists "Users can read company badges" on public.badges;
create policy "Users can read company badges"
on public.badges for select
using (company_id = public.current_company_id());

drop policy if exists "Employers can manage company badges" on public.badges;
create policy "Employers can manage company badges"
on public.badges for all
using (company_id = public.current_company_id() and public.current_user_is_employer())
with check (company_id = public.current_company_id() and public.current_user_is_employer());

drop policy if exists "Users can read company user badges" on public.user_badges;
create policy "Users can read company user badges"
on public.user_badges for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = user_badges.profile_id
      and p.company_id = public.current_company_id()
  )
);

drop policy if exists "Users can read company announcements" on public.announcements;
create policy "Users can read company announcements"
on public.announcements for select
using (company_id = public.current_company_id());

drop policy if exists "Employers can create company announcements" on public.announcements;
create policy "Employers can create company announcements"
on public.announcements for insert
with check (company_id = public.current_company_id() and public.current_user_is_employer());

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications for select
using (profile_id = auth.uid() and company_id = public.current_company_id());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications for update
using (profile_id = auth.uid() and company_id = public.current_company_id())
with check (profile_id = auth.uid() and company_id = public.current_company_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are public" on storage.objects;
create policy "Avatar images are public"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
