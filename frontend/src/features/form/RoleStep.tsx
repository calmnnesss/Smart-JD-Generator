import { ArrowLeft, ArrowRight, Check, ListChecks, LoaderCircle, Sparkles, Wand2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { AIOrb } from '../../components/ui/AIOrb'
import { Button } from '../../components/ui/Button'
import { Tag } from '../../components/ui/Chip'
import { fieldClass } from '../../components/ui/field'
import { cn } from '../../lib/cn'
import { useLlmAvailable } from '../../lib/serverInfo'
import type { BriefDraft, RoleMode } from '../../types'
import { ChoiceCards, CityMultiSelect, Field, QuickPicks, Segmented, SelectBox, SingleChips, TextField } from './controls'
import { guidedQuestions, quickFields, ROLE_FIELDS, stepIssues, type RoleKey } from './fields'
import { cohortOptions, EXPERIENCE_OPTIONS, HIRE_TYPES, LEVEL_OPTIONS, ROLE_SUGGESTIONS, SCENE_EXAMPLES } from './options'
import { StepCard } from './StepShell'
import type { Studio } from './useStudio'

// 缺失时标记「待补充」的建议项
const RECOMMENDED: RoleKey[] = ['title', 'locations', 'hire_type', 'cohort', 'experience']

type RoleValue = BriefDraft['role'][RoleKey]

const isEmpty = (value: RoleValue) => (Array.isArray(value) ? value.length === 0 : !value)

interface ControlProps {
  field: RoleKey
  brief: BriefDraft
  onChange: (value: RoleValue) => void
  /** 逐项引导：选择类控件选中后自动进入下一项 */
  onCommit?: () => void
  large?: boolean
}

/** 岗位字段的控件，一句话识别（紧凑）和逐项引导（大尺寸）共用 */
function RoleFieldControl({ field, brief, onChange, onCommit, large }: ControlProps) {
  const role = brief.role
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
            value={role.title}
            onChange={onChange}
            suggestions={ROLE_SUGGESTIONS}
            onCommit={() => onCommit?.()}
            placeholder="例如：AI 产品经理"
            autoFocus={large}
            size={size}
          />
          {large && !role.title && <QuickPicks label="常用" items={ROLE_SUGGESTIONS.slice(0, 8)} onPick={choose} />}
        </div>
      )
    case 'scene':
      return (
        <div className="space-y-2.5">
          <TextField
            value={role.scene}
            onChange={(v) => onChange(v.replace(/^负责/, ''))}
            onCommit={() => onCommit?.()}
            placeholder="例如：金融场景下的大模型应用产品"
            maxLength={200}
            autoFocus={large}
            size={size}
          />
          {large && !role.scene && <QuickPicks label="示例" items={SCENE_EXAMPLES} onPick={onChange} />}
        </div>
      )
    case 'locations':
      return <CityMultiSelect value={role.locations} onChange={onChange} autoFocus={large} />
    case 'hire_type':
      return large ? (
        <ChoiceCards options={HIRE_TYPES} value={role.hire_type} onChange={choose} />
      ) : (
        <Segmented options={HIRE_TYPES.map((h) => h.value)} value={role.hire_type} onChange={choose} size="sm" />
      )
    case 'cohort':
      return (
        <SelectBox
          value={role.cohort}
          options={cohortOptions()}
          placeholder="选择届别"
          onChange={choose}
          size={size}
          className={large ? 'max-w-xs' : 'max-w-48'}
        />
      )
    case 'experience':
      return <Segmented options={EXPERIENCE_OPTIONS} value={role.experience} onChange={choose} size={size} />
    case 'level':
      return <SingleChips options={LEVEL_OPTIONS} value={role.level} onChange={choose} customPlaceholder="自定义，如 P6" clearable />
    case 'extra':
      return <TextField value={role.extra} onChange={onChange} placeholder="例如：需要能适应出差" maxLength={300} size={size} />
  }
}

