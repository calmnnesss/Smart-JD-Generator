/** 落地页统一的进入视野动效 */
export const reveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
}

export const revealAt = (index: number, step = 0.07) => ({
  ...reveal,
  transition: { ...reveal.transition, delay: index * step },
})
