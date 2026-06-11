alter table if exists public.profiles
add column if not exists jira_account_id text,
add column if not exists jira_display_name text,
add column if not exists jira_mapped_at timestamptz;

create unique index if not exists profiles_jira_account_id_idx
on public.profiles(jira_account_id)
where jira_account_id is not null;

alter table if exists public.tasks
add column if not exists jira_issue_id text,
add column if not exists jira_issue_key text,
add column if not exists jira_issue_url text;

create unique index if not exists tasks_jira_issue_id_idx
on public.tasks(jira_issue_id)
where jira_issue_id is not null;

create unique index if not exists tasks_jira_issue_key_idx
on public.tasks(jira_issue_key)
where jira_issue_key is not null;

comment on column public.profiles.jira_account_id is 'Atlassian accountId used for Jira assignment and JQL queries';
comment on column public.tasks.jira_issue_key is 'Jira issue key mirrored locally for authorization and audit';
