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
