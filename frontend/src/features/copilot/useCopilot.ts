import { useCallback, useEffect, useReducer, useRef } from 'react'
import { streamGenerate } from '../../lib/api'
import { parseHiring, type ParsedHiring } from '../../lib/parseHiring'
import { SAMPLE } from '../../lib/sample'
import {
  emptyBrief,
  type BriefDraft,
  type GenerateEvent,
  type JdResult,
  type Route,
  type StageInfo,
  type StageStatus,
  type Supplement,
} from '../../types'
import { nextStep, STEP_BY_ID, type Answer, type StepId } from './script'

export type Message =
  | { id: string; role: 'ai'; kind: 'text'; text: string; hint?: string; label?: string }
  | { id: string; role: 'user'; kind: 'answer'; text: string; stepId?: StepId }
  | { id: string; role: 'ai'; kind: 'parsed'; parsed: ParsedHiring }
  | { id: string; role: 'ai'; kind: 'confirm' }
  | { id: string; role: 'ai'; kind: 'run'; runId: string }
  | { id: string; role: 'ai'; kind: 'missing'; runId: string }

export interface Run {
  id: string
  version: number
  status: 'running' | 'done' | 'error' | 'stopped'
  stages: StageInfo[]
  stageState: Record<string, { status: StageStatus; elapsedMs?: number }>
  delta: string
  result?: JdResult
  error?: { message: string; retryable: boolean }
  startedAt: number
  finishedAt?: number
}

export type Phase = 'intro' | 'collecting' | 'confirm' | 'generating' | 'done'

export interface CopilotState {
  brief: BriefDraft
  route: Route | null
  answered: StepId[]
  current: StepId | null
  phase: Phase
  messages: Message[]
  runs: Run[]
  activeRunId: string | null
  lastChanged: { step: StepId; at: number } | null
  autoplay: boolean
}

type Action =
  | { type: 'start' }
  | { type: 'answer'; stepId: StepId; value: Answer }
  | { type: 'edit'; stepId: StepId }
  | { type: 'run_start'; runId: string; note: string; supplements?: Supplement[] }
  | { type: 'run_event'; runId: string; event: GenerateEvent }
  | { type: 'run_failed'; runId: string; message: string }
  | { type: 'run_stopped'; runId: string }
  | { type: 'select_run'; runId: string }
  | { type: 'autoplay'; on: boolean }
  | { type: 'reset' }

// 快速路线里由「一句话」拆出来的字段；重新输入一句话时需要重新判断是否追问
const ROLE_STEPS: StepId[] = ['role_title', 'scene', 'location', 'hire_type', 'cohort', 'experience']

