import { ArrowLeft, ArrowRight, Wand2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Tag } from '../../components/ui/Chip'
import { fieldClass } from '../../components/ui/field'
import { cn } from '../../lib/cn'
import { HOT_CITIES, MORE_CITIES, parseHiring } from '../../lib/parseHiring'
import type { BriefDraft, HireType } from '../../types'
import { ChoiceCards, Field, QuickPicks, Segmented, SelectBox, SingleChips, TextField } from './controls'
import { guidedQuestions, quickFields, ROLE_FIELDS, stepIssues, type RoleKey } from './fields'
import { cohortOptions, EXPERIENCE_OPTIONS, HIRE_TYPES, LEVEL_OPTIONS, ROLE_SUGGESTIONS, SCENE_EXAMPLES } from './options'
import { StepCard } from './StepShell'
import type { Studio } from './useStudio'

const MODES = [
  { value: 'quick', label: '一句话识别' },
  { value: 'guided', label: '逐项引导' },
] as const

// 缺失时标记「待补充」的建议项
const RECOMMENDED: RoleKey[] = ['title', 'location', 'hire_type', 'cohort', 'experience']

interface ControlProps {
  field: RoleKey
  brief: BriefDraft
  onChange: (value: string) => void
  /** 逐项引导：选择类控件选中后自动进入下一项 */
  onCommit?: () => void
  large?: boolean
}

/** 岗位字段的控件，一句话识别（紧凑）和逐项引导（大尺寸）共用 */
function RoleFieldControl({ field, brief, onChange, onCommit, large }: ControlProps) {
  const value = brief.role[field]
  const size = large ? 'md' : 'sm'
  const choose = (v: string) => {
    onChange(v)
    onCommit?.()
  }

  switch (field) {
    case 'title':
      return (
        <div className="space-y-2.5">
          <TextField
            value={value}
            onChange={onChange}
            suggestions={ROLE_SUGGESTIONS}
            onCommit={() => onCommit?.()}
            placeholder="例如：AI 产品经理"
            autoFocus={large}
            size={size}
          />
          {large && !value && <QuickPicks label="常用" items={ROLE_SUGGESTIONS.slice(0, 8)} onPick={choose} />}
        </div>
      )
    case 'scene':
      return (
        <div className="space-y-2.5">
          <TextField
            value={value}
            onChange={(v) => onChange(v.replace(/^负责/, ''))}
            onCommit={() => onCommit?.()}
            placeholder="例如：金融场景下的大模型应用产品"
            maxLength={200}
            autoFocus={large}
            size={size}
          />
          {large && !value && <QuickPicks label="示例" items={SCENE_EXAMPLES} onPick={onChange} />}
        </div>
      )
    case 'location':
      return (
        <SingleChips
          options={[...HOT_CITIES, '远程']}
          value={value}
          onChange={choose}
          more={{ placeholder: '更多城市', options: MORE_CITIES }}
          customPlaceholder="其他城市"
        />
      )
    case 'hire_type':
      return large ? (
        <ChoiceCards options={HIRE_TYPES} value={value} onChange={choose} />
      ) : (
        <Segmented options={HIRE_TYPES.map((h) => h.value)} value={value} onChange={choose} size="sm" />
      )
    case 'cohort':
      return <SelectBox value={value} options={cohortOptions()} placeholder="选择届别" onChange={choose} size={size} className={large ? 'max-w-xs' : 'max-w-48'} />
    case 'experience':
      return <Segmented options={EXPERIENCE_OPTIONS} value={value} onChange={choose} size={size} />
    case 'level':
      return <SingleChips options={LEVEL_OPTIONS} value={value} onChange={choose} customPlaceholder="自定义，如 P6" clearable />
    case 'extra':
      return <TextField value={value} onChange={onChange} placeholder="例如：需要能适应出差" maxLength={300} size={size} />
  }
}

