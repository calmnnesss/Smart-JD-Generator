import type { BriefDraft } from '../types'

export interface Completeness {
  score: number
  tips: string[]
}

/** 信息完整度：权重与提示文案都依据工作流的真实行为（信息越少，JD 占位越多）。 */
export function scoreBrief(brief: BriefDraft): Completeness {
  const { company, role } = brief
  const descLength = company.description.trim().length
  const checks: { weight: number; ok: boolean; tip?: string }[] = [
    { weight: 10, ok: !!company.name.trim() },
    { weight: 10, ok: !!company.domain.trim(), tip: '填写官网后，AI 会读取官网正文补充公司背景' },
    { weight: 10, ok: descLength >= 60 },
    {
      weight: 15,
      ok: descLength >= 150,
      tip: '公司介绍再具体一些（主营业务、客户、近期方向、团队特点），JD 会更少占位',
    },
    { weight: 10, ok: !!role.title.trim() },
    { weight: 10, ok: !!role.scene.trim(), tip: '补充业务场景，岗位职责会更聚焦' },
    { weight: 5, ok: role.locations.length > 0, tip: '补充工作地点' },
    { weight: 5, ok: !!role.hire_type },
    {
      weight: 5,
      ok: !!(role.cohort || role.experience),
      tip: '写明届别或经验年限，JD 会原样保留这一条件',
    },
    { weight: 10, ok: brief.benefits.length > 0, tip: '不填福利时，JD 不会出现福利部分' },
    { weight: 10, ok: brief.tech_stack.length > 0, tip: '不填技术栈时，技术要求会写成通用能力描述' },
  ]
  const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0)
  const tips = checks.filter((c) => !c.ok && c.tip).map((c) => c.tip as string)
  return { score, tips }
}
