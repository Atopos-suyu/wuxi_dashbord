-- V2.2 / V3 起步：站内通知 + 学员活跃日志 + 预警辅助视图

-- ========== notifications ==========
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  link text,
  level text not null default 'yellow' check (level in ('red', 'yellow', 'info')),
  source_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, source_key)
);

create index if not exists notifications_recipient_idx
  on public.notifications(recipient_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_insert_leaders" on public.notifications;

create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_id = auth.uid());

create policy "notifications_insert_leaders"
  on public.notifications for insert
  with check (
    public.auth_role() in ('T3', 'T2', 'T1')
    or recipient_id = auth.uid()
  );

-- ========== student_activities（成交学员活跃） ==========
create table if not exists public.student_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  activity_type text not null check (
    activity_type in ('社群互动', '课时出勤', '作业提交', '1v1跟进', '其他')
  ),
  note text not null default '',
  happened_at timestamptz not null default now(),
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists student_activities_user_idx
  on public.student_activities(user_id, happened_at desc);

alter table public.users
  add column if not exists last_active_at timestamptz;

alter table public.student_activities enable row level security;

drop policy if exists "sa_select" on public.student_activities;
drop policy if exists "sa_insert" on public.student_activities;

create policy "sa_select"
  on public.student_activities for select
  using (
    exists (
      select 1 from public.users u
      where u.id = user_id and public.can_see_member(u.owner_id)
    )
  );

create policy "sa_insert"
  on public.student_activities for insert
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

-- 写入活跃日志时同步 users.last_active_at
create or replace function public.touch_user_last_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set last_active_at = greatest(coalesce(last_active_at, 'epoch'::timestamptz), new.happened_at)
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists student_activities_touch_trg on public.student_activities;
create trigger student_activities_touch_trg
  after insert on public.student_activities
  for each row execute function public.touch_user_last_active();

-- ========== 预警辅助视图（服务端口径，供报表/Edge Function） ==========
create or replace view public.v_users_stalled as
select
  u.id as user_id,
  u.name,
  u.level,
  u.stage,
  u.owner_id,
  u.contact,
  coalesce(u.last_stage_update_at, u.updated_at) as last_stage_at,
  extract(day from now() - coalesce(u.last_stage_update_at, u.updated_at))::int as stall_days
from public.users u
where u.stage <> '成交' and u.stage <> '流失';

create or replace view public.v_deals_active as
select
  u.id as user_id,
  u.name,
  u.owner_id,
  u.deal_amount,
  u.last_active_at,
  extract(day from now() - coalesce(u.last_active_at, u.updated_at))::int as inactive_days
from public.users u
where u.stage = '成交';
