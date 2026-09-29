import { Tag } from '../../components/ui/Chip'
import type { ParsedHiring } from '../../lib/parseHiring'

export function ParsedSummary({ parsed }: { parsed: ParsedHiring }) {
  const hireText = [parsed.hire_type, parsed.cohort, parsed.experience && `${parsed.experience}经验`]
    .filter(Boolean)
    .join(' · ')
  const found: [string, string | undefined][] = [
    ['岗位', parsed.title],
    ['场景', parsed.scene],
    ['地点', parsed.location],
    ['类型', hireText || undefined],
    ['其他', parsed.extra],
  ]
  const detected = found.filter(([, v]) => v)
  const missing = [
    !parsed.title && '岗位名称',
    !parsed.scene && '业务场景',
    !parsed.location && '工作地点',
    !parsed.hire_type && '招聘类型',
  ].filter(Boolean)

  return (
    <div className="space-y-2.5">
      <p className="text-[15px] leading-7 text-zinc-800">
        {detected.length ? '我从这句话里识别出了：' : '这句话里没识别出结构化信息，我逐项问你。'}
      </p>
      {detected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {detected.map(([key, value]) => (
            <Tag key={key} tone="ai">
              <span className="text-violet-500/80">{key}</span>
              {value}
            </Tag>
          ))}
        </div>
      )}
      {detected.length > 0 && (
        <p className="text-[13px] text-zinc-500">
          {missing.length ? `还缺${missing.join('、')}，我再追问几句。` : '岗位信息很完整。'}
        </p>
      )}
    </div>
  )
}
