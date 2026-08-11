-- V2-5：预警后端口径（与 src/lib/constants.ts ALERT_THRESHOLDS / src/lib/alerts.ts 对齐）
-- 演示模式用 TS 计算；Live 可查本视图，保证阈值一致。

-- 连续未填日报天数（从今天往前，直到有一条日报；全无则 14）
create or replace function public.fn_consecutive_missed_daily(p_member_id uuid)
returns int
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select min(n)::int
      from generate_series(0, 13) as n
      where exists (
        select 1
        from public.daily_reviews r
        where r.member_id = p_member_id
          and r.review_date = (current_date - n)
      )
    ),
    14
  );
$$;

-- 能力连续下滑周数：按 period 倒序，较新一期任一分项低于较旧一期则计 1，连续累计
create or replace function public.fn_capability_drop_weeks(p_member_id uuid)
returns int
language plpgsql
stable
set search_path = public
as $$
declare
  rec record;
  newer jsonb := null;
  older jsonb;
  drops int := 0;
  declining boolean;
  k text;
begin
  for rec in
    select scores
    from public.team_capabilities
    where member_id = p_member_id
    order by period desc
    limit 8
  loop
    if newer is null then
      newer := rec.scores;
      continue;
    end if;
    older := rec.scores;
    declining := false;
    for k in
      select jsonb_object_keys(coalesce(newer, '{}'::jsonb) || coalesce(older, '{}'::jsonb))
    loop
      if coalesce((newer ->> k)::numeric, 0) < coalesce((older ->> k)::numeric, 0) then
        declining := true;
        exit;
      end if;
    end loop;
    if declining then
      drops := drops + 1;
      newer := older;
    else
      exit;
    end if;
  end loop;
  return drops;
end;
$$;

create or replace view public.v_computed_alerts
with (security_invoker = true)
as
select * from (
  -- 日报漏填 · 红
  select
    format('日报漏填:%s:red:%s', p.id, to_char(current_date, 'YYYY-MM')) as alert_key,
    '日报漏填'::text as alert_type,
    'red'::text as level,
    p.id as member_id,
    p.full_name as member_name,
    null::uuid as user_id,
    null::text as user_name,
    null::text as contact,
    format('连续 %s 天未填日报', public.fn_consecutive_missed_daily(p.id)) as reason
  from public.profiles p
  where p.role <> 'T3'
    and public.can_see_member(p.id)
    and public.fn_consecutive_missed_daily(p.id) >= 3

  union all

  -- 日报漏填 · 黄
  select
    format('日报漏填:%s:yellow:%s', p.id, to_char(current_date, 'YYYY-MM-DD')),
    '日报漏填',
    'yellow',
    p.id,
    p.full_name,
    null,
    null,
    null,
    format('近 %s 天未填日报', public.fn_consecutive_missed_daily(p.id))
  from public.profiles p
  where p.role <> 'T3'
    and public.can_see_member(p.id)
    and public.fn_consecutive_missed_daily(p.id) between 1 and 2

  union all

  -- 能力下滑
  select
    format('能力下滑:%s:%s', p.id, public.fn_capability_drop_weeks(p.id)),
    '能力下滑',
    'yellow',
    p.id,
    p.full_name,
    null,
    null,
    null,
    format('连续 %s 周能力维度下滑', public.fn_capability_drop_weeks(p.id))
  from public.profiles p
  where p.role <> 'T3'
    and public.can_see_member(p.id)
    and public.fn_capability_drop_weeks(p.id) >= 2

  union all

  -- S/A 用户停滞 · 红
  select
    format('用户停滞:%s:SA', u.id),
    '用户停滞',
    'red',
    u.owner_id,
    coalesce(p.full_name, '未知'),
    u.id,
    u.name,
    u.contact,
    format(
      '%s 级用户 %s 天无阶段更新',
      u.level,
      (current_date - coalesce(u.last_stage_update_at, u.updated_at)::date)
    )
  from public.users u
  left join public.profiles p on p.id = u.owner_id
  where u.level in ('S', 'A')
    and public.can_see_member(u.owner_id)
    and (current_date - coalesce(u.last_stage_update_at, u.updated_at)::date) >= 5

  union all

  -- B 用户停滞 · 黄
  select
    format('用户停滞:%s:B', u.id),
    '用户停滞',
    'yellow',
    u.owner_id,
    coalesce(p.full_name, '未知'),
    u.id,
    u.name,
    u.contact,
    format(
      'B 级用户 %s 天无阶段更新',
      (current_date - coalesce(u.last_stage_update_at, u.updated_at)::date)
    )
  from public.users u
  left join public.profiles p on p.id = u.owner_id
  where u.level = 'B'
    and public.can_see_member(u.owner_id)
    and (current_date - coalesce(u.last_stage_update_at, u.updated_at)::date) >= 7

  union all

  -- 关单超时 · 红
  select
    format('关单超时:%s', u.id),
    '关单超时',
    'red',
    u.owner_id,
    coalesce(p.full_name, '未知'),
    u.id,
    u.name,
    u.contact,
    format(
      '在「%s」停留 %s 天',
      u.stage,
      (current_date - coalesce(u.last_stage_update_at, u.updated_at)::date)
    )
  from public.users u
  left join public.profiles p on p.id = u.owner_id
  where u.stage in ('产品', '关单')
    and public.can_see_member(u.owner_id)
    and (current_date - coalesce(u.last_stage_update_at, u.updated_at)::date) >= 7

  union all

  -- 待办逾期
  select
    format('待办逾期:%s:%s', u.id, u.next_action_due),
    '待办逾期',
    case
      when (current_date - u.next_action_due) > 3 then 'red'
      else 'yellow'
    end,
    u.owner_id,
    coalesce(p.full_name, '未知'),
    u.id,
    u.name,
    u.contact,
    format(
      '待办逾期 %s 天：%s',
      (current_date - u.next_action_due),
      coalesce(nullif(u.next_action, ''), '未填写')
    )
  from public.users u
  left join public.profiles p on p.id = u.owner_id
  where u.next_action_due is not null
    and u.next_action_due < current_date
    and u.stage <> '成交'
    and public.can_see_member(u.owner_id)

  union all

  -- 家长态度恶化（每用户每种恶化态度取最近一条）
  select
    format('家长态度恶化:%s:%s', x.user_id, x.to_attitude),
    '家长态度恶化',
    'red',
    x.owner_id,
    x.member_name,
    x.user_id,
    x.user_name,
    x.contact,
    format('家长态度由「%s」变为「%s」', x.from_attitude, x.to_attitude)
  from (
    select distinct on (u.id, l.to_attitude)
      u.id as user_id,
      u.owner_id,
      coalesce(p.full_name, '未知') as member_name,
      u.name as user_name,
      u.contact,
      l.from_attitude,
      l.to_attitude
    from public.parent_attitude_logs l
    join public.users u on u.id = l.user_id
    left join public.profiles p on p.id = u.owner_id
    where l.from_attitude = '支持'
      and l.to_attitude in ('犹豫', '反对')
      and public.can_see_member(u.owner_id)
    order by u.id, l.to_attitude, l.created_at desc
  ) x
) alerts;

grant select on public.v_computed_alerts to authenticated, anon;

comment on view public.v_computed_alerts is
  'V2 预警动态口径；阈值对齐 ALERT_THRESHOLDS；已处理请对照 alert_resolutions.alert_key';

-- ===== end alert views =====