/** 岗位描述方式：两张醒目的选择卡 */
function ModeCards({ mode, llm, onChange }: { mode: RoleMode; llm: boolean | null; onChange: (mode: RoleMode) => void }) {
  const options = [
    { value: 'quick' as const, icon: Wand2, title: '一句话识别', badge: llm ? 'AI' : null },
    { value: 'guided' as const, icon: ListChecks, title: '逐项引导', badge: null },
  ]
  return (
    <div role="radiogroup" aria-label="岗位描述方式" className="grid gap-3 sm:grid-cols-2">
      {options.map(({ value, icon: Icon, title, badge }) => {
        const selected = mode === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(value)}
            className={cn(
              'relative flex items-center gap-3.5 rounded-2xl p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:outline-none',
              selected
                ? 'ai-border shadow-[0_0_0_4px_rgb(139_92_246/0.08)] [--ai-fill:#faf8ff]'
                : 'border border-zinc-200 bg-white hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-soft',
            )}
          >
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl transition',
                selected ? 'bg-linear-to-br from-ai-indigo via-ai-violet to-ai-cyan text-white shadow-glow' : 'bg-zinc-100 text-zinc-500',
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="flex min-w-0 items-center gap-2 pr-5">
              <span className={cn('text-[15px] font-semibold', selected ? 'text-zinc-900' : 'text-zinc-700')}>{title}</span>
              {badge && <span className="ai-text rounded border border-violet-200 px-1 text-[10px] leading-4 font-semibold">{badge}</span>}
            </span>
            {selected && (
              <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-violet-600 text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function OneLinerMode({ studio, llm }: { studio: Studio; llm: boolean | null }) {
  const { state, dispatch, applyOneLiner } = studio
  const { brief, oneLiner, appliedOneLiner, parsingText, parseEngine } = state
  const ref = useRef<HTMLTextAreaElement>(null)
  const parsing = parsingText !== null
  const pending = !!oneLiner.trim() && oneLiner.trim() !== appliedOneLiner
  const hasRole = Object.values(brief.role).some((v) => (Array.isArray(v) ? v.length > 0 : !!v))
  const apply = () => void applyOneLiner()
  const setRole = (field: RoleKey) => (value: RoleValue) =>
    dispatch({ type: 'patch_role', patch: { [field]: value } as Partial<BriefDraft['role']> })

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
            className={cn(fieldClass, 'min-h-24 resize-none py-2.5 leading-7 sm:min-h-20 sm:pr-28')}
          />
          <div className="mt-2 flex justify-end sm:absolute sm:right-2 sm:bottom-2 sm:mt-0">
            <Button
              size="sm"
              variant={pending ? 'ai' : 'secondary'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={apply}
              disabled={!pending || parsing}
            >
              {parsing ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {parsing ? '识别中' : llm === false ? '识别' : 'AI 识别'}
            </Button>
          </div>
        </div>
        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5">
          {oneLiner.trim() ? (
            <span className="text-xs text-zinc-400">{pending ? '按 Enter 或点击右下角按钮开始识别' : '已识别，可在下方修改'}</span>
          ) : (
            <QuickPicks
              label="示例"
              items={['后端工程师，负责支付系统，base 上海/杭州，社招 3-5 年', '2027 届数据分析实习，负责增长分析，北京']}
              onPick={(text) => {
                dispatch({ type: 'set_one_liner', text })
                ref.current?.focus()
              }}
            />
          )}
        </div>
      </Field>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-zinc-50/60 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-800">岗位信息</h3>
            {parseEngine === 'rules' && llm && <Tag>AI 暂不可用，已用本地规则识别</Tag>}
          </div>
          <span className="text-xs text-zinc-400">可直接修改；重新识别会覆盖这里</span>
        </div>
        {hasRole || appliedOneLiner ? (
          <div className="space-y-4">
            {quickFields(brief).map((field) => {
              const value = brief.role[field]
              const badge =
                isEmpty(value) && RECOMMENDED.includes(field)
                  ? 'missing'
                  : isEmpty(value) && ROLE_FIELDS[field].optional
                    ? 'optional'
                    : undefined
              return (
                <Field key={field} label={ROLE_FIELDS[field].label} badge={badge} required={field === 'title'}>
                  <RoleFieldControl field={field} brief={brief} onChange={setRole(field)} />
                </Field>
              )
            })}
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-zinc-400">输入一句话并识别后，结果会显示在这里</p>
        )}
        <AnimatePresence>
          {parsing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center bg-white/75 backdrop-blur-[2px]"
            >
              <div className="flex items-center gap-3">
                <AIOrb size={28} thinking />
                <span className="shimmer-text text-sm font-medium">{llm === false ? '正在识别…' : 'AI 正在拆解这句话…'}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
  const setValue = (value: RoleValue) =>
    dispatch({ type: 'patch_role', patch: { [field]: value } as Partial<BriefDraft['role']> })

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
            <RoleFieldControl field={field} brief={state.brief} onChange={setValue} onCommit={advance} large />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function RoleStep({ studio }: { studio: Studio }) {
  const { state, dispatch } = studio
  const llm = useLlmAvailable()
  const [showErrors, setShowErrors] = useState(false)
  const issues = stepIssues(state.brief, 'role')
  const guided = state.roleMode === 'guided'

  const questions = guidedQuestions(state.brief)
  const index = Math.min(state.guidedIndex, questions.length - 1)
  const field = questions[index]
  const fieldEmpty = isEmpty(state.brief.role[field])

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
      <Button variant="ghost" onClick={() => dispatch({ type: 'goto_step', step: 'company' })} disabled={state.filling}>
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
        <Button variant="primary" onClick={next} disabled={state.filling || state.parsingText !== null}>
          下一步
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </>
  )

  return (
    <StepCard title="要招什么样的人？" description="先选择描述方式。两种方式填写的是同一份岗位信息，可以随时切换。" footer={footer}>
      <ModeCards mode={state.roleMode} llm={llm} onChange={(mode) => dispatch({ type: 'set_mode', mode })} />
      <div className="h-px bg-zinc-100" />
      {guided ? <GuidedMode studio={studio} /> : <OneLinerMode studio={studio} llm={llm} />}
    </StepCard>
  )
}
