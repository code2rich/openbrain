// 运行时动态检测 API 地址
// 本地访问 localhost:8080 → http://localhost:3456
// 远程访问 192.168.1.x:8080 → http://192.168.1.x:3456
// 也可通过 <script>window.__API_BASE__ = '...'</script> 覆盖
export function getApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:3456'
  if ((window as any).__API_BASE__) return (window as any).__API_BASE__
  return `${window.location.protocol}//${window.location.hostname}:3456`
}
