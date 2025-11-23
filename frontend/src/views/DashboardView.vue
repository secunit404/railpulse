<template>
  <div class="flex-1">
    <AppHeader />

    <!-- Main Content -->
    <main class="px-4 py-6 sm:p-6">
      <div class="max-w-screen-2xl mx-auto">
      <!-- Dashboard Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <h2 class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white">My Monitors</h2>
        <button @click="openCreateForm" class="btn-secondary w-full sm:w-auto justify-center">
          <PlusIcon class="h-5 w-5 inline-block mr-1" />
          New Monitor
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-if="!monitorStore.loading && monitorStore.monitors.length === 0"
        class="card text-center py-12"
      >
        <div class="text-neutral-400 mb-4">
          <svg class="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p class="text-lg text-neutral-600 dark:text-neutral-400 mb-4">No monitors yet</p>
      </div>

      <!-- Monitor Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div
          v-for="monitor in monitorStore.monitors"
          :key="monitor.id"
          class="card-hover"
        >
          <!-- Card Header -->
          <div class="mb-2 pb-2 border-b border-neutral-200 dark:border-surface-700">
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <h3 class="text-base font-semibold text-surface-900 dark:text-neutral-100">
                {{ monitor.name }}
              </h3>
              <div class="flex items-center gap-1.5 shrink-0">
                <span
                  v-if="monitor.lastRunStatus === 'success' && monitor.lastRunResultCount !== undefined && monitor.lastRunResultCount !== null"
                  :class="[
                    'px-1.5 py-0.5 rounded text-xs font-medium',
                    (monitor.lastRunResultCount || 0) > 0
                      ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300'
                      : 'bg-neutral-100 dark:bg-surface-700 text-neutral-600 dark:text-neutral-400'
                  ]"
                >
                  {{ monitor.lastRunResultCount }}
                </span>
                <span
                  v-if="monitor.lastRunStatus"
                  :class="[
                    'px-1.5 py-0.5 rounded text-xs font-medium',
                    getStatusClasses(monitor.lastRunStatus)
                  ]"
                >
                  {{ monitor.lastRunStatus === 'success' ? '✓' : monitor.lastRunStatus === 'failed' ? '✗' : '⟳' }}
                </span>
              </div>
            </div>
            <span v-if="monitor.lastRunAt" class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ formatRelativeTime(monitor.lastRunAt) }}
            </span>
            <span v-else class="text-xs text-neutral-500 dark:text-neutral-400">Never run</span>
          </div>

          <!-- Monitor Details -->
          <dl class="space-y-1.5 text-sm mb-3">
            <div class="flex items-baseline gap-2">
              <dt class="text-neutral-500 dark:text-neutral-400 text-xs shrink-0">Route:</dt>
              <dd class="text-surface-900 dark:text-neutral-100 font-medium">
                {{ monitor.stationName }}<span v-if="monitor.destName"> → {{ monitor.destName }}</span>
              </dd>
            </div>
            <div class="flex items-baseline gap-2 flex-wrap">
              <dt class="text-neutral-500 dark:text-neutral-400 text-xs shrink-0">
                {{ monitor.runMode === 'daily' ? 'Schedule:' : 'Query Range:' }}
              </dt>
              <dd class="flex items-center gap-1.5 flex-wrap">
                <span class="text-surface-900 dark:text-neutral-100">
                  <template v-if="monitor.runMode === 'one-time' && monitor.scheduleDate">
                    {{ monitor.scheduleDate }}<template v-if="monitor.scheduleEndDate && monitor.scheduleEndDate !== monitor.scheduleDate"> - {{ monitor.scheduleEndDate }}</template>
                  </template>
                  <template v-else-if="monitor.runMode === 'daily' && monitor.scheduleTime">
                    Daily at {{ monitor.scheduleTime }}
                  </template>
                  <template v-else>
                    Not configured
                  </template>
                </span>
                <span
                  :class="[
                    'px-1.5 py-0.5 rounded text-xs font-medium',
                    monitor.runMode === 'daily'
                      ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300'
                      : 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300'
                  ]"
                >
                  {{ monitor.runMode === 'daily' ? 'Auto' : 'Manual' }}
                </span>
              </dd>
            </div>
            <div class="flex items-baseline gap-2">
              <dt class="text-neutral-500 dark:text-neutral-400 text-xs shrink-0">Threshold:</dt>
              <dd class="text-surface-900 dark:text-neutral-100">{{ monitor.delayThreshold }} min</dd>
            </div>
            <div class="flex items-baseline gap-2">
              <dt class="text-neutral-500 dark:text-neutral-400 text-xs shrink-0">Discord:</dt>
              <dd>
                <span
                  :class="[
                    'px-1.5 py-0.5 rounded text-xs font-medium',
                    monitor.discordWebhookUrl
                      ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-100'
                      : 'bg-neutral-100 dark:bg-surface-700 text-neutral-600 dark:text-neutral-400'
                  ]"
                >
                  {{ monitor.discordWebhookUrl ? 'Configured' : 'None' }}
                </span>
              </dd>
            </div>
          </dl>

          <!-- Action Buttons -->
          <div class="pt-2 border-t border-neutral-200 dark:border-surface-700">
            <div class="flex gap-2">
              <button @click="openEditForm(monitor)" class="flex-1 btn-secondary text-sm py-1.5 justify-center">
                Edit
              </button>
              <button
                @click="confirmDelete(monitor)"
                class="flex-1 btn-secondary text-sm py-1.5 justify-center"
              >
                Delete
              </button>
              <button @click="handleRunNow(monitor.id)" class="flex-1 btn-secondary text-sm py-1.5 justify-center">
                Run Now
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>

    <!-- Results Dialog -->
    <DelayResultsDialog
      :show="showResults"
      :results="delayResults"
      :timestamp="resultTimestamp"
      @close="showResults = false"
    />

    <!-- Delete Confirmation -->
    <TransitionRoot :show="deleteDialogOpen" as="template" @after-leave="handleDeleteDialogLeave">
      <Dialog @close="closeDeleteConfirm" class="relative z-50">
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
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-surface-800 p-6 text-left align-middle shadow-xl">
              <DialogTitle class="text-xl font-semibold text-surface-900 dark:text-neutral-100 mb-2">
                Delete Monitor
              </DialogTitle>
              <p class="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
                Are you sure you want to delete
                <span class="font-semibold">{{ deleteTarget ? deleteTarget.name : '' }}</span>? This action cannot be undone.
              </p>
              <div class="flex justify-end gap-3">
                <button
                  type="button"
                  class="btn-secondary"
                  @click="closeDeleteConfirm"
                  :disabled="deleteLoading"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="btn-primary bg-danger-600 hover:bg-danger-700 border-danger-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="handleDeleteConfirmed"
                  :disabled="deleteLoading"
                >
                  <span v-if="deleteLoading">Deleting...</span>
                  <span v-else>Delete</span>
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <!-- Monitor Form Modal -->
    <monitor-form-modal
      v-model="formVisible"
      :monitor="editingMonitor"
      @saved="handleFormSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useMonitorStore } from '../stores/monitor.store';
