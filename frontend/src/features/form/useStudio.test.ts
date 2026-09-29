import { describe, expect, it } from 'vitest'
import { firstBlockedStep, guidedQuestions, stepIssues } from './fields'
import { initialState, reducer, type StudioState } from './useStudio'

type Action = Parameters<typeof reducer>[1]
const run = (actions: Action[], state: StudioState = initialState()) => actions.reduce(reducer, state)

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
    expect(issues.warnings).toEqual(['scene', 'location', 'hire_type'])
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
  it('识别结果写入岗位字段，并记录已识别项', () => {
    const state = run([
      { type: 'set_one_liner', text: 'AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招，需要能出差' },
      { type: 'apply_one_liner' },
    ])
    expect(state.brief.role).toMatchObject({
      title: 'AI 产品经理',
      scene: '金融场景下的大模型应用产品',
      location: '杭州',
      hire_type: '校招',
      cohort: '2026届',
      extra: '需要能出差',
    })
    expect(state.detected).toEqual(['title', 'scene', 'location', 'hire_type', 'cohort'])
  })

  it('句子未变化时不重复识别，修改后的字段保留', () => {
    let state = run([{ type: 'set_one_liner', text: '后端工程师，负责支付系统' }, { type: 'apply_one_liner' }])
    state = run([{ type: 'patch_role', patch: { location: '上海' } }, { type: 'apply_one_liner' }], state)
    expect(state.brief.role.location).toBe('上海')
  })

  it('再次识别会覆盖上一次写入的字段，职级保留', () => {
    const state = run([
      { type: 'set_one_liner', text: '后端工程师，base 上海，社招 3-5年' },
      { type: 'apply_one_liner' },
      { type: 'patch_role', patch: { level: '高级' } },
      { type: 'set_one_liner', text: '算法工程师，2027 届校招' },
      { type: 'apply_one_liner' },
    ])
    expect(state.brief.role).toMatchObject({ title: '算法工程师', location: '', hire_type: '校招', cohort: '2027届', experience: '', level: '高级' })
    expect(stepIssues(state.brief, 'role').warnings).toEqual(['scene', 'location'])
  })
})

describe('逐项引导', () => {
  it('届别 / 经验随招聘类型联动', () => {
    let state = run([{ type: 'set_mode', mode: 'guided' }, { type: 'patch_role', patch: { title: '产品经理' } }])
    expect(guidedQuestions(state.brief)).toEqual(['title', 'scene', 'location', 'hire_type', 'level'])
    state = run([{ type: 'patch_role', patch: { hire_type: '校招' } }, { type: 'patch_role', patch: { cohort: '2026届' } }], state)
    expect(guidedQuestions(state.brief)).toEqual(['title', 'scene', 'location', 'hire_type', 'cohort', 'level'])
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
