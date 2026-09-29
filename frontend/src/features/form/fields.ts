import { validateUrl } from '../../lib/url'
import type { BriefDraft } from '../../types'

export type StepKey = 'company' | 'role' | 'extras' | 'confirm'

export const STEPS: { key: StepKey; label: string }[] = [
  { key: 'company', label: '公司信息' },
  { key: 'role', label: '岗位需求' },
  { key: 'extras', label: '福利与技术栈' },
  { key: 'confirm', label: '确认生成' },
]

/** 岗位需求里可以单独填写的字段 */
export type RoleKey = 'title' | 'scene' | 'location' | 'hire_type' | 'cohort' | 'experience' | 'level' | 'extra'

/** 简报里可以定位、高亮的字段 */
export type FieldKey = 'name' | 'domain' | 'description' | RoleKey | 'benefits' | 'tech_stack'

export interface RoleFieldDef {
  label: string
  /** 逐项引导时的问题 */
  question: (brief: BriefDraft) => string
  hint?: string
  optional?: boolean
}

export const ROLE_FIELDS: Record<RoleKey, RoleFieldDef> = {
  title: { label: '岗位名称', question: () => '要招聘的岗位名称是？', hint: '可以直接输入，或从常用岗位中选择' },
  scene: {
    label: '业务场景',
    question: () => '这个岗位主要负责什么业务场景？',
    hint: '会成为岗位职责的主线，例如「金融场景下的大模型应用产品」',
    optional: true,
  },
  location: { label: '工作地点', question: () => '工作地点在哪里？' },
  hire_type: { label: '招聘类型', question: () => '这是校招、社招还是实习岗位？' },
  cohort: {
    label: '届别',
    question: (b) => (b.role.hire_type === '实习' ? '面向哪一届的在校生？' : '面向哪一届的毕业生？'),
    hint: '明确写出的届别会原样保留在 JD 中',
  },
  experience: { label: '经验要求', question: () => '对工作经验有什么要求？', hint: '明确写出的年限会原样保留在 JD 中' },
  level: { label: '职级', question: () => '有明确的职级吗？', hint: '没有可以跳过', optional: true },
  extra: { label: '其他要求', question: () => '还有其他要求吗？', optional: true },
}

/** 逐项引导的问题顺序：届别 / 经验随招聘类型联动 */
export function guidedQuestions(brief: BriefDraft): RoleKey[] {
  const keys: RoleKey[] = ['title', 'scene', 'location', 'hire_type']
  if (brief.role.hire_type === '社招') keys.push('experience')
  else if (brief.role.hire_type) keys.push('cohort')
  keys.push('level')
  return keys
}

/** 一句话识别模式下展示的字段 */
export function quickFields(brief: BriefDraft): RoleKey[] {
  const keys: RoleKey[] = ['title', 'scene', 'location', 'hire_type']
  if (brief.role.hire_type === '社招') keys.push('experience')
  else if (brief.role.hire_type) keys.push('cohort')
  keys.push('level', 'extra')
  return keys
}

export interface StepIssues {
  /** 阻止进入下一步的问题 */
  errors: Partial<Record<FieldKey, string>>
  /** 不阻断，只提示缺失的建议项 */
  warnings: FieldKey[]
}

export function stepIssues(brief: BriefDraft, step: StepKey): StepIssues {
  const errors: StepIssues['errors'] = {}
  const warnings: FieldKey[] = []
  const { company, role } = brief
  if (step === 'company') {
    if (!company.name.trim()) errors.name = '请填写公司名称'
    const urlProblem = validateUrl(company.domain)
    if (urlProblem) errors.domain = urlProblem
    if (!company.description.trim()) errors.description = '请填写公司介绍'
  }
  if (step === 'role') {
    if (!role.title.trim()) errors.title = '请填写岗位名称'
    if (!role.scene.trim()) warnings.push('scene')
    if (!role.location.trim()) warnings.push('location')
    if (!role.hire_type) warnings.push('hire_type')
    else if (role.hire_type === '社招' && !role.experience) warnings.push('experience')
    else if (role.hire_type !== '社招' && !role.cohort) warnings.push('cohort')
  }
  return { errors, warnings }
}

export const hasErrors = (issues: StepIssues) => Object.keys(issues.errors).length > 0

/** 第一个还有错误的步骤；全部通过时返回 confirm */
export function firstBlockedStep(brief: BriefDraft): StepKey {
  for (const { key } of STEPS) {
    if (key !== 'confirm' && hasErrors(stepIssues(brief, key))) return key
  }
  return 'confirm'
}
