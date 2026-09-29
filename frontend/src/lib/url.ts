/** 官网地址：补全协议头、校验格式、提取域名 */

export function normalizeUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return value
  return /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`
}

export function validateUrl(raw: string): string | null {
  if (!raw.trim()) return '请填写官网地址'
  try {
    const url = new URL(normalizeUrl(raw))
    if (!url.hostname.includes('.') || /\s/.test(raw.trim())) return '看起来不是有效的网址'
    return null
  } catch {
    return '看起来不是有效的网址'
  }
}

export function hostOf(raw: string): string {
  try {
    return new URL(normalizeUrl(raw)).hostname.replace(/^www\./, '')
  } catch {
    return raw
  }
}
