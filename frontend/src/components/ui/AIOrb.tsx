import { cn } from '../../lib/cn'

interface AIOrbProps {
  size?: number
  thinking?: boolean
  className?: string
}

/** AI 头像：缓慢旋转的渐变球体，思考时加速并带呼吸光晕 */
export function AIOrb({ size = 28, thinking = false, className }: AIOrbProps) {
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }} aria-hidden>
      {thinking && (
        <span className="absolute -inset-[35%] animate-breathe rounded-full bg-[radial-gradient(closest-side,rgb(139_92_246/0.35),transparent)]" />
      )}
      <span className="absolute inset-0 overflow-hidden rounded-full shadow-[inset_0_-3px_6px_rgb(49_46_129/0.35),0_2px_8px_-2px_rgb(99_102_241/0.5)]">
        <span
          className={cn(
            'absolute -inset-1/4 bg-[conic-gradient(from_0deg,#6366f1,#8b5cf6,#22d3ee,#a78bfa,#6366f1)] blur-[3px]',
            thinking ? 'animate-orb-fast' : 'animate-orb',
          )}
        />
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgb(255_255_255/0.9),rgb(255_255_255/0.2)_38%,transparent_62%)]" />
      </span>
    </span>
  )
}
