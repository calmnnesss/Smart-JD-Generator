import { describe, expect, it } from 'vitest'
import { initialState, reducer, type CopilotState } from './useCopilot'
import type { Answer, StepId } from './script'

function run(steps: [StepId, Answer][], state: CopilotState = reducer(initialState(), { type: 'start' })) {
  return steps.reduce((s, [stepId, value]) => {
    expect(s.current).toBe(stepId)
    return reducer(s, { type: 'answer', stepId, value })
  }, state)
}

const COMPANY: [StepId, Answer][] = [
  ['company_name', '恒生电子'],
  ['company_domain', 'https://www.hundsun.com/'],
  ['company_description', '面向金融机构的软件与服务提供商。'],
]

describe('对话流程', () => {
  it('快速路线：一句话信息完整时直接进入福利与技术栈', () => {
    const state = run([
      ...COMPANY,
      ['route', 'quick'],
      ['one_liner', 'AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招'],
      ['benefits', ['六险一金']],
      ['tech_stack', []],
    ])
    expect(state.phase).toBe('confirm')
    expect(state.brief.role).toMatchObject({ title: 'AI 产品经理', location: '杭州', hire_type: '校招', cohort: '2026届' })
    expect(state.messages.some((m) => m.kind === 'parsed')).toBe(true)
  })

  it('快速路线：只追问缺失的字段', () => {
    const state = run([
      ...COMPANY,
      ['route', 'quick'],
      ['one_liner', '后端工程师，负责支付系统'],
      ['location', '上海'],
      ['hire_type', '社招'],
      ['experience', '3-5年'],
      ['benefits', []],
      ['tech_stack', ['Java']],
    ])
    expect(state.phase).toBe('confirm')
    expect(state.brief.role).toMatchObject({ title: '后端工程师', scene: '支付系统', hire_type: '社招', experience: '3-5年' })
  })

  it('引导路线：逐项询问，含职级', () => {
    const state = run([
      ...COMPANY,
      ['route', 'guided'],
      ['role_title', '数据分析师'],
      ['scene', ''],
      ['location', '北京'],
      ['hire_type', '实习'],
      ['cohort', '2027届'],
      ['level', ''],
      ['benefits', []],
      ['tech_stack', []],
    ])
    expect(state.phase).toBe('confirm')
    expect(state.brief.role).toMatchObject({ title: '数据分析师', hire_type: '实习', cohort: '2027届', level: '' })
  })

  it('修改招聘类型后重新追问届别 / 经验', () => {
    let state = run([
      ...COMPANY,
      ['route', 'guided'],
      ['role_title', '产品经理'],
      ['scene', ''],
      ['location', '杭州'],
      ['hire_type', '校招'],
      ['cohort', '2026届'],
      ['level', ''],
      ['benefits', []],
      ['tech_stack', []],
    ])
    state = reducer(state, { type: 'edit', stepId: 'hire_type' })
    state = run([['hire_type', '社招'], ['experience', '1-3年']], state)
    expect(state.phase).toBe('confirm')
    expect(state.brief.role).toMatchObject({ hire_type: '社招', cohort: '', experience: '1-3年' })
  })

  it('补充信息会合并进简报并开始新版本', () => {
    let state = run([...COMPANY, ['route', 'quick'], ['one_liner', 'AI 产品经理，base 杭州，2026 届校招'], ['scene', ''], ['benefits', []], ['tech_stack', []]])
    state = reducer(state, { type: 'run_start', runId: 'r1', note: '生成 JD' })
    state = reducer(state, {
      type: 'run_event',
      runId: 'r1',
      event: { type: 'result', result: { jd_markdown: '# JD', missing_info: ['团队规模'], elapsed_s: 1 } },
    })
    expect(state.phase).toBe('done')
    state = reducer(state, { type: 'run_start', runId: 'r2', note: '补充', supplements: [{ item: '团队规模', answer: '15 人' }] })
    expect(state.brief.supplements).toEqual([{ item: '团队规模', answer: '15 人' }])
    expect(state.runs.map((r) => r.version)).toEqual([1, 2])
    expect(state.activeRunId).toBe('r2')
  })
})
