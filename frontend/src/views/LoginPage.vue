<template>
  <div class="login-page animate-fade-in">
    <div class="login-container">
      <div class="login-header delay-1 animate-slide-up">
        <div class="label-micro">DIYOU AUTHENTICATION</div>
        <h2 class="login-title">
          {{ $t('auth.login') }}
        </h2>
        <p class="login-subtitle">
          {{ $t('auth.subtitle') }}
        </p>
      </div>

      <div class="login-card delay-2 animate-slide-up">
        <div class="login-tabs">
          <button
            type="button"
            class="login-tab"
            :class="{ active: mode === 'password' }"
            @click="mode = 'password'"
          >
            {{ $t('auth.passwordLogin') }}
          </button>
          <button
            type="button"
            class="login-tab"
            :class="{ active: mode === 'otp' }"
            @click="mode = 'otp'"
          >
            {{ $t('auth.otpLogin') }}
          </button>
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="email" class="form-label">
              {{ $t('auth.email') }}
            </label>
            <input
              id="email"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="form-input"
            />
          </div>

          <div v-if="mode === 'password'" class="form-group">
            <label for="password" class="form-label">
              {{ $t('auth.password') }}
            </label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="form-input"
            />
          </div>

          <div v-else class="form-group">
            <label for="code" class="form-label">
              {{ $t('auth.verificationCode') }}
            </label>
            <div class="otp-input-row">
              <input
                id="code"
                v-model="code"
                name="code"
                type="text"
                inputmode="numeric"
                maxlength="6"
                autocomplete="one-time-code"
                required
                class="form-input otp-input"
                :placeholder="$t('auth.verificationCode')"
              />
              <button
                type="button"
                class="otp-send-btn"
                :disabled="sendingCode || countdown > 0"
                @click="handleSendCode"
              >
                <span v-if="sendingCode">{{ $t('auth.sending') }}</span>
                <span v-else-if="countdown > 0">{{ countdown }}s</span>
                <span v-else>{{ $t('auth.sendCode') }}</span>
              </button>
            </div>
          </div>

          <div v-if="error" class="form-error">
            {{ error }}
          </div>

          <div v-if="success" class="form-success">
            {{ success }}
          </div>

          <div class="form-actions">
            <button type="submit" class="editorial-btn" :disabled="loading">
              <span v-if="loading">...</span>
              <span v-else>{{ $t('auth.signIn') }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { authService } from '../api/services/auth.service'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const mode = ref<'password' | 'otp'>('password')
const email = ref('')
const password = ref('')
const code = ref('')
const codeId = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const sendingCode = ref(false)
const countdown = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | null = null

const startCountdown = () => {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

const handleSendCode = async () => {
  if (!email.value) {
    error.value = t('auth.emailRequired')
    return
  }

  sendingCode.value = true
  error.value = ''
  success.value = ''

  try {
    const response = await authService.sendEmailOtp(email.value)
    codeId.value = response.data.codeId

    // In non-production environments the backend returns the code directly.
    if (response.data.code) {
      code.value = response.data.code
    }

    success.value = t('auth.codeSent')
    startCountdown()
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || t('auth.otpLoginFailed')
  } finally {
    sendingCode.value = false
  }
}

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    let response

    if (mode.value === 'password') {
      response = await authService.login(email.value, password.value)
    } else {
      if (!code.value) {
        error.value = t('auth.codeRequired')
        loading.value = false
        return
      }
      response = await authService.loginWithEmailOtp(email.value, codeId.value, code.value)
    }

    const { user } = response.data

    authStore.setUser(user)

    router.push('/')
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || t('auth.loginFailed')
  } finally {
    loading.value = false
  }
}

watch(mode, () => {
  error.value = ''
  success.value = ''
  password.value = ''
  code.value = ''
})
</script>

<style scoped>
.login-page {
  min-height: calc(100svh - 72px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2.5rem 2rem;
  background: var(--bg);
}

.login-container {
  margin: 0 auto;
  width: 100%;
  max-width: 460px;
}

.login-header {
  margin-bottom: 3rem;
}

.label-micro {
  font-family: var(--sans);
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  color: var(--brand);
  font-weight: 500;
  margin-bottom: 1rem;
}

.login-title {
  font-family: var(--serif);
  font-size: 3rem;
  color: var(--text-h);
  line-height: 1.1;
  margin-bottom: 1rem;
  font-weight: 400;
}

.login-subtitle {
  font-family: var(--sans);
  font-size: 1rem;
  color: var(--text-muted);
  font-weight: 300;
  line-height: 1.6;
}

.login-card {
  background-color: var(--surface);
  padding: 3rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-whisper);
  border-radius: 24px;
}

.login-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

.login-tab {
  flex: 1;
  padding: 0.75rem 0;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.3s ease;
}

.login-tab.active {
  color: var(--text-h);
  border-bottom-color: var(--brand);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-label {
  font-family: var(--sans);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-h);
}

.form-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  font-family: var(--sans);
  font-size: 1.1rem;
  color: var(--text-h);
  background-color: transparent;
  transition: all 0.3s ease;
  outline: none;
}

.form-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(168, 79, 56, 0.1);
}

.otp-input-row {
  display: flex;
  gap: 0.75rem;
}

.otp-input {
  flex: 1;
  letter-spacing: 0.25em;
  text-align: center;
}

.otp-send-btn {
  padding: 0 1rem;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text-h);
  font-family: var(--sans);
  font-size: 0.85rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s ease;
}

.otp-send-btn:hover:not(:disabled) {
  border-color: var(--brand);
  color: var(--brand);
}

.otp-send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-error {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--error);
  padding: 0.75rem;
  background: rgba(153, 27, 27, 0.05);
  border-left: 2px solid var(--error);
}

.form-success {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--success);
  padding: 0.75rem;
  background: rgba(22, 101, 52, 0.05);
  border-left: 2px solid var(--success);
}

.form-actions {
  margin-top: 1rem;
}

.editorial-btn {
  width: 100%;
  background: var(--text-h);
  color: var(--surface);
  border: none;
  border-radius: 12px;
  padding: 1.25rem;
  font-family: var(--sans);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.editorial-btn:hover:not(:disabled) {
  background: var(--brand);
}

.editorial-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .login-page {
    padding: 1.5rem 1.25rem;
  }
  .login-card {
    padding: 2rem;
  }
}
</style>
