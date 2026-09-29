import { Pencil } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Tag } from '../../components/ui/Chip'
import { cn } from '../../lib/cn'
import { scoreBrief } from '../../lib/completeness'
import type { BriefDraft, Route } from '../../types'
import { hostOf, type StepId } from '../copilot/script'
import { CompletenessRing } from './CompletenessRing'

interface BriefPanelProps {
  brief: BriefDraft
  route: Route | null
  lastChanged: { step: StepId; at: number } | null
  editable: boolean
  onEdit: (stepId: StepId) => void
}

interface RowProps {
  label: string
  steps: StepId[]
  editStep?: StepId
  children: ReactNode
  empty: boolean
}

interface RowContext {
  lastChanged: BriefPanelProps['lastChanged']
  editable: boolean
  onEdit: (stepId: StepId) => void
}

function BriefRow({ label, steps, editStep, children, empty, lastChanged, editable, onEdit }: RowProps & RowContext) {
  const flashing = lastChanged && steps.includes(lastChanged.step)
  const canEdit = editable && !!editStep
  return (
    <motion.button
      type="button"
      key={flashing ? lastChanged.at : 'static'}
      disabled={!canEdit}
      onClick={() => editStep && onEdit(editStep)}
      initial={flashing ? { backgroundColor: 'rgba(237, 233, 254, 1)' } : false}
      animate={{ backgroundColor: 'rgba(237, 233, 254, 0)' }}
      transition={{ duration: 1.4, ease: 'easeOut' }}
      className={cn(
        'group -mx-2 grid w-[calc(100%+1rem)] grid-cols-[4rem_1fr_auto] items-start gap-2 rounded-lg px-2 py-1.5 text-left',
        canEdit && 'hover:bg-zinc-900/[0.03]',
      )}
    >
      <span className="pt-px text-[13px] leading-6 text-zinc-500">{label}</span>
      <span className={cn('min-w-0 text-[13px] leading-6', empty ? 'text-zinc-300' : 'text-zinc-800')}>{empty ? '待填写' : children}</span>
      {canEdit && <Pencil className="mt-1.5 size-3 text-zinc-300 opacity-0 transition group-hover:opacity-100" />}
    </motion.button>
  )
}

export function BriefPanel({ brief, route, lastChanged, editable, onEdit }: BriefPanelProps) {
  const { score, tips } = scoreBrief(brief)
  const { company, role } = brief
  const ctx: RowContext = { lastChanged, editable, onEdit }
  const hireText = [role.hire_type, role.cohort, role.experience && (role.experience === '不限' ? '经验不限' : `${role.experience}经验`)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900">招聘简报</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {route ? (route === 'quick' ? '一句话拆解' : '逐项引导') : '随对话实时整理'} · 点击任意字段可修改
          </p>
        </div>
        <CompletenessRing score={score} />
      </div>

      <section>
        <h3 className="mb-1 text-xs font-medium tracking-wide text-zinc-400">公司</h3>
        <BriefRow {...ctx} label="名称" steps={['company_name']} editStep="company_name" empty={!company.name}>
          {company.name}
        </BriefRow>
        <BriefRow {...ctx} label="官网" steps={['company_domain']} editStep="company_domain" empty={!company.domain}>
          {hostOf(company.domain)}
        </BriefRow>
        <BriefRow {...ctx} label="介绍" steps={['company_description']} editStep="company_description" empty={!company.description}>
          <span className="line-clamp-3">{company.description}</span>
        </BriefRow>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-medium tracking-wide text-zinc-400">岗位</h3>
        <BriefRow {...ctx} label="岗位" steps={['role_title', 'one_liner', 'level']} editStep="role_title" empty={!role.title}>
          {role.title}
          {role.level && <span className="text-zinc-500">（{role.level}）</span>}
        </BriefRow>
        <BriefRow {...ctx} label="场景" steps={['scene', 'one_liner']} editStep="scene" empty={!role.scene}>
          {role.scene}
        </BriefRow>
        <BriefRow {...ctx} label="地点" steps={['location', 'one_liner']} editStep="location" empty={!role.location}>
          {role.location}
        </BriefRow>
        <BriefRow
          {...ctx}
          label="类型"
          steps={['hire_type', 'cohort', 'experience', 'one_liner']}
          editStep="hire_type"
          empty={!hireText}
        >
          {hireText}
        </BriefRow>
        {role.extra && (
          <BriefRow {...ctx} label="其他" steps={['one_liner']} editStep={route === 'quick' ? 'one_liner' : undefined} empty={false}>
            {role.extra}
          </BriefRow>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-xs font-medium tracking-wide text-zinc-400">写进 JD 的原话</h3>
        <BriefRow {...ctx} label="福利" steps={['benefits']} editStep="benefits" empty={!brief.benefits.length}>
          <span className="flex flex-wrap gap-1 py-0.5">
            {brief.benefits.map((b) => (
              <Tag key={b}>{b}</Tag>
            ))}
          </span>
        </BriefRow>
        <BriefRow {...ctx} label="技术栈" steps={['tech_stack']} editStep="tech_stack" empty={!brief.tech_stack.length}>
          <span className="flex flex-wrap gap-1 py-0.5">
            {brief.tech_stack.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </span>
        </BriefRow>
      </section>

      {brief.supplements.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-zinc-400">补充信息</h3>
          <ul className="space-y-1.5">
            {brief.supplements.map((s) => (
              <li key={s.item} className="text-[13px] leading-6">
                <span className="text-zinc-500">{s.item}：</span>
                <span className="text-zinc-800">{s.answer}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tips.length > 0 && (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white/60 p-3">
          <div className="ai-text mb-1.5 text-xs font-medium">让 JD 更具体</div>
          <ul className="space-y-1 text-xs leading-5 text-zinc-500">
            {tips.slice(0, 3).map((tip) => (
              <li key={tip}>· {tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