function OneLinerMode({ studio }: { studio: Studio }) {
  const { state, dispatch } = studio
  const { brief, oneLiner, appliedOneLiner, detected } = state
  const ref = useRef<HTMLTextAreaElement>(null)
  const preview = parseHiring(oneLiner)
  const previewTags = [
    preview.title && `岗位 ${preview.title}`,
    preview.scene && `场景 ${preview.scene}`,
    preview.location,
    [preview.cohort, preview.hire_type].filter(Boolean).join(''),
    preview.experience && `${preview.experience}经验`,
  ].filter(Boolean) as string[]
  const hasRole = Object.values(brief.role).some(Boolean)
  const apply = () => dispatch({ type: 'apply_one_liner' })
  const setRole = (field: RoleKey) => (value: string) =>
    dispatch({ type: 'patch_role', patch: { [field]: field === 'hire_type' ? (value as HireType) : value } })

  return (
    <>
      <Field label="一句话描述岗位" hint="建议包含岗位名称、业务场景、工作地点、届别或经验要求，识别后可在下方逐项修改。">
        <div className="relative">
          <textarea
            ref={ref}
            value={oneLiner}
            rows={2}
            onChange={(e) => dispatch({ type: 'set_one_liner', text: e.target.value })}
            onBlur={apply}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                apply()
              }
            }}
            placeholder="例如：AI 产品经理，负责金融场景下的大模型应用产品，base 杭州，2026 届校招"
            maxLength={300}
            className={cn(fieldClass, 'min-h-20 resize-none py-2.5 pr-24 leading-7')}
          />
          <div className="absolute right-2 bottom-2">
            <Button
              size="sm"
              variant="secondary"
              onMouseDown={(e) => e.preventDefault()}
              onClick={apply}
              disabled={!oneLiner.trim() || oneLiner.trim() === appliedOneLiner}
            >
              <Wand2 className="size-3.5 text-violet-500" />
              识别
            </Button>
          </div>
        </div>
        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5">
          {oneLiner.trim() ? (
            <>
              <span className="ai-text text-xs font-medium">自动识别 ›</span>
              {previewTags.length ? previewTags.map((t) => <Tag key={t} tone="ai">{t}</Tag>) : <span className="text-xs text-zinc-400">继续输入…</span>}
            </>
          ) : (
            <QuickPicks
              label="示例"
              items={['后端工程师，负责支付系统，base 上海，社招 3-5 年', '2027 届数据分析实习，负责增长分析，北京']}
              onPick={(text) => {
                dispatch({ type: 'set_one_liner', text })
                ref.current?.focus()
              }}
            />
          )}
        </div>
      </Field>

      <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/60 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-zinc-800">岗位信息</h3>
          <span className="text-xs text-zinc-400">可直接修改；修改上面的句子并重新识别会覆盖这里</span>
        </div>
        {hasRole || appliedOneLiner ? (
          <div className="space-y-4">
            {quickFields(brief).map((field) => {
              const value = brief.role[field]
              const badge = detected.includes(field) && value ? 'detected' : !value && RECOMMENDED.includes(field) ? 'missing' : !value && ROLE_FIELDS[field].optional ? 'optional' : undefined
              return (
                <Field key={field} label={ROLE_FIELDS[field].label} badge={badge} required={field === 'title'}>
                  <RoleFieldControl field={field} brief={brief} onChange={setRole(field)} />
                </Field>
              )
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-zinc-400">输入一句话后，识别结果会显示在这里</p>
        )}
      </div>
    </>
  )
}

function GuidedMode({ studio }: { studio: Studio }) {
  const { state, dispatch } = studio
  const questions = guidedQuestions(state.brief)
  const index = Math.min(state.guidedIndex, questions.length - 1)
  const field = questions[index]
  const def = ROLE_FIELDS[field]

  const goto = (i: number) => dispatch({ type: 'guided_goto', index: i })
  // 连续快速点选时只保留最后一次自动前进
  const advanceTimer = useRef<number | undefined>(undefined)
  const advance = () => {
    window.clearTimeout(advanceTimer.current)
    // 选中后稍作停顿再进入下一项，让用户看到选中状态
    advanceTimer.current = window.setTimeout(() => goto(index + 1), 220)
  }
  const setValue = (value: string) =>
    dispatch({ type: 'patch_role', patch: { [field]: field === 'hire_type' ? (value as HireType) : value } })

  return (
    <div className="min-h-[17rem]">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs text-zinc-400 tabular-nums">
          {index + 1} / {questions.length}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-ai-indigo via-ai-violet to-ai-cyan"
            animate={{ width: `${((index + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={field}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <h3 className="text-[22px] font-semibold tracking-tight text-zinc-900">{def.question(state.brief)}</h3>
          {def.hint && <p className="mt-1.5 text-sm text-zinc-500">{def.hint}</p>}
          <div className="mt-6">
            <RoleFieldControl
              field={field}
              brief={state.brief}
              onChange={setValue}
              onCommit={advance}
              large
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function RoleStep({ studio }: { studio: Studio }) {
  const { state, dispatch } = studio
  const [showErrors, setShowErrors] = useState(false)
  const issues = stepIssues(state.brief, 'role')
  const guided = state.roleMode === 'guided'

  const questions = guidedQuestions(state.brief)
  const index = Math.min(state.guidedIndex, questions.length - 1)
  const field = questions[index]
  const fieldEmpty = !state.brief.role[field]

  const next = () => {
    if (issues.errors.title) {
      setShowErrors(true)
      return
    }
    dispatch({ type: 'goto_step', step: 'extras' })
  }

  const footer = guided ? (
    <>
      <Button variant="ghost" onClick={() => dispatch({ type: 'guided_goto', index: index - 1 })}>
        <ArrowLeft className="size-4" />
        {index === 0 ? '上一步' : '上一项'}
      </Button>
      <div className="flex items-center gap-2">
        {field !== 'title' && (
          <Button variant="ghost" onClick={() => dispatch({ type: 'guided_goto', index: index + 1 })}>
            跳过
          </Button>
        )}
        <Button variant="primary" disabled={fieldEmpty} onClick={() => dispatch({ type: 'guided_goto', index: index + 1 })}>
          {index === questions.length - 1 ? '下一步' : '下一项'}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={() => dispatch({ type: 'goto_step', step: 'company' })}>
        <ArrowLeft className="size-4" />
        上一步
      </Button>
      <div className="flex items-center gap-3">
        {showErrors && issues.errors.title ? (
          <span className="text-[13px] text-rose-600">{issues.errors.title}</span>
        ) : issues.warnings.length > 0 ? (
          <span className="hidden text-[13px] text-amber-600 sm:inline">
            建议补充：{issues.warnings.map((w) => ROLE_FIELDS[w as RoleKey].label).join('、')}
          </span>
        ) : null}
        <Button variant="primary" onClick={next}>
          下一步
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </>
  )

  return (
    <StepCard
      title="要招什么样的人？"
      description="两种方式填写的是同一份岗位信息，可以随时切换。"
      action={
        <div className="w-full sm:w-auto">
          <Segmented
            options={MODES.map((m) => m.label)}
            value={MODES.find((m) => m.value === state.roleMode)!.label}
            onChange={(label) => dispatch({ type: 'set_mode', mode: MODES.find((m) => m.label === label)!.value })}
            size="sm"
          />
        </div>
      }
      footer={footer}
    >
      {guided ? <GuidedMode studio={studio} /> : <OneLinerMode studio={studio} />}
    </StepCard>
  )
}
