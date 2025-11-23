<template>
  <div class="flex-1 flex flex-col items-center justify-center px-4">
    <div class="fixed top-4 right-4">
      <ThemeToggle />
    </div>
    <div class="w-full max-w-md">
      <div class="card">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-center text-surface-900 dark:text-neutral-100">
            RailPulse
          </h2>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="label">Email</label>
            <input
              v-model="email"
              type="email"
              required
              class="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label class="label">Password</label>
            <input
              v-model="password"
              type="password"
              required
              class="input"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Logging in...</span>
            <span v-else>Login</span>
          </button>

          <div class="flex justify-between items-center text-sm">
            <router-link
              to="/forgot-password"
              class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Forgot password?
            </router-link>
            <router-link
              to="/register"
              class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Register
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useNotification } from '../composables/useNotification';
import ThemeToggle from '../components/ThemeToggle.vue';

const router = useRouter();
const authStore = useAuthStore();
const { notify } = useNotification();

const email = ref('');
const password = ref('');
const loading = ref(false);

async function handleLogin() {
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    notify({
      title: 'Success',
      message: 'Logged in successfully',
      type: 'success',
    });
    router.push('/dashboard');
  } catch (error: any) {
    notify({
      title: 'Login Failed',
      message: error.response?.data?.error || 'Invalid credentials',
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
}
</script>
