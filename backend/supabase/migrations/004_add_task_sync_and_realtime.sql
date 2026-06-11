alter table if exists public.tasks
alter column due_date drop not null;

alter table if exists public.tasks
add column if not exists jira_updated_at timestamptz,
add column if not exists updated_at timestamptz not null default now();

drop index if exists public.tasks_jira_issue_key_idx;

do $$
begin
  alter table public.tasks add constraint tasks_jira_issue_key_unique unique (jira_issue_key);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.task_sync_state (
  company_id uuid primary key references public.companies(id) on delete cascade,
  last_jira_sync_at timestamptz,
  last_jira_sync_error text,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.task_sync_state enable row level security;

drop policy if exists "Users can read company task sync state" on public.task_sync_state;
create policy "Users can read company task sync state"
on public.task_sync_state for select
using (company_id = public.current_company_id());

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception
  when duplicate_object then null;
end $$;

comment on table public.task_sync_state is 'Throttles Jira reconciliation so normal task reads never call Jira';
