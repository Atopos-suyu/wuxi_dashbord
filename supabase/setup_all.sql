-- 无锡片区业务工作台 · 一键建表（可重复执行）
-- 在 Supabase Dashboard → SQL Editor 中整段运行

create extension if not exists "pgcrypto";

-- ========== 先建 profiles，再创建依赖它的函数 ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'T2' check (role in ('T0', 'T1', 'T2', '伪T0')),
  school_region text not null default '无锡学院',
  status text not null default 'active' check (status in ('active', 'pending', 'inactive')),
  created_at timestamptz not null default now()
);

create or replace function public.is_t0()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'T0'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_t0" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_own_or_t0" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

-- 已登录成员可读队友档案（展示负责人姓名）；仅本人或 T0 可改
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own_or_t0"
  on public.profiles for update
  using (auth.uid() = id or public.is_t0());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'T2')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== users（新生） ==========
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  major text not null default '',
  contact text not null default '',
  channel text not null default '',
  owner_id uuid not null references public.profiles(id),
  level text not null default 'B' check (level in ('S', 'A', 'B', 'C')),
  stage text not null default '建联' check (
    stage in ('建联', '面试', '关系铺垫', '职规', '产品', '关单', '成交', '流失')
  ),
  six_dim_score jsonb not null default '{
    "提前学习意识":2,
    "额外学习意识":2,
    "学习AI/编程意识":2,
    "付费学习意识":2,
    "付费能力":2,
    "信任度":2
  }'::jsonb,
  family_situation text not null default '',
  parent_attitude text not null default '未接触',
  next_action text not null default '',
  next_action_due date,
  deal_amount numeric,
  remark text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_owner_idx on public.users(owner_id);
create index if not exists users_stage_idx on public.users(stage);
create index if not exists users_level_idx on public.users(level);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create or replace function public.calc_user_level(score jsonb)
returns text
language plpgsql
immutable
as $$
declare
  vals int[];
  v int;
  threes int := 0;
  ones int := 0;
  keys text[] := array[
    '提前学习意识','额外学习意识','学习AI/编程意识','付费学习意识','付费能力','信任度'
  ];
  k text;
begin
  foreach k in array keys loop
    v := coalesce((score->>k)::int, 1);
    vals := array_append(vals, v);
    if v = 3 then threes := threes + 1; end if;
    if v = 1 then ones := ones + 1; end if;
  end loop;

  if ones >= 3 then return 'C'; end if;
  if threes >= 5 and ones = 0 then return 'S'; end if;
  if threes between 2 and 4 and ones = 0 then return 'A'; end if;
  if threes <= 1 or ones between 1 and 2 then return 'B'; end if;
  return 'B';
end;
$$;

create or replace function public.users_auto_level()
returns trigger
language plpgsql
as $$
begin
  new.level := public.calc_user_level(new.six_dim_score);
  return new;
end;
$$;

drop trigger if exists users_auto_level_trg on public.users;
create trigger users_auto_level_trg
  before insert or update of six_dim_score on public.users
  for each row execute function public.users_auto_level();

alter table public.users enable row level security;

drop policy if exists "users_select_own_or_t0" on public.users;
drop policy if exists "users_insert_own_or_t0" on public.users;
drop policy if exists "users_update_own_or_t0" on public.users;
drop policy if exists "users_delete_own_or_t0" on public.users;

create policy "users_select_own_or_t0"
  on public.users for select
  using (owner_id = auth.uid() or public.is_t0());

create policy "users_insert_own_or_t0"
  on public.users for insert
  with check (owner_id = auth.uid() or public.is_t0());

create policy "users_update_own_or_t0"
  on public.users for update
  using (owner_id = auth.uid() or public.is_t0());

create policy "users_delete_own_or_t0"
  on public.users for delete
  using (owner_id = auth.uid() or public.is_t0());

-- ========== user_stage_logs ==========
create table if not exists public.user_stage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stage text not null,
  status text not null default 'done' check (status in ('doing', 'done', 'failed')),
  note text not null default '',
  record_url text,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists stage_logs_user_idx on public.user_stage_logs(user_id);
create index if not exists stage_logs_owner_idx on public.user_stage_logs(owner_id);

alter table public.user_stage_logs enable row level security;

drop policy if exists "stage_logs_select" on public.user_stage_logs;
drop policy if exists "stage_logs_insert" on public.user_stage_logs;
drop policy if exists "stage_logs_update" on public.user_stage_logs;
drop policy if exists "stage_logs_delete" on public.user_stage_logs;

