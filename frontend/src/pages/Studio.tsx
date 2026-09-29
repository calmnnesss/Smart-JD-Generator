import { FileText, ListChecks, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AuroraBackground } from '../components/ui/AuroraBackground'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import { cn } from '../lib/cn'
import { scoreBrief } from '../lib/completeness'
import { BriefPanel } from '../features/brief/BriefPanel'
import { ChatThread } from '../features/copilot/ChatThread'
import { Dock } from '../features/copilot/Dock'
import { useCopilot } from '../features/copilot/useCopilot'
import { JdDocument } from '../features/generation/JdDocument'

type PanelTab = 'document' | 'brief'

export default function Studio() {
  const copilot = useCopilot()
  const { state } = copilot
  // 右侧面板的标签选择绑定在当前版本上：切换到新版本时自动回到文档视图
  const [tabChoice, setTabChoice] = useState<{ tab: PanelTab; runId: string | null }>({ tab: 'brief', runId: null })
  const tab = tabChoice.runId === state.activeRunId ? tabChoice.tab : 'document'
  const setTab = (next: PanelTab) => setTabChoice({ tab: next, runId: state.activeRunId })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [params, setParams] = useSearchParams()

  // /studio?demo=1：直接播放示例（落地页「看看示例」入口）
  const { playSample } = copilot
  useEffect(() => {
    if (!params.get('demo')) return
    setParams({}, { replace: true })
    playSample()
  }, [params, setParams, playSample])

  const hasRuns = state.runs.length > 0
  const editable = !state.autoplay && state.phase !== 'intro' && state.phase !== 'generating'
  const { score } = scoreBrief(state.brief)

  const briefPanel = (
    <BriefPanel
      brief={state.brief}
      route={state.route}
      lastChanged={state.lastChanged}
      editable={editable}
      onEdit={(stepId) => {
        setSheetOpen(false)
        copilot.edit(stepId)
      }}
    />
  )

  return (
    <div className="flex h-dvh flex-col">
      <AuroraBackground />
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/60 bg-canvas/70 px-4 backdrop-blur-md sm:px-6">
        <Logo />
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setSheetOpen(true)}>
            <ListChecks className="size-3.5" />
            简报 <span className="text-zinc-400 tabular-nums">{score}%</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={copilot.reset} disabled={state.phase === 'intro' && !state.autoplay}>
            重新开始
          </Button>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <ChatThread
            copilot={copilot}
            onOpenDocument={(runId) => {
              copilot.selectRun(runId)
              setTabChoice({ tab: 'document', runId })
            }}
          />
          <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="mx-auto max-w-2xl">
              <Dock copilot={copilot} />
            </div>
          </div>
        </section>

        <aside
          className={cn(
            'hidden min-h-0 shrink-0 flex-col border-l border-zinc-200/60 bg-white/40 backdrop-blur-sm transition-[width] duration-500 ease-out lg:flex',
            hasRuns ? 'w-[48%] max-w-[720px]' : 'w-[380px] xl:w-[420px]',
          )}
        >
          {hasRuns && (
            <div className="flex shrink-0 items-center gap-1 px-5 pt-4">
              {(
                [
                  ['document', 'JD 文档', FileText],
                  ['brief', '招聘简报', ListChecks],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] transition',
                    tab === key ? 'bg-white font-medium text-zinc-900 shadow-soft' : 'text-zinc-500 hover:text-zinc-800',
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {hasRuns && tab === 'document' ? (
              <JdDocument
                runs={state.runs}
                activeRunId={state.activeRunId}
                companyName={state.brief.company.name}
                onSelect={copilot.selectRun}
                className="h-full"
              />
            ) : (
              <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-soft">{briefPanel}</div>
            )}
          </div>
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
