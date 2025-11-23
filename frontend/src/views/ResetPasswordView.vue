<template>
  <div class="flex-1 flex flex-col items-center justify-center px-4">
    <div class="fixed top-4 right-4">
      <ThemeToggle />
    </div>
    <div class="w-full max-w-md">
      <div class="card">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-center text-surface-900 dark:text-neutral-100">
            Set New Password
          </h2>
          <p class="text-center text-neutral-600 dark:text-neutral-400 text-sm mt-2">
            Enter your new password below
          </p>
        </div>

        <div v-if="invalidLink" class="text-center space-y-4">
          <p class="text-danger-600 dark:text-danger-400 font-medium">
            This reset link is invalid or missing a token.
          </p>
          <router-link to="/forgot-password" class="inline-block btn-primary">
            Request a new link
          </router-link>
        </div>

        <form v-else-if="!success" @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="label">New Password</label>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="8"
              class="input"
              placeholder="Enter new password"
            />
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Minimum 8 characters
            </p>
          </div>

          <div>
            <label class="label">Confirm Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="input"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Resetting...</span>
            <span v-else>Reset Password</span>
          </button>
        </form>

        <div v-else class="text-center space-y-4">
          <div class="text-success-600 dark:text-success-400">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-lg font-semibold text-surface-900 dark:text-neutral-100">Password reset successful!</p>
            <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              You can now log in with your new password
            </p>
          </div>
          <router-link
            to="/login"
            class="inline-block btn-primary"
          >
            Go to Login
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useNotification } from '../composables/useNotification';
import ThemeToggle from '../components/ThemeToggle.vue';

const route = useRoute();
const authStore = useAuthStore();
const { notify } = useNotification();

const token = ref('');
const invalidLink = ref(false);
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const success = ref(false);

onMounted(() => {
  token.value = (route.params.token as string) || (route.query.token as string) || '';
  if (!token.value) {
    invalidLink.value = true;
    notify({
      title: 'Error',
      message: 'Invalid or missing reset token',
      type: 'error',
    });
  }
});

async function handleSubmit() {
  if (!token.value) {
    notify({
      title: 'Error',
      message: 'Invalid reset link. Request a new one.',
      type: 'error',
    });
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    notify({
      title: 'Error',
      message: 'Passwords do not match',
      type: 'error',
    });
    return;
  }

  if (newPassword.value.length < 8) {
    notify({
      title: 'Error',
      message: 'Password must be at least 8 characters',
      type: 'error',
    });
    return;
  }

  loading.value = true;
  try {
    await authStore.resetPassword(token.value, newPassword.value);
    success.value = true;
    notify({
      title: 'Success',
      message: 'Password reset successfully',
      type: 'success',
    });
  } catch (error: any) {
    notify({
      title: 'Reset Failed',
      message: error.response?.data?.error || 'Failed to reset password',
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
}
</script>
