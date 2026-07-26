export const GITHUB_REPOSITORY_URL = 'https://github.com/ZToolsCenter/ZTools'
export const GITHUB_RELEASES_URL = `${GITHUB_REPOSITORY_URL}/releases`
export const GITHUB_LATEST_RELEASE_URL = `${GITHUB_RELEASES_URL}/latest`

/**
 * 生成指定版本的 GitHub Release 页面地址。
 * @param version 目标版本号，不包含前导 v；为空时返回最新正式版页面。
 * @returns GitHub Release 页面地址。
 */
export function getGitHubReleaseUrl(version?: string): string {
  if (!version) return GITHUB_LATEST_RELEASE_URL
  return `${GITHUB_RELEASES_URL}/tag/v${encodeURIComponent(version)}`
}
