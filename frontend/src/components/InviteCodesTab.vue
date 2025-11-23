<template>
  <div class="card">
    <h2 class="text-xl sm:text-2xl font-semibold text-surface-900 dark:text-neutral-100 mb-4 sm:mb-6">Invite Code Management</h2>

    <!-- Create Invite Code Form -->
    <div class="mb-4 sm:mb-6 p-4 sm:p-6 border border-neutral-200 dark:border-surface-600 rounded-xl shadow-sm">
      <div class="mb-4">
        <h3 class="text-base sm:text-lg font-semibold text-surface-900 dark:text-neutral-100">Create new invite code</h3>
        <p class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">Generate a unique code for new user registration.</p>
      </div>
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <label class="block text-sm font-medium text-surface-900 dark:text-neutral-100 mb-1.5">Expires in (days)</label>
          <input
            v-model.number="expiresInDays"
            type="number"
            min="1"
            class="input"
            placeholder="Leave empty for permanent"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="handleCreateInvite"
            :disabled="creatingInvite"
            class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap h-[42px] w-full sm:w-auto justify-center"
          >
            <svg v-if="!creatingInvite" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span v-if="creatingInvite">Creating...</span>
            <span v-else>Create Code</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Invite Codes List -->
    <div>
      <h3 class="text-base sm:text-lg font-medium text-surface-900 dark:text-neutral-100 mb-3 sm:mb-4">All invite codes</h3>

      <div v-if="loadingInvites" class="text-center py-8">
        <p class="text-neutral-600 dark:text-neutral-400">Loading invite codes...</p>
      </div>

      <div v-else-if="inviteCodes.length === 0" class="text-center py-8">
        <p class="text-neutral-600 dark:text-neutral-400">No invite codes created yet</p>
      </div>

      <div v-else class="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
        <table class="w-full min-w-[640px]">
          <thead>
            <tr class="border-b border-neutral-200 dark:border-surface-600">
              <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Code</th>
              <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Created By</th>
              <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Used By</th>
              <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Status</th>
              <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Expires</th>
              <th class="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-semibold text-surface-900 dark:text-neutral-100">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="invite in inviteCodes"
              :key="invite.id"
              class="border-b border-neutral-200 dark:border-surface-600 hover:bg-neutral-50 dark:hover:bg-surface-700/50"
            >
              <td class="py-2 sm:py-3 px-2">
                <input
                  type="text"
                  :value="invite.code"
                  @click="copyToClipboard(invite.code)"
                  readonly
                  class="w-full min-w-[100px] text-xs bg-neutral-50 dark:bg-surface-700 border border-neutral-200 dark:border-surface-600 rounded px-2 py-1 font-mono text-surface-900 dark:text-neutral-100 cursor-pointer hover:bg-neutral-100 dark:hover:bg-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                  title="Click to copy"
                />
              </td>
              <td class="py-2 sm:py-3 px-2 text-xs sm:text-sm text-surface-900 dark:text-neutral-100">
                {{ invite.creatorEmail }}
              </td>
              <td class="py-2 sm:py-3 px-2 text-xs sm:text-sm text-surface-900 dark:text-neutral-100">
                {{ invite.usedByEmail || 'Not Used' }}
              </td>
              <td class="py-2 sm:py-3 px-2">
                <span
                  :class="getStatusBadgeClass(invite)"
                  class="inline-block px-2 py-0.5 sm:py-1 rounded text-xs font-medium whitespace-nowrap"
                >
                  {{ getStatusText(invite) }}
                </span>
              </td>
              <td class="py-2 sm:py-3 px-2 text-xs sm:text-sm text-surface-900 dark:text-neutral-100">
                {{ invite.expiresAt ? formatDate(invite.expiresAt) : 'Never' }}
              </td>
              <td class="py-2 sm:py-3 px-2">
                <div class="flex items-center gap-2 sm:gap-3">
                  <button
                    v-if="invite.active && !invite.isUsed && !invite.isExpired"
                    @click="confirmDeactivate(invite)"
                    class="text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300 text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    Deactivate
                  </button>
                  <button
                    @click="confirmDelete(invite)"
                    class="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Deactivate Invite Code Confirmation Dialog -->
    <TransitionRoot :show="showDeactivateConfirm" as="template">
      <Dialog @close="showDeactivateConfirm = false" class="relative z-50">
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
                Deactivate Invite Code
              </DialogTitle>
              <p class="text-neutral-600 dark:text-neutral-300 mb-4">
                Are you sure you want to deactivate this invite code? It will no longer be usable for new registrations.
              </p>
              <div v-if="inviteToDeactivate" class="mb-6 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg">
                <code class="text-sm font-mono text-surface-900 dark:text-neutral-100">
                  {{ inviteToDeactivate.code }}
                </code>
              </div>
              <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  @click="showDeactivateConfirm = false"
                  class="flex-1 btn-secondary order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  @click="handleDeactivateInvite"
                  :disabled="deactivatingInvite"
                  class="flex-1 bg-danger-600 hover:bg-danger-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 order-1 sm:order-2"
                >
                  <span v-if="deactivatingInvite">Deactivating...</span>
                  <span v-else>Deactivate</span>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Delete Invite Code Confirmation Dialog -->
    <TransitionRoot :show="showDeleteInviteConfirm" as="template">
      <Dialog @close="showDeleteInviteConfirm = false" class="relative z-50">
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
                Delete Invite Code
              </DialogTitle>
              <p class="text-neutral-600 dark:text-neutral-300 mb-4">
                Are you sure you want to permanently delete this invite code? This action cannot be undone.
              </p>
              <div v-if="inviteToDelete" class="mb-6 p-3 bg-neutral-50 dark:bg-surface-700 rounded-lg">
                <code class="text-sm font-mono text-surface-900 dark:text-neutral-100">
                  {{ inviteToDelete.code }}
                </code>
              </div>
              <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  @click="showDeleteInviteConfirm = false"
                  class="flex-1 btn-secondary order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  @click="handleDeleteInvite"
                  :disabled="deletingInvite"
                  class="flex-1 bg-danger-600 hover:bg-danger-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 order-1 sm:order-2"
                >
                  <span v-if="deletingInvite">Deleting...</span>
                  <span v-else>Delete Permanently</span>
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
import type { InviteCode } from '../../../shared/types';

