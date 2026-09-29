import { CircleAlert, CirclePause, PanelRight, RotateCcw, Sparkles } from 'lucide-react'
import { AIOrb } from '../../components/ui/AIOrb'
import { Button } from '../../components/ui/Button'
import { formatSeconds, useNow } from '../../lib/useNow'
import { hostOf } from '../copilot/script'
import type { Run } from '../copilot/useCopilot'
import type { BriefDraft } from '../../types'
import { JdDocument } from './JdDocument'
import { StageTimeline } from './StageTimeline'

interface RunCardProps {
  run: Run
  runs: Run[]
  brief: BriefDraft
  isLatest: boolean
  onStop: () => void
  onRetry: () => void
  onOpen: () => void
  onSelect: (runId: string) => void
}

function stageCaptions(brief: BriefDraft): Record<string, string> {
  return {
    fetch: brief.company.domain ? `读取 ${hostOf(brief.company.domain)}` : '',
    search: `检索「${brief.company.name}」的公开资料`,
    analyze: '文化关键词与岗位卖点',
    profile: '专业技能、实战经验、核心素质',
    draft: '按招聘启事结构组织内容',
    review: '核对事实依据，删去没有来源的表述',
  }
}

/** 对话流中的「生成过程」卡片：真实阶段进度 + 计时 + 停止 / 重试 */
export function RunCard({ run, runs, brief, isLatest, onStop, onRetry, onOpen, onSelect }: RunCardProps) {
  const running = run.status === 'running'
  const now = useNow(running)
  const elapsed = (run.finishedAt ?? now) - run.startedAt

  const header = {
    running: { title: '正在生成 JD 底稿', icon: null },
    done: { title: 'JD 底稿已生成', icon: <Sparkles className="size-4 text-violet-500" /> },
    error: { title: '生成未完成', icon: <CircleAlert className="size-4 text-rose-500" /> },
    stopped: { title: '已停止生成', icon: <CirclePause className="size-4 text-zinc-400" /> },
  }[run.status]

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-soft">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
          {running ? <AIOrb size={20} thinking /> : header.icon}
          <div className="min-w-0 flex-1">
            <div className={running ? 'shimmer-text text-sm font-medium' : 'text-sm font-medium text-zinc-900'}>{header.title}</div>
          </div>
          <span className="text-xs text-zinc-400 tabular-nums">
            v{run.version} · {run.result ? `${run.result.elapsed_s}s` : formatSeconds(elapsed)}
          </span>
          {running && (
            <Button variant="secondary" size="sm" onClick={onStop} className="h-7">
              停止
            </Button>
          )}
        </div>
        <div className="px-4 py-3.5">
          <StageTimeline stages={run.stages} state={run.stageState} captions={stageCaptions(brief)} />
          {run.error && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">
              <span>{run.error.message}</span>
              {run.error.retryable && isLatest && (
                <Button size="sm" variant="secondary" onClick={onRetry} className="h-7">
                  <RotateCcw className="size-3.5" />
                  重试
                </Button>
              )}
            </div>
          )}
          {run.status === 'stopped' && isLatest && (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="secondary" onClick={onRetry}>
                <RotateCcw className="size-3.5" />
                重新生成
              </Button>
            </div>
          )}
        </div>
        {run.result && (
          <button
            type="button"
            onClick={onOpen}
            className="hidden w-full items-center justify-between border-t border-zinc-100 bg-zinc-50/70 px-4 py-2.5 text-left text-[13px] text-zinc-600 transition hover:bg-zinc-100/70 hover:text-zinc-900 lg:flex"
          >
            <span>已在右侧打开 v{run.version}，可复制或下载</span>
            <PanelRight className="size-4" />
          </button>
        )}
      </div>
      {/* 小屏没有右侧面板，直接在对话流里展示 JD */}
      {run.result && (
        <JdDocument runs={runs} activeRunId={run.id} companyName={brief.company.name} onSelect={onSelect} className="max-h-[70vh] lg:hidden" />
      )}
    </div>
  )
}
