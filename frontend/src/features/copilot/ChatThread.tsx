import { AnimatePresence, motion } from 'motion/react'
import { FileSearch, ListChecks, Wand2 } from 'lucide-react'
import { AIOrb } from '../../components/ui/AIOrb'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { ConfirmCard } from './ConfirmCard'
import { AiMessage, UserMessage } from './MessageParts'
import { ParsedSummary } from './ParsedSummary'
import { MissingInfoCard } from '../generation/MissingInfoCard'
import { RunCard } from '../generation/RunCard'
import type { Copilot } from './useCopilot'

interface ChatThreadProps {
  copilot: Copilot
  onOpenDocument: (runId: string) => void
}

export function ChatThread({ copilot, onOpenDocument }: ChatThreadProps) {
  const { state, edit, generate, stop, selectRun } = copilot
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  // 内容增长时，如果用户停留在底部附近就自动跟随；只有用户主动向上滚动才取消跟随
  useEffect(() => {
    const scroller = scrollRef.current
    const content = contentRef.current
    if (!scroller || !content) return
    let lastTop = scroller.scrollTop
    const onScroll = () => {
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
      if (distance < 80) stick.current = true
      else if (scroller.scrollTop < lastTop - 4) stick.current = false
      lastTop = scroller.scrollTop
    }
    const follow = () => {
      if (stick.current) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
    }
    const observer = new ResizeObserver(follow)
    scroller.addEventListener('scroll', onScroll, { passive: true })
    observer.observe(content)
    observer.observe(scroller)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  // 新消息（包括用户自己的回答）总是滚到底部
  useLayoutEffect(() => {
    stick.current = true
    const scroller = scrollRef.current
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
  }, [state.messages.length])

  // 首屏用欢迎区代替开场白，开始对话后开场白作为第一条消息出现
  const visible = state.phase === 'intro' && !state.autoplay ? [] : state.messages
  const lastConfirm = [...state.messages].reverse().find((m) => m.kind === 'confirm')?.id
  const latestRun = state.runs[state.runs.length - 1]
  const canEdit = !state.autoplay && state.phase !== 'generating' && state.phase !== 'intro'

  const render = (message: (typeof state.messages)[number]): ReactNode => {
    switch (message.kind) {
      case 'text':
        return <AiMessage text={message.text} hint={message.hint} label={message.label} />
      case 'answer':
        return (
          <UserMessage
            text={message.text}
            onEdit={canEdit && message.stepId ? () => edit(message.stepId!) : undefined}
          />
        )
      case 'parsed':
        return (
          <AiMessage>
            <ParsedSummary parsed={message.parsed} />
          </AiMessage>
        )
      case 'confirm':
        return (
          <AiMessage>
            <ConfirmCard brief={state.brief} route={state.route} onEdit={message.id === lastConfirm ? edit : undefined} />
          </AiMessage>
        )
      case 'run': {
        const run = state.runs.find((r) => r.id === message.runId)
        if (!run) return null
        return (
          <AiMessage typing={false}>
            <RunCard
              run={run}
              runs={state.runs}
              brief={state.brief}
              isLatest={run.id === latestRun?.id}
              onStop={() => stop(run.id)}
              onRetry={() => generate('重新生成')}
              onOpen={() => onOpenDocument(run.id)}
              onSelect={selectRun}
            />
          </AiMessage>
        )
      }
      case 'missing': {
        const run = state.runs.find((r) => r.id === message.runId)
        if (!run?.result) return null
        return (
          <AiMessage>
            <MissingInfoCard
              items={run.result.missing_info}
              interactive={run.id === latestRun?.id && state.phase === 'done'}
              onRegenerate={(supplements) => generate(`补充了 ${supplements.length} 条信息，重新生成`, supplements)}
            />
          </AiMessage>
        )
      }
    }
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div ref={contentRef} className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-8 pb-10 sm:px-6">
        {state.phase === 'intro' && !state.autoplay && <IntroHero />}
        <AnimatePresence initial={false}>
          {visible.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {render(message)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

const INTRO_POINTS = [
  { icon: Wand2, text: '一句话描述岗位，AI 拆解并追问缺失项' },
  { icon: FileSearch, text: '查阅官网与公开信息，起草并审校' },
  { icon: ListChecks, text: '不编造，列出仍需你确认的信息' },
]

function IntroHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[52dvh] flex-col items-center justify-center text-center"
    >
      <AIOrb size={56} thinking />
      <h1 className="mt-7 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px]">这次要招什么样的人？</h1>
      <p className="mt-3 max-w-md text-[15px] leading-7 text-zinc-500">
        我是 JD Copilot。回答几个问题，我会查阅公开信息，为你起草一份不编造的招聘启事底稿。
      </p>
      <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-3">
        {INTRO_POINTS.map(({ icon: Icon, text }) => (
          <div key={text} className="rounded-xl border border-zinc-200/70 bg-white/70 p-3 text-left text-[13px] leading-5 text-zinc-600 shadow-soft backdrop-blur">
            <Icon className="mb-2 size-4 text-violet-500" />
            {text}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
