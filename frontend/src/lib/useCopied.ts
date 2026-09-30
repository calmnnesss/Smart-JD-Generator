import { useState } from 'react'

/** 复制到剪贴板；不支持 Clipboard API 时回退到 execCommand。copied 为最近一次复制的 key，1.6 秒后清除 */
export function useCopied() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(key)
    window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 1600)
  }
  return { copied, copy }
}
