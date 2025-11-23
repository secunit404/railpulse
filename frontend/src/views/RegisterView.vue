<template>
  <div class="flex-1 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="card">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-center text-surface-900 dark:text-neutral-100 mb-3">
            Register
          </h2>

          <div
            v-if="isFirstUser"
            class="rounded-lg bg-info-50 dark:bg-info-900/30 border border-info-200 dark:border-info-700 p-3 text-sm text-info-800 dark:text-info-100"
          >
            Creating first admin account
          </div>
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
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
            <label class="label">Display Name (Optional)</label>
            <input
              v-model="displayName"
              type="text"
              class="input"
              placeholder="Your Name"
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

          <div>
            <label class="label">Confirm Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="input"
              placeholder="Confirm your password"
            />
          </div>

          <div v-if="!isFirstUser">
            <label class="label">Invite Code</label>
            <input
              v-model="inviteCode"
              type="text"
              required
              class="input"
              placeholder="Enter invite code"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Registering...</span>
            <span v-else>Register</span>
          </button>

          <div class="text-center">
            <router-link
              to="/login"
              class="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Already have an account? Login
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useNotification } from '../composables/useNotification';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { notify } = useNotification();

const email = ref('');
const displayName = ref('');
const password = ref('');
const confirmPassword = ref('');
const inviteCode = ref((route.query.code as string) || '');
const loading = ref(false);
const isFirstUser = ref(false);

onMounted(async () => {
  isFirstUser.value = await authStore.checkFirstUser();
});

async function handleRegister() {
  if (password.value !== confirmPassword.value) {
    notify({
      title: 'Error',
      message: 'Passwords do not match',
      type: 'error',
    });
    return;
  }

  loading.value = true;
  try {
    await authStore.register(email.value, password.value, displayName.value || undefined, inviteCode.value || undefined);
    notify({
      title: 'Success',
      message: 'Registered successfully',
      type: 'success',
    });
    router.push('/dashboard');
  } catch (error: any) {
    notify({
      title: 'Registration Failed',
      message: error.response?.data?.error || 'Registration failed',
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
}
</script>
