import lmdbInstance from '../../core/lmdb/lmdbInstance'
import type { HttpRequestOptions, HttpResponse } from '../../utils/httpRequest'
import { httpRequest } from '../../utils/httpRequest.js'

export const DEFAULT_PLUGIN_MARKET_API_BASE = 'https://z-tools.top/api/market'
export const DEFAULT_SYNC_SERVER_URL = 'wss://z-tools.top'

type StoredSyncConfig = {
  enabled?: boolean
  serverUrl?: string
  token?: string
  refreshToken?: string
  syncInterval?: number
  lastSyncTime?: number
  deviceId?: string
  username?: string
}

export class PluginMarketAuthRequiredError extends Error {
  constructor(message = '需要登录后操作') {
    super(message)
    this.name = 'PluginMarketAuthRequiredError'
  }
}

export function getPluginMarketApiBase(): string {
  return DEFAULT_PLUGIN_MARKET_API_BASE
}

export async function getPluginMarketAuthHeaders(
  marketApiBase = getPluginMarketApiBase()
): Promise<Record<string, string>> {
  void marketApiBase
  try {
    const config = await getStoredSyncConfig()
    if (!config?.token || config.serverUrl !== DEFAULT_SYNC_SERVER_URL) {
      return {}
    }
    return { Authorization: `Bearer ${config.token}` }
  } catch {
    return {}
  }
}

export async function requestPluginMarket(
  path: string,
  options: HttpRequestOptions = {}
): Promise<HttpResponse> {
  const marketApiBase = getPluginMarketApiBase()
  const url = path.startsWith('http') ? path : `${marketApiBase}${path}`
  const response = await requestPluginMarketOnce(url, marketApiBase, options)
  if (response.status !== 401) {
    assertOK(response)
    return response
  }

  const refreshed = await refreshPluginMarketToken(marketApiBase)
  if (!refreshed) {
    throw new PluginMarketAuthRequiredError()
  }

  const retry = await requestPluginMarketOnce(url, marketApiBase, options)
  if (retry.status === 401) {
    throw new PluginMarketAuthRequiredError()
  }
  assertOK(retry)
  return retry
}

export async function savePluginMarketTokens(input: {
  serverUrl?: string
  token: string
  refreshToken?: string
  username?: string
}): Promise<void> {
  const existingDoc = await lmdbInstance.promises.get('SYNC/config')
  const current = (existingDoc?.data || {}) as StoredSyncConfig
  const next: StoredSyncConfig = {
    ...current,
    enabled: Boolean(current.enabled),
    serverUrl: input.serverUrl || current.serverUrl || DEFAULT_SYNC_SERVER_URL,
    token: input.token,
    refreshToken: input.refreshToken || current.refreshToken || '',
    syncInterval: current.syncInterval || 30,
    lastSyncTime: current.lastSyncTime || 0,
    username: input.username || current.username
  }
  await lmdbInstance.promises.put({
    _id: 'SYNC/config',
    _rev: existingDoc?._rev,
    data: next
  })
}

async function requestPluginMarketOnce(
  url: string,
  marketApiBase: string,
  options: HttpRequestOptions
): Promise<HttpResponse> {
  const authHeaders = await getPluginMarketAuthHeaders(marketApiBase)
  return httpRequest(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders
    },
    validateStatus: (status) => (status >= 200 && status < 300) || status === 401
  })
}

async function refreshPluginMarketToken(marketApiBase: string): Promise<boolean> {
  const config = await getStoredSyncConfig()
  if (!config?.refreshToken || config.serverUrl !== DEFAULT_SYNC_SERVER_URL) {
    return false
  }
  const endpoint = `${new URL(marketApiBase).origin}/api/auth/refresh`
  const response = await httpRequest(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: config.refreshToken }),
    validateStatus: (status) => status >= 200 && status < 500
  })
  if (response.status !== 200) {
    return false
  }
  const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
  if (!data?.token || !data?.refreshToken) {
    return false
  }
  await savePluginMarketTokens({
    serverUrl: config.serverUrl,
    token: data.token,
    refreshToken: data.refreshToken,
    username: config.username
  })
  return true
}

async function getStoredSyncConfig(): Promise<StoredSyncConfig | null> {
  const doc = await lmdbInstance.promises.get('SYNC/config')
  return doc?.data || null
}

function assertOK(response: HttpResponse): void {
  if (response.status >= 200 && response.status < 300) return
  const data = typeof response.data === 'string' ? safeParseJSON(response.data) : response.data
  throw new Error(data?.error || `Request failed with status code ${response.status}`)
}

function safeParseJSON(value: string): any {
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

export function syncServerUrlToHttp(serverUrl: string): string {
  return serverUrl.replace(/^ws:\/\//, 'http://').replace(/^wss:\/\//, 'https://')
}
