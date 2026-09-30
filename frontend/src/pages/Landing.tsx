import { ArrowRight, Globe, PenLine, ShieldCheck, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { AIOrb } from '../components/ui/AIOrb'
import { AuroraBackground } from '../components/ui/AuroraBackground'
import { Logo } from '../components/ui/Logo'

const FLOW = [
  { icon: Sparkles, title: '一句话或逐项填写', text: '一句话描述岗位，AI 拆解成结构化字段并提示缺失项；也可以逐项引导填写' },
  { icon: Globe, title: '读取公司官网', text: '读取官网正文，结合你提供的公司介绍补足背景' },
  { icon: PenLine, title: '起草并自我审校', text: '提炼亮点与能力画像，撰写后再核对事实依据' },
  { icon: ShieldCheck, title: '不编造', text: '只使用你提供的信息和官网内容，拿不准的内容不写' },
]

const ease = [0.22, 1, 0.36, 1] as const

/** 落地页（占位）：项目介绍的正式内容下一步再补充 */
export default function Landing() {
  return (
    <div className="min-h-dvh">
      <AuroraBackground />
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Link to="/studio" className="text-sm text-zinc-600 transition hover:text-zinc-900">
          开始体验
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="flex flex-col items-center pt-16 pb-20 text-center sm:pt-24">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease }}>
            <AIOrb size={64} thinking />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease }}
            className="mt-8 max-w-3xl text-4xl leading-[1.15] font-semibold tracking-tight text-balance text-zinc-900 sm:text-6xl"
          >
            把招聘需求，变成一份
            <span className="ai-text">不编造</span>
            的 JD
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="mt-6 max-w-xl text-base leading-8 text-pretty text-zinc-600 sm:text-lg"
          >
            填写公司与岗位信息，AI 工作流会读取公司官网、提炼亮点，起草并审校一份招聘启事底稿。
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/studio"
              className="group relative isolate inline-flex h-12 items-center gap-2 rounded-2xl bg-zinc-900 px-6 text-[15px] font-medium text-white shadow-glow transition hover:bg-zinc-800 before:absolute before:-inset-px before:-z-10 before:rounded-[inherit] before:bg-linear-to-r before:from-ai-indigo before:via-ai-violet before:to-ai-cyan before:opacity-0 before:blur-md before:transition-opacity hover:before:opacity-60"
            >
              开始体验
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/studio?demo=1"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 text-[15px] font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <Sparkles className="size-4 text-violet-500" />
              看看示例
            </Link>
          </motion.div>
        </section>

        <section className="grid gap-3 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map(({ icon: Icon, title, text }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.08, ease }}
              className="rounded-2xl border border-zinc-200/70 bg-white/70 p-5 shadow-soft backdrop-blur"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600">
                  <Icon className="size-4" />
                </span>
                <span className="text-xs text-zinc-400 tabular-nums">0{index + 1}</span>
              </div>
              <h3 className="text-[15px] font-medium text-zinc-900">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-6 text-zinc-500">{text}</p>
            </motion.div>
          ))}
        </section>

        {/* 下一步：项目背景、工作流设计、迭代记录等介绍区块 */}
      </main>

      <footer className="border-t border-zinc-200/60 py-8 text-center text-xs text-zinc-400">Smart JD · JD 智能生成器</footer>
    </div>
  )
}
