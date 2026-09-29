import { HOT_CITIES, MORE_CITIES, parseHiring } from '../../lib/parseHiring'
import type { BriefDraft, HireType, Route } from '../../types'
import {
  BENEFIT_OPTIONS,
  cohortOptions,
  EXPERIENCE_OPTIONS,
  HIRE_TYPES,
  LEVEL_OPTIONS,
  ROLE_SUGGESTIONS,
  SCENE_EXAMPLES,
  techSuggestions,
} from './options'

export type StepId =
  | 'company_name'
  | 'company_domain'
  | 'company_description'
  | 'route'
  | 'one_liner'
  | 'role_title'
  | 'scene'
  | 'location'
  | 'hire_type'
  | 'cohort'
  | 'experience'
  | 'level'
  | 'benefits'
  | 'tech_stack'

export type Answer = string | string[]

export interface ChoiceOption {
  value: string
  label: string
  description?: string
}

export type InputSpec =
  | { kind: 'text'; placeholder: string; suggestions?: string[]; examples?: string[]; optional?: boolean; maxLength?: number }
  | { kind: 'url'; placeholder: string }
  | { kind: 'textarea'; placeholder: string; tips: string[] }
  | { kind: 'oneliner'; placeholder: string; examples: string[] }
  | { kind: 'cards'; options: ChoiceOption[] }
  | { kind: 'chips'; options: string[]; more?: string[]; customPlaceholder?: string; optional?: boolean }
  | { kind: 'select'; options: string[]; placeholder: string }
  | { kind: 'segmented'; options: string[] }
  | { kind: 'multi'; options: string[]; customPlaceholder: string }

export interface Step {
  id: StepId
  /** 在简报与「修改」菜单里显示的字段名 */
  field: string
  ask: (brief: BriefDraft) => string
  hint?: (brief: BriefDraft) => string | undefined
  input: (brief: BriefDraft) => InputSpec
  /** 当前路线下是否需要问这一步（快速路线只追问缺失的字段） */
  shouldAsk: (brief: BriefDraft, route: Route | null) => boolean
  /** 读取当前值，用于修改时回填 */
  read: (brief: BriefDraft, route: Route | null) => Answer
  apply: (brief: BriefDraft, value: Answer) => BriefDraft
  /** 用户气泡里的文字 */
  summarize: (value: Answer) => string
  optional?: boolean
}

const str = (value: Answer) => (Array.isArray(value) ? value.join('、') : value).trim()
const list = (value: Answer) => (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean)
const role = (brief: BriefDraft, patch: Partial<BriefDraft['role']>): BriefDraft => ({
  ...brief,
  role: { ...brief.role, ...patch },
})
const company = (brief: BriefDraft, patch: Partial<BriefDraft['company']>): BriefDraft => ({
  ...brief,
  company: { ...brief.company, ...patch },
})
const guidedOrMissing = (route: Route | null, value: string) => route === 'guided' || (route === 'quick' && !value)
const needsCohort = (brief: BriefDraft) => brief.role.hire_type === '校招' || brief.role.hire_type === '实习'
const companyName = (brief: BriefDraft) => brief.company.name || '这家公司'

