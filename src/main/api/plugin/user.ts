import { getCurrentUserInfo } from '../../core/account/userProfileStore'
import { registerPluginApiServices } from './pluginApiDispatcher'

/**
 * 插件用户 API，向插件提供当前登录用户的公开资料。
 */
export class PluginUserAPI {
  /**
   * 注册同步用户资料 API。
   * @returns 无返回值
   */
  public init(): void {
    // getUser 使用同步 IPC，保证与公开 API 的同步签名一致。
    registerPluginApiServices({ getUser: this.handleGetUser })
  }

  /**
   * 将当前用户公开资料写入同步 IPC 返回值。
   * @param event 插件发起的同步 IPC 事件
   * @returns 无返回值
   */
  private handleGetUser(event: Electron.IpcMainEvent): void {
    event.returnValue = getCurrentUserInfo()
  }
}

export default new PluginUserAPI()
