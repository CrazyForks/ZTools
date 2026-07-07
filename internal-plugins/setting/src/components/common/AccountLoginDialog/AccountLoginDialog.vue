<template>
  <BaseDialog
    :visible="visible"
    title="ZTools 账号注册/登录"
    subtitle="同步数据、插件评论和个人配置"
    max-width="430px"
    @update:visible="emit('update:visible', $event)"
    @close="emit('cancel')"
  >
    <template #icon>
      <div class="login-logo">
        <img src="/logo.png" alt="" />
      </div>
    </template>

    <form class="login-form" @submit.prevent="handleSubmit">
      <label>
        <span>用户名</span>
        <input
          v-model.trim="form.username"
          type="text"
          autocomplete="username"
          placeholder="输入用户名"
        />
      </label>
      <label>
        <span>密码</span>
        <input
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          placeholder="输入密码"
        />
      </label>
    </form>
    <AliyunCaptcha ref="captchaRef" />

    <template #footer>
      <button type="button" class="btn-secondary" @click="handleCancel">取消</button>
      <button type="button" class="btn-primary" :disabled="loading" @click="handleSubmit">
        {{ loading ? '提交中...' : '注册/登录' }}
      </button>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { BaseDialog } from '../BaseDialog'
import AliyunCaptcha from './AliyunCaptcha.vue'

interface Props {
  visible: boolean
  username?: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  username: '',
  loading: false
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (
    e: 'submit',
    value: { username: string; password: string; captchaVerifyParam?: string },
    controls: {
      resolve: () => void
      reject: (error: unknown) => void
    }
  ): void
  (e: 'cancel'): void
}>()

const captchaRef = ref<InstanceType<typeof AliyunCaptcha> | null>(null)
const form = reactive({
  username: '',
  password: ''
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    form.username = props.username || ''
    form.password = ''
  },
  { immediate: true }
)

watch(
  () => props.username,
  (username) => {
    if (props.visible && !form.username) {
      form.username = username || ''
    }
  }
)

const handleSubmit = async (): Promise<void> => {
  if (props.loading) return
  const submit = (captchaVerifyParam?: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      emit(
        'submit',
        {
          username: form.username,
          password: form.password,
          captchaVerifyParam
        },
        { resolve, reject }
      )
    })

  try {
    if (!form.username || !form.password) {
      await submit()
      return
    }

    const execute =
      captchaRef.value?.execute ??
      ((business: (captchaVerifyParam?: string) => Promise<void>) => business())
    await execute(submit)
  } catch (_) {
    // 登录结果由父组件的 toast 展示；这里不重复提示。
  }
}

const handleCancel = (): void => {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<style scoped>
.login-form {
  display: grid;
  gap: 16px;
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: rgba(19, 24, 26, 0.94);
  box-shadow:
    0 10px 26px rgba(30, 62, 72, 0.22),
    0 0 0 4px rgba(255, 255, 255, 0.24);
}

.login-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.login-form label {
  display: grid;
  gap: 8px;
  color: rgba(61, 72, 76, 0.82);
  font-size: 13px;
  font-weight: 500;
}

.login-form input {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  border: 1px solid rgba(142, 167, 174, 0.38);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-primary, #222222);
  outline: none;
  padding: 0 14px;
  font-size: 14px;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 1px 2px rgba(42, 73, 84, 0.05);
}

.login-form input::placeholder {
  color: rgba(83, 95, 101, 0.55);
}

.login-form input:focus {
  border-color: var(--primary-color);
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--primary-color) 16%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.btn-primary,
.btn-secondary {
  min-width: 86px;
  min-height: 40px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  padding: 9px 18px;
  font-size: 14px;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    background-color 0.16s ease,
    opacity 0.16s ease;
}

.btn-primary {
  background: var(--primary-color);
  color: #fff;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--primary-color) 26%, transparent);
}

.btn-primary:not(:disabled):hover,
.btn-secondary:hover {
  transform: translateY(-1px);
}

.btn-primary:not(:disabled):active,
.btn-secondary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.btn-secondary {
  border: 1px solid rgba(255, 255, 255, 0.58);
  background: color-mix(in srgb, var(--primary-color) 11%, rgba(255, 255, 255, 0.72));
  color: rgba(39, 57, 56, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
}

@media (prefers-color-scheme: dark) {
  .login-form label {
    color: rgba(224, 235, 237, 0.82);
  }

  .login-form input {
    border-color: rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(245, 248, 249, 0.94);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .login-form input::placeholder {
    color: rgba(220, 228, 230, 0.48);
  }

  .login-form input:focus {
    background: rgba(255, 255, 255, 0.12);
  }

  .btn-secondary {
    border-color: rgba(255, 255, 255, 0.12);
    background: color-mix(in srgb, var(--primary-color) 16%, rgba(255, 255, 255, 0.08));
    color: rgba(235, 244, 244, 0.9);
  }
}
</style>
