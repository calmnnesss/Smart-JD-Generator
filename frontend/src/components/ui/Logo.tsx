import { Link } from 'react-router'
import { AIOrb } from './AIOrb'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:outline-none">
      <AIOrb size={24} />
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
        Smart JD
        <span className="ml-2 hidden text-[13px] font-normal text-zinc-500 sm:inline">JD 智能生成器</span>
      </span>
    </Link>
  )
}
