import { useEffect, useState } from 'react'
import type { TechGroup } from '../types'
import { fetchHealth, fetchTechGroups } from './api'

// 进程内缓存：整个页面只请求一次；失败时清空，下次挂载再重试
let llmPromise: Promise<boolean> | null = null
let groupsPromise: Promise<TechGroup[]> | null = null

function useCached<T>(load: () => Promise<T>, onError: () => void, fallback: T): T | null {
  const [value, setValue] = useState<T | null>(null)
  useEffect(() => {
    let cancelled = false
    load()
      .then((v) => !cancelled && setValue(v))
      .catch(() => {
        onError()
        if (!cancelled) setValue(fallback)
      })
    return () => {
      cancelled = true
    }
  }, [load, onError, fallback])
  return value
}

const loadLlm = () => (llmPromise ??= fetchHealth().then((h) => h.llm_configured))
const resetLlm = () => {
  llmPromise = null
}
const loadGroups = () => (groupsPromise ??= fetchTechGroups())
const resetGroups = () => {
  groupsPromise = null
}
const NO_GROUPS: TechGroup[] = []

/** 后端是否配置了中间层 LLM；null 表示还在查询 */
export const useLlmAvailable = () => useCached(loadLlm, resetLlm, false)

/** 技术栈预设标签组；null 表示还在加载 */
export const useTechGroups = () => useCached(loadGroups, resetGroups, NO_GROUPS)
