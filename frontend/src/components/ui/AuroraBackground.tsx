/** 页面背景：极淡的渐变光晕 + 点阵网格，营造「AI 在场」的氛围 */
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent_75%)]" />
      <div className="absolute -top-[28rem] -left-[12rem] size-[46rem] animate-aurora rounded-full bg-indigo-300/25 blur-3xl" />
      <div className="absolute -top-[30rem] right-[-10rem] size-[42rem] animate-aurora rounded-full bg-violet-300/25 blur-3xl [animation-delay:-7s]" />
      <div className="absolute top-[-18rem] left-1/3 size-[30rem] animate-aurora rounded-full bg-cyan-200/30 blur-3xl [animation-delay:-13s]" />
    </div>
  )
}
