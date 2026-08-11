# 3.1.0-beta.1

## 新功能 (Feat)

- 支持账号注销删除
- 更新窗口下载中支持取消
- 添加getUserTempToken插件api
- 支持私有部署同步服务

## 修复 (Fix)

- 修复为本地启动项和匹配类指令设置别名后无法搜索的问题，并保留本地启动项原名搜索能力（PR [#621](../../pull/621)，感谢 [@Particaly](https://github.com/Particaly) 的贡献 🎉）
- 修复 Windows 启动 UWP 应用后未获得前台焦点的问题
- 修复 Windows 扫描本地应用时，原生快捷方式扫描异常可能导致主程序崩溃的问题

## 优化 (Optimize)

- 优化全部指令的打开速度
- 优化 AI 模型未配置供应商时的空状态样式

## 重构 (Refactor)

无

## 其他 (Chore)

- 新增基于 Playwright Electron 的端到端测试支持，覆盖主窗口、内置设置插件和私有部署同步流程

---
