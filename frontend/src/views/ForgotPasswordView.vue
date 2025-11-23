<template>
  <div class="flex-1 flex flex-col items-center justify-center px-4">
    <div class="fixed top-4 right-4">
      <ThemeToggle />
    </div>
    <div class="w-full max-w-md">
      <div class="card">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-center text-surface-900 dark:text-neutral-100">
            Reset Password
          </h2>
          <p class="text-center text-neutral-600 dark:text-neutral-400 text-sm mt-2">
            Enter your email address and we'll send you a password reset link.
          </p>
        </div>

        <form v-if="!submitted" @submit.prevent="handleSubmit" class="space-y-4">
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

          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Sending...</span>
            <span v-else>Send Reset Link</span>
          </button>

          <div class="text-center">
            <router-link
              to="/login"
              class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Back to Login
            </router-link>
          </div>
        </form>

        <div v-else class="text-center space-y-4">
          <div class="text-success-600 dark:text-success-400">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-lg font-semibold text-surface-900 dark:text-neutral-100">Check your email</p>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              If an account exists for <strong>{{ email }}</strong>, you will receive a password reset link shortly.
            </p>
          </div>
          <router-link
            to="/login"
            class="inline-block btn-secondary"
          >
            Back to Login
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useNotification } from '../composables/useNotification';
import ThemeToggle from '../components/ThemeToggle.vue';

const authStore = useAuthStore();
const { notify } = useNotification();

const email = ref('');
const loading = ref(false);
const submitted = ref(false);

async function handleSubmit() {
  loading.value = true;
  try {
    await authStore.forgotPassword(email.value);
    submitted.value = true;
  } catch (error: any) {
    notify({
      title: 'Error',
      message: error.response?.data?.error || 'Failed to send reset link',
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
}
</script>
