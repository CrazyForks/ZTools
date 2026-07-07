<template>
  <div class="legacy-import-window" tabindex="0" @keydown="handleKeydown">
    <div class="header">
      <img :src="logo" class="header-icon" draggable="false" />
      <div class="header-info">
        <div class="title">检测到旧版本 ZTools 数据</div>
        <div class="subtitle">ZTools 3.0 数据初始化</div>
      </div>
    </div>

    <main class="content">
      <div class="message">
        <p>你可以导入旧数据，也可以全新开始。</p>
        <p>旧数据不会被删除、移动或覆盖。</p>
      </div>
    </main>

    <footer class="footer">
      <button class="btn cancel" :disabled="isImporting" @click="chooseFresh">全新开始</button>
      <button class="btn confirm" :disabled="isImporting" @click="chooseImport">
        <span v-if="isImporting" class="loading-spinner"></span>
        <span>{{ isImporting ? '导入中...' : '导入旧数据' }}</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import logo from '../../assets/logo.png'

const isImporting = ref(false)

function waitNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

async function chooseImport(): Promise<void> {
  if (isImporting.value) return
  isImporting.value = true
  await waitNextFrame()
  window.electron?.ipcRenderer.send('legacy-import:choose', 'import')
}

function chooseFresh(): void {
  if (isImporting.value) return
  window.electron?.ipcRenderer.send('legacy-import:choose', 'fresh')
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    chooseImport()
  } else if (event.key === 'Escape') {
    chooseFresh()
  }
}

onMounted(() => {
  document.querySelector<HTMLElement>('.legacy-import-window')?.focus()
})
</script>

<style>
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>

<style scoped>
.legacy-import-window {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: var(--text-color);
  outline: none;
}

@media (prefers-color-scheme: dark) {
  .legacy-import-window {
    background: var(--bg-color);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #e5e5e5;
  }
}

.header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.5);
  -webkit-app-region: drag;
}

@media (prefers-color-scheme: dark) {
  .header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(30, 30, 30, 0.5);
  }
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: contain;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 13px;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .subtitle {
    color: #999;
  }
}

.content {
  flex: 1;
  padding: 26px 24px;
  overflow: hidden;
}

.message {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-color);
}

.message p {
  margin: 0;
}

.footer {
  padding: 16px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.5);
}

@media (prefers-color-scheme: dark) {
  .footer {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(30, 30, 30, 0.5);
  }
}

.btn {
  padding: 8px 20px;
  min-width: 110px;
  height: 34px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  outline: none;
  -webkit-app-region: no-drag;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  cursor: default;
  opacity: 0.72;
}

.cancel {
  background: transparent;
  color: #666;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.cancel:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .cancel {
    color: #999;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .cancel:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
}

.confirm {
  background: #3b82f6;
  color: white;
}

.confirm:hover {
  background: #2563eb;
}

.confirm:active {
  background: #1d4ed8;
}

.loading-spinner {
  width: 13px;
  height: 13px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-color-scheme: dark) {
  .message {
    color: #e5e5e5;
  }
}
</style>
