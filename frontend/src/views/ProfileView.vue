<template>
  <div class="flex-1">
    <AppHeader />

    <!-- Main Content -->
    <main class="px-4 py-6 sm:p-6">
      <div class="max-w-screen-2xl mx-auto">
        <!-- Tabs -->
        <div class="mb-4 sm:mb-6">
          <div class="flex gap-1 sm:gap-2 border-b border-neutral-200 dark:border-surface-700 overflow-x-auto">
            <button
              @click="activeTab = 'profile'"
              :class="[
                'px-4 sm:px-6 py-2 sm:py-3 font-medium border-b-2 text-sm sm:text-base whitespace-nowrap',
                activeTab === 'profile'
                  ? 'border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-300'
                  : 'border-transparent text-neutral-500 dark:text-neutral-500 hover:text-surface-900 dark:hover:text-neutral-300'
              ]"
            >
              My profile
            </button>
            <button
              v-if="authStore.user?.isAdmin"
              @click="activeTab = 'invites'"
              :class="[
                'px-4 sm:px-6 py-2 sm:py-3 font-medium border-b-2 text-sm sm:text-base whitespace-nowrap',
                activeTab === 'invites'
                  ? 'border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-300'
                  : 'border-transparent text-neutral-500 dark:text-neutral-500 hover:text-surface-900 dark:hover:text-neutral-300'
              ]"
            >
              Invite codes
            </button>
            <button
              v-if="authStore.user?.isAdmin"
              @click="activeTab = 'users'"
              :class="[
                'px-4 sm:px-6 py-2 sm:py-3 font-medium border-b-2 text-sm sm:text-base whitespace-nowrap',
                activeTab === 'users'
                  ? 'border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-300'
                  : 'border-transparent text-neutral-500 dark:text-neutral-500 hover:text-surface-900 dark:hover:text-neutral-300'
              ]"
            >
              Users
            </button>
          </div>
        </div>

        <!-- Profile Tab Content -->
        <div v-if="activeTab === 'profile'" class="max-w-4xl mx-auto">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <!-- Profile Information Card -->
        <div class="card">
          <h2 class="text-lg sm:text-xl font-semibold text-surface-900 dark:text-neutral-100 mb-4">Profile Information</h2>

          <div class="space-y-4">
            <div>
              <label class="label">Email</label>
              <input
                v-model="profileForm.email"
                type="email"
                class="input"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label class="label">Display Name</label>
              <input
                v-model="profileForm.displayName"
                type="text"
                class="input"
                placeholder="Your Name"
              />
            </div>

            <div>
              <label class="label">Timezone</label>
              <select v-model="profileForm.timezone" class="input">
                <option value="Europe/Stockholm">Europe/Stockholm</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="Australia/Sydney">Australia/Sydney</option>
              </select>
            </div>

            <div>
              <label class="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  v-model="profileForm.hideBusReplacedTrains"
                  class="w-4 h-4 text-primary-600 bg-neutral-100 dark:bg-surface-700 border-neutral-300 dark:border-surface-600 rounded focus:ring-primary-500"
                />
                <span class="ml-2 text-sm text-surface-900 dark:text-neutral-100">
                  Hide trains replaced by buses from search results
                </span>
              </label>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-6">
                When enabled, trains that are cancelled and replaced by buses will not appear in delay results
              </p>
            </div>

            <button
              @click="handleUpdateProfile"
              :disabled="loadingProfile"
              class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loadingProfile">Saving...</span>
              <span v-else>Save Profile</span>
            </button>
          </div>
        </div>

        <!-- Account Statistics Card -->
        <div class="card">
          <h2 class="text-lg sm:text-xl font-semibold text-surface-900 dark:text-neutral-100 mb-4">Account Statistics</h2>

          <div class="space-y-3 sm:space-y-4">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg">
              <span class="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">Current Email</span>
              <span class="font-medium text-sm sm:text-base text-surface-900 dark:text-neutral-100 break-all">{{ authStore.user?.email }}</span>
            </div>

            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg">
              <span class="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">Role</span>
              <span class="font-medium text-sm sm:text-base text-surface-900 dark:text-neutral-100">
                {{ authStore.user?.isAdmin ? 'Admin' : 'User' }}
              </span>
            </div>

            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg">
              <span class="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">Monitors</span>
              <span class="font-medium text-sm sm:text-base text-surface-900 dark:text-neutral-100">{{ authStore.user?._count?.monitors ?? 0 }}</span>
            </div>

            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg">
              <span class="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">Member Since</span>
              <span class="font-medium text-sm sm:text-base text-surface-900 dark:text-neutral-100">{{ formatDate(authStore.user?.createdAt) }}</span>
            </div>

            <div v-if="authStore.user?.lastLoginAt" class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg">
              <span class="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">Last Login</span>
              <span class="font-medium text-sm sm:text-base text-surface-900 dark:text-neutral-100">{{ formatDate(authStore.user?.lastLoginAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Change Password Card -->
        <div class="card">
          <h2 class="text-lg sm:text-xl font-semibold text-surface-900 dark:text-neutral-100 mb-4">Change Password</h2>

          <form @submit.prevent="handleChangePassword" class="space-y-4">
            <div>
              <label class="label">Current Password</label>
              <input
                v-model="passwordForm.currentPassword"
                type="password"
                required
                class="input"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label class="label">New Password</label>
              <input
                v-model="passwordForm.newPassword"
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
              <label class="label">Confirm New Password</label>
              <input
                v-model="passwordForm.confirmPassword"
                type="password"
                required
                class="input"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              :disabled="loadingPassword"
              class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loadingPassword">Changing...</span>
              <span v-else>Change Password</span>
            </button>
          </form>
        </div>

        <!-- Danger Zone Card -->
        <div class="card border-2 border-danger-200 dark:border-danger-900/50">
          <h2 class="text-lg sm:text-xl font-semibold text-danger-600 dark:text-danger-400 mb-4">Danger Zone</h2>

          <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Once you delete your account, there is no going back. All your monitors and search history will be permanently deleted.
          </p>

          <button
            @click="showDeleteConfirm = true"
            class="w-full bg-danger-600 hover:bg-danger-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Delete Account
          </button>
        </div>
          </div>
        </div>

        <!-- Invite Codes Tab Content -->
        <InviteCodesTab v-if="activeTab === 'invites'" />

        <!-- Users Tab Content -->
        <UsersTab v-if="activeTab === 'users'" />
      </div>
    </main>

    <!-- Delete Confirmation Dialog -->
    <TransitionRoot :show="showDeleteConfirm" as="template">
      <Dialog @close="showDeleteConfirm = false" class="relative z-50">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </TransitionChild>

        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="bg-white dark:bg-surface-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 dark:border-surface-700">
              <DialogTitle class="text-xl font-bold text-danger-600 dark:text-danger-400 mb-2">
                Delete Account
              </DialogTitle>
              <p class="text-neutral-600 dark:text-neutral-300 mb-6">
                Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.
              </p>
              <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  @click="showDeleteConfirm = false"
                  class="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  @click="handleDeleteAccount"
                  :disabled="loadingDelete"
                  class="flex-1 bg-danger-600 hover:bg-danger-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  <span v-if="loadingDelete">Deleting...</span>
                  <span v-else>Delete</span>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import { useNotification } from '../composables/useNotification';
import AppHeader from '../components/AppHeader.vue';
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';
import InviteCodesTab from '../components/InviteCodesTab.vue';
import UsersTab from '../components/UsersTab.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { notify } = useNotification();

const activeTab = ref<'profile' | 'invites' | 'users'>((route.query.tab as 'profile' | 'invites' | 'users') || 'profile');

const profileForm = reactive({
  email: '',
  displayName: '',
  timezone: 'Europe/Stockholm',
  hideBusReplacedTrains: false,
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const loadingProfile = ref(false);
const loadingPassword = ref(false);
const loadingDelete = ref(false);
const showDeleteConfirm = ref(false);

// Update URL when tab changes
watch(activeTab, (newTab) => {
  router.push({ query: { tab: newTab } });
});

onMounted(async () => {
  try {
    await authStore.getProfile();
    // Populate form with current values
    profileForm.email = authStore.user?.email || '';
    profileForm.displayName = authStore.user?.displayName || '';
    profileForm.timezone = authStore.user?.timezone || 'Europe/Stockholm';
    profileForm.hideBusReplacedTrains = authStore.user?.hideBusReplacedTrains || false;
  } catch (error: any) {
    notify({
      title: 'Error',
      message: 'Failed to load profile',
      type: 'error',
    });
  }
});

async function handleUpdateProfile() {
  loadingProfile.value = true;
  try {
    await authStore.updateProfile({
      email: profileForm.email,
      displayName: profileForm.displayName || null,
      timezone: profileForm.timezone,
      hideBusReplacedTrains: profileForm.hideBusReplacedTrains,
    });
    notify({
      title: 'Success',
      message: 'Profile updated successfully',
      type: 'success',
    });
  } catch (error: any) {
    notify({
      title: 'Update Failed',
      message: error.response?.data?.error || 'Failed to update profile',
      type: 'error',
    });
  } finally {
    loadingProfile.value = false;
  }
}

async function handleChangePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    notify({
      title: 'Error',
      message: 'New passwords do not match',
      type: 'error',
    });
    return;
  }

  if (passwordForm.newPassword.length < 8) {
    notify({
      title: 'Error',
      message: 'Password must be at least 8 characters',
      type: 'error',
    });
    return;
  }

  loadingPassword.value = true;
  try {
    await authStore.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    notify({
      title: 'Success',
      message: 'Password changed successfully',
      type: 'success',
    });
    // Clear form
    passwordForm.currentPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
  } catch (error: any) {
    notify({
      title: 'Change Failed',
      message: error.response?.data?.error || 'Failed to change password',
      type: 'error',
    });
  } finally {
    loadingPassword.value = false;
  }
}

async function handleDeleteAccount() {
  loadingDelete.value = true;
  try {
    await authStore.deleteAccount();
    notify({
      title: 'Account Deleted',
      message: 'Your account has been permanently deleted',
      type: 'success',
    });
    router.push('/login');
  } catch (error: any) {
    notify({
      title: 'Delete Failed',
      message: error.response?.data?.error || 'Failed to delete account',
      type: 'error',
    });
  } finally {
    loadingDelete.value = false;
    showDeleteConfirm.value = false;
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>
