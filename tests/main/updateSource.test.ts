import { describe, expect, it } from 'vitest'
import {
  getGitHubReleaseUrl,
  GITHUB_LATEST_RELEASE_URL,
  GITHUB_RELEASES_URL,
  GITHUB_REPOSITORY_URL
} from '../../src/shared/updateSource'

describe('GitHub update source', () => {
  it('exposes the repository and Release entry URLs', () => {
    expect(GITHUB_REPOSITORY_URL).toBe('https://github.com/ZToolsCenter/ZTools')
    expect(GITHUB_RELEASES_URL).toBe('https://github.com/ZToolsCenter/ZTools/releases')
    expect(GITHUB_LATEST_RELEASE_URL).toBe('https://github.com/ZToolsCenter/ZTools/releases/latest')
  })

  it('builds latest and version-specific Release page URLs', () => {
    expect(getGitHubReleaseUrl()).toBe(GITHUB_LATEST_RELEASE_URL)
    expect(getGitHubReleaseUrl('3.1.0-beta.2')).toBe(
      'https://github.com/ZToolsCenter/ZTools/releases/tag/v3.1.0-beta.2'
    )
  })
})
