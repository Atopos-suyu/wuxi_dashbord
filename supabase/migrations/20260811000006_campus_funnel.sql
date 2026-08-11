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
