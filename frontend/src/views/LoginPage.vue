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

          <div class="form-group">
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

          <div v-if="error" class="form-error">
            {{ error }}
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { apiClient } from '../api/client'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await apiClient.post('/auth/login', {
      email: email.value,
      password: password.value
    })

    const { token, user } = response.data

    authStore.setTokens(token)
    authStore.setUser(user)

    router.push('/')
  } catch (err: any) {
    console.error('Login failed:', err)
    error.value = err.response?.data?.message || t('auth.loginFailed') || 'Login failed'
  } finally {
    loading.value = false
  }
}
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

.form-error {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--error);
  padding: 0.75rem;
  background: rgba(153, 27, 27, 0.05);
  border-left: 2px solid var(--error);
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
