import { useCallback, useEffect, useReducer, useRef } from 'react'
import { classifyRole, parseRoleWithLlm, streamGenerate } from '../../lib/api'
import { parseHiring } from '../../lib/parseHiring'
import { SAMPLE } from '../../lib/sample'
import { normalizeUrl } from '../../lib/url'
import {
  emptyBrief,
  type BriefDraft,
  type Engine,
  type GenerateEvent,
  type RoleMode,
  type RoleParseResult,
  type Run,
  type StageStatus,
} from '../../types'
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
  /** 正在识别的句子；识别结果回来时只接受与之相同的句子 */
  parsingText: string | null
  /** 最近一次识别使用的引擎：LLM 或本地规则 */
  parseEngine: Engine | null
  /** 技术栈推荐使用的标签组 */
  tech: { group: string | null; forTitle: string; engine: Engine | 'manual' | null; loading: boolean }
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
  | { type: 'parse_start'; text: string }
  | { type: 'parse_done'; text: string; result: RoleParseResult; engine: Engine }
  | { type: 'tech_start' }
  | { type: 'tech_done'; title: string; group: string; engine: Engine }
  | { type: 'set_tech_group'; group: string }
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
const PARSED_KEYS: RoleKey[] = ['title', 'scene', 'locations', 'hire_type', 'cohort', 'experience', 'level']

export const initialState = (): StudioState => ({
  brief: emptyBrief(),
  roleMode: 'quick',
  oneLiner: '',
  appliedOneLiner: '',
  detected: [],
  parsingText: null,
  parseEngine: null,
  tech: { group: null, forTitle: '', engine: null, loading: false },
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

    case 'parse_start':
      return { ...state, parsingText: action.text }

    case 'parse_done': {
      if (action.text !== state.parsingText) return state
      const r = action.result
      // 识别结果覆盖上一次写入的岗位字段；句子里没提职级时保留原值
      const role: BriefDraft['role'] = {
        ...state.brief.role,
        title: r.title ?? '',
        scene: r.scene ?? '',
        locations: r.locations ?? [],
        hire_type: r.hire_type ?? '',
        cohort: r.cohort ?? '',
        experience: r.experience ?? '',
        level: r.level ?? state.brief.role.level,
        extra: r.extra ?? '',
      }
      const detected = PARSED_KEYS.filter((key) => (key === 'locations' ? r.locations?.length : r[key as keyof RoleParseResult]))
      const tech =
        r.category && role.title
          ? { group: r.category, forTitle: role.title.trim(), engine: action.engine, loading: false }
          : state.tech
      return {
        ...state,
        brief: { ...state.brief, role },
        appliedOneLiner: action.text,
        parsingText: null,
        parseEngine: action.engine,
        detected,
        tech,
        lastChanged: changed(PARSED_KEYS),
      }
    }

    case 'tech_start':
      return { ...state, tech: { ...state.tech, loading: true } }

    case 'tech_done':
      // 岗位名称在判断期间被修改过，丢弃旧结果，等待重新判断
      if (action.title !== state.brief.role.title.trim()) return { ...state, tech: { ...state.tech, loading: false } }
      return { ...state, tech: { group: action.group, forTitle: action.title, engine: action.engine, loading: false } }

    case 'set_tech_group':
      return { ...state, tech: { group: action.group, forTitle: state.brief.role.title.trim(), engine: 'manual', loading: false } }

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
  // 示例填充的批次号：重新开始或卸载时递增，让进行中的填充停下
  const fillToken = useRef(0)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(
    () => () => {
      fillToken.current++
      controller.current?.abort()
    },
    [],
  )

  const reset = useCallback(() => {
    fillToken.current++
    controller.current?.abort()
    dispatch({ type: 'reset' })
  }, [])

  /** 识别一句话：优先用中间层 LLM，不可用时回退到本地规则 */
  const applyOneLiner = useCallback((explicit?: string): Promise<void> => {
    const current = stateRef.current
    const text = (explicit ?? current.oneLiner).trim()
    if (!text || (explicit === undefined && (text === current.appliedOneLiner || text === current.parsingText))) {
      return Promise.resolve()
    }
    dispatch({ type: 'parse_start', text })
    return parseRoleWithLlm(text)
      .then((result) => dispatch({ type: 'parse_done', text, result, engine: 'llm' }))
      .catch(() => dispatch({ type: 'parse_done', text, result: parseHiring(text), engine: 'rules' }))
  }, [])

  /** 岗位名称变化后重新判断技术栈标签组；手动选择过的分组在岗位名称不变时保留 */
  const ensureTechGroup = useCallback(() => {
    const { brief, tech } = stateRef.current
    const title = brief.role.title.trim()
    if (!title || tech.forTitle === title || tech.loading) return
    dispatch({ type: 'tech_start' })
    classifyRole(title, brief.role.scene)
      .then((r) => dispatch({ type: 'tech_done', title, group: r.category, engine: r.engine }))
      .catch(() => dispatch({ type: 'tech_done', title, group: 'general', engine: 'rules' }))
  }, [])

  /** 逐项填入恒生电子样例（一句话识别走真实的识别流程），最后停在确认步 */
  const fillSample = useCallback(async () => {
    reset()
    const token = ++fillToken.current
    const pause = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))
    const run = async (action: Action, wait = 240) => {
      if (token !== fillToken.current) throw new Error('cancelled')
      dispatch(action)
      await pause(wait)
    }
    try {
      await run({ type: 'filling', on: true }, 0)
      await run({ type: 'patch_company', patch: { name: SAMPLE.companyName } })
      await run({ type: 'patch_company', patch: { domain: normalizeUrl(SAMPLE.domain) } })
      await run({ type: 'patch_company', patch: { description: SAMPLE.description } })
      await run({ type: 'goto_step', step: 'role' })
      await run({ type: 'set_mode', mode: 'quick' }, 0)
      await run({ type: 'set_one_liner', text: SAMPLE.oneLiner }, 300)
      await applyOneLiner(SAMPLE.oneLiner)
      await pause(600)
      await run({ type: 'goto_step', step: 'extras' })
      await run({ type: 'set_list', key: 'benefits', items: [...SAMPLE.benefits] })
      await run({ type: 'set_list', key: 'tech_stack', items: [...SAMPLE.techStack] }, 400)
      await run({ type: 'goto_step', step: 'confirm' }, 0)
      await run({ type: 'filling', on: false }, 0)
    } catch {
      /* 被「重新开始」打断 */
    }
  }, [reset, applyOneLiner])

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

  return { state, dispatch, reset, fillSample, applyOneLiner, ensureTechGroup, generate, stop }
}

export type Studio = ReturnType<typeof useStudio>
