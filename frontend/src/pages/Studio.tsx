import { ArrowLeft, FileText, ListChecks, Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { AuroraBackground } from '../components/ui/AuroraBackground'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { scoreBrief } from '../lib/completeness'
import { BriefPanel } from '../features/brief/BriefPanel'
import { CompanyStep } from '../features/form/CompanyStep'
import { ConfirmStep } from '../features/form/ConfirmStep'
import { ExtrasStep } from '../features/form/ExtrasStep'
import type { FieldKey, StepKey } from '../features/form/fields'
import { RoleStep } from '../features/form/RoleStep'
import { Stepper } from '../features/form/StepShell'
import { useStudio, type Studio as StudioModel } from '../features/form/useStudio'
import { JdDocument } from '../features/generation/JdDocument'
import { RunCard } from '../features/generation/RunCard'

const STEP_VIEWS: Record<StepKey, (props: { studio: StudioModel }) => ReactNode> = {
  company: CompanyStep,
  role: RoleStep,
  extras: ExtrasStep,
  confirm: ConfirmStep,
}

function ResultView({ studio }: { studio: StudioModel }) {
  const { state, dispatch, reset, generate, stop } = studio
  const run = state.run!
  const running = run.status === 'running'
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'back_to_form' })} disabled={running}>
          <ArrowLeft className="size-4" />
          返回修改信息
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} disabled={running}>
          <Plus className="size-4" />
          新的招聘
        </Button>
      </div>
      <RunCard run={run} brief={state.brief} onStop={stop} onRetry={generate} />
      <JdDocument run={run} companyName={state.brief.company.name} />
    </div>
  )
}

export default function Studio() {
  const studio = useStudio()
  const { state, dispatch, reset, fillSample } = studio
  const [sheetOpen, setSheetOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const scrollRef = useRef<HTMLDivElement>(null)

  // /studio?demo=1：直接填入示例（落地页「看看示例」入口）
  useEffect(() => {
    if (!params.get('demo')) return
    setParams({}, { replace: true })
    fillSample()
  }, [params, setParams, fillSample])

  // 切换步骤或视图时回到顶部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.step, state.view])

  const { score } = scoreBrief(state.brief)
  const StepView = STEP_VIEWS[state.step]

  const briefPanel = (
    <BriefPanel
      brief={state.brief}
      roleMode={state.roleMode}
      lastChanged={state.lastChanged}
      editable={state.view === 'form' && !state.filling}
      onEdit={(step: StepKey, field: FieldKey) => {
        setSheetOpen(false)
        dispatch({ type: 'edit_field', step, field })
      }}
    />
  )

  return (
    <div className="flex h-dvh flex-col">
      <AuroraBackground />
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/60 bg-canvas/70 px-4 backdrop-blur-md sm:px-6">
        <Logo />
        <div className="flex items-center gap-1.5">
          {state.view === 'form' && state.run && (
            <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'show_result' })}>
              <FileText className="size-3.5" />
              查看结果
            </Button>
          )}
          <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setSheetOpen(true)}>
            <ListChecks className="size-3.5" />
            简报 <span className="text-zinc-400 tabular-nums">{score}%</span>
          </Button>
          {state.view === 'form' && (
            <Button variant="ghost" size="sm" onClick={reset}>
              重新开始
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1320px] flex-1">
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
          <div className={`mx-auto w-full px-4 pt-6 pb-16 sm:px-6 sm:pt-10 ${state.view === 'form' ? 'max-w-2xl' : 'max-w-3xl'}`}>
            {state.view === 'form' ? (
              <>
                <Stepper studio={studio} />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={state.step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-6"
                  >
                    <StepView studio={studio} />
                  </motion.div>
                </AnimatePresence>
              </>
            ) : (
              <ResultView studio={studio} />
            )}
          </div>
        </div>

        <aside className="hidden w-[380px] shrink-0 overflow-y-auto border-l border-zinc-200/60 bg-white/40 p-5 backdrop-blur-sm lg:block xl:w-[400px]">
          <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-soft">{briefPanel}</div>
        </aside>
      </main>

      {/* 小屏：简报以底部抽屉展示 */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-zinc-900/20 backdrop-blur-[2px]" onClick={() => setSheetOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white px-5 pt-3 pb-8 shadow-float"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="h-1 w-10 rounded-full bg-zinc-200" />
                <button type="button" aria-label="关闭" onClick={() => setSheetOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
                  <X className="size-4" />
                </button>
              </div>
              {briefPanel}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
