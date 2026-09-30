import { ArrowDown, ArrowRight, Check, ChevronDown, MonitorSmartphone, Plug, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { CodeBlock } from '../../components/ui/CodeBlock'
import { CopyButton } from '../../components/ui/CopyButton'
import { cn } from '../../lib/cn'
import { CLIENT_CONFIGS, MCP_PARAMS, MCP_SCHEMA_JSON, MCP_TOOL, MCP_URL } from './mcp'
import { reveal, revealAt } from './motion'
import { Section, SectionHeading } from './SectionHeading'

const WEB_FEATURES = ['一句话 AI 识别，或逐项引导填写', '按工作流节点实时显示生成进度', '复制 Markdown / 纯文本，或下载 .md 文件']

const DEMO_SENTENCE = '招一个杭州的 AI 产品经理，做金融场景的大模型应用，2027 届校招'
const DEMO_FIELDS: [label: string, value: string | null][] = [
  ['岗位', 'AI 产品经理'],
  ['场景', '金融场景的大模型应用'],
  ['地点', '杭州'],
  ['类型', '校招'],
  ['届别', '2027届'],
  ['职级', null],
]

/** 一句话识别示意：一句话 → 表单字段，没识别出的标为待补充 */
function OneLinerDemo() {
  return (
    <div className="mt-7 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4">
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <span>一句话识别</span>
        <span className="flex items-center gap-1 text-violet-600">
          <Sparkles className="size-3" />
          通义千问
        </span>
      </div>
      <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] leading-6 text-zinc-800 shadow-soft ring-1 ring-zinc-200/70">
        {DEMO_SENTENCE}
      </p>
      <div className="my-2.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
        <ArrowDown className="size-3.5" />
        拆成表单字段，没识别出的标为「待补充」
      </div>
      <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {DEMO_FIELDS.map(([label, value], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
            className={cn(
              'min-w-0 rounded-lg px-2.5 py-1.5',
              value ? 'border border-zinc-200/70 bg-white' : 'border border-dashed border-zinc-300',
            )}
          >
            <dt className="text-[10.5px] text-zinc-400">{label}</dt>
            <dd className={cn('truncate text-[12.5px]', value ? 'text-zinc-800' : 'text-zinc-400')}>{value ?? '待补充'}</dd>
          </motion.div>
        ))}
      </dl>
    </div>
  )
}

function CardHeader({ icon: Icon, title, description }: { icon: typeof Plug; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-ai-indigo via-ai-violet to-ai-cyan text-white shadow-glow">
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
      </div>
    </div>
  )
}

function WebCard() {
  return (
    <motion.div {...revealAt(0)} className="flex min-w-0 flex-col rounded-3xl border border-zinc-200/70 bg-white/85 p-5 shadow-float backdrop-blur sm:p-8">
      <CardHeader icon={MonitorSmartphone} title="在线使用" description="在浏览器里填写公司与岗位信息，实时查看生成进度，拿到可以直接复制的 JD 底稿。" />
      <ul className="mt-6 space-y-3">
        {WEB_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-700">
            <Check className="mt-0.5 size-4 shrink-0 text-violet-500" />
            {feature}
          </li>
        ))}
      </ul>
      <OneLinerDemo />
      <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
        <Link
          to="/studio"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white shadow-glow transition hover:bg-zinc-800"
        >
          开始使用
          <ArrowRight className="size-4" />
        </Link>
        <Link to="/studio?demo=1" className="inline-flex h-11 items-center rounded-xl px-3 text-sm text-zinc-600 transition hover:bg-zinc-900/5 hover:text-zinc-900">
          看看示例
        </Link>
      </div>
    </motion.div>
  )
}

