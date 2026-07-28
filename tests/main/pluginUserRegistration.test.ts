import { describe, expect, it, vi } from 'vitest'

const { getCurrentUserInfo, registerPluginApiServices } = vi.hoisted(() => ({
  getCurrentUserInfo: vi.fn(),
  registerPluginApiServices: vi.fn()
}))

vi.mock('../../src/main/core/account/userProfileStore', () => ({ getCurrentUserInfo }))
vi.mock('../../src/main/api/plugin/pluginApiDispatcher', () => ({ registerPluginApiServices }))

import pluginUserAPI from '../../src/main/api/plugin/user'

describe('plugin user API registration', () => {
  it('registers getUser as a synchronous API handler', () => {
    const user = { avatar: 'avatar.png', nickname: 'Zing', uid: 'zing' }
    getCurrentUserInfo.mockReturnValue(user)

    pluginUserAPI.init()

    const services = registerPluginApiServices.mock.calls[0][0]
    const event = { returnValue: undefined } as unknown as Electron.IpcMainEvent
    services.getUser(event)

    expect(event.returnValue).toEqual(user)
  })
})