create policy "stage_logs_select"
  on public.user_stage_logs for select
  using (
    public.is_t0()
    or owner_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = user_id and u.owner_id = auth.uid()
    )
  );

create policy "stage_logs_insert"
  on public.user_stage_logs for insert
  with check (
    public.is_t0()
    or owner_id = auth.uid()
    or exists (
      select 1 from public.users u
      where u.id = user_id and u.owner_id = auth.uid()
    )
  );

create policy "stage_logs_update"
  on public.user_stage_logs for update
  using (public.is_t0() or owner_id = auth.uid());

create policy "stage_logs_delete"
  on public.user_stage_logs for delete
  using (public.is_t0() or owner_id = auth.uid());

-- ========== team_capabilities ==========
create table if not exists public.team_capabilities (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  period text not null,
  scores jsonb not null default '{}'::jsonb,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  unique (member_id, period)
);

alter table public.team_capabilities enable row level security;

drop policy if exists "capabilities_select" on public.team_capabilities;
drop policy if exists "capabilities_write_t0" on public.team_capabilities;

create policy "capabilities_select"
  on public.team_capabilities for select
  using (member_id = auth.uid() or public.is_t0());

create policy "capabilities_write_t0"
  on public.team_capabilities for all
  using (public.is_t0())
  with check (public.is_t0());

-- ========== daily_reviews ==========
create table if not exists public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  review_date date not null,
  new_contacts int not null default 0,
  new_a int not null default 0,
  private_chats int not null default 0,
  stage_followups int not null default 0,
  group_active int not null default 3 check (group_active between 1 and 5),
  highlights text not null default '',
  problems text not null default '',
  next_plan text not null default '',
  support_needed text not null default '',
  created_at timestamptz not null default now(),
  unique (member_id, review_date)
);

alter table public.daily_reviews enable row level security;

drop policy if exists "daily_select" on public.daily_reviews;
drop policy if exists "daily_insert_own" on public.daily_reviews;
drop policy if exists "daily_update_own" on public.daily_reviews;

create policy "daily_select"
  on public.daily_reviews for select
  using (member_id = auth.uid() or public.is_t0());

create policy "daily_insert_own"
  on public.daily_reviews for insert
  with check (member_id = auth.uid() or public.is_t0());

create policy "daily_update_own"
  on public.daily_reviews for update
  using (member_id = auth.uid() or public.is_t0());

-- ========== weekly_reviews ==========
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  summary text not null default '',
  funnel_summary jsonb not null default '{}'::jsonb,
  capability_snapshot jsonb,
  plan_next text not null default '',
  created_at timestamptz not null default now(),
  unique (member_id, week_start)
);

alter table public.weekly_reviews enable row level security;

drop policy if exists "weekly_select" on public.weekly_reviews;
drop policy if exists "weekly_insert_own" on public.weekly_reviews;
drop policy if exists "weekly_update_own" on public.weekly_reviews;

create policy "weekly_select"
  on public.weekly_reviews for select
  using (member_id = auth.uid() or public.is_t0());

create policy "weekly_insert_own"
  on public.weekly_reviews for insert
  with check (member_id = auth.uid() or public.is_t0());

create policy "weekly_update_own"
  on public.weekly_reviews for update
  using (member_id = auth.uid() or public.is_t0());

-- ========== storage: recordings ==========
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists "recordings_read_own_or_t0" on storage.objects;
drop policy if exists "recordings_insert_own" on storage.objects;
drop policy if exists "recordings_delete_own_or_t0" on storage.objects;