let counter = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`

const GREETING: Message = {
  id: 'greeting',
  role: 'ai',
  kind: 'text',
  text: '你好，我是 JD Copilot。告诉我公司和岗位的情况，我会查阅官网与公开信息，起草一份招聘启事底稿。',
  hint: '我只使用你提供的信息和检索到的公开信息，不编造业务、团队规模或福利承诺。',
}

export const initialState = (): CopilotState => ({
  brief: emptyBrief(),
  route: null,
  answered: [],
  current: null,
  phase: 'intro',
  messages: [GREETING],
  runs: [],
  activeRunId: null,
  lastChanged: null,
  autoplay: false,
})

function askMessage(state: CopilotState, stepId: StepId, label?: string): Message {
  const step = STEP_BY_ID[stepId]
  return { id: uid('ask'), role: 'ai', kind: 'text', text: step.ask(state.brief), hint: step.hint?.(state.brief), label }
}

/** 进入下一个待回答的步骤；全部回答完则进入确认环节 */
function advance(state: CopilotState): CopilotState {
  const next = nextStep(state.brief, state.route, state.answered)
  if (next) {
    return { ...state, phase: 'collecting', current: next, messages: [...state.messages, askMessage(state, next)] }
  }
  return {
    ...state,
    phase: 'confirm',
    current: null,
    messages: [...state.messages, { id: uid('confirm'), role: 'ai', kind: 'confirm' }],
  }
}

export function mergeSupplements(brief: BriefDraft, supplements: Supplement[]): BriefDraft {
  const merged = [...brief.supplements]
  for (const s of supplements) {
    const index = merged.findIndex((m) => m.item === s.item)
    if (index >= 0) merged[index] = s
    else merged.push(s)
  }
  return { ...brief, supplements: merged }
}

function updateRun(state: CopilotState, runId: string, patch: (run: Run) => Run): CopilotState {
  return { ...state, runs: state.runs.map((r) => (r.id === runId ? patch(r) : r)) }
}

function applyEvent(state: CopilotState, runId: string, event: GenerateEvent): CopilotState {
  switch (event.type) {
    case 'stages':
      return updateRun(state, runId, (r) => ({
        ...r,
        stages: event.stages,
        stageState: Object.fromEntries(event.stages.map((s) => [s.id, { status: 'pending' as StageStatus }])),
      }))
    case 'stage':
      return updateRun(state, runId, (r) => ({
        ...r,
        stageState: { ...r.stageState, [event.id]: { status: event.status, elapsedMs: event.elapsed_ms } },
      }))
    case 'delta':
      return updateRun(state, runId, (r) => ({ ...r, delta: r.delta + event.text }))
    case 'result': {
      const next = updateRun(state, runId, (r) => ({ ...r, status: 'done', result: event.result, finishedAt: Date.now() }))
      return {
        ...next,
        phase: 'done',
        messages: [...next.messages, { id: uid('missing'), role: 'ai', kind: 'missing', runId }],
      }
    }
    case 'error': {
      const next = updateRun(state, runId, (r) => ({
        ...r,
        status: 'error',
        error: { message: event.message, retryable: event.retryable },
        finishedAt: Date.now(),
      }))
      return { ...next, phase: 'done' }
    }
  }
}

export function reducer(state: CopilotState, action: Action): CopilotState {
  // 「重新开始」后，已中止请求的回调可能晚到，直接忽略
  if (
    (action.type === 'run_event' || action.type === 'run_failed' || action.type === 'run_stopped') &&
    !state.runs.some((r) => r.id === action.runId)
  ) {
    return state
  }
  switch (action.type) {
    case 'start':
      return advance({ ...state, phase: 'collecting' })

    case 'answer': {
      const step = STEP_BY_ID[action.stepId]
      let answered = [...state.answered.filter((id) => id !== action.stepId), action.stepId]
      if (action.stepId === 'one_liner') answered = answered.filter((id) => !ROLE_STEPS.includes(id))
      if (action.stepId === 'hire_type') answered = answered.filter((id) => id !== 'cohort' && id !== 'experience')

      const brief = step.apply(state.brief, action.value)
      const route = action.stepId === 'route' ? (action.value as Route) : state.route
      const messages: Message[] = [
        ...state.messages,
        { id: uid('answer'), role: 'user', kind: 'answer', text: step.summarize(action.value), stepId: action.stepId },
      ]
      if (action.stepId === 'one_liner') {
        messages.push({ id: uid('parsed'), role: 'ai', kind: 'parsed', parsed: parseHiring(String(action.value)) })
      }
      return advance({
        ...state,
        brief,
        route,
        answered,
        messages,
        lastChanged: { step: action.stepId, at: Date.now() },
      })
    }

    case 'edit': {
      if (state.phase === 'generating' || state.phase === 'intro' || state.autoplay) return state
      const step = STEP_BY_ID[action.stepId]
      return {
        ...state,
        phase: 'collecting',
        current: action.stepId,
        messages: [...state.messages, askMessage(state, action.stepId, `修改 · ${step.field}`)],
      }
    }

    case 'run_start': {
      const brief = action.supplements ? mergeSupplements(state.brief, action.supplements) : state.brief
      const run: Run = {
        id: action.runId,
        version: state.runs.length + 1,
        status: 'running',
        stages: [],
        stageState: {},
        delta: '',
        startedAt: Date.now(),
      }
      return {
        ...state,
        brief,
        phase: 'generating',
        current: null,
        runs: [...state.runs, run],
        activeRunId: run.id,
        messages: [
          ...state.messages,
          { id: uid('answer'), role: 'user', kind: 'answer', text: action.note },
          { id: uid('run'), role: 'ai', kind: 'run', runId: run.id },
        ],
      }
    }

    case 'run_event':
      return applyEvent(state, action.runId, action.event)

    case 'run_failed':
      return {
        ...updateRun(state, action.runId, (r) =>
          r.status === 'running'
            ? { ...r, status: 'error', error: { message: action.message, retryable: true }, finishedAt: Date.now() }
            : r,
        ),
        phase: 'done',
      }

    case 'run_stopped':
      return {
        ...updateRun(state, action.runId, (r) => ({ ...r, status: 'stopped', finishedAt: Date.now() })),
        phase: 'done',
      }

    case 'select_run':
      return { ...state, activeRunId: action.runId }

    case 'autoplay':
      return { ...state, autoplay: action.on }

    case 'reset':
      return initialState()
  }
}

const SAMPLE_SCRIPT: [StepId, Answer][] = [
  ['company_name', SAMPLE.companyName],
  ['company_domain', SAMPLE.domain],
  ['company_description', SAMPLE.description],
  ['route', 'quick'],
  ['one_liner', SAMPLE.oneLiner],
  ['benefits', [...SAMPLE.benefits]],
  ['tech_stack', [...SAMPLE.techStack]],
]

export function useCopilot() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const stateRef = useRef(state)
  const controllers = useRef(new Map<string, AbortController>())
  const timers = useRef<number[]>([])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(() => {
    const running = controllers.current
    return () => {
      clearTimers()
      running.forEach((c) => c.abort())
    }
  }, [clearTimers])

  const start = useCallback(() => dispatch({ type: 'start' }), [])
  const answer = useCallback((stepId: StepId, value: Answer) => dispatch({ type: 'answer', stepId, value }), [])
  const edit = useCallback((stepId: StepId) => dispatch({ type: 'edit', stepId }), [])
  const selectRun = useCallback((runId: string) => dispatch({ type: 'select_run', runId }), [])

  const reset = useCallback(() => {
    clearTimers()
    controllers.current.forEach((c) => c.abort())
    dispatch({ type: 'reset' })
  }, [clearTimers])

  /** 用恒生电子样例自动走完一遍对话，方便快速体验 */
  const playSample = useCallback(() => {
    reset()
    dispatch({ type: 'autoplay', on: true })
    dispatch({ type: 'start' })
    SAMPLE_SCRIPT.forEach(([stepId, value], index) => {
      timers.current.push(window.setTimeout(() => dispatch({ type: 'answer', stepId, value }), 900 + index * 750))
    })
    timers.current.push(
      window.setTimeout(() => dispatch({ type: 'autoplay', on: false }), 900 + SAMPLE_SCRIPT.length * 750),
    )
  }, [reset])

  const generate = useCallback((note = '生成 JD', supplements?: Supplement[]) => {
    const current = stateRef.current
    if (current.phase === 'generating') return
    const runId = uid('run')
    const brief = supplements ? mergeSupplements(current.brief, supplements) : current.brief
    dispatch({ type: 'run_start', runId, note, supplements })

    const controller = new AbortController()
    controllers.current.set(runId, controller)
    let settled = false
    streamGenerate(
      brief,
      current.route,
      (event) => {
        if (event.type === 'result' || event.type === 'error') settled = true
        dispatch({ type: 'run_event', runId, event })
      },
      controller.signal,
    )
      .then(() => {
        if (!settled) dispatch({ type: 'run_failed', runId, message: '连接意外中断，请重试' })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          dispatch({ type: 'run_stopped', runId })
          return
        }
        const message =
          error instanceof TypeError
            ? '无法连接到服务，请确认后端已启动'
            : error instanceof Error
              ? error.message
              : '生成失败，请重试'
        dispatch({ type: 'run_failed', runId, message })
      })
      .finally(() => controllers.current.delete(runId))
  }, [])

  const stop = useCallback((runId: string) => controllers.current.get(runId)?.abort(), [])

  return { state, start, answer, edit, reset, playSample, generate, stop, selectRun }
}

export type Copilot = ReturnType<typeof useCopilot>