function McpCard() {
  const [active, setActive] = useState(CLIENT_CONFIGS[0].id)
  const config = CLIENT_CONFIGS.find((c) => c.id === active)!
  return (
    <motion.div {...revealAt(1)} className="flex min-w-0 flex-col rounded-3xl border border-zinc-200/70 bg-white/85 p-5 shadow-float backdrop-blur sm:p-8">
      <CardHeader icon={Plug} title="MCP 服务" description="作为标准工具暴露给任意 MCP 客户端，在对话里直接调用。" />

      <div className="mt-6">
        <div className="mb-1.5 text-xs text-zinc-500">服务地址</div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 py-1.5 pr-1.5 pl-3">
          <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-zinc-800" title={MCP_URL}>
            {MCP_URL}
          </code>
          <CopyButton text={MCP_URL} label="复制地址" />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-600">Streamable HTTP</span>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-zinc-600">tool: {MCP_TOOL}</span>
        </div>
      </div>

      <div className="mt-6">
        <div role="tablist" aria-label="客户端配置" className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1">
          {CLIENT_CONFIGS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === active}
              onClick={() => setActive(c.id)}
              className={cn(
                'h-8 flex-1 rounded-lg px-2 text-[13px] whitespace-nowrap transition',
                c.id === active ? 'bg-white font-medium text-zinc-900 shadow-soft' : 'text-zinc-500 hover:text-zinc-800',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-3">
          {config.code ? (
            <CodeBlock code={config.code} language={config.language} title={config.language === 'json' ? 'mcp.json' : 'terminal'} />
          ) : (
            <ol className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              {config.steps!.map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white text-[11px] font-medium text-violet-600 shadow-soft">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-xs leading-5 text-zinc-500">{config.note}</p>
        </div>
      </div>

      <p className="mt-6 border-t border-zinc-100 pt-4 text-[13px] leading-6 text-zinc-600">
        返回 markdown 格式的 JD 正文，以及一份「仍需人工补充的信息」清单。
      </p>
    </motion.div>
  )
}

function ParamRow({ param }: { param: (typeof MCP_PARAMS)[number] }) {
  const [open, setOpen] = useState(false)
  const expandable = param.description !== param.summary
  return (
    <div className="grid gap-x-6 gap-y-1.5 border-t border-zinc-100 px-5 py-4 first:border-t-0 sm:grid-cols-[13rem_4rem_minmax(0,1fr)] sm:px-6">
      <code className="font-mono text-[13px] font-medium text-zinc-900">{param.name}</code>
      <span>
        <span className={cn('rounded-md px-1.5 py-0.5 text-[11px]', param.required ? 'bg-violet-50 text-violet-700' : 'bg-zinc-100 text-zinc-500')}>
          {param.required ? '必填' : '选填'}
        </span>
      </span>
      <div className="text-[13px] leading-6 text-zinc-600">
        {open ? param.description : param.summary}
        {expandable && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="ml-1.5 text-violet-600 hover:text-violet-800">
            {open ? '收起' : '展开'}
          </button>
        )}
      </div>
    </div>
  )
}

export function Access() {
  const required = MCP_PARAMS.filter((p) => p.required).length
  return (
    <Section id="access">
      <SectionHeading
        eyebrow="接入方式"
        title="两种使用方式，同一条工作流"
        description="网页端适合直接生成；MCP 适合在 AI 客户端的对话里调用，也能被其他 Agent 当作工具编排。"
      />
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <WebCard />
        <McpCard />
      </div>

      <motion.div {...reveal} className="mt-5 overflow-hidden rounded-3xl border border-zinc-200/70 bg-white/85 shadow-soft">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-100 px-5 py-4 sm:px-6">
          <h3 className="text-[15px] font-semibold text-zinc-900">
            工具参数 <code className="ml-1 font-mono text-[13px] font-normal text-zinc-500">{MCP_TOOL}</code>
          </h3>
          <span className="text-xs text-zinc-500">
            {required} 个必填 · {MCP_PARAMS.length - required} 个选填 · 均为 string
          </span>
        </div>
        <div className="hidden grid-cols-[13rem_4rem_minmax(0,1fr)] gap-x-6 bg-zinc-50/70 px-6 py-2 text-xs text-zinc-400 sm:grid">
          <span>参数</span>
          <span>是否必填</span>
          <span>说明</span>
        </div>
        {MCP_PARAMS.map((param) => (
          <ParamRow key={param.name} param={param} />
        ))}
        <details className="group border-t border-zinc-100">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm text-zinc-700 hover:bg-zinc-50/70 sm:px-6">
            完整 Schema（JSON）
            <ChevronDown className="size-4 text-zinc-400 transition group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 sm:px-6">
            <CodeBlock code={MCP_SCHEMA_JSON} language="json" title="schema.json" wrap className="[&_pre]:max-h-96" />
          </div>
        </details>
      </motion.div>
    </Section>
  )
}
