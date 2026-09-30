import { describe, expect, it } from 'vitest'
import { parseHiring } from '../../lib/parseHiring'
import { firstBlockedStep, guidedQuestions, stepIssues } from './fields'
import { initialState, reducer, type StudioState } from './useStudio'

type Action = Parameters<typeof reducer>[1]
const run = (actions: Action[], state: StudioState = initialState()) => actions.reduce(reducer, state)
// 模拟一次本地规则识别（LLM 不可用时的回退路径）
const recognize = (text: string): Action[] => [
  { type: 'set_one_liner', text },
  { type: 'parse_start', text },
  { type: 'parse_done', text, result: parseHiring(text), engine: 'rules' },
]

const COMPANY: Action[] = [
  { type: 'patch_company', patch: { name: '恒生电子' } },
  { type: 'patch_company', patch: { domain: 'https://www.hundsun.com/' } },
  { type: 'patch_company', patch: { description: '面向金融机构的软件与服务提供商。' } },
]

describe('步骤校验', () => {
  it('公司信息三项必填，官网需要合法', () => {
    expect(Object.keys(stepIssues(initialState().brief, 'company').errors)).toEqual(['name', 'domain', 'description'])
    const state = run([...COMPANY, { type: 'patch_company', patch: { domain: '恒生' } }])
    expect(stepIssues(state.brief, 'company').errors).toEqual({ domain: '看起来不是有效的网址' })
  })

  it('岗位只有名称必填，其余缺失给出提示', () => {
    const state = run([...COMPANY, { type: 'patch_role', patch: { title: '产品经理' } }])
    const issues = stepIssues(state.brief, 'role')
    expect(issues.errors).toEqual({})
    expect(issues.warnings).toEqual(['scene', 'locations', 'hire_type'])
  })

  it('前进不能越过还有错误的步骤', () => {
    let state = run([{ type: 'goto_step', step: 'confirm' }])
    expect(state.step).toBe('company')
    state = run([...COMPANY, { type: 'goto_step', step: 'confirm' }])
    expect(state.step).toBe('role')
    expect(firstBlockedStep(state.brief)).toBe('role')
  })
})

describe('一句话识别', () => {
  it('识别结果写入岗位字段，并记录已识别项与引擎', () => {
    const state = run(recognize('AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招，需要能出差'))
    expect(state.brief.role).toMatchObject({
      title: 'AI 产品经理',
      scene: '金融场景下的大模型应用产品',
      locations: ['杭州'],
      hire_type: '校招',
      cohort: '2026届',
      extra: '需要能出差',
    })
    expect(state.detected).toEqual(['title', 'scene', 'locations', 'hire_type', 'cohort'])
    expect(state).toMatchObject({ parseEngine: 'rules', parsingText: null })
  })

  it('LLM 结果附带岗位类别时直接设定技术栈标签组', () => {
    const text = '产品经理，上海/杭州'
    const state = run([
      { type: 'set_one_liner', text },
      { type: 'parse_start', text },
      { type: 'parse_done', text, engine: 'llm', result: { title: '产品经理', locations: ['上海', '杭州'], level: 'P6', category: 'product' } },
    ])
    expect(state.brief.role).toMatchObject({ locations: ['上海', '杭州'], level: 'P6' })
    expect(state.tech).toEqual({ group: 'product', forTitle: '产品经理', engine: 'llm', loading: false })
  })

  it('句子在识别期间被改动时丢弃过期结果', () => {
    const state = run([
      { type: 'parse_start', text: '旧句子' },
      { type: 'parse_start', text: '新句子' },
      { type: 'parse_done', text: '旧句子', engine: 'llm', result: { title: '旧岗位' } },
    ])
    expect(state.brief.role.title).toBe('')
    expect(state.parsingText).toBe('新句子')
  })

  it('再次识别会覆盖上一次写入的字段，职级保留', () => {
    const state = run([
      ...recognize('后端工程师，base 上海，社招 3-5年'),
      { type: 'patch_role', patch: { level: '高级' } },
      ...recognize('算法工程师，2027 届校招'),
    ])
    expect(state.brief.role).toMatchObject({ title: '算法工程师', locations: [], hire_type: '校招', cohort: '2027届', experience: '', level: '高级' })
    expect(stepIssues(state.brief, 'role').warnings).toEqual(['scene', 'locations'])
  })
})

