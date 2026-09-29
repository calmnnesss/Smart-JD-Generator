import { ArrowUp, ChevronDown, Globe, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Button } from '../../components/ui/Button'
import { Chip, Tag } from '../../components/ui/Chip'
import { fieldClass } from '../../components/ui/field'
import { cn } from '../../lib/cn'
import { parseHiring } from '../../lib/parseHiring'
import type { BriefDraft, Route } from '../../types'
import { hostOf, normalizeUrl, validateUrl, type Answer, type InputSpec, type Step } from './script'

interface AnswerDockProps {
  step: Step
  brief: BriefDraft
  route: Route | null
  onAnswer: (value: Answer) => void
}

/** 底部回答区：根据当前问题的类型切换为输入框、选择卡、标签、下拉框等控件 */
export function AnswerDock({ step, brief, route, onAnswer }: AnswerDockProps) {
  const spec = step.input(brief)
  const initial = step.read(brief, route)
  const text = Array.isArray(initial) ? '' : initial
  const list = Array.isArray(initial) ? initial : []

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-3 shadow-float backdrop-blur">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs text-zinc-500">
          回答 · <span className="text-zinc-700">{step.field}</span>
        </span>
        {step.optional && spec.kind !== 'multi' && (
          <button type="button" onClick={() => onAnswer('')} className="text-xs text-zinc-400 transition hover:text-zinc-700">
            跳过
          </button>
        )}
      </div>
      {renderInput(spec, text, list, onAnswer)}
    </div>
  )
}

function renderInput(spec: InputSpec, text: string, list: string[], onAnswer: (value: Answer) => void) {
  switch (spec.kind) {
    case 'text':
      return <TextAnswer spec={spec} initial={text} onSubmit={onAnswer} />
    case 'url':
      return <UrlAnswer placeholder={spec.placeholder} initial={text} onSubmit={onAnswer} />
    case 'textarea':
      return <TextareaAnswer spec={spec} initial={text} onSubmit={onAnswer} />
    case 'oneliner':
      return <OneLinerAnswer spec={spec} initial={text} onSubmit={onAnswer} />
    case 'cards':
      return (
        <div className={cn('grid gap-2', spec.options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          {spec.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(option.value)}
              className={cn(
                'group rounded-xl p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:outline-none',
                option.value === text ? 'ai-border [--ai-fill:var(--color-violet-50)]' : 'border border-zinc-200 bg-white hover:border-violet-200',
              )}
            >
              <div className="text-[15px] font-medium text-zinc-900">{option.label}</div>
              {option.description && <div className="mt-1 text-[13px] leading-5 text-zinc-500">{option.description}</div>}
            </button>
          ))}
        </div>
      )
    case 'chips':
      return <ChipsAnswer spec={spec} initial={text} onSubmit={onAnswer} />
    case 'select':
      return <SelectAnswer spec={spec} initial={text} onSubmit={onAnswer} />
    case 'segmented':
      return (
        <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
          {spec.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onAnswer(option)}
              className={cn(
                'h-9 flex-1 rounded-lg px-3 text-sm whitespace-nowrap transition',
                option === text ? 'bg-white font-medium text-violet-700 shadow-soft' : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )
    case 'multi':
      return <MultiAnswer spec={spec} initial={list} onSubmit={onAnswer} />
  }
}

function SendButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="发送"
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-900 text-white shadow-glow transition hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
    >
      <ArrowUp className="size-4" strokeWidth={2.4} />
    </button>
  )
}

function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    // 触屏设备上不自动弹出键盘
    if (window.matchMedia('(pointer: fine)').matches) ref.current?.focus({ preventScroll: true })
  }, [])
  return ref
}

function useAutosize(ref: RefObject<HTMLTextAreaElement | null>, value: string, max = 200) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
  }, [ref, value, max])
}

function QuickPicks({ items, onPick, label }: { items: string[]; onPick: (v: string) => void; label?: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {label && <span className="mr-0.5 text-xs text-zinc-400">{label}</span>}
      {items.map((item) => (
        <Chip key={item} onClick={() => onPick(item)} className="h-7 text-xs">
          {item}
        </Chip>
      ))}
    </div>
  )
}

function InputRow({ children }: { children: ReactNode }) {
  return <div className="flex items-end gap-2">{children}</div>
}

