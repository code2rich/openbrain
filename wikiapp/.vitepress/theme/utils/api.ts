// 运行时动态检测 API 地址
// 端口由环境变量 API_PORT（.env）驱动，通过 VITE_API_PORT 注入前端
const API_PORT = import.meta.env.VITE_API_PORT || '3457'

export function getApiBase(): string {
  if (typeof window === 'undefined') return `http://localhost:${API_PORT}`
  if ((window as any).__API_BASE__) return (window as any).__API_BASE__
  return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`
}
