import { Link } from 'react-router'
import { Logo } from '../../components/ui/Logo'

export function Footer() {
  return (
    <footer className="border-t border-zinc-200/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <Logo />
          <span className="text-xs text-zinc-400">基于 Dify 工作流构建的 JD 底稿工具</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-zinc-500">
          <Link to="/studio" className="transition hover:text-zinc-900">
            在线使用
          </Link>
          <a href="#access" className="transition hover:text-zinc-900">
            MCP 接入
          </a>
          <a href="#workflow" className="transition hover:text-zinc-900">
            工作流架构
          </a>
        </nav>
      </div>
    </footer>
  )
}
