import { useCallback, useEffect, useReducer, useRef } from 'react'
import { streamGenerate } from '../../lib/api'
import { parseHiring, type ParsedHiring } from '../../lib/parseHiring'
import { SAMPLE } from '../../lib/sample'
import { normalizeUrl } from '../../lib/url'
import { emptyBrief, type BriefDraft, type GenerateEvent, type RoleMode, type Run, type StageStatus } from '../../types'
import { firstBlockedStep, guidedQuestions, STEPS, type FieldKey, type RoleKey, type StepKey } from './fields'

export interface StudioState {
  brief: BriefDraft
  roleMode: RoleMode
  /** 一句话识别的输入框内容 */
  oneLiner: string
  /** 最近一次识别所用的句子 */
  appliedOneLiner: string
  /** 最近一次识别出值的字段 */
  detected: RoleKey[]
  step: StepKey
  guidedIndex: number
  view: 'form' | 'result'
  run: Run | null
  /** 最近一次变更的字段，用于简报高亮 */
  lastChanged: { fields: FieldKey[]; at: number } | null
  /** 正在自动填入示例 */
  filling: boolean
}

type Action =
  | { type: 'patch_company'; patch: Partial<BriefDraft['company']> }
  | { type: 'patch_role'; patch: Partial<BriefDraft['role']> }
  | { type: 'set_one_liner'; text: string }
  | { type: 'apply_one_liner' }
  | { type: 'set_mode'; mode: RoleMode }
  | { type: 'set_list'; key: 'benefits' | 'tech_stack'; items: string[] }
  | { type: 'goto_step'; step: StepKey }
  | { type: 'guided_goto'; index: number }
  | { type: 'edit_field'; step: StepKey; field?: FieldKey }
  | { type: 'filling'; on: boolean }
  | { type: 'run_start'; runId: string }
  | { type: 'run_event'; runId: string; event: GenerateEvent }
  | { type: 'run_failed'; runId: string; message: string }
  | { type: 'run_stopped'; runId: string }
  | { type: 'show_result' }
  | { type: 'back_to_form' }
  | { type: 'reset' }

// 一句话识别能写入的岗位字段（其他要求单独展示，不算「已识别」）
const PARSED_KEYS: (RoleKey & keyof ParsedHiring)[] = ['title', 'scene', 'location', 'hire_type', 'cohort', 'experience']

export const initialState = (): StudioState => ({
  brief: emptyBrief(),
  roleMode: 'quick',
  oneLiner: '',
  appliedOneLiner: '',
  detected: [],
  step: 'company',
  guidedIndex: 0,
  view: 'form',
  run: null,
  lastChanged: null,
  filling: false,
})

const changed = (fields: FieldKey[]) => ({ fields, at: Date.now() })

/** 修改招聘类型时清掉不再适用的条件（社招没有届别，校招 / 实习没有经验年限） */
function patchRole(role: BriefDraft['role'], patch: Partial<BriefDraft['role']>): BriefDraft['role'] {
  const next = { ...role, ...patch }
  if (patch.hire_type !== undefined && patch.hire_type !== role.hire_type) {
    if (next.hire_type === '社招') next.cohort = ''
    else next.experience = ''
  }
  return next
}

function stepIndex(step: StepKey) {
  return STEPS.findIndex((s) => s.key === step)
}

/** 前进时不能越过还有错误的步骤 */
function clampStep(brief: BriefDraft, target: StepKey): StepKey {
  const blocked = firstBlockedStep(brief)
  return stepIndex(target) > stepIndex(blocked) ? blocked : target
}

function applyEvent(run: Run, event: GenerateEvent): Run {
  switch (event.type) {
    case 'stages':
      return {
        ...run,
        stages: event.stages,
        stageState: Object.fromEntries(event.stages.map((s) => [s.id, { status: 'pending' as StageStatus }])),
      }
    case 'stage':
      return { ...run, stageState: { ...run.stageState, [event.id]: { status: event.status, elapsedMs: event.elapsed_ms } } }
    case 'delta':
      return { ...run, delta: run.delta + event.text }
    case 'result':
      return { ...run, status: 'done', result: event.result, finishedAt: Date.now() }
    case 'error':
      return { ...run, status: 'error', error: { message: event.message, retryable: event.retryable }, finishedAt: Date.now() }
  }
}

