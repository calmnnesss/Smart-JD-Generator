import { Activity, ArrowDown, ArrowRight, Container, KeyRound, Layers, Puzzle, Sparkles, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { AIOrb } from '../../components/ui/AIOrb'
import { cn } from '../../lib/cn'
import { reveal, revealAt } from './motion'
import { Section, SectionHeading } from './SectionHeading'

const POINTS: { icon: LucideIcon; title: string; body: string; tag: string }[] = [
  {
    icon: Activity,
    title: '流式生成进度',
    body: '后端以 streaming 模式调用 Dify，把节点事件精简成阶段事件经 SSE 推给前端，页面按真实进度逐步点亮。',
    tag: 'POST /workflows/run · SSE',
  },
  {
    icon: Sparkles,
    title: 'LLM 中间层',
    body: '通义千问把一句话拆成结构化字段。城市、届别、年限必须能在原文中找到，否则丢弃；调用失败自动回退本地规则。',
    tag: 'qwen-flash · JSON mode',
  },
  {
    icon: Layers,
    title: '受约束的推荐',
    body: '技术栈是 20 组人工整理的标签，模型只判断岗位属于哪一组，不生成标签名，避免推荐不存在的技术。',
    tag: 'classify → 20 groups',
  },
  {
    icon: Puzzle,
    title: '入参拼接',
    body: '结构化表单在后端拼成工作流的 6 个入参；福利与技术栈逐字传递，不做改写或扩充。',
    tag: 'compose.py',
  },
  {
    icon: KeyRound,
    title: '密钥只在服务端',
    body: '前端只和自家 FastAPI 通信，Dify 与千问的 Key 从不下发，节点名与 prompt 也不会出现在浏览器里。',
    tag: 'FastAPI · 薄后端',
  },
  {
    icon: Container,
    title: '单容器部署',
    body: '多阶段构建：Node 构建前端，FastAPI 同时托管静态页面与 API，一个容器、一个端口即可上线。',
    tag: 'Docker · multi-stage',
  },
]

const STACK = ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'Motion', 'FastAPI', 'httpx', 'Pydantic', 'Dify Workflow', '通义千问', 'Docker']

function Box({ title, detail, accent, children }: { title: string; detail?: string; accent?: boolean; children?: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-3.5',
        accent ? 'ai-border shadow-glow [--ai-fill:#f6f3ff]' : 'border border-zinc-200/80 bg-white shadow-soft',
      )}
    >
      <div className={cn('text-sm font-semibold', accent ? 'text-violet-800' : 'text-zinc-900')}>{title}</div>
      {detail && <div className="mt-0.5 text-xs leading-5 text-zinc-500">{detail}</div>}
      {children}
    </div>
  )
}

function Connector({ label, vertical }: { label: string; vertical?: boolean }) {
  return (
    <div className={cn('flex items-center justify-center gap-1 text-zinc-300', vertical ? 'flex-row py-1' : 'flex-col px-1')}>
      {vertical ? <ArrowDown className="size-4" /> : <ArrowRight className="size-4" />}
      <span className="font-mono text-[10px] whitespace-nowrap text-zinc-400">{label}</span>
    </div>
  )
}

const QWEN = (
  <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/60 px-2.5 py-2 text-left">
    <AIOrb size={16} />
    <div>
      <div className="text-xs font-medium text-violet-800">中间层 · 通义千问</div>
      <div className="text-[11px] text-violet-700/70">一句话识别 · 岗位分类</div>
    </div>
  </div>
)

/** 系统架构：网页与 MCP 两条链路最终汇入同一个 Dify 工作流 */
function Architecture() {
  return (
    <motion.div {...reveal} className="mt-12 rounded-3xl border border-zinc-200/70 bg-white/70 p-5 shadow-float backdrop-blur sm:p-8">
      {/* 桌面：两行链路，右侧工作流跨两行 */}
      <div className="hidden grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1.2fr)_auto_minmax(0,1fr)] items-center gap-y-6 lg:grid">
        <span className="pr-4 text-xs text-zinc-400">网页</span>
        <Box title="浏览器 · React SPA" detail="分步表单 · 生成进度 · JD 文档" />
        <Connector label="JSON / SSE" />
        <Box title="FastAPI 薄后端" detail="校验 · 拼接入参 · 事件精简">
          {QWEN}
        </Box>
        <Connector label="workflows/run" />
        <div className="row-span-2 self-stretch">
          <div className="flex h-full flex-col justify-center">
            <Box title="Dify 工作流" detail="检索 → ① 文化 → ② 需求 → ③ 起草 → ④ 审校" accent />
          </div>
        </div>
        <span className="pr-4 text-xs text-zinc-400">MCP</span>
        <Box title="MCP 客户端" detail="Claude · Cursor 等" />
        <Connector label="Streamable HTTP" />
        <Box title="Dify MCP Server" detail={`工具：JD_generator_v3`} />
        <Connector label="tool call" />
      </div>

      {/* 移动端：两条链路纵向排列 */}
      <div className="space-y-6 lg:hidden">
        <div>
          <div className="mb-2 text-xs text-zinc-400">网页链路</div>
          <Box title="浏览器 · React SPA" detail="分步表单 · 生成进度 · JD 文档" />
          <Connector label="JSON / SSE" vertical />
          <Box title="FastAPI 薄后端" detail="校验 · 拼接入参 · 事件精简">
            {QWEN}
          </Box>
          <Connector label="workflows/run" vertical />
          <Box title="Dify 工作流" detail="检索 → ① 文化 → ② 需求 → ③ 起草 → ④ 审校" accent />
        </div>
        <div>
          <div className="mb-2 text-xs text-zinc-400">MCP 链路</div>
          <Box title="MCP 客户端" detail="Claude · Cursor 等" />
          <Connector label="Streamable HTTP" vertical />
          <Box title="Dify MCP Server" detail="工具：JD_generator_v3" />
          <Connector label="tool call" vertical />
          <Box title="Dify 工作流" detail="与网页链路是同一条工作流" accent />
        </div>
      </div>
    </motion.div>
  )
}

export function Engineering() {
  return (
    <Section id="stack">
      <SectionHeading
        eyebrow="技术实现"
        title="一个薄后端，把两段 AI 串成产品"
        description="表单侧用小模型做结构化，生成侧交给 Dify 工作流；Key、prompt 与节点细节都留在服务端。"
      />
      <Architecture />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body, tag }, i) => (
          <motion.div key={title} {...revealAt(i, 0.06)} className="flex flex-col rounded-2xl border border-zinc-200/70 bg-white/80 p-5 shadow-soft">
            <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Icon className="size-4.5" />
            </span>
            <h3 className="mt-4 text-[15px] font-semibold text-zinc-900">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
            <span className="mt-auto self-start pt-5">
              <code className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-600">{tag}</code>
            </span>
          </motion.div>
        ))}
      </div>
      <motion.div {...reveal} className="mt-10 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-xs tracking-[0.18em] text-zinc-400 uppercase">Stack</span>
        {STACK.map((item) => (
          <span key={item} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[13px] text-zinc-700">
            {item}
          </span>
        ))}
      </motion.div>
    </Section>
  )
}
