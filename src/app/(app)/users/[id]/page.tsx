"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PARENT_ATTITUDES,
  SIX_DIM_KEYS,
  STAGE_LOG_STATUSES,
  STAGES,
  type SixDimScore,
  type Stage,
  type StageLogStatus,
} from "@/lib/constants";
import { calcLevel, normalizeSixDim } from "@/lib/level";
import { useSession } from "@/components/providers/session-provider";
import {
  addStageLog,
  getUser,
  listStageLogs,
  upsertUser,
} from "@/lib/demo/store";
import { useDemoTick } from "@/lib/demo/use-demo-db";
import { ScoreRadar } from "@/components/charts/radar-chart";
import { LevelBadge } from "@/components/users/level-badge";
import { StageBadge } from "@/components/users/stage-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty";
import { formatDateTime } from "@/lib/utils";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useSession();
  const tick = useDemoTick();
  const user = useMemo(() => getUser(params.id), [params.id, tick]);
  const logs = useMemo(() => listStageLogs(params.id), [params.id, tick]);

  const [six, setSix] = useState<SixDimScore | null>(null);
  const [note, setNote] = useState("");
  const [nextStage, setNextStage] = useState<Stage>("面试");
  const [status, setStatus] = useState<StageLogStatus>("done");
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!user || !profile) {
    return (
      <EmptyState
        title="用户不存在或无权访问"
        action={
          <Button className="mt-2" onClick={() => router.push("/users")}>
            返回列表
          </Button>
        }
      />
    );
  }

  if (profile.role !== "T0" && user.owner_id !== profile.id) {
    return <EmptyState title="无权查看该用户" />;
  }

  const score = six ?? user.six_dim_score;
  const liveLevel = calcLevel(normalizeSixDim(score));

  const radarData = SIX_DIM_KEYS.map((k) => ({
    subject: k.replace("意识", "").replace("学习", "学"),
    score: score[k],
  }));

  const nextIndex = Math.min(
    STAGES.indexOf(user.stage) + 1,
    STAGES.length - 1,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">{user.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {user.major} · {user.channel} · {user.contact || "无联系方式"}
          </p>
        </div>
        <div className="flex gap-1.5">
          <LevelBadge level={liveLevel} />
          <StageBadge stage={user.stage} />
        </div>
      </div>

      <section className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">六维评分</h2>
          <span className="text-xs text-[var(--muted)]">
            改分后自动重算等级 → {liveLevel}
          </span>
        </div>
        <ScoreRadar
          data={radarData}
          max={3}
          series={[{ key: "score", color: "#1F6B8A", name: "当前" }]}
        />
        <div className="mt-4 grid gap-3">
          {SIX_DIM_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <Label className="w-36 shrink-0 text-xs md:text-sm">{key}</Label>
              <input
                type="range"
                min={1}
                max={3}
                step={1}
                value={score[key]}
                className="flex-1 accent-[var(--lake)]"
                onChange={(e) => {
                  const next = {
                    ...score,
                    [key]: Number(e.target.value),
                  } as SixDimScore;
                  setSix(next);
                }}
              />
              <span className="w-4 text-sm font-semibold">{score[key]}</span>
            </div>
          ))}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            upsertUser({
              id: user.id,
              name: user.name,
              owner_id: user.owner_id,
              six_dim_score: normalizeSixDim(score),
            });
            setSix(null);
            toast.success(`评分已保存，等级：${liveLevel}`);
          }}
        >
          保存六维评分
        </Button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">阶段推进</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>推进到</Label>
            <Select
              value={nextStage || STAGES[nextIndex]}
              onChange={(e) => setNextStage(e.target.value as Stage)}
              defaultValue={STAGES[nextIndex]}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as StageLogStatus)}
            >
              {STAGE_LOG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "doing" ? "进行中" : s === "done" ? "完成" : "失败"}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>本次说明</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="聊了什么、结果如何…"
          />
        </div>
        <div className="space-y-2">
          <Label>上传录音（手机可录）</Label>
          <Input
            type="file"
            accept="audio/*,.m4a,.mp3,.wav"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                // 演示模式：用 object URL 本地播放；正式环境走 Supabase Storage
                const url = URL.createObjectURL(file);
                setRecordUrl(url);
                toast.success("录音已就绪（演示本地预览）");
              } finally {
                setUploading(false);
              }
            }}
          />
          {recordUrl ? (
            <audio controls className="mt-2 w-full" src={recordUrl} />
          ) : null}
        </div>
        <Button
          className="w-full"
          disabled={uploading}
          onClick={() => {
            const stage = nextStage || STAGES[nextIndex];
            addStageLog({
              user_id: user.id,
              stage,
              status,
              note,
              record_url: recordUrl,
              owner_id: profile.id,
              advanceUser: status !== "failed",
            });
            if (stage === "成交") {
              upsertUser({
                id: user.id,
                name: user.name,
                owner_id: user.owner_id,
                stage: "成交",
              });
            }
            setNote("");
            setRecordUrl(null);
            toast.success(`已记录：${stage}`);
          }}
        >
          提交推进记录
        </Button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">跟进信息</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="家长态度">
            <Select
              defaultValue={user.parent_attitude}
              onChange={(e) =>
                upsertUser({
                  id: user.id,
                  name: user.name,
                  owner_id: user.owner_id,
                  parent_attitude: e.target.value,
                })
              }
            >
              {PARENT_ATTITUDES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="成交金额">
            <Input
              type="number"
              defaultValue={user.deal_amount ?? ""}
              onBlur={(e) =>
                upsertUser({
                  id: user.id,
                  name: user.name,
                  owner_id: user.owner_id,
                  deal_amount: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </Field>
          <Field label="下一步待办">
            <Input
              defaultValue={user.next_action}
              onBlur={(e) =>
                upsertUser({
                  id: user.id,
                  name: user.name,
                  owner_id: user.owner_id,
                  next_action: e.target.value,
                })
              }
            />
          </Field>
          <Field label="待办截止">
            <Input
              type="date"
              defaultValue={user.next_action_due ?? ""}
              onBlur={(e) =>
                upsertUser({
                  id: user.id,
                  name: user.name,
                  owner_id: user.owner_id,
                  next_action_due: e.target.value || null,
                })
              }
            />
          </Field>
        </div>
        <Field label="家庭情况">
          <Textarea
            defaultValue={user.family_situation}
            onBlur={(e) =>
              upsertUser({
                id: user.id,
                name: user.name,
                owner_id: user.owner_id,
                family_situation: e.target.value,
              })
            }
          />
        </Field>
        <Field label="总备注">
          <Textarea
            defaultValue={user.remark}
            onBlur={(e) =>
              upsertUser({
                id: user.id,
                name: user.name,
                owner_id: user.owner_id,
                remark: e.target.value,
              })
            }
          />
        </Field>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-semibold">跟进时间线</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">暂无推进记录</p>
        ) : (
          <ol className="space-y-4">
            {logs.map((log) => (
              <li key={log.id} className="relative border-l-2 border-[var(--line)] pl-4">
                <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--lake)]" />
                <div className="flex flex-wrap items-center gap-2">
                  <StageBadge stage={log.stage} />
                  <span className="text-xs text-[var(--muted)]">
                    {formatDateTime(log.created_at)} · {log.owner?.full_name}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  {log.note || "（无备注）"}
                </p>
                {log.record_url ? (
                  <audio
                    className="mt-2 w-full"
                    controls
                    src={
                      log.record_url.startsWith("demo://")
                        ? undefined
                        : log.record_url
                    }
                  >
                    {log.record_url.startsWith("demo://")
                      ? "演示录音占位"
                      : null}
                  </audio>
                ) : null}
                {log.record_url?.startsWith("demo://") ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    演示录音：{log.record_url}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
