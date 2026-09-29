import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { firstBlockedStep, STEPS } from './fields'
import type { Studio } from './useStudio'

/** 顶部步骤条：可以回到已完成的步骤，前进不能越过还有错误的步骤 */
export function Stepper({ studio }: { studio: Studio }) {
  const { state, dispatch } = studio
  const current = STEPS.findIndex((s) => s.key === state.step)
  const reachable = STEPS.findIndex((s) => s.key === firstBlockedStep(state.brief))

  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const done = index < current
        const active = index === current
        const enabled = !state.filling && index <= Math.max(current, reachable)
        return (
          <li key={step.key} className={cn('flex items-center gap-2', index < STEPS.length - 1 && 'flex-1')}>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => dispatch({ type: 'goto_step', step: step.key })}
              aria-current={active ? 'step' : undefined}
              className="group flex shrink-0 items-center gap-2 rounded-full focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:outline-none"
            >
              <span
                className={cn(
                  'grid size-7 place-items-center rounded-full text-xs font-semibold tabular-nums transition',
                  active && 'ai-border text-violet-700 shadow-[0_0_0_4px_rgb(139_92_246/0.1)] [--ai-fill:var(--color-violet-50)]',
                  done && 'bg-zinc-900 text-white',
                  !active && !done && 'border border-zinc-300 bg-white text-zinc-400',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-[13px] whitespace-nowrap transition',
                  active ? 'font-medium text-zinc-900' : 'hidden text-zinc-500 sm:inline',
                  enabled && !active && 'group-hover:text-zinc-900',
                )}
              >
                {step.label}
              </span>
            </button>
            {index < STEPS.length - 1 && <span className={cn('h-px flex-1', done ? 'bg-zinc-400' : 'bg-zinc-200')} />}
          </li>
        )
      })}
    </ol>
  )
}

interface StepCardProps {
  title: string
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function StepCard({ title, description, action, children, footer }: StepCardProps) {
  return (
    <section className="rounded-3xl border border-zinc-200/70 bg-white/85 shadow-float backdrop-blur">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-6 sm:px-8 sm:pt-7">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h2>
          {description && <p className="mt-1.5 text-sm leading-6 text-zinc-500">{description}</p>}
        </div>
        {action}
      </header>
      <div className="space-y-6 px-5 py-6 sm:px-8">{children}</div>
      {footer && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4 sm:px-8">{footer}</footer>
      )}
    </section>
  )
}
