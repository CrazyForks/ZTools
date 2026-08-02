import { app } from 'electron'
import lmdbInstance from '../lmdb/lmdbInstance'
import pluginDeviceAPI from '../../api/plugin/device'
import { httpRequest } from '../../utils/httpRequest'
import { DEFAULT_SYNC_SERVER_URL, syncServerUrlToHttp } from '../../api/renderer/pluginMarketConfig'
import { getUpdateSystemType, type ServerUpdateInfo } from '../../api/serverUpdateCatalog'

const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000

type StoredSyncConfig = {
  serverUrl?: string
  token?: string
  refreshToken?: string
  username?: string
}

class ActivityHeartbeatService {
  private timer: NodeJS.Timeout | null = null
  private inFlight = false
  private updateHandler: ((update: ServerUpdateInfo | null) => void | Promise<void>) | null = null

  /**
   * 注册心跳更新信息的消费回调。
   * @param handler 接收服务端更新信息的回调函数。
   * @returns 无返回值。
   */
  setUpdateHandler(handler: (update: ServerUpdateInfo | null) => void | Promise<void>): void {
    this.updateHandler = handler
  }

  start(): void {
    if (this.timer) return
    void this.sendHeartbeat()
    this.timer = setInterval(() => {
      void this.sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  runNow(): void {
    void this.sendHeartbeat()
  }

  private async sendHeartbeat(): Promise<void> {
    if (this.inFlight) return
    this.inFlight = true
    try {
      const config = await this.loadConfig()
      const response = await this.postHeartbeat(config)
      if (response.status !== 401) {
        await this.updateHandler?.(response.update)
        return
      }
      const refreshed = await this.refreshToken(config)
      if (refreshed) {
        const retry = await this.postHeartbeat(refreshed)
        await this.updateHandler?.(retry.update)
      }
    } catch (error) {
      console.warn('[ActivityHeartbeat] 上报失败:', error)
    } finally {
      this.inFlight = false
    }
  }

  /**
   * 向官方服务端提交当前设备的活跃心跳和 ZTools 版本。
   * @param config 当前同步账号配置；未登录时为 null
   * @returns 服务端返回的 HTTP 状态码和更新信息
   */
  private async postHeartbeat(
    config: StoredSyncConfig | null
  ): Promise<{ status: number; update: ServerUpdateInfo | null }> {
    const deviceId = pluginDeviceAPI.getDeviceIdPublic()
    const token = config?.serverUrl === DEFAULT_SYNC_SERVER_URL ? config.token : ''

    // 使用 Electron 实际应用版本，确保开发和打包环境的上报来源一致。
    const ztoolsVersion = app.getVersion()
    const response = await httpRequest(
      `${syncServerUrlToHttp(DEFAULT_SYNC_SERVER_URL)}/api/activity/heartbeat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          deviceId,
          uid: token ? config?.username || '' : '',
          ztoolsVersion,
          systemType: getUpdateSystemType()
        }),
        validateStatus: (status) => (status >= 200 && status < 300) || status === 401
      }
    )
    return {
      status: response.status,
      update: response.status === 200 ? (response.data?.update ?? null) : null
    }
  }

  private async refreshToken(config: StoredSyncConfig | null): Promise<StoredSyncConfig | null> {
    if (!config?.refreshToken || config.serverUrl !== DEFAULT_SYNC_SERVER_URL) {
      return null
    }
    const response = await httpRequest(
      `${syncServerUrlToHttp(DEFAULT_SYNC_SERVER_URL)}/api/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: config.refreshToken }),
        validateStatus: (status) => status >= 200 && status < 500
      }
    )
    if (response.status !== 200 || !response.data?.token || !response.data?.refreshToken) {
      return null
    }
    const nextConfig = {
      ...config,
      token: response.data.token,
      refreshToken: response.data.refreshToken
    }
    const existingDoc = await lmdbInstance.promises.get('SYNC/config')
    await lmdbInstance.promises.put({
      _id: 'SYNC/config',
      _rev: existingDoc?._rev,
      data: nextConfig
    })
    return nextConfig
  }

  private async loadConfig(): Promise<StoredSyncConfig | null> {
    try {
      const doc = await lmdbInstance.promises.get('SYNC/config')
      return doc?.data || null
    } catch {
      return null
    }
  }
}

export default new ActivityHeartbeatService()
