import fs from 'fs'
import path from 'path'
import LmdbDatabase from '../lmdb'
import {
  ensure3Layout,
  getZToolsDataLayout,
  hasLegacyLmdb,
  type AppDataPathOptions
} from '../appData/appDataPaths'
import { readDataVersion, writeDataVersion } from '../appData/appDataVersion'
import { getStorageScopeForKey } from './storageRouting'
import { storageManager, type StorageManager } from './storageManager'

export interface LegacyImportDetection {
  initialized: boolean
  legacyLmdbFound: boolean
  shouldPrompt: boolean
  legacyLmdbPath: string
}

export interface LegacyImportOptions {
  baseSettings?: boolean
  pluginInstallState?: boolean
  pluginOrder?: boolean
  pluginData?: boolean
  aiModels?: boolean
  legacySyncConfig?: boolean
}

export interface LegacyImportResult {
  importedDocs: number
  skippedDocs: number
  importedAttachments: number
  skippedAttachments: number
  copiedDirs: string[]
}

const BASE_SETTING_KEYS = new Set(['ZTOOLS/settings-general'])
const PLUGIN_INSTALL_KEYS = new Set(['ZTOOLS/plugins', 'ZTOOLS/disabled-plugins'])
const PLUGIN_ORDER_KEYS = new Set(['ZTOOLS/plugin-order'])
const AI_MODEL_KEYS = new Set(['ZTOOLS/ai-models'])
const LEGACY_SYNC_KEYS = new Set(['SYNC/config'])

export class LegacyImportService {
  constructor(
    private manager: StorageManager = storageManager,
    private pathOptions: AppDataPathOptions = {}
  ) {}

  detect(): LegacyImportDetection {
    const layout = getZToolsDataLayout(this.pathOptions)
    const initialized = Boolean(readDataVersion(this.pathOptions))
    const legacyLmdbFound = !initialized && hasLegacyLmdb(this.pathOptions)
    return {
      initialized,
      legacyLmdbFound,
      shouldPrompt: legacyLmdbFound,
      legacyLmdbPath: layout.legacyLmdbPath
    }
  }

  startFresh(): void {
    ensure3Layout(this.pathOptions)
    writeDataVersion({ importedFromLegacy: false }, this.pathOptions)
  }

  importSelected(options: LegacyImportOptions): LegacyImportResult {
    const layout = ensure3Layout(this.pathOptions)
    if (!fs.existsSync(layout.legacyLmdbPath)) {
      const copiedDirs = copyLegacyDataDirs(layout)
      return {
        importedDocs: 0,
        skippedDocs: 0,
        importedAttachments: 0,
        skippedAttachments: 0,
        copiedDirs
      }
    }

    const legacyDb = new LmdbDatabase({
      path: layout.legacyLmdbPath,
      mapSize: 2 * 1024 * 1024 * 1024,
      maxDbs: 6
    })

    let importedDocs = 0
    let skippedDocs = 0
    let importedAttachments = 0
    let skippedAttachments = 0
    const copiedDirs = copyLegacyDataDirs(layout)

    try {
      const docs = legacyDb.allDocs()
      for (const doc of docs) {
        if (!shouldImportDoc(doc._id, options)) {
          skippedDocs++
          continue
        }
        const targetDb =
          getStorageScopeForKey(doc._id) === 'device'
            ? this.manager.getDeviceDb()
            : this.manager.getAccountDb()
        const existing = targetDb.get(doc._id)
        targetDb.put({ ...sanitizeLegacyDocForImport(doc, layout), _rev: existing?._rev })
        importedDocs++
      }

      for (const item of legacyDb.listAttachments()) {
        if (!shouldImportDoc(item.docId, options)) {
          skippedAttachments++
          continue
        }
        const targetDb =
          getStorageScopeForKey(item.docId) === 'device'
            ? this.manager.getDeviceDb()
            : this.manager.getAccountDb()
        if (targetDb.getAttachment(item.docId)) {
          skippedAttachments++
          continue
        }
        const body = legacyDb.getAttachment(item.docId)
        if (!body) {
          skippedAttachments++
          continue
        }
        const meta = legacyDb.getAttachmentType(item.docId)
        const result = targetDb.postAttachment(
          item.docId,
          body,
          meta?.type || item.contentType || 'application/octet-stream'
        )
        if (result.ok) {
          importedAttachments++
        } else {
          skippedAttachments++
        }
      }
    } finally {
      legacyDb.close()
    }

    writeDataVersion({ importedFromLegacy: true }, this.pathOptions)
    return { importedDocs, skippedDocs, importedAttachments, skippedAttachments, copiedDirs }
  }
}

function sanitizeLegacyDocForImport(doc: any, layout: ReturnType<typeof getZToolsDataLayout>): any {
  const {
    _rev,
    _cloudSynced,
    _lastModified,
    _deleted,
    _conflicts,
    _revisions,
    _sync,
    ...cleanDoc
  } = doc || {}

  const pathRewrittenDoc = rewriteLegacyPaths(cleanDoc, layout)

  if (pathRewrittenDoc?._id !== 'SYNC/config') return pathRewrittenDoc
  const data = pathRewrittenDoc.data || {}
  return {
    ...pathRewrittenDoc,
    data: {
      ...data,
      enabled: false,
      token: '',
      refreshToken: '',
      username: ''
    }
  }
}

function copyLegacyDataDirs(layout: ReturnType<typeof getZToolsDataLayout>): string[] {
  const copied: string[] = []
  const pairs = [
    ['plugins', layout.pluginsPath],
    ['avatar', layout.avatarPath],
    ['clipboard', layout.clipboardPath],
    ['extends', layout.extendsPath]
  ] as const

  for (const [dirName, targetPath] of pairs) {
    const sourcePath = path.join(layout.legacyUserDataPath, dirName)
    if (!fs.existsSync(sourcePath)) continue
    if (copyDirectoryContents(sourcePath, targetPath)) {
      copied.push(dirName)
    }
  }
  return copied
}

function copyDirectoryContents(sourceDir: string, targetDir: string): boolean {
  let copied = false
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
    copied = true
  }
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name)
    const targetPath = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      copied = copyDirectoryContents(sourcePath, targetPath) || copied
      continue
    }
    if (entry.isFile() && !fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath)
      copied = true
    }
  }
  return copied
}

function rewriteLegacyPaths<T>(value: T, layout: ReturnType<typeof getZToolsDataLayout>): T {
  if (typeof value === 'string') {
    return rewriteLegacyPath(value, layout) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteLegacyPaths(item, layout)) as T
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value)) {
      next[key] = rewriteLegacyPaths(child, layout)
    }
    return next as T
  }
  return value
}

function rewriteLegacyPath(value: string, layout: ReturnType<typeof getZToolsDataLayout>): string {
  if (!value.startsWith(layout.legacyUserDataPath)) return value
  return path.join(layout.root, path.relative(layout.legacyUserDataPath, value))
}

function shouldImportDoc(docId: string, options: LegacyImportOptions): boolean {
  if (options.baseSettings && BASE_SETTING_KEYS.has(docId)) return true
  if (options.pluginInstallState && PLUGIN_INSTALL_KEYS.has(docId)) return true
  if (options.pluginOrder && PLUGIN_ORDER_KEYS.has(docId)) return true
  if (options.pluginData && docId.startsWith('PLUGIN/')) return true
  if (options.aiModels && AI_MODEL_KEYS.has(docId)) return true
  if (options.legacySyncConfig && LEGACY_SYNC_KEYS.has(docId)) return true
  return false
}

export const legacyImportService = new LegacyImportService()