import MonitorFormModal from '../components/MonitorFormModal.vue';
import AppHeader from '../components/AppHeader.vue';
import DelayResultsDialog from '../components/DelayResultsDialog.vue';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue';
import {
  PlusIcon,
} from '@heroicons/vue/24/outline';
import type { Monitor, StationDelay } from '../../../shared/types';

const monitorStore = useMonitorStore();

const showResults = ref(false);
const delayResults = ref<StationDelay[]>([]);
const resultTimestamp = ref<string | null>(null);
const formVisible = ref(false);
const editingMonitor = ref<Monitor | null>(null);
const deleteTarget = ref<Monitor | null>(null);
const deleteDialogOpen = ref(false);
const deleteLoading = ref(false);

// Format relative time (e.g., "2 minutes ago")
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

onMounted(async () => {
  await monitorStore.fetchMonitors();
  monitorStore.setupSocketListeners();
});

watch(formVisible, (isOpen) => {
  if (!isOpen) {
    editingMonitor.value = null;
  }
});

function openCreateForm() {
  editingMonitor.value = null;
  formVisible.value = true;
}

function openEditForm(monitor: Monitor) {
  editingMonitor.value = monitor;
  formVisible.value = true;
}

function confirmDelete(monitor: Monitor) {
  deleteTarget.value = monitor;
  deleteDialogOpen.value = true;
}

async function handleFormSaved() {
  await monitorStore.fetchMonitors();
}

async function handleRunNow(monitorId: number) {
  try {
    const result = await monitorStore.runNow(monitorId);
    if (result) {
      delayResults.value = result.delays;
      resultTimestamp.value = new Date().toISOString();
      showResults.value = true;
    }
  } catch (error) {
    console.error('Failed to run monitor:', error);
  }
}

function getStatusClasses(status: string) {
const classes = {
  success: 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-100',
  failed: 'bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-100',
  running: 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-100',
};
  return classes[status as keyof typeof classes] || 'bg-neutral-100 dark:bg-surface-700 text-neutral-600 dark:text-neutral-400';
}

function closeDeleteConfirm() {
  if (deleteLoading.value) return;
  deleteDialogOpen.value = false;
}

function handleDeleteDialogLeave() {
  if (!deleteDialogOpen.value) {
    deleteTarget.value = null;
  }
}

async function handleDeleteConfirmed() {
  if (!deleteTarget.value) return;
  deleteLoading.value = true;
  try {
    await monitorStore.deleteMonitor(deleteTarget.value.id);
    deleteDialogOpen.value = false;
  } catch (error) {
    console.error('Failed to delete monitor:', error);
  } finally {
    deleteLoading.value = false;
  }
}
</script>
