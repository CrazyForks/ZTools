import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  screen: { getDisplayNearestPoint: vi.fn() }
}))

vi.mock('../../src/main/api/shared/database', () => ({
  default: { dbGet: vi.fn(), dbPut: vi.fn() }
}))

vi.mock('../../src/main/core/native/index.js', () => ({
  WindowManager: { getActiveWindow: vi.fn() }
}))

const { isFullscreenWindow, isWindowsDesktopWindow } =
  await import('../../src/main/core/dndManager')

// 以下尺寸全部来自 MacBook Air M4（1470x956 bounds，含刘海）与 Windows 1920x1080 的实测采样
const MAC = { bounds: { x: 0, y: 0, width: 1470, height: 956 } }
const WIN = { bounds: { x: 0, y: 0, width: 1920, height: 1080 } }

describe('isFullscreenWindow', () => {
  it('macOS 只使用 native 返回的全屏状态', () => {
    expect(isFullscreenWindow({ app: 'Safari.app', isFullscreen: true }, MAC, 'darwin')).toBe(true)
    expect(
      isFullscreenWindow(
        { app: 'Safari.app', isFullscreen: false, x: 0, y: 33, width: 1470, height: 923 },
        MAC,
        'darwin'
      )
    ).toBe(false)
    expect(
      isFullscreenWindow(
        { app: 'Safari.app', x: 0, y: 33, width: 1470, height: 923 },
        MAC,
        'darwin'
      )
    ).toBe(false)
  })

  it('识别 Windows 全屏游戏', () => {
    expect(
      isFullscreenWindow({ app: 'game.exe', x: 0, y: 0, width: 1920, height: 1080 }, WIN, 'win32')
    ).toBe(true)
  })

  it('排除 Windows 桌面 Shell 窗口', () => {
    for (const className of ['Progman', 'WorkerW', 'Shell_TrayWnd']) {
      expect(
        isFullscreenWindow(
          { app: 'explorer.exe', className, x: 0, y: 0, width: 1920, height: 1080 },
          WIN,
          'win32'
        )
      ).toBe(false)
      expect(isWindowsDesktopWindow({ app: 'explorer.exe', className })).toBe(true)
    }
  })

  it('不把 Explorer 文件夹窗口当作桌面', () => {
    expect(isWindowsDesktopWindow({ app: 'explorer.exe', className: 'CabinetWClass' })).toBe(false)
    expect(
      isFullscreenWindow(
        { app: 'explorer.exe', className: 'CabinetWClass', x: 0, y: 0, width: 1920, height: 1080 },
        WIN,
        'win32'
      )
    ).toBe(true)
  })

  it('排除 Windows 最大化窗口：底部留有任务栏空间', () => {
    expect(
      isFullscreenWindow({ app: 'app.exe', x: 0, y: 0, width: 1920, height: 1032 }, WIN, 'win32')
    ).toBe(false)
  })

  it('尺寸缺失时不判定为全屏', () => {
    expect(
      isFullscreenWindow({ app: 'app.exe', x: 0, y: 0, width: 0, height: 0 }, WIN, 'win32')
    ).toBe(false)
    expect(isFullscreenWindow({ app: 'app.exe', x: 0, y: 0 }, WIN, 'win32')).toBe(false)
  })

  it('排除 ZTools 自身窗口', () => {
    const self = { x: 0, y: 33, width: 1470, height: 923, pid: process.pid }
    expect(isFullscreenWindow({ app: 'ZTools.app', ...self }, MAC, 'darwin')).toBe(false)
  })

  it('在副屏上按该屏幕的 bounds 判定', () => {
    const secondary = { bounds: { x: 1470, y: 0, width: 2560, height: 1440 } }
    expect(
      isFullscreenWindow(
        { app: 'game.exe', x: 1470, y: 0, width: 2560, height: 1440 },
        secondary,
        'win32'
      )
    ).toBe(true)
    expect(
      isFullscreenWindow(
        { app: 'app.exe', x: 1470, y: 0, width: 2560, height: 1300 },
        secondary,
        'win32'
      )
    ).toBe(false)
  })
})