export const STEPS: Step[] = [
  {
    id: 'company_name',
    field: '公司名称',
    ask: () => '先从公司开始：这次为哪家公司招人？',
    hint: () => '填写工商注册名或通用简称，我会用它检索公开信息。',
    input: () => ({ kind: 'text', placeholder: '例如：恒生电子' }),
    shouldAsk: () => true,
    read: (b) => b.company.name,
    apply: (b, v) => company(b, { name: str(v) }),
    summarize: str,
  },
  {
    id: 'company_domain',
    field: '官网',
    ask: (b) => `${companyName(b)}的官网地址是？`,
    hint: () => '我会读取官网正文作为背景信息来源。',
    input: () => ({ kind: 'url', placeholder: '例如：www.hundsun.com' }),
    shouldAsk: () => true,
    read: (b) => b.company.domain,
    apply: (b, v) => company(b, { domain: normalizeUrl(str(v)) }),
    summarize: str,
  },
  {
    id: 'company_description',
    field: '公司介绍',
    ask: (b) => `用一两段话介绍一下${companyName(b)}吧。`,
    hint: () => '这是可信度最高的信息来源，只写确定属实的内容，这里的错误会被带进最终 JD。',
    input: () => ({
      kind: 'textarea',
      placeholder: '主营业务、主要客户、成立时间与总部、近期方向、团队特点……',
      tips: ['主营业务', '主要客户', '成立时间与总部', '近期投入方向', '团队协作特点'],
    }),
    shouldAsk: () => true,
    read: (b) => b.company.description,
    apply: (b, v) => company(b, { description: str(v) }),
    summarize: str,
  },
  {
    id: 'route',
    field: '岗位描述方式',
    ask: () => '公司信息收到了。接下来描述岗位，你更喜欢哪种方式？',
    input: () => ({
      kind: 'cards',
      options: [
        { value: 'quick', label: '一句话描述，AI 帮你拆', description: '说一句话，我来识别岗位、地点、届别，缺什么再追问' },
        { value: 'guided', label: '一步步引导填写', description: '逐项选择岗位名称、场景、地点、类型与届别' },
      ],
    }),
    shouldAsk: () => true,
    read: (_, route) => route ?? '',
    apply: (b) => b,
    summarize: (v) => (v === 'guided' ? '一步步引导填写' : '一句话描述，AI 帮你拆'),
  },
  {
    id: 'one_liner',
    field: '一句话需求',
    ask: () => '用一句话描述要招的岗位，我来帮你拆解。',
    hint: () => '建议包含：岗位名称、业务场景、工作地点、届别或经验要求。',
    input: () => ({
      kind: 'oneliner',
      placeholder: '例如：AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招',
      examples: ['后端工程师，负责支付系统，base 上海，社招 3-5 年', '2027 届数据分析实习，负责增长分析，北京'],
    }),
    shouldAsk: (_, route) => route === 'quick',
    read: (b) => composeOneLiner(b),
    apply: (b, v) => {
      const parsed = parseHiring(str(v))
      return role(b, {
        title: parsed.title ?? '',
        scene: parsed.scene ?? '',
        location: parsed.location ?? '',
        hire_type: parsed.hire_type ?? '',
        cohort: parsed.cohort ?? '',
        experience: parsed.experience ?? '',
        extra: parsed.extra ?? '',
      })
    },
    summarize: str,
  },
  {
    id: 'role_title',
    field: '岗位名称',
    ask: (b) => (b.role.extra && !b.role.title ? '我没能识别出岗位名称，具体是什么岗位？' : '要招聘的岗位名称是？'),
    input: () => ({ kind: 'text', placeholder: '输入或从建议中选择', suggestions: ROLE_SUGGESTIONS }),
    shouldAsk: (b, route) => guidedOrMissing(route, b.role.title),
    read: (b) => b.role.title,
    apply: (b, v) => role(b, { title: str(v) }),
    summarize: str,
  },
  {
    id: 'scene',
    field: '业务场景',
    ask: () => '这个岗位主要负责什么业务场景？',
    hint: () => '会成为岗位职责的主线，可以跳过。',
    input: () => ({ kind: 'text', placeholder: '例如：金融场景下的大模型应用产品', examples: SCENE_EXAMPLES, optional: true, maxLength: 200 }),
    shouldAsk: (b, route) => guidedOrMissing(route, b.role.scene),
    read: (b) => b.role.scene,
    apply: (b, v) => role(b, { scene: str(v).replace(/^负责/, '') }),
    summarize: (v) => str(v) || '跳过',
    optional: true,
  },
  {
    id: 'location',
    field: '工作地点',
    ask: () => '工作地点在哪里？',
    input: () => ({ kind: 'chips', options: [...HOT_CITIES, '远程'], more: MORE_CITIES, customPlaceholder: '其他城市' }),
    shouldAsk: (b, route) => guidedOrMissing(route, b.role.location),
    read: (b) => b.role.location,
    apply: (b, v) => role(b, { location: str(v) }),
    summarize: str,
  },
  {
    id: 'hire_type',
    field: '招聘类型',
    ask: () => '这是校招、社招还是实习岗位？',
    input: () => ({ kind: 'cards', options: HIRE_TYPES }),
    shouldAsk: (b, route) => guidedOrMissing(route, b.role.hire_type),
    read: (b) => b.role.hire_type,
    apply: (b, v) => {
      const hireType = str(v) as HireType
      // 切换类型时清掉不再适用的条件
      return role(b, {
        hire_type: hireType,
        cohort: hireType === '社招' ? '' : b.role.cohort,
        experience: hireType === '社招' ? b.role.experience : '',
      })
    },
    summarize: str,
  },
  {
    id: 'cohort',
    field: '届别',
    ask: (b) => (b.role.hire_type === '实习' ? '面向哪一届的在校生？' : '面向哪一届的毕业生？'),
    input: () => ({ kind: 'select', options: cohortOptions(), placeholder: '选择届别' }),
    shouldAsk: (b, route) => needsCohort(b) && guidedOrMissing(route, b.role.cohort),
    read: (b) => b.role.cohort,
    apply: (b, v) => role(b, { cohort: str(v) }),
    summarize: str,
  },
  {
    id: 'experience',
    field: '经验要求',
    ask: () => '对工作经验有什么要求？',
    input: () => ({ kind: 'segmented', options: EXPERIENCE_OPTIONS }),
    shouldAsk: (b, route) => b.role.hire_type === '社招' && guidedOrMissing(route, b.role.experience),
    read: (b) => b.role.experience,
    apply: (b, v) => role(b, { experience: str(v) }),
    summarize: (v) => (str(v) === '不限' ? '经验不限' : `${str(v)}经验`),
  },
  {
    id: 'level',
    field: '职级',
    ask: () => '有明确的职级吗？没有可以跳过。',
    input: () => ({ kind: 'chips', options: LEVEL_OPTIONS, customPlaceholder: '自定义，如 P6', optional: true }),
    shouldAsk: (_, route) => route === 'guided',
    read: (b) => b.role.level,
    apply: (b, v) => role(b, { level: str(v) }),
    summarize: (v) => str(v) || '跳过',
    optional: true,
  },
  {
    id: 'benefits',
    field: '福利',
    ask: () => '有哪些福利需要写进 JD？',
    hint: () => '会被逐字写入，不做改写；不选则 JD 不出现福利部分。注意「弹性工作」和「弹性工作制」的承诺强度不同。',
    input: () => ({ kind: 'multi', options: BENEFIT_OPTIONS, customPlaceholder: '添加其他福利，回车确认' }),
    shouldAsk: () => true,
    read: (b) => b.benefits,
    apply: (b, v) => ({ ...b, benefits: list(v) }),
    summarize: (v) => list(v).join(' · ') || '暂不填写福利',
    optional: true,
  },
  {
    id: 'tech_stack',
    field: '技术栈',
    ask: () => '这个岗位会用到哪些技术栈或方法？',
    hint: () => '只会使用你选定的名称；不确定就跳过，技术要求会写成通用能力描述。',
    input: (b) => ({ kind: 'multi', options: techSuggestions(b.role.title), customPlaceholder: '添加其他技术，回车确认' }),
    shouldAsk: () => true,
    read: (b) => b.tech_stack,
    apply: (b, v) => ({ ...b, tech_stack: list(v) }),
    summarize: (v) => list(v).join(' · ') || '暂不指定技术栈',
    optional: true,
  },
]