function TextAnswer({ spec, initial, onSubmit }: { spec: Extract<InputSpec, { kind: 'text' }>; initial: string; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useAutoFocus<HTMLInputElement>()
  const query = value.trim().toLowerCase()
  const matches = query ? (spec.suggestions ?? []).filter((s) => s.toLowerCase().includes(query) && s !== value).slice(0, 6) : []
  const canSubmit = !!value.trim() || !!spec.optional

  const submit = (v = value) => {
    if (v.trim() || spec.optional) onSubmit(v.trim())
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (open && matches.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && matches.length) {
        setValue(matches[active])
        setOpen(false)
      } else submit()
    } else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div>
      {!value && spec.suggestions && <QuickPicks items={spec.suggestions.slice(0, 6)} onPick={(v) => submit(v)} />}
      {!value && spec.examples && (
        <QuickPicks
          label="示例"
          items={spec.examples}
          onPick={(v) => {
            setValue(v)
            ref.current?.focus()
          }}
        />
      )}
      <InputRow>
        <div className="relative flex-1">
          {open && matches.length > 0 && (
            <ul role="listbox" className="absolute bottom-full left-0 z-10 mb-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-float">
              {matches.map((m, i) => (
                <li key={m}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setValue(m)
                      setOpen(false)
                    }}
                    className={cn('w-full rounded-lg px-3 py-2 text-left text-sm', i === active ? 'bg-violet-50 text-violet-700' : 'text-zinc-700 hover:bg-zinc-50')}
                  >
                    {m}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={ref}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setOpen(true)
              setActive(0)
            }}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            placeholder={spec.placeholder}
            className={cn(fieldClass, 'h-11')}
            maxLength={spec.maxLength ?? 100}
          />
        </div>
        <SendButton disabled={!canSubmit} onClick={() => submit()} />
      </InputRow>
    </div>
  )
}

function UrlAnswer({ placeholder, initial, onSubmit }: { placeholder: string; initial: string; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const ref = useAutoFocus<HTMLInputElement>()
  const valid = value.trim() && !validateUrl(value)

  const submit = () => {
    const problem = validateUrl(value)
    if (problem) setError(problem)
    else onSubmit(normalizeUrl(value))
  }

  return (
    <div>
      <InputRow>
        <input
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
          }}
          placeholder={placeholder}
          inputMode="url"
          autoCapitalize="off"
          spellCheck={false}
          className={cn(fieldClass, 'h-11', error && 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10')}
        />
        <SendButton disabled={!value.trim()} onClick={submit} />
      </InputRow>
      <div className="mt-2 flex h-5 items-center gap-1.5 px-1 text-xs">
        {error ? (
          <span className="text-rose-600">{error}</span>
        ) : valid ? (
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Globe className="size-3.5 text-violet-500" />
            将访问 <span className="text-zinc-700">{hostOf(value)}</span>
          </span>
        ) : (
          <span className="text-zinc-400">不用写 https://，我会自动补全</span>
        )}
      </div>
    </div>
  )
}

function TextareaAnswer({ spec, initial, onSubmit }: { spec: Extract<InputSpec, { kind: 'textarea' }>; initial: string; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  const ref = useAutoFocus<HTMLTextAreaElement>()
  useAutosize(ref, value, 220)
  const length = value.trim().length
  const submit = () => value.trim() && onSubmit(value.trim())

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
        <span className="text-xs text-zinc-400">建议包含</span>
        {spec.tips.map((tip) => (
          <Tag key={tip}>{tip}</Tag>
        ))}
      </div>
      <InputRow>
        <textarea
          ref={ref}
          value={value}
          rows={3}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={spec.placeholder}
          maxLength={3000}
          className={cn(fieldClass, 'min-h-[5.5rem] resize-none py-2.5 leading-7')}
        />
        <SendButton disabled={!length} onClick={submit} />
      </InputRow>
      <div className="mt-2 flex items-center justify-between px-1 text-xs text-zinc-400">
        <span>{length > 0 && length < 60 ? <span className="text-amber-600">介绍偏短，JD 可能会出现较多占位</span> : 'Enter 换行 · ⌘/Ctrl + Enter 发送'}</span>
        <span className="tabular-nums">{length} 字</span>
      </div>
    </div>
  )
}

function OneLinerAnswer({ spec, initial, onSubmit }: { spec: Extract<InputSpec, { kind: 'oneliner' }>; initial: string; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  const ref = useAutoFocus<HTMLTextAreaElement>()
  useAutosize(ref, value, 120)
  const parsed = parseHiring(value)
  const detected = [
    parsed.title && `岗位 ${parsed.title}`,
    parsed.scene && `场景 ${parsed.scene}`,
    parsed.location,
    [parsed.cohort, parsed.hire_type].filter(Boolean).join(''),
    parsed.experience && `${parsed.experience}经验`,
  ].filter(Boolean) as string[]
  const submit = () => value.trim() && onSubmit(value.trim())

  return (
    <div>
      {value.trim() ? (
        <div className="mb-2 flex min-h-7 flex-wrap items-center gap-1.5 px-1">
          <span className="ai-text text-xs font-medium">已识别 ›</span>
          {detected.length ? detected.map((d) => <Tag key={d} tone="ai">{d}</Tag>) : <span className="text-xs text-zinc-400">继续输入…</span>}
        </div>
      ) : (
        <QuickPicks
          label="示例"
          items={spec.examples}
          onPick={(v) => {
            setValue(v)
            ref.current?.focus()
          }}
        />
      )}
      <InputRow>
        <textarea
          ref={ref}
          value={value}
          rows={1}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={spec.placeholder}
          maxLength={300}
          className={cn(fieldClass, 'min-h-11 resize-none py-2 leading-7')}
        />
        <SendButton disabled={!value.trim()} onClick={submit} />
      </InputRow>
    </div>
  )
}

function ChipsAnswer({ spec, initial, onSubmit }: { spec: Extract<InputSpec, { kind: 'chips' }>; initial: string; onSubmit: (v: string) => void }) {
  const [custom, setCustom] = useState(spec.options.includes(initial) || spec.more?.includes(initial) ? '' : initial)
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {spec.options.map((option) => (
          <Chip key={option} selected={option === initial} onClick={() => onSubmit(option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {spec.more && (
          <SelectBox
            value={spec.more.includes(initial) ? initial : ''}
            placeholder="更多城市"
            options={spec.more}
            onChange={(v) => v && onSubmit(v)}
            className="w-36"
          />
        )}
        {spec.customPlaceholder && (
          <div className="flex min-w-48 flex-1 items-center gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && custom.trim() && !e.nativeEvent.isComposing) onSubmit(custom.trim())
              }}
              placeholder={spec.customPlaceholder}
              maxLength={40}
              className={cn(fieldClass, 'h-9 text-sm')}
            />
            <SendButton disabled={!custom.trim()} onClick={() => onSubmit(custom.trim())} />
          </div>
        )}
      </div>
    </div>
  )
}

function SelectBox({
  value,
  options,
  placeholder,
  onChange,
  className,
}: {
  value: string
  options: string[]
  placeholder: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldClass, 'h-9 appearance-none pr-9 text-sm', !value && 'text-zinc-400')}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o} className="text-zinc-900">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-400" />
    </div>
  )
}

function SelectAnswer({ spec, initial, onSubmit }: { spec: Extract<InputSpec, { kind: 'select' }>; initial: string; onSubmit: (v: string) => void }) {
  const [value, setValue] = useState(initial || spec.options[1] || spec.options[0])
  return (
    <div className="flex items-center gap-2">
      <SelectBox value={value} options={spec.options} placeholder={spec.placeholder} onChange={setValue} className="flex-1 [&_select]:h-11 [&_select]:text-[15px]" />
      <Button variant="primary" size="md" disabled={!value} onClick={() => onSubmit(value)} className="h-11">
        确定
      </Button>
    </div>
  )
}

function MultiAnswer({ spec, initial, onSubmit }: { spec: Extract<InputSpec, { kind: 'multi' }>; initial: string[]; onSubmit: (v: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(initial)
  const [custom, setCustom] = useState('')
  const options = [...spec.options, ...selected.filter((s) => !spec.options.includes(s))]
  const toggle = (item: string) => setSelected((s) => (s.includes(item) ? s.filter((x) => x !== item) : [...s, item]))
  const add = () => {
    const items = custom
      .split(/[、,，]/)
      .map((s) => s.trim().slice(0, 30))
      .filter(Boolean)
    if (!items.length) return
    setSelected((s) => [...s, ...items.filter((i) => !s.includes(i))])
    setCustom('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <Chip key={option} selected={selected.includes(option)} onClick={() => toggle(option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-52 flex-1 items-center gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                add()
              }
            }}
            placeholder={spec.customPlaceholder}
            maxLength={60}
            className={cn(fieldClass, 'h-9 text-sm')}
          />
          <Button size="sm" variant="secondary" onClick={add} disabled={!custom.trim()} className="h-9" aria-label="添加">
            <Plus className="size-4" />
          </Button>
        </div>
        <Button variant={selected.length ? 'primary' : 'secondary'} onClick={() => onSubmit(selected)} className="h-9">
          {selected.length ? `确定（${selected.length}）` : '暂不填写'}
        </Button>
      </div>
    </div>
  )
}