const authStore = useAuthStore();
const { notify } = useNotification();

const inviteCodes = ref<InviteCode[]>([]);
const loadingInvites = ref(false);
const creatingInvite = ref(false);
const expiresInDays = ref<number | null>(null);
const showDeactivateConfirm = ref(false);
const inviteToDeactivate = ref<InviteCode | null>(null);
const deactivatingInvite = ref(false);
const showDeleteInviteConfirm = ref(false);
const inviteToDelete = ref<InviteCode | null>(null);
const deletingInvite = ref(false);

onMounted(async () => {
  await loadInviteCodes();
});

async function loadInviteCodes() {
  loadingInvites.value = true;
  try {
    inviteCodes.value = await authStore.getAllInviteCodes();
  } catch (error: any) {
    notify({
      title: 'Error',
      message: 'Failed to load invite codes',
      type: 'error',
    });
  } finally {
    loadingInvites.value = false;
  }
}

async function handleCreateInvite() {
  creatingInvite.value = true;
  try {
    await authStore.createInviteCode(expiresInDays.value);
    notify({
      title: 'Success',
      message: 'Invite code created successfully',
      type: 'success',
    });
    await loadInviteCodes();
    expiresInDays.value = null;
  } catch (error: any) {
    notify({
      title: 'Create Failed',
      message: error.response?.data?.error || 'Failed to create invite code',
      type: 'error',
    });
  } finally {
    creatingInvite.value = false;
  }
}

function confirmDeactivate(invite: InviteCode) {
  inviteToDeactivate.value = invite;
  showDeactivateConfirm.value = true;
}

async function handleDeactivateInvite() {
  if (!inviteToDeactivate.value) return;

  deactivatingInvite.value = true;
  try {
    await authStore.deactivateInviteCode(inviteToDeactivate.value.id);
    notify({
      title: 'Success',
      message: 'Invite code deactivated',
      type: 'success',
    });
    await loadInviteCodes();
  } catch (error: any) {
    notify({
      title: 'Deactivate Failed',
      message: error.response?.data?.error || 'Failed to deactivate invite code',
      type: 'error',
    });
  } finally {
    deactivatingInvite.value = false;
    showDeactivateConfirm.value = false;
    inviteToDeactivate.value = null;
  }
}

function confirmDelete(invite: InviteCode) {
  inviteToDelete.value = invite;
  showDeleteInviteConfirm.value = true;
}

async function handleDeleteInvite() {
  if (!inviteToDelete.value) return;

  deletingInvite.value = true;
  try {
    await authStore.deleteInviteCode(inviteToDelete.value.id);
    notify({
      title: 'Success',
      message: 'Invite code permanently deleted',
      type: 'success',
    });
    await loadInviteCodes();
  } catch (error: any) {
    notify({
      title: 'Delete Failed',
      message: error.response?.data?.error || 'Failed to delete invite code',
      type: 'error',
    });
  } finally {
    deletingInvite.value = false;
    showDeleteInviteConfirm.value = false;
    inviteToDelete.value = null;
  }
}

async function copyToClipboard(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    notify({
      title: 'Copied',
      message: 'Invite code copied to clipboard',
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

function getStatusBadgeClass(invite: InviteCode) {
  if (invite.isUsed) return 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
  if (invite.isExpired) return 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400';
  if (invite.active) return 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400';
  return 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300';
}

function getStatusText(invite: InviteCode) {
  if (invite.isUsed) return 'Used';
  if (invite.isExpired) return 'Expired';
  if (invite.active) return 'Active';
  return 'Inactive';
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