create policy "recordings_read_own_or_t0"
  on storage.objects for select
  using (
    bucket_id = 'recordings'
    and (
      public.is_t0()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "recordings_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "recordings_delete_own_or_t0"
  on storage.objects for delete
  using (
    bucket_id = 'recordings'
    and (
      public.is_t0()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
-- V2：角色层级 T3/T2/T1/T0 + goals + alert_resolutions + RLS 重构
-- 增量改造，不删除 V1 业务表

-- ========== profiles 升级 ==========
alter table public.profiles
  add column if not exists area text,
  add column if not exists manager_id uuid references public.profiles(id);

-- 放宽 role 约束
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('T3', 'T2', 'T1', 'T0', '伪T0'));

-- ========== users 升级 ==========
alter table public.users
  add column if not exists area text,
  add column if not exists last_stage_update_at timestamptz default now();

create or replace function public.users_touch_stage()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.last_stage_update_at := coalesce(new.last_stage_update_at, now());
    return new;
  end if;
  if new.stage is distinct from old.stage then
    new.last_stage_update_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists users_touch_stage_trg on public.users;
create trigger users_touch_stage_trg
  before insert or update of stage on public.users
  for each row execute function public.users_touch_stage();

-- ========== goals ==========
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.profiles(id) on delete cascade,
  period text not null,
  metric text not null check (metric in ('招新群', '面试', 'A类', '成交')),
  target_value numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists goals_period_idx on public.goals(period);
create index if not exists goals_member_idx on public.goals(member_id);

-- ========== alert_resolutions ==========
create table if not exists public.alert_resolutions (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null unique,
  member_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  alert_type text not null,
  level text not null check (level in ('red', 'yellow')),
  note text not null default '',
  handled_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ========== 权限函数 ==========
create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_area()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select area from public.profiles where id = auth.uid();
$$;

create or replace function public.can_see_member(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles target on target.id = target_id
    where me.id = auth.uid()
      and (
        me.role = 'T3'
        or me.id = target.id
        or me.id = target.manager_id
        or me.id = (
          select p2.manager_id from public.profiles p2 where p2.id = target.manager_id
        )
        or (me.role = 'T2' and me.area is not null and me.area = target.area)
      )
  );
$$;

-- 兼容旧函数名：V2 中「最高权限」改为 T3
create or replace function public.is_t0()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'T3'
  );
$$;

create or replace function public.is_t3()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() = 'T3';
$$;

-- ========== 重写 RLS ==========
-- profiles
drop policy if exists "profiles_select_own_or_t0" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_own_or_t0" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_select_visible"
  on public.profiles for select
  to authenticated
  using (public.can_see_member(id));

create policy "profiles_update_self_or_leader"
  on public.profiles for update
  using (
    auth.uid() = id
    or public.auth_role() in ('T3', 'T2')
  );

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- users
drop policy if exists "users_select_own_or_t0" on public.users;
drop policy if exists "users_insert_own_or_t0" on public.users;
drop policy if exists "users_update_own_or_t0" on public.users;
drop policy if exists "users_delete_own_or_t0" on public.users;

create policy "users_select_visible"
  on public.users for select
  using (public.can_see_member(owner_id));

create policy "users_insert_visible"
  on public.users for insert
  with check (
    owner_id = auth.uid()
    or public.auth_role() in ('T3', 'T2')
    or public.can_see_member(owner_id)
  );

create policy "users_update_visible"
  on public.users for update
  using (
    owner_id = auth.uid()
    or public.auth_role() in ('T3', 'T2')
    or public.can_see_member(owner_id)
  );

create policy "users_delete_visible"
  on public.users for delete
  using (
    owner_id = auth.uid()
    or public.auth_role() in ('T3', 'T2')
  );

-- stage logs
drop policy if exists "stage_logs_select" on public.user_stage_logs;
drop policy if exists "stage_logs_insert" on public.user_stage_logs;
drop policy if exists "stage_logs_update" on public.user_stage_logs;
drop policy if exists "stage_logs_delete" on public.user_stage_logs;

create policy "stage_logs_select"
  on public.user_stage_logs for select
  using (public.can_see_member(owner_id));

create policy "stage_logs_insert"
  on public.user_stage_logs for insert
  with check (public.can_see_member(owner_id) or owner_id = auth.uid());

create policy "stage_logs_update"
  on public.user_stage_logs for update
  using (public.can_see_member(owner_id));

create policy "stage_logs_delete"
  on public.user_stage_logs for delete
  using (public.can_see_member(owner_id));

-- capabilities
drop policy if exists "capabilities_select" on public.team_capabilities;
drop policy if exists "capabilities_write_t0" on public.team_capabilities;

create policy "capabilities_select"
  on public.team_capabilities for select
  using (public.can_see_member(member_id));

create policy "capabilities_write_leaders"
  on public.team_capabilities for all
  using (public.auth_role() in ('T3', 'T2'))
  with check (public.auth_role() in ('T3', 'T2'));

-- daily / weekly
drop policy if exists "daily_select" on public.daily_reviews;
drop policy if exists "daily_insert_own" on public.daily_reviews;
drop policy if exists "daily_update_own" on public.daily_reviews;
drop policy if exists "weekly_select" on public.weekly_reviews;
drop policy if exists "weekly_insert_own" on public.weekly_reviews;
drop policy if exists "weekly_update_own" on public.weekly_reviews;

create policy "daily_select"
  on public.daily_reviews for select
  using (public.can_see_member(member_id));

create policy "daily_insert_own"
  on public.daily_reviews for insert
  with check (member_id = auth.uid() or public.auth_role() in ('T3', 'T2'));

create policy "daily_update_own"
  on public.daily_reviews for update
  using (member_id = auth.uid() or public.auth_role() in ('T3', 'T2'));

create policy "weekly_select"
  on public.weekly_reviews for select
  using (public.can_see_member(member_id));

create policy "weekly_insert_own"
  on public.weekly_reviews for insert
  with check (member_id = auth.uid() or public.auth_role() in ('T3', 'T2'));

create policy "weekly_update_own"
  on public.weekly_reviews for update
  using (member_id = auth.uid() or public.auth_role() in ('T3', 'T2'));

-- goals
alter table public.goals enable row level security;

drop policy if exists "goals_select" on public.goals;
drop policy if exists "goals_write" on public.goals;

create policy "goals_select"
  on public.goals for select
  using (
    member_id is null
    or public.can_see_member(member_id)
  );

create policy "goals_write"
  on public.goals for all
  using (public.auth_role() in ('T3', 'T2'))
  with check (public.auth_role() in ('T3', 'T2'));

-- alert resolutions
alter table public.alert_resolutions enable row level security;

drop policy if exists "alerts_select" on public.alert_resolutions;
drop policy if exists "alerts_insert" on public.alert_resolutions;

create policy "alerts_select"
  on public.alert_resolutions for select
  using (public.can_see_member(member_id));

create policy "alerts_insert"
  on public.alert_resolutions for insert
  with check (
    public.auth_role() in ('T3', 'T2', 'T1')
    or member_id = auth.uid()
  );

-- ===== end V2 =====

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

-- ===== end V2.1 ops =====
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

-- ===== end notify/students =====
-- V2.3：双校区（无锡学院 / 无锡太湖学院）+ 漏斗诊断支撑

alter table public.profiles
  drop constraint if exists profiles_school_region_check;

alter table public.profiles
  add constraint profiles_school_region_check
  check (school_region in ('无锡学院', '无锡太湖学院'));

update public.profiles
set school_region = '无锡学院'
where school_region is null
   or school_region not in ('无锡学院', '无锡太湖学院');

alter table public.users
  add column if not exists school_region text;

update public.users u
set school_region = coalesce(
  u.school_region,
  (select p.school_region from public.profiles p where p.id = u.owner_id),
  '无锡学院'
)
where u.school_region is null
   or u.school_region not in ('无锡学院', '无锡太湖学院');

alter table public.users
  drop constraint if exists users_school_region_check;

alter table public.users
  add constraint users_school_region_check
  check (school_region is null or school_region in ('无锡学院', '无锡太湖学院'));

create or replace function public.auth_school_region()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select school_region from public.profiles where id = auth.uid();
$$;

-- T3 跨校区；其他角色同校区 + 原层级规则
create or replace function public.can_see_member(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles target on target.id = target_id
    where me.id = auth.uid()
      and (
        me.role = 'T3'
        or me.id = target.id
        or (
          me.school_region = target.school_region
          and (
            me.id = target.manager_id
            or me.id = (
              select p2.manager_id from public.profiles p2 where p2.id = target.manager_id
            )
            or (me.role = 'T2' and me.area is not null and me.area = target.area)
          )
        )
      )
  );
$$;

create or replace view public.v_funnel_by_campus as
select
  coalesce(u.school_region, p.school_region, '无锡学院') as school_region,
  u.stage,
  count(*)::int as user_count
from public.users u
left join public.profiles p on p.id = u.owner_id
group by 1, 2;

-- ===== end campus funnel =====
-- V2.4：录音质检字段 + 企微推送去重记录

alter table public.user_stage_logs
  add column if not exists qa_status text
    check (qa_status is null or qa_status in ('pending', 'passed', 'rejected')),
  add column if not exists qa_note text not null default '',
  add column if not exists qa_by uuid references public.profiles(id),
  add column if not exists qa_at timestamptz;

create index if not exists stage_logs_qa_pending_idx
  on public.user_stage_logs(qa_status, created_at desc)
  where qa_status = 'pending';

-- 企微推送去重（按 alert_key / source）
create table if not exists public.outbound_pushes (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'wecom',
  source_key text not null,
  payload text not null default '',
  pushed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (channel, source_key)
);

alter table public.outbound_pushes enable row level security;

drop policy if exists "outbound_select_leaders" on public.outbound_pushes;
drop policy if exists "outbound_insert_leaders" on public.outbound_pushes;

create policy "outbound_select_leaders"
  on public.outbound_pushes for select
  using (public.auth_role() in ('T3', 'T2'));

create policy "outbound_insert_leaders"
  on public.outbound_pushes for insert
  with check (public.auth_role() in ('T3', 'T2'));

-- ===== end qa wecom =====
