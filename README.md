# 无锡片区业务工作台（V2 监控闭环）

面向高校校园团队的业务管理系统：用户跟进漏斗、六维评级、成员能力、复盘录音，以及 V2 新增的片区总览、成员红绿灯、目标达成与预警中心。

组织层级：**T3 片区总负责 → T2 专业片区负责人 → T1 组长 → T0 执行成员**（可选 伪T0）。

技术栈：Next.js 16 · Tailwind CSS 4 · Supabase（Auth / Postgres / Storage）· Recharts

## 快速开始（演示模式）

未配置 Supabase 时默认进入演示模式（localStorage）：

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，按角色选择演示身份进入。

## 接入 Supabase

1. 复制环境变量：

```bash
cp .env.local.example .env.local
```

2. 在 Supabase SQL Editor 执行：

```bash
# 一键（含 V1 + V2）
supabase/setup_all.sql

# 或已跑过 V1 时，只执行增量
supabase/migrations/20260811000003_v2_roles_goals_alerts.sql
```

3. 填写 `.env.local` 中的 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，并设置 `NEXT_PUBLIC_DEMO_MODE=false`。

## 功能清单（V2 / V2.1）

| 模块 | 说明 |
|---|---|
| 片区总览 | T3/T2：漏斗、等级、成员红绿灯、CSV 导出 |
| 预警中心 | 动态计算 + 处理闭环；导航角标；含目标落后 / 家长态度恶化（日志对比） |
| 目标与达成 | 周目标 vs 实际；从上周复制；CSV |
| 组织管理 | T3：调整角色 / 片区 / 上级 / 状态（`/org`） |
| 站内通知 | 红黄预警自动生成；角标 + `/notifications` |
| 成交学员活跃 | `/students`：活跃/召回统计与登记（对齐 9 月活跃目标） |
| 周作战会包 | `/briefing`：红绿灯+预警+目标+学员 CSV 一键导出 |
| 成员下钻 | 用户列表、能力对比、近 7 天日报、告警 |
| 用户管理 | 六维、阶段、待办完成、联系方式复制、态度变更日志 |
| 复盘 / 录音库 | 日报周报与录音在线播放 |

权限核心：`can_see_member`（SQL RLS + `src/lib/permissions.ts`）。预警阈值在 `ALERT_THRESHOLDS`。

增量迁移：
- V2：`20260811000003_v2_roles_goals_alerts.sql`
- V2.1：`20260811000004_v2_1_ops.sql`（`parent_attitude_logs`）
- V2.2：`20260811000005_notify_students.sql`（通知 / 学员活跃 / 预警视图）
- 或一键执行 `supabase/setup_all.sql`

## 脚本

```bash
npm run dev      # 开发
npm run build    # 生产构建
npm run start    # 启动生产服务
npm run lint     # ESLint
```
