import { ChevronDown, Globe, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Button } from '../../components/ui/Button'
import { Chip, Tag } from '../../components/ui/Chip'
import { fieldClass } from '../../components/ui/field'
import { cn } from '../../lib/cn'
import { hostOf, validateUrl } from '../../lib/url'

/** 受控表单控件：值由 useStudio 统一管理，控件只负责展示与交互 */

type Badge = 'detected' | 'missing' | 'optional'

const BADGES: Record<Badge, { text: string; className: string }> = {
  detected: { text: '已识别', className: 'ai-border text-violet-700 [--ai-fill:var(--color-violet-50)]' },
  missing: { text: '待补充', className: 'border border-amber-200 bg-amber-50 text-amber-700' },
  optional: { text: '可选', className: 'bg-zinc-100 text-zinc-500' },
}

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string
  badge?: Badge
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, badge, required, children, className }: FieldProps) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-800">
          {label}
          {required && <span className="ml-0.5 text-violet-500">*</span>}
        </span>
        {badge && (
          <span className={cn('rounded-md px-1.5 py-px text-[11px] leading-4', BADGES[badge].className)}>{BADGES[badge].text}</span>
        )}
      </div>
      {hint && <p className="mb-2 text-[13px] leading-5 text-zinc-500">{hint}</p>}
      {children}
      {error && <p className="mt-1.5 text-[13px] text-rose-600">{error}</p>}
    </div>
  )
}

function useAutoFocus<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null)
  useEffect(() => {
    // 触屏设备上不自动弹出键盘
    if (enabled && window.matchMedia('(pointer: fine)').matches) ref.current?.focus({ preventScroll: true })
  }, [enabled])
  return ref
}

function useAutosize(ref: RefObject<HTMLTextAreaElement | null>, value: string, max: number) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
  }, [ref, value, max])
}

export function QuickPicks({ items, onPick, label }: { items: string[]; onPick: (v: string) => void; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && <span className="mr-0.5 text-xs text-zinc-400">{label}</span>}
      {items.map((item) => (
        <Chip key={item} onClick={() => onPick(item)} className="h-7 text-xs">
          {item}
        </Chip>
      ))}
    </div>
  )
}

interface TextFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 输入时下拉提示的候选项 */
  suggestions?: string[]
  /** 从候选项选中或按 Enter 时触发 */
  onCommit?: (value: string) => void
  maxLength?: number
  autoFocus?: boolean
  invalid?: boolean
  size?: 'sm' | 'md'
}