export function reducer(state: StudioState, action: Action): StudioState {
  // 「新的招聘」或重新生成后，旧请求的回调可能晚到，直接忽略
  if (
    (action.type === 'run_event' || action.type === 'run_failed' || action.type === 'run_stopped') &&
    state.run?.id !== action.runId
  ) {
    return state
  }

  switch (action.type) {
    case 'patch_company': {
      const fields = Object.keys(action.patch) as FieldKey[]
      return { ...state, brief: { ...state.brief, company: { ...state.brief.company, ...action.patch } }, lastChanged: changed(fields) }
    }

    case 'patch_role': {
      const fields = Object.keys(action.patch) as FieldKey[]
      return { ...state, brief: { ...state.brief, role: patchRole(state.brief.role, action.patch) }, lastChanged: changed(fields) }
    }

    case 'set_one_liner':
      return { ...state, oneLiner: action.text }

    case 'apply_one_liner': {
      const text = state.oneLiner.trim()
      if (!text || text === state.appliedOneLiner) return state
      const parsed = parseHiring(text)
      // 识别结果覆盖上一次写入的岗位字段；职级不在一句话的识别范围内，保留
      const role: BriefDraft['role'] = {
        ...state.brief.role,
        title: parsed.title ?? '',
        scene: parsed.scene ?? '',
        location: parsed.location ?? '',
        hire_type: parsed.hire_type ?? '',
        cohort: parsed.cohort ?? '',
        experience: parsed.experience ?? '',
        extra: parsed.extra ?? '',
      }
      return {
        ...state,
        brief: { ...state.brief, role },
        appliedOneLiner: text,
        detected: PARSED_KEYS.filter((key) => parsed[key]),
        lastChanged: changed(PARSED_KEYS),
      }
    }

    case 'set_mode':
      return { ...state, roleMode: action.mode, guidedIndex: 0 }

    case 'set_list':
      return { ...state, brief: { ...state.brief, [action.key]: action.items }, lastChanged: changed([action.key]) }

    case 'goto_step':
      return { ...state, view: 'form', step: clampStep(state.brief, action.step) }

    case 'guided_goto': {
      const questions = guidedQuestions(state.brief)
      if (action.index < 0) return { ...state, step: 'company' }
      if (action.index >= questions.length) return { ...state, step: clampStep(state.brief, 'extras') }
      return { ...state, guidedIndex: action.index }
    }

    case 'edit_field': {
      const next: StudioState = { ...state, view: 'form', step: clampStep(state.brief, action.step) }
      if (next.step === 'role' && state.roleMode === 'guided' && action.field) {
        const index = guidedQuestions(state.brief).indexOf(action.field as RoleKey)
        if (index >= 0) next.guidedIndex = index
      }
      return next
    }

    case 'filling':
      return { ...state, filling: action.on }

    case 'run_start':
      return {
        ...state,
        view: 'result',
        run: { id: action.runId, status: 'running', stages: [], stageState: {}, delta: '', startedAt: Date.now() },
      }

    case 'run_event':
      return { ...state, run: applyEvent(state.run!, action.event) }

    case 'run_failed':
      return state.run!.status === 'running'
        ? {
            ...state,
            run: { ...state.run!, status: 'error', error: { message: action.message, retryable: true }, finishedAt: Date.now() },
          }
        : state

    case 'run_stopped':
      return { ...state, run: { ...state.run!, status: 'stopped', finishedAt: Date.now() } }

    case 'show_result':
      return state.run ? { ...state, view: 'result' } : state

    case 'back_to_form':
      return { ...state, view: 'form', step: 'confirm' }

    case 'reset':
      return initialState()
  }
}

let counter = 0
const uid = () => `run-${Date.now().toString(36)}-${(counter++).toString(36)}`

export function useStudio() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const stateRef = useRef(state)
  const controller = useRef<AbortController | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(
    () => () => {
      clearTimers()
      controller.current?.abort()
    },
    [clearTimers],
  )

  const reset = useCallback(() => {
    clearTimers()
    controller.current?.abort()
    dispatch({ type: 'reset' })
  }, [clearTimers])

  /** 逐项填入恒生电子样例，最后停在确认步 */
  const fillSample = useCallback(() => {
    reset()
    const steps: Action[] = [
      { type: 'filling', on: true },
      { type: 'patch_company', patch: { name: SAMPLE.companyName } },
      { type: 'patch_company', patch: { domain: normalizeUrl(SAMPLE.domain) } },
      { type: 'patch_company', patch: { description: SAMPLE.description } },
      { type: 'goto_step', step: 'role' },
      { type: 'set_one_liner', text: SAMPLE.oneLiner },
      { type: 'apply_one_liner' },
      { type: 'goto_step', step: 'extras' },
      { type: 'set_list', key: 'benefits', items: [...SAMPLE.benefits] },
      { type: 'set_list', key: 'tech_stack', items: [...SAMPLE.techStack] },
      { type: 'goto_step', step: 'confirm' },
      { type: 'filling', on: false },
    ]
    steps.forEach((action, index) => {
      timers.current.push(window.setTimeout(() => dispatch(action), index * 260))
    })
  }, [reset])

  const generate = useCallback(() => {
    const current = stateRef.current
    if (current.run?.status === 'running') return
    controller.current?.abort()
    const runId = uid()
    dispatch({ type: 'run_start', runId })

    const abort = new AbortController()
    controller.current = abort
    let settled = false
    streamGenerate(
      current.brief,
      current.roleMode,
      (event) => {
        if (event.type === 'result' || event.type === 'error') settled = true
        dispatch({ type: 'run_event', runId, event })
      },
      abort.signal,
    )
      .then(() => {
        if (!settled) dispatch({ type: 'run_failed', runId, message: '连接意外中断，请重试' })
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) {
          dispatch({ type: 'run_stopped', runId })
          return
        }
        const message =
          error instanceof TypeError ? '无法连接到服务，请确认后端已启动' : error instanceof Error ? error.message : '生成失败，请重试'
        dispatch({ type: 'run_failed', runId, message })
      })
  }, [])

  const stop = useCallback(() => controller.current?.abort(), [])

  return { state, dispatch, reset, fillSample, generate, stop }
}

export type Studio = ReturnType<typeof useStudio>
