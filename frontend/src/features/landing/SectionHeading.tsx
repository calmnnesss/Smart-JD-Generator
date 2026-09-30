import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { reveal } from './motion'

interface SectionHeadingProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
}

/** 区块标题：眉标 + 标题 + 一句说明 */
export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <motion.div {...reveal} className="max-w-2xl">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="h-px w-6 bg-linear-to-r from-ai-indigo to-ai-violet" />
        <span className="text-xs font-medium tracking-[0.18em] text-violet-600 uppercase">{eyebrow}</span>
      </div>
      <h2 className="text-[28px] leading-tight font-semibold tracking-tight text-balance text-zinc-900 sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-8 text-pretty text-zinc-600">{description}</p>}
    </motion.div>
  )
}

export function Section({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-16 py-20 sm:py-28 ${className ?? ''}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  )
}