export function TextField({
  value,
  onChange,
  placeholder,
  suggestions,
  onCommit,
  maxLength = 100,
  autoFocus,
  invalid,
  size = 'md',
}: TextFieldProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useAutoFocus<HTMLInputElement>(autoFocus)
  const query = value.trim().toLowerCase()
  const matches = query ? (suggestions ?? []).filter((s) => s.toLowerCase().includes(query) && s !== value).slice(0, 6) : []

  const pick = (item: string) => {
    onChange(item)
    setOpen(false)
    onCommit?.(item)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (open && matches.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && matches.length) pick(matches[active])
      else if (value.trim()) onCommit?.(value.trim())
    } else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="relative">
      <input
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={invalid}
        className={cn(fieldClass, size === 'sm' ? 'h-9 text-sm' : 'h-11', invalid && 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10')}
      />
      {open && matches.length > 0 && (
        <ul role="listbox" className="absolute top-full left-0 z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-float">
          {matches.map((m, i) => (
            <li key={m}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(m)
                }}
                className={cn('w-full rounded-lg px-3 py-2 text-left text-sm', i === active ? 'bg-violet-50 text-violet-700' : 'text-zinc-700 hover:bg-zinc-50')}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface UrlFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
  autoFocus?: boolean
}

export function UrlField({ value, onChange, error, autoFocus }: UrlFieldProps) {
  const [touched, setTouched] = useState(false)
  const ref = useAutoFocus<HTMLInputElement>(autoFocus)
  const problem = value.trim() ? validateUrl(value) : null
  const shownError = error ?? (touched ? problem ?? undefined : undefined)

  return (
    <div>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="例如：www.hundsun.com"
        inputMode="url"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={300}
        aria-invalid={!!shownError}
        className={cn(fieldClass, 'h-11', shownError && 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10')}
      />
      <div className="mt-1.5 flex min-h-5 items-center gap-1.5 text-[13px]">
        {shownError ? (
          <span className="text-rose-600">{shownError}</span>
        ) : value.trim() && !problem ? (
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Globe className="size-3.5 text-violet-500" />
            将读取 <span className="text-zinc-700">{hostOf(value)}</span> 的官网正文
          </span>
        ) : (
          <span className="text-zinc-400">不用写 https://，会自动补全</span>
        )}
      </div>
    </div>
  )
}

interface TextareaFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  tips?: string[]
  maxLength?: number
  invalid?: boolean
  /** 低于该字数时提示偏短 */
  shortBelow?: number
}

export function TextareaField({ value, onChange, placeholder, tips, maxLength = 3000, invalid, shortBelow }: TextareaFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useAutosize(ref, value, 320)
  const length = value.trim().length
  return (
    <div>
      {tips && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-400">建议包含</span>
          {tips.map((tip) => (
            <Tag key={tip}>{tip}</Tag>
          ))}
        </div>
      )}
      <textarea
        ref={ref}
        value={value}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={invalid}
        className={cn(fieldClass, 'min-h-28 resize-none py-2.5 leading-7', invalid && 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10')}
      />
      <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
        <span>{shortBelow && length > 0 && length < shortBelow ? <span className="text-amber-600">介绍偏短，JD 可能会出现较多占位</span> : null}</span>
        <span className="tabular-nums">{length} 字</span>
      </div>
    </div>
  )
}

export interface Option {
  value: string
  label: string
  description?: string
}

export function ChoiceCards({ options, value, onChange }: { options: Option[]; value: string; onChange: (value: string) => void }) {
  return (
    <div role="radiogroup" className={cn('grid gap-2', options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:outline-none',
            option.value === value ? 'ai-border [--ai-fill:var(--color-violet-50)]' : 'border border-zinc-200 bg-white hover:border-violet-200',
          )}
        >
          <div className={cn('text-[15px] font-medium', option.value === value ? 'text-violet-700' : 'text-zinc-900')}>{option.label}</div>
          {option.description && <div className="mt-1 text-[13px] leading-5 text-zinc-500">{option.description}</div>}
        </button>
      ))}
    </div>
  )
}

export function SelectBox({
  value,
  options,
  placeholder,
  onChange,
  className,
  size = 'md',
}: {
  value: string
  options: string[]
  placeholder: string
  onChange: (value: string) => void
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldClass, 'appearance-none pr-9', size === 'sm' ? 'h-9 text-sm' : 'h-11', !value && 'text-zinc-400')}
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

export function Segmented({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          onClick={() => onChange(option)}
          className={cn(
            'flex-1 rounded-lg px-3 whitespace-nowrap transition',
            size === 'sm' ? 'h-7 text-[13px]' : 'h-9 text-sm',
            option === value ? 'bg-white font-medium text-violet-700 shadow-soft' : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

interface SingleChipsProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  /** 更多选项放进下拉框 */
  more?: { placeholder: string; options: string[] }
  customPlaceholder?: string
  /** 可选字段：再次点击已选项可取消 */
  clearable?: boolean
}

/** 单选标签 + 更多下拉 + 自定义输入 */
export function SingleChips({ options, value, onChange, more, customPlaceholder, clearable }: SingleChipsProps) {
  const [custom, setCustom] = useState('')
  const isCustom = !!value && !options.includes(value) && !more?.options.includes(value)
  const submitCustom = () => {
    if (custom.trim()) {
      onChange(custom.trim())
      setCustom('')
    }
  }
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {[...options, ...(isCustom ? [value] : [])].map((option) => (
          <Chip key={option} selected={option === value} onClick={() => onChange(clearable && option === value ? '' : option)}>
            {option}
          </Chip>
        ))}
      </div>
      {(more || customPlaceholder) && (
        <div className="flex flex-wrap items-center gap-2">
          {more && (
            <SelectBox
              value={more.options.includes(value) ? value : ''}
              placeholder={more.placeholder}
              options={more.options}
              onChange={onChange}
              size="sm"
              className="w-36"
            />
          )}
          {customPlaceholder && (
            <div className="flex min-w-44 flex-1 items-center gap-2">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    submitCustom()
                  }
                }}
                placeholder={customPlaceholder}
                maxLength={30}
                className={cn(fieldClass, 'h-9 text-sm')}
              />
              <Button size="sm" variant="secondary" onClick={submitCustom} disabled={!custom.trim()} className="h-9" aria-label="使用自定义值">
                <Plus className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** 多选标签 + 自定义添加（顿号或逗号分隔可一次添加多项） */
export function MultiChips({
  options,
  value,
  onChange,
  customPlaceholder,
}: {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  customPlaceholder: string
}) {
  const [custom, setCustom] = useState('')
  const all = [...options, ...value.filter((v) => !options.includes(v))]
  const toggle = (item: string) => onChange(value.includes(item) ? value.filter((x) => x !== item) : [...value, item])
  const add = () => {
    const items = custom
      .split(/[、,，]/)
      .map((s) => s.trim().slice(0, 30))
      .filter(Boolean)
    if (!items.length) return
    onChange([...value, ...items.filter((i) => !value.includes(i))])
    setCustom('')
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {all.map((option) => (
          <Chip key={option} selected={value.includes(option)} onClick={() => toggle(option)}>
            {option}
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              add()
            }
          }}
          placeholder={customPlaceholder}
          maxLength={60}
          className={cn(fieldClass, 'h-9 text-sm')}
        />
        <Button size="sm" variant="secondary" onClick={add} disabled={!custom.trim()} className="h-9" aria-label="添加">
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}
