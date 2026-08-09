export const OFFICIAL_SYNC_SERVER_URL = 'wss://z-tools.top'

/**
 * 将用户输入的 HTTP 或 WebSocket 地址规范化为同步客户端使用的 WebSocket origin。
 * @param input 用户填写的同步服务器地址。
 * @returns 去除末尾斜杠后的 ws 或 wss 服务地址。
 * @throws 当地址为空、协议不受支持、包含凭据、查询参数、锚点或非根路径时抛出错误。
 */
export function normalizeSyncServerUrl(input: string): string {
  const value = input.trim()
  if (!value) throw new Error('请填写服务器地址')

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('服务器地址格式不正确')
  }

  // 同步协议当前挂载在服务根路径，拒绝容易产生错误请求地址的额外 URL 部分。
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
    throw new Error('服务器地址仅支持 http、https、ws 或 wss 协议')
  }
  if (!parsed.hostname) throw new Error('服务器地址缺少主机名')
  if (parsed.username || parsed.password) throw new Error('服务器地址不能包含账号或密码')
  if (parsed.search || parsed.hash) throw new Error('服务器地址不能包含查询参数或锚点')
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error('服务器地址暂不支持子路径')
  }

  parsed.protocol = parsed.protocol === 'https:' || parsed.protocol === 'wss:' ? 'wss:' : 'ws:'
  parsed.pathname = ''
  return parsed.origin
}

/**
 * 判断给定地址是否指向 ZTools 官方同步服务。
 * @param input 待判断的同步服务器地址。
 * @returns 地址规范化后与官方服务一致时返回 true。
 */
export function isOfficialSyncServerUrl(input?: string | null): boolean {
  if (!input) return false
  try {
    return normalizeSyncServerUrl(input) === OFFICIAL_SYNC_SERVER_URL
  } catch {
    return false
  }
}
