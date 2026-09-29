import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { StageInfo, StageStatus } from '../../types'

interface StageTimelineProps {
  stages: StageInfo[]
  state: Record<string, { status: StageStatus; elapsedMs?: number }>
  captions: Record<string, string>
}

function Indicator({ status }: { status: StageStatus }) {
  if (status === 'done') {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-zinc-900 text-white shadow-[0_2px_6px_-1px_rgb(24_24_27/0.35)]">
        <Check className="size-3" strokeWidth={3} />
      </span>
    )
  }
  if (status === 'running') {
    return (
      <span className="relative grid size-5 place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent,#8b5cf6,#06b6d4)] [mask:radial-gradient(farthest-side,transparent_calc(100%-2.5px),#000_calc(100%-2px))]" />
        <span className="size-1.5 rounded-full bg-violet-500" />
      </span>
    )
  }
  return (
    <span
      className={cn(
        'size-5 rounded-full border-[1.5px] bg-white',
        status === 'skipped' ? 'border-dashed border-zinc-300' : 'border-zinc-300',
      )}
    />
  )
}

export function StageTimeline({ stages, state, captions }: StageTimelineProps) {
  if (!stages.length) {
    return (
      <div className="space-y-3 py-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-4 rounded" style={{ width: `${70 - i * 12}%` }} />
        ))}
      </div>
    )
  }
  return (
    <ol className="relative">
      {stages.map((stage, index) => {
        const { status, elapsedMs } = state[stage.id] ?? { status: 'pending' as StageStatus }
        const last = index === stages.length - 1
        return (
          <li key={stage.id} className="relative flex gap-3 pb-3.5 last:pb-0">
            {!last && (
              <span
                className={cn(
                  'absolute top-6 bottom-0.5 left-[9.5px] w-px',
                  status === 'done' ? 'bg-zinc-300' : 'bg-zinc-200',
                )}
              />
            )}
            <Indicator status={status} />
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={cn(
                    'text-sm leading-5',
                    status === 'running' && 'shimmer-text font-medium',
                    status === 'done' && 'text-zinc-800',
                    status === 'pending' && 'text-zinc-400',
                    status === 'skipped' && 'text-zinc-300 line-through decoration-zinc-200',
                  )}
                >
                  {stage.label}
                </div>
                {captions[stage.id] && status !== 'skipped' && (
                  <div className={cn('mt-0.5 truncate text-xs', status === 'pending' ? 'text-zinc-300' : 'text-zinc-500')}>
                    {captions[stage.id]}
                  </div>
                )}
              </div>
              <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
                {status === 'done' && elapsedMs !== undefined ? `${(elapsedMs / 1000).toFixed(1)}s` : status === 'running' ? '进行中' : ''}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
