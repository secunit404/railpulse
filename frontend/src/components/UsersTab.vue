<template>
  <div class="card">
    <h2 class="text-xl sm:text-2xl font-semibold text-surface-900 dark:text-neutral-100 mb-4 sm:mb-6">All Users</h2>

    <div v-if="loading" class="text-center py-8">
      <p class="text-neutral-600 dark:text-neutral-400">Loading users...</p>
    </div>

    <div v-else-if="users.length === 0" class="text-center py-8">
      <p class="text-neutral-600 dark:text-neutral-400">No users found</p>
    </div>

    <div v-else class="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
      <table class="w-full min-w-[800px]">
        <thead>
          <tr class="border-b border-neutral-200 dark:border-surface-600">
            <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Email</th>
            <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Display Name</th>
            <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Role</th>
            <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Status</th>
            <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Monitors</th>
            <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Invite Code</th>
            <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Registered</th>
            <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Last Login</th>
            <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            class="border-b border-neutral-200 dark:border-surface-600 hover:bg-neutral-50 dark:hover:bg-surface-700/50"
          >
            <td class="py-2 sm:py-3 px-2 text-xs sm:text-sm text-surface-900 dark:text-neutral-100">
              {{ user.email }}
            </td>
            <td class="py-2 sm:py-3 px-2 text-xs sm:text-sm text-surface-900 dark:text-neutral-100">
              {{ user.displayName || '-' }}
            </td>
            <td class="py-2 sm:py-3 px-2">
              <span
                :class="user.isAdmin ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'"
                class="inline-block px-2 py-0.5 sm:py-1 rounded text-xs font-medium whitespace-nowrap"
              >
                {{ user.isAdmin ? 'Admin' : 'User' }}
              </span>
            </td>
            <td class="py-2 sm:py-3 px-2">
              <span
                :class="user.isActive ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400' : 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400'"
                class="inline-block px-2 py-0.5 sm:py-1 rounded text-xs font-medium whitespace-nowrap"
              >
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="py-2 sm:py-3 px-2 text-xs sm:text-sm text-surface-900 dark:text-neutral-100">
              {{ user._count?.monitors ?? 0 }}
            </td>
            <td class="py-2 sm:py-3 px-2 text-xs sm:text-sm text-surface-900 dark:text-neutral-100">
              <input
                v-if="user.usedInviteCode"
                type="text"
                :value="user.usedInviteCode.code"
                @click="copyToClipboard(user.usedInviteCode.code)"
                readonly
                class="w-full min-w-20 text-xs bg-neutral-50 dark:bg-surface-700 border border-neutral-200 dark:border-surface-600 rounded px-2 py-1 font-mono text-surface-900 dark:text-neutral-100 cursor-pointer hover:bg-neutral-100 dark:hover:bg-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                title="Click to copy"
              />
              <span v-else class="text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap">First User</span>
            </td>
            <td class="py-2 sm:py-3 px-2 text-xs sm:text-sm text-surface-900 dark:text-neutral-100 whitespace-nowrap">
              {{ formatDate(user.createdAt) }}
            </td>
            <td class="py-2 sm:py-3 px-2 text-xs sm:text-sm text-surface-900 dark:text-neutral-100 whitespace-nowrap">
              {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never' }}
            </td>
            <td class="py-2 sm:py-3 px-2">
              <div class="flex items-center gap-2 sm:gap-3">
                <button
                  v-if="user.id !== authStore.user?.id"
                  @click="openResetDialog(user)"
                  class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  Reset password
                </button>
                <button
                  v-if="user.id !== authStore.user?.id"
                  @click="confirmToggleStatus(user)"
                  :class="user.isActive ? 'text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300' : 'text-success-600 dark:text-success-400 hover:text-success-700 dark:hover:text-success-300'"
                  class="text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  {{ user.isActive ? 'Deactivate' : 'Activate' }}
                </button>
                <button
                  v-if="user.id !== authStore.user?.id"
                  @click="confirmDelete(user)"
                  class="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 text-xs sm:text-sm font-medium whitespace-nowrap"
                >
                  Delete
                </button>
                <span v-if="user.id === authStore.user?.id" class="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                  (You)
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Toggle Status Confirmation Dialog -->
    <TransitionRoot :show="showToggleStatusConfirm" as="template">
      <Dialog @close="showToggleStatusConfirm = false" class="relative z-50">
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
              <DialogTitle class="text-xl font-bold text-surface-900 dark:text-neutral-100 mb-2">
                {{ userToToggle?.isActive ? 'Deactivate' : 'Activate' }} User
              </DialogTitle>
              <p class="text-neutral-600 dark:text-neutral-300 mb-4">
                Are you sure you want to {{ userToToggle?.isActive ? 'deactivate' : 'activate' }} this user?
                {{ userToToggle?.isActive ? 'They will no longer be able to log in.' : 'They will be able to log in again.' }}
              </p>
              <div v-if="userToToggle" class="mb-6 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg">
                <p class="text-sm font-medium text-surface-900 dark:text-neutral-100">
                  {{ userToToggle.email }}
                </p>
              </div>
              <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  @click="showToggleStatusConfirm = false"
                  class="flex-1 btn-secondary order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  @click="handleToggleStatus"
                  :disabled="togglingStatus"
                  :class="userToToggle?.isActive ? 'bg-warning-600 hover:bg-warning-700' : 'bg-success-600 hover:bg-success-700'"
                  class="flex-1 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 order-1 sm:order-2"
                >
                  <span v-if="togglingStatus">Processing...</span>
                  <span v-else>{{ userToToggle?.isActive ? 'Deactivate' : 'Activate' }}</span>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Delete User Confirmation Dialog -->
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
                Delete User
              </DialogTitle>
              <p class="text-neutral-600 dark:text-neutral-300 mb-4">
                Are you sure you want to permanently delete this user? This action cannot be undone. All their monitors and search history will be permanently deleted.
              </p>
              <div v-if="userToDelete" class="mb-6 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg">
                <p class="text-sm font-medium text-surface-900 dark:text-neutral-100">
                  {{ userToDelete.email }}
                </p>
                <p v-if="userToDelete._count?.monitors" class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  {{ userToDelete._count.monitors }} monitor(s) will be deleted
                </p>
              </div>
              <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  @click="showDeleteConfirm = false"
                  class="flex-1 btn-secondary order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  @click="handleDeleteUser"
                  :disabled="deletingUser"
                  class="flex-1 bg-danger-600 hover:bg-danger-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 order-1 sm:order-2"
                >
                  <span v-if="deletingUser">Deleting...</span>
                  <span v-else>Delete Permanently</span>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Admin Reset Password Dialog -->
    <TransitionRoot :show="showResetDialog" as="template">
      <Dialog @close="showResetDialog = false" class="relative z-50">
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
            <DialogPanel class="bg-white dark:bg-surface-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-neutral-200 dark:border-surface-700">
              <DialogTitle class="text-xl font-bold text-surface-900 dark:text-neutral-100 mb-2">
                Generate reset link
              </DialogTitle>
              <p class="text-neutral-600 dark:text-neutral-300 mb-4">
                Create a one-time password reset link for this user. You can share it manually, or have the system email it if SMTP is configured.
              </p>

              <div v-if="userToReset" class="mb-4 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg border border-neutral-200 dark:border-surface-600">
                <p class="text-sm font-medium text-surface-900 dark:text-neutral-100 break-all">{{ userToReset.email }}</p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Link expires in 60 minutes</p>
              </div>

              <label class="flex items-center gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  v-model="sendResetEmail"
                  class="w-4 h-4 text-primary-600 bg-neutral-100 dark:bg-surface-700 border-neutral-300 dark:border-surface-600 rounded focus:ring-primary-500"
                />
                <span class="text-sm text-surface-900 dark:text-neutral-100">Email the reset link (if SMTP is configured)</span>
              </label>

              <div v-if="resetResult" class="mb-4 space-y-2">
                <div class="flex items-center justify-between text-sm text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-900/30 border border-success-200 dark:border-success-800 rounded-lg px-3 py-2">
                  <span>{{ resetResult.message }}</span>
                  <span class="text-xs uppercase tracking-wide font-semibold">{{ resetResult.delivery }}</span>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-neutral-600 dark:text-neutral-300">Reset link</label>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      :value="resetResult.resetLink"
                      readonly
                      class="flex-1 text-xs bg-neutral-50 dark:bg-surface-700 border border-neutral-200 dark:border-surface-600 rounded px-2 py-2 font-mono text-surface-900 dark:text-neutral-100"
                    />
                    <button
                      @click="copyToClipboard(resetResult.resetLink, 'Reset link copied')"
                      class="btn-secondary whitespace-nowrap"
                    >
                      Copy link
                    </button>
                  </div>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400">Share this link with the user to complete the reset.</p>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-6">
                <button
                  @click="showResetDialog = false"
                  class="flex-1 btn-secondary order-2 sm:order-1"
                >
                  Close
                </button>
                <button
                  @click="handleAdminReset"
                  :disabled="resetting || !userToReset"
                  class="flex-1 btn-primary order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="resetting">Generating...</span>
                  <span v-else>Generate link</span>
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
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.store';
import { useNotification } from '../composables/useNotification';
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue';
import type { User, AdminResetPasswordResponse } from '../../../shared/types';

const authStore = useAuthStore();
const { notify } = useNotification();

const users = ref<User[]>([]);
const loading = ref(false);
const showToggleStatusConfirm = ref(false);
const userToToggle = ref<User | null>(null);
const togglingStatus = ref(false);
const showDeleteConfirm = ref(false);
const userToDelete = ref<User | null>(null);
const deletingUser = ref(false);
const showResetDialog = ref(false);
const userToReset = ref<User | null>(null);
const resetting = ref(false);
const sendResetEmail = ref(false);
const resetResult = ref<AdminResetPasswordResponse | null>(null);

onMounted(async () => {
  await loadUsers();
});

async function loadUsers() {
  loading.value = true;
  try {
    users.value = await authStore.getAllUsers();
  } catch (error: any) {
    notify({
      title: 'Error',
      message: 'Failed to load users',
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
}

function confirmToggleStatus(user: User) {
  userToToggle.value = user;
  showToggleStatusConfirm.value = true;
}

async function handleToggleStatus() {
  if (!userToToggle.value) return;

  togglingStatus.value = true;
  try {
    await authStore.updateUserStatus(userToToggle.value.id, !userToToggle.value.isActive);
    notify({
      title: 'Success',
      message: `User ${userToToggle.value.isActive ? 'deactivated' : 'activated'} successfully`,
      type: 'success',
    });
    await loadUsers();
  } catch (error: any) {
    notify({
      title: 'Error',
      message: error.response?.data?.error || 'Failed to update user status',
      type: 'error',
    });
  } finally {
    togglingStatus.value = false;
    showToggleStatusConfirm.value = false;
    userToToggle.value = null;
  }
}

function confirmDelete(user: User) {
  userToDelete.value = user;
  showDeleteConfirm.value = true;
}

function openResetDialog(user: User) {
  userToReset.value = user;
  sendResetEmail.value = false;
  resetResult.value = null;
  showResetDialog.value = true;
}

async function handleAdminReset() {
  if (!userToReset.value) return;

  resetting.value = true;
  resetResult.value = null;
  try {
    const result = await authStore.adminResetPassword(userToReset.value.email, sendResetEmail.value);
    resetResult.value = result;
    notify({
      title: 'Reset link created',
      message: result.message,
      type: 'success',
    });
  } catch (error: any) {
    notify({
      title: 'Error',
      message: error.response?.data?.error || 'Failed to create reset link',
      type: 'error',
    });
  } finally {
    resetting.value = false;
  }
}

async function handleDeleteUser() {
  if (!userToDelete.value) return;

  deletingUser.value = true;
  try {
    await authStore.deleteUser(userToDelete.value.id);
    notify({
      title: 'Success',
      message: 'User deleted successfully',
      type: 'success',
    });
    await loadUsers();
  } catch (error: any) {
    notify({
      title: 'Error',
      message: error.response?.data?.error || 'Failed to delete user',
      type: 'error',
    });
  } finally {
    deletingUser.value = false;
    showDeleteConfirm.value = false;
    userToDelete.value = null;
  }
}

async function copyToClipboard(value: string, successMessage = 'Invite code copied to clipboard') {
  try {
    await navigator.clipboard.writeText(value);
    notify({
      title: 'Copied',
      message: successMessage,
      type: 'success',
    });
  } catch (error) {
    notify({
      title: 'Error',
      message: 'Failed to copy to clipboard',
      type: 'error',
    });
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>
