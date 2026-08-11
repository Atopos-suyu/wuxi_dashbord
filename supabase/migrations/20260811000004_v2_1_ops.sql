-- V2.1 运营增强：家长态度变更日志（供「家长态度恶化」预警对比）
create table if not exists public.parent_attitude_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  from_attitude text,
  to_attitude text not null,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists parent_attitude_logs_user_idx
  on public.parent_attitude_logs(user_id, created_at desc);

alter table public.parent_attitude_logs enable row level security;

drop policy if exists "pal_select" on public.parent_attitude_logs;
drop policy if exists "pal_insert" on public.parent_attitude_logs;

create policy "pal_select"
  on public.parent_attitude_logs for select
  using (
    exists (
      select 1 from public.users u
      where u.id = user_id and public.can_see_member(u.owner_id)
    )
  );

create policy "pal_insert"
  on public.parent_attitude_logs for insert
  with check (
    exists (
      select 1 from public.users u
      where u.id = user_id
        and (
          u.owner_id = auth.uid()
          or public.auth_role() in ('T3', 'T2')
          or public.can_see_member(u.owner_id)
        )
    )
  );
