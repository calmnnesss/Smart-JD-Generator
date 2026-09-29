import { ArrowRight, PenLine, RefreshCw, Sparkles, Square } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AIOrb } from '../../components/ui/AIOrb'
import { Button } from '../../components/ui/Button'
import { formatSeconds, useNow } from '../../lib/useNow'
import { AnswerDock } from './AnswerDock'
import { STEP_BY_ID, STEPS, type StepId } from './script'
import type { Copilot } from './useCopilot'

/** 「修改信息」菜单：只列出当前路线下有意义的字段 */
function EditMenu({ copilot }: { copilot: Copilot }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { brief, route } = copilot.state

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const fields = STEPS.filter((step) => {
    if (step.id === 'one_liner') return route === 'quick'
    if (step.id === 'level') return route === 'guided'
    if (step.id === 'cohort') return brief.role.hire_type === '校招' || brief.role.hire_type === '实习'
    if (step.id === 'experience') return brief.role.hire_type === '社招'
    return true
  })

  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <PenLine className="size-4" />
        修改信息
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-full left-0 z-20 mb-2 grid w-64 grid-cols-2 gap-0.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-float"
          >
            {fields.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  copilot.edit(step.id as StepId)
                }}
                className="rounded-lg px-2.5 py-2 text-left text-[13px] text-zinc-700 transition hover:bg-violet-50 hover:text-violet-700"
              >
                {step.field}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/90 p-3 shadow-float backdrop-blur">
      {children}
    </div>
  )
}

function GeneratingDock({ copilot }: { copilot: Copilot }) {
  const run = copilot.state.runs.find((r) => r.id === copilot.state.activeRunId)
  const now = useNow(true)
  if (!run) return null
  const running = run.stages.find((s) => run.stageState[s.id]?.status === 'running')
  return (
    <Panel>
      <AIOrb size={22} thinking />
      <div className="min-w-0 flex-1">
        <div className="shimmer-text truncate text-sm font-medium">{running ? `${running.label}…` : '正在准备…'}</div>
      </div>
      <span className="text-xs text-zinc-400 tabular-nums">{formatSeconds(now - run.startedAt)}</span>
      <Button size="sm" variant="secondary" onClick={() => copilot.stop(run.id)}>
        <Square className="size-3 fill-current" />
        停止
      </Button>
    </Panel>
  )
}

/** 底部操作区：按对话阶段切换 */
export function Dock({ copilot }: { copilot: Copilot }) {
  const { state } = copilot
  let content: ReactNode

  if (state.autoplay) {
    content = (
      <Panel>
        <Sparkles className="size-4 text-violet-500" />
        <span className="shimmer-text text-sm font-medium">正在用示例演示对话…</span>
      </Panel>
    )
  } else if (state.phase === 'intro') {
    content = (
      <Panel>
        <Button variant="ai" size="lg" onClick={copilot.start} className="flex-1 sm:flex-none">
          开始
          <ArrowRight className="size-4" />
        </Button>
        <Button size="lg" onClick={copilot.playSample} className="flex-1 sm:flex-none">
          <Sparkles className="size-4 text-violet-500" />
          用示例体验
        </Button>
        <span className="hidden text-xs text-zinc-400 sm:ml-auto sm:block">大约 6–8 个问题</span>
      </Panel>
    )
  } else if (state.phase === 'collecting' && state.current) {
    content = (
      <AnswerDock
        key={`${state.current}-${state.messages.length}`}
        step={STEP_BY_ID[state.current]}
        brief={state.brief}
        route={state.route}
        onAnswer={(value) => copilot.answer(state.current!, value)}
      />
    )
  } else if (state.phase === 'confirm') {
    content = (
      <Panel>
        <Button variant="ai" size="lg" onClick={() => copilot.generate()} className="flex-1 sm:flex-none">
          <Sparkles className="size-4" />
          生成 JD
        </Button>
        <EditMenu copilot={copilot} />
      </Panel>
    )
  } else if (state.phase === 'generating') {
    content = <GeneratingDock copilot={copilot} />
  } else {
    content = (
      <Panel>
        <Button variant="primary" onClick={() => copilot.generate('重新生成')}>
          <RefreshCw className="size-4" />
          重新生成
        </Button>
        <EditMenu copilot={copilot} />
        <Button variant="ghost" onClick={copilot.reset} className="ml-auto">
          新的招聘
        </Button>
      </Panel>
    )
  }

  const key = state.autoplay ? 'autoplay' : state.phase === 'collecting' ? `step-${state.current}-${state.messages.length}` : state.phase
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.3, delay: state.phase === 'collecting' ? 0.25 : 0, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  )
}
