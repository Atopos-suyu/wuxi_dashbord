-- 无锡片区业务工作台 · 初始 Schema + RLS
-- 执行: supabase db push

create extension if not exists "pgcrypto";

-- ========== helpers ==========
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

-- ========== profiles ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'T2' check (role in ('T0', 'T1', 'T2', '伪T0')),
  school_region text not null default '无锡学院',
  status text not null default 'active' check (status in ('active', 'pending', 'inactive')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_t0"
  on public.profiles for select
  using (auth.uid() = id or public.is_t0());

create policy "profiles_update_own_or_t0"
  on public.profiles for update
  using (auth.uid() = id or public.is_t0());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- auto create profile on signup
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

-- ========== users (新生) ==========
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

-- auto calc level from six_dim_score
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