describe('技术栈标签组', () => {
  it('岗位名称在判断期间变化时丢弃旧结果；手动选择会记录来源', () => {
    let state = run([{ type: 'patch_role', patch: { title: '产品经理' } }, { type: 'tech_start' }, { type: 'patch_role', patch: { title: '前端工程师' } }])
    state = run([{ type: 'tech_done', title: '产品经理', group: 'product', engine: 'llm' }], state)
    expect(state.tech).toMatchObject({ group: null, loading: false })
    state = run([{ type: 'tech_done', title: '前端工程师', group: 'frontend', engine: 'rules' }, { type: 'set_tech_group', group: 'mobile' }], state)
    expect(state.tech).toEqual({ group: 'mobile', forTitle: '前端工程师', engine: 'manual', loading: false })
  })
})

describe('逐项引导', () => {
  it('届别 / 经验随招聘类型联动', () => {
    let state = run([{ type: 'set_mode', mode: 'guided' }, { type: 'patch_role', patch: { title: '产品经理' } }])
    expect(guidedQuestions(state.brief)).toEqual(['title', 'scene', 'locations', 'hire_type', 'level'])
    state = run([{ type: 'patch_role', patch: { hire_type: '校招' } }, { type: 'patch_role', patch: { cohort: '2026届' } }], state)
    expect(guidedQuestions(state.brief)).toEqual(['title', 'scene', 'locations', 'hire_type', 'cohort', 'level'])
    state = run([{ type: 'patch_role', patch: { hire_type: '社招' } }], state)
    expect(state.brief.role.cohort).toBe('')
    expect(guidedQuestions(state.brief)).toContain('experience')
  })

  it('走完最后一项进入福利与技术栈；第一项之前回到公司信息', () => {
    let state = run([...COMPANY, { type: 'goto_step', step: 'role' }, { type: 'set_mode', mode: 'guided' }])
    state = run([{ type: 'guided_goto', index: -1 }], state)
    expect(state.step).toBe('company')
    state = run([{ type: 'goto_step', step: 'role' }, { type: 'patch_role', patch: { title: '数据分析师' } }, { type: 'guided_goto', index: 5 }], state)
    expect(state.step).toBe('extras')
  })

  it('从简报定位到逐项引导中的具体问题', () => {
    const state = run([
      ...COMPANY,
      { type: 'set_mode', mode: 'guided' },
      { type: 'patch_role', patch: { title: '产品经理', hire_type: '社招' } },
      { type: 'goto_step', step: 'confirm' },
      { type: 'edit_field', step: 'role', field: 'experience' },
    ])
    expect(state.step).toBe('role')
    expect(state.guidedIndex).toBe(4)
  })
})

describe('生成', () => {
  const ready = () => run([...COMPANY, { type: 'patch_role', patch: { title: '产品经理' } }, { type: 'goto_step', step: 'confirm' }])

  it('生成完成后返回修改，再次生成会替换结果', () => {
    let state = run([
      { type: 'run_start', runId: 'r1' },
      { type: 'run_event', runId: 'r1', event: { type: 'result', result: { jd_markdown: '# v1', missing_info: ['团队规模'], elapsed_s: 1 } } },
    ], ready())
    expect(state.view).toBe('result')
    expect(state.run?.result?.jd_markdown).toBe('# v1')
    state = run([{ type: 'back_to_form' }, { type: 'run_start', runId: 'r2' }], state)
    expect(state.run).toMatchObject({ id: 'r2', status: 'running' })
    expect(state.run?.result).toBeUndefined()
  })

  it('旧请求晚到的回调被忽略', () => {
    let state = run([{ type: 'run_start', runId: 'r1' }, { type: 'reset' }], ready())
    state = run([{ type: 'run_stopped', runId: 'r1' }, { type: 'run_failed', runId: 'r1', message: 'x' }], state)
    expect(state).toMatchObject({ run: null, view: 'form', step: 'company' })
  })

  it('连接中断记为可重试的错误', () => {
    const state = run([{ type: 'run_start', runId: 'r1' }, { type: 'run_failed', runId: 'r1', message: '连接意外中断，请重试' }], ready())
    expect(state.run?.error).toEqual({ message: '连接意外中断，请重试', retryable: true })
  })
})
