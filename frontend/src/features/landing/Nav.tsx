import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Logo } from '../../components/ui/Logo'
import { cn } from '../../lib/cn'

const LINKS = [
  { href: '#how', label: '工作原理' },
  { href: '#workflow', label: '工作流' },
  { href: '#stack', label: '技术实现' },
  { href: '#access', label: '接入' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-30 transition-colors duration-300',
        scrolled ? 'border-b border-zinc-200/70 bg-canvas/75 backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-900/5 hover:text-zinc-900">
              {link.label}
            </a>
          ))}
        </nav>
        <Link
          to="/studio"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 text-sm font-medium text-white shadow-soft transition hover:bg-zinc-800"
        >
          在线使用
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </header>
  )
}
