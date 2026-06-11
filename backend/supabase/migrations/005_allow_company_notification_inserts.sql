drop policy if exists "Employers can create company notifications" on public.notifications;
create policy "Employers can create company notifications"
on public.notifications for insert
with check (
  company_id = public.current_company_id()
  and public.current_user_is_employer()
  and exists (
    select 1
    from public.profiles p
    where p.id = notifications.profile_id
      and p.company_id = public.current_company_id()
  )
);
