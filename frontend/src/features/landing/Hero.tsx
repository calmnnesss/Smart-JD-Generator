import { ArrowRight, Plug } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { revealAt } from './motion'

const STATS = [
  { value: '5–6', label: '个输入字段' },
  { value: '4', label: '个生成环节' },
  { value: '8', label: '项审校清单' },
  { value: '7', label: '个 JD 小节' },
]

const PIPELINE = [
  { index: '①', name: '公司文化分析', rule: '只引用' },
  { index: '②', name: '岗位需求提取', rule: '限岗位能力' },
  { index: '③', name: '起草 JD', rule: '只组织' },
  { index: '④', name: '审校', rule: '只删改' },
]

/** 首屏下方的流水线示意：一道光沿四个环节依次流过 */
function PipelinePreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-4xl rounded-3xl border border-zinc-200/70 bg-white/70 p-4 shadow-float backdrop-blur sm:p-6">
      <div className="mb-4 hidden justify-end px-1 text-xs text-zinc-400 sm:flex">约束逐级收紧 →</div>
      <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* 连接线与流光（仅桌面） */}
        <div className="pointer-events-none absolute top-1/2 right-[12%] left-[12%] hidden h-px -translate-y-1/2 bg-zinc-200 sm:block">
          <div className="absolute inset-y-0 w-24 animate-flow bg-linear-to-r from-transparent via-violet-500 to-transparent" />
        </div>
        {PIPELINE.map((stage, i) => (
          <motion.div
            key={stage.name}
            {...revealAt(i, 0.1)}
            className="relative rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 text-left shadow-soft"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-violet-600">{stage.index}</span>
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500">{stage.rule}</span>
            </div>
            <div className="mt-2 text-sm font-medium text-zinc-900">{stage.name}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-28">
      <motion.div {...revealAt(0)} className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/70 px-3 py-1 text-xs text-zinc-600 backdrop-blur">
        <span className="size-1.5 animate-pulse rounded-full bg-violet-500" />
        基于 Dify 工作流 · 四环节约束式生成
      </motion.div>
      <motion.p {...revealAt(1)} className="mt-8 text-sm font-medium tracking-[0.2em] text-zinc-500">
        JD 智能生成器
      </motion.p>
      <motion.h1
        {...revealAt(2)}
        className="mx-auto mt-3 max-w-3xl text-[40px] leading-[1.15] font-semibold tracking-tight text-balance text-zinc-900 sm:text-6xl"
      >
        给用人主管的
        <span className="ai-text"> JD 底稿工具</span>
      </motion.h1>
      <motion.div {...revealAt(3)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/studio"
          className="group relative isolate inline-flex h-12 items-center gap-2 rounded-2xl bg-zinc-900 px-6 text-[15px] font-medium text-white shadow-glow transition before:absolute before:-inset-px before:-z-10 before:rounded-[inherit] before:bg-linear-to-r before:from-ai-indigo before:via-ai-violet before:to-ai-cyan before:opacity-0 before:blur-md before:transition-opacity hover:bg-zinc-800 hover:before:opacity-60"
        >
          在线使用
          <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
        </Link>
        <a
          href="#access"
          className="inline-flex h-12 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 text-[15px] font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          <Plug className="size-4 text-violet-500" />
          MCP 接入
        </a>
      </motion.div>
      <motion.div {...revealAt(4)} className="mt-5">
        <Link to="/studio?demo=1" className="text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-900">
          或者，先看一段示例
        </Link>
      </motion.div>

      <motion.dl {...revealAt(5)} className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-y-6 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center">
            <dt className="order-2 mt-1 text-[13px] text-zinc-500">{stat.label}</dt>
            <dd className="order-1 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </motion.dl>

      <PipelinePreview />
    </section>
  )
}
