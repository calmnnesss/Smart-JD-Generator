import { ChevronDown, CircleAlert, CirclePause, RotateCcw, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { AIOrb } from '../../components/ui/AIOrb'
import { Button } from '../../components/ui/Button'
import { hostOf } from '../../lib/url'
import { formatSeconds, useNow } from '../../lib/useNow'
import type { BriefDraft, Run } from '../../types'
import { StageTimeline } from './StageTimeline'

interface RunCardProps {
  run: Run
  brief: BriefDraft
  onStop: () => void
  onRetry: () => void
}

function stageCaptions(brief: BriefDraft): Record<string, string> {
  return {
    fetch: brief.company.domain ? `读取 ${hostOf(brief.company.domain)}` : '',
    analyze: '文化关键词与岗位卖点',
    profile: '专业技能、实战经验、核心素质',
    draft: '按招聘启事结构组织内容',
    review: '核对事实依据',
  }
}

/** 生成进度：运行中完整展开；完成后收起为一行摘要，可展开查看 */
export function RunCard({ run, brief, onStop, onRetry }: RunCardProps) {
  const running = run.status === 'running'
  const [expanded, setExpanded] = useState(false)
  const now = useNow(running)
  const elapsed = (run.finishedAt ?? now) - run.startedAt
  const finishedStages = run.stages.filter((s) => run.stageState[s.id]?.status === 'done').length
  const collapsible = run.status === 'done'
  const open = !collapsible || expanded

  const header = {
    running: { title: '正在生成 JD 底稿', icon: <AIOrb size={20} thinking /> },
    done: { title: `已完成 ${finishedStages} 个步骤`, icon: <Sparkles className="size-4 text-violet-500" /> },
    error: { title: '生成未完成', icon: <CircleAlert className="size-4 text-rose-500" /> },
    stopped: { title: '已停止生成', icon: <CirclePause className="size-4 text-zinc-400" /> },
  }[run.status]

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 shadow-soft backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        {header.icon}
        <button
          type="button"
          disabled={!collapsible}
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left disabled:cursor-default"
        >
          <span className={running ? 'shimmer-text text-sm font-medium' : 'text-sm font-medium text-zinc-900'}>{header.title}</span>
          {collapsible && <ChevronDown className={`size-4 text-zinc-400 transition ${expanded ? 'rotate-180' : ''}`} />}
        </button>
        <span className="text-xs text-zinc-400 tabular-nums">{run.result ? `用时 ${run.result.elapsed_s}s` : formatSeconds(elapsed)}</span>
        {running && (
          <Button variant="secondary" size="sm" onClick={onStop} className="h-7">
            停止
          </Button>
        )}
        {(run.status === 'stopped' || run.error?.retryable) && (
          <Button size="sm" variant="secondary" onClick={onRetry} className="h-7">
            <RotateCcw className="size-3.5" />
            {run.status === 'stopped' ? '重新生成' : '重试'}
          </Button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-100 px-4 py-3.5">
              <StageTimeline stages={run.stages} state={run.stageState} captions={stageCaptions(brief)} />
              {run.error && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">{run.error.message}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