export const STEP_BY_ID = Object.fromEntries(STEPS.map((s) => [s.id, s])) as Record<StepId, Step>

/** 按顺序找到下一个需要回答、且还没回答过的步骤 */
export function nextStep(brief: BriefDraft, route: Route | null, answered: StepId[]): StepId | null {
  for (const step of STEPS) {
    if (answered.includes(step.id) || !step.shouldAsk(brief, route)) continue
    return step.id
  }
  return null
}

export function normalizeUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return value
  return /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`
}

export function validateUrl(raw: string): string | null {
  const value = normalizeUrl(raw)
  try {
    const url = new URL(value)
    if (!url.hostname.includes('.') || /\s/.test(raw.trim())) return '看起来不是有效的网址'
    return null
  } catch {
    return '看起来不是有效的网址'
  }
}

export function hostOf(raw: string): string {
  try {
    return new URL(normalizeUrl(raw)).hostname.replace(/^www\./, '')
  } catch {
    return raw
  }
}

/** 把已拆解的岗位字段还原成一句话（修改一句话需求时回填） */
function composeOneLiner(b: BriefDraft): string {
  const r = b.role
  const parts = [r.title, r.scene && `负责${r.scene}`, r.location && (r.location === '远程' ? '远程' : `base ${r.location}`)]
  if (r.hire_type === '社招') parts.push(r.experience ? `社招 ${r.experience}` : '社招')
  else if (r.hire_type) parts.push(`${r.cohort ? r.cohort.replace('届', ' 届') : ''}${r.hire_type}`)
  parts.push(r.extra)
  return parts.filter(Boolean).join('，')
}
