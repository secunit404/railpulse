<template>
  <div class="flex-1">
    <AppHeader />

    <!-- Main Content -->
    <main class="px-4 py-6 sm:p-6">
      <div class="max-w-screen-2xl mx-auto">
        <!-- Tabs and Filters -->
        <div class="mb-6 space-y-4">
          <!-- Category Tabs -->
          <div class="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto border-b border-neutral-200 dark:border-surface-700">
            <button
              @click="activeTab = 'auto'"
              :class="[
                'px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium border-b-2 shrink-0',
                activeTab === 'auto'
                  ? 'border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-300'
                  : 'border-transparent text-neutral-500 dark:text-neutral-500 hover:text-surface-900 dark:hover:text-neutral-300'
              ]"
            >
              Auto Runs ({{ autoCount }})
            </button>
            <button
              @click="activeTab = 'manual'"
              :class="[
                'px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium border-b-2 shrink-0',
                activeTab === 'manual'
                  ? 'border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-300'
                  : 'border-transparent text-neutral-500 dark:text-neutral-500 hover:text-surface-900 dark:hover:text-neutral-300'
              ]"
            >
              Manual Searches ({{ manualCount }})
            </button>
          </div>

          <!-- Filters Row -->
          <div class="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <!-- Monitor Filter -->
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <Listbox v-model="selectedMonitorId">
                <div class="relative w-full sm:w-60">
                  <ListboxButton
                    class="w-full px-4 py-2 rounded-lg border-2 border-neutral-200 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-neutral-100 font-medium shadow-sm hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-0 focus:border-neutral-200 dark:focus:border-surface-600 cursor-pointer flex items-center justify-between"
                  >
                    <span class="truncate">{{ selectedMonitorLabel }}</span>
                    <svg class="w-4 h-4 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </ListboxButton>
                  <TransitionRoot
                    as="template"
                    enter="transition ease-out duration-100"
                    enter-from="opacity-0 translate-y-1"
                    enter-to="opacity-100 translate-y-0"
                    leave="transition ease-in duration-75"
                    leave-from="opacity-100 translate-y-0"
                    leave-to="opacity-0 translate-y-1"
                  >
                    <ListboxOptions
                      class="absolute z-20 mt-2 w-full max-h-64 overflow-auto rounded-lg border border-neutral-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-lg focus:outline-none"
                    >
                      <ListboxOption
                        v-for="option in monitorOptions"
                        :key="option.id ?? 'all'"
                        :value="option.id"
                        v-slot="{ active, selected }"
                      >
                        <li
                          :class="[
                            'px-4 py-2 text-sm cursor-pointer flex items-center justify-between',
                            active ? 'bg-neutral-100 dark:bg-surface-700 text-surface-900 dark:text-neutral-50' : 'text-surface-800 dark:text-neutral-100',
                            selected ? 'font-semibold' : 'font-medium'
                          ]"
                        >
                          <span class="truncate">{{ option.name }}</span>
                          <svg
                            v-if="selected"
                            class="w-4 h-4 text-primary-600 dark:text-primary-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </li>
                      </ListboxOption>
                    </ListboxOptions>
                  </TransitionRoot>
                </div>
              </Listbox>
            </div>

            <!-- Selection Actions -->
            <div v-if="filteredHistories.length > 0" class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <button
                v-if="!historyStore.hasSelections"
                @click="historyStore.selectAll(activeTab)"
                class="btn-secondary text-sm w-full sm:w-auto justify-center"
              >
                Select All
              </button>
              <template v-else>
                <span class="text-sm text-neutral-600 dark:text-neutral-400">
                  {{ historyStore.selectedCount }} selected
                </span>
                <button
                  @click="historyStore.clearSelections"
                  class="btn-secondary text-sm w-full sm:w-auto justify-center"
                >
                  Clear
                </button>
                <button
                  @click="confirmBulkDelete"
                  class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium w-full sm:w-auto"
                >
                  Delete Selected
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="showLoading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p class="mt-4 text-neutral-600 dark:text-neutral-400">Loading search history...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredHistories.length === 0" class="card text-center py-12">
          <div class="text-neutral-400 mb-4">
            <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p class="text-lg text-neutral-600 dark:text-neutral-400">
            No {{ activeTab === 'auto' ? 'auto run' : 'manual search' }} history found
          </p>
        </div>

        <!-- History List -->
        <div v-else class="space-y-4">
          <!-- Date Group Headers with Entries -->
          <div v-for="group in groupedHistories" :key="group.label" class="space-y-2">
            <!-- Date Header -->
            <div class="sticky top-0 z-10 mb-1 ml-1">
              <h3 class="text-sm font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
                {{ group.label }}
              </h3>
            </div>

            <!-- Entries in this group -->
            <div
              v-for="history in group.histories"
              :key="history.id"
              class="card-hover"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
                <!-- Checkbox -->
                <input
                  type="checkbox"
                  :checked="historyStore.isSelected(history.id)"
                  @change="historyStore.toggleSelection(history.id)"
                  class="h-4 w-4 rounded border-neutral-300 dark:border-surface-600 text-primary-600 focus:ring-primary-500 shrink-0"
                />

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <!-- Left: Route and Info -->
                    <div class="flex-1 min-w-0">
                      <!-- Route with Icon -->
                      <div class="flex flex-wrap items-center gap-2 mb-1">
                        <h3 class="text-base sm:text-lg font-bold text-surface-900 dark:text-neutral-100 truncate">
                          {{ history.stationName }}
                        </h3>
                        <svg class="h-4 w-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <h3 class="text-base sm:text-lg font-bold text-surface-900 dark:text-neutral-100 truncate">
                          {{ history.destName }}
                        </h3>
                      </div>

                      <!-- Compact Info Row -->
                      <div class="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400 flex-wrap">
                        <!-- Relative Time -->
                        <span class="font-medium">{{ formatRelativeTime(history.createdAt) }}</span>

                        <!-- Monitor Badge -->
                        <span
                          v-if="history.monitor"
                          class="px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-500/20 text-neutral-800 dark:text-neutral-300"
                        >
                          {{ history.monitor.name }}
                        </span>

                        <!-- Date Range -->
                        <span>{{ formatCompactDate(history.startDate) }}<template v-if="history.startDate !== history.endDate"> - {{ formatCompactDate(history.endDate) }}</template></span>

                        <!-- Threshold -->
                        <span>≥{{ history.delayThreshold }}min</span>
                      </div>

                      <!-- Error Message (if any) -->
                      <div v-if="!history.success && history.errorMessage" class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-900 dark:text-red-100">
                        <span class="font-semibold">Error:</span> {{ history.errorMessage }}
                      </div>
                    </div>

                    <!-- Right: Status and Action -->
                    <div class="flex w-full sm:w-auto items-stretch gap-2 sm:gap-3 justify-between sm:justify-end">
                      <!-- Delay Badge (shows max delay when there are delays) -->
                      <div
                        v-if="history.success && history.resultCount > 0"
                        :class="[
                          'px-4 py-2 rounded-lg font-bold text-sm text-center flex flex-col items-center justify-center w-full sm:w-auto sm:self-stretch min-h-11',
                          getMaxDelayColorClass(history)
                        ]"
                      >
                        <div class="text-[10px] font-medium uppercase tracking-wide opacity-75 leading-none mb-0.5">Max Delay</div>
                        <div class="leading-tight">{{ getMaxDelay(history) }} min</div>
                      </div>

                      <!-- Status Badge (for On Time / Failed) -->
                      <div
                        v-else
                        :class="[
                          'px-4 py-2 rounded-lg font-bold text-sm text-center w-full sm:w-auto sm:self-stretch flex items-center justify-center min-h-11',
                          history.success
                            ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        ]"
                      >
                        {{ history.success ? 'On Time' : 'Failed' }}
                      </div>

                      <!-- View Button -->
                      <button
                        v-if="history.success && history.resultCount > 0"
                        @click="viewResults(history)"
                        class="btn-secondary text-sm w-full sm:w-auto self-stretch min-h-11"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                </div>
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
      :timestamp="currentHistory?.createdAt"
      @close="showResults = false"
    />

    <!-- Delete Confirmation Dialog -->
    <TransitionRoot :show="deleteDialogOpen" as="template">
      <Dialog @close="closeDeleteDialog" class="relative z-50">
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
                Delete Search History
              </DialogTitle>
              <p class="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
                Are you sure you want to delete
                <span class="font-semibold">{{ historyStore.selectedCount }} {{ historyStore.selectedCount === 1 ? 'entry' : 'entries' }}</span>? This action cannot be undone.
              </p>
              <div class="flex justify-end gap-3">
                <button
                  type="button"
                  class="btn-secondary"
                  @click="closeDeleteDialog"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild, Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useSearchHistoryStore } from '../stores/search-history.store';
import { useMonitorStore } from '../stores/monitor.store';
import AppHeader from '../components/AppHeader.vue';
import DelayResultsDialog from '../components/DelayResultsDialog.vue';
import type { SearchHistory, StationDelay } from '../../../shared/types';

dayjs.extend(relativeTime);

const historyStore = useSearchHistoryStore();
const monitorStore = useMonitorStore();
const showLoading = ref(false);
let loadingTimer: ReturnType<typeof setTimeout> | null = null;

// State
const activeTab = ref<'auto' | 'manual'>('auto');
const selectedMonitorId = ref<number | undefined>(undefined);
const showResults = ref(false);
const currentHistory = ref<SearchHistory | null>(null);
const delayResults = ref<StationDelay[]>([]);
const deleteDialogOpen = ref(false);
const deleteLoading = ref(false);

// Computed
const filteredHistories = computed(() => {
  let filtered = activeTab.value === 'auto' ? historyStore.autoHistories : historyStore.manualHistories;

  // Apply monitor filter if selected
  if (selectedMonitorId.value !== undefined) {
    filtered = filtered.filter(h => h.monitorId === selectedMonitorId.value);
  }

  return filtered;
});

const autoCount = computed(() => {
  const all = historyStore.histories.filter(h => h.searchType === 'auto');
  if (selectedMonitorId.value !== undefined) {
    return all.filter(h => h.monitorId === selectedMonitorId.value).length;
  }
  return all.length;
});

const manualCount = computed(() => {
  const all = historyStore.histories.filter(h => h.searchType === 'manual');
  if (selectedMonitorId.value !== undefined) {
    return all.filter(h => h.monitorId === selectedMonitorId.value).length;
  }
  return all.length;
});


// Get monitors that have entries for the current active tab
const availableMonitors = computed(() => {
  const currentTabHistories = activeTab.value === 'auto'
    ? historyStore.autoHistories
    : historyStore.manualHistories;

  // Get unique monitor IDs from current tab's histories
  const monitorIds = new Set(
    currentTabHistories
      .map(h => h.monitorId)
      .filter(id => id !== null && id !== undefined) as number[]
  );

  // Return only monitors that have entries in current tab
  return monitorStore.monitors.filter(m => monitorIds.has(m.id));
});

// Monitor options for select / listbox
const monitorOptions = computed(() => [
  { id: undefined, name: 'All Monitors' },
  ...availableMonitors.value.map(m => ({ id: m.id, name: m.name }))
]);

const selectedMonitorLabel = computed(() => {
  const found = monitorOptions.value.find(o => o.id === selectedMonitorId.value);
  return found ? found.name : 'All Monitors';
});

// Group histories by date
const groupedHistories = computed(() => {
  const histories = filteredHistories.value;
  const now = dayjs();

  const groups: { label: string; histories: SearchHistory[] }[] = [
    { label: 'Today', histories: [] },
    { label: 'Yesterday', histories: [] },
    { label: 'This Week', histories: [] },
    { label: 'Last Week', histories: [] },
    { label: 'This Month', histories: [] },
    { label: 'Older', histories: [] }
  ];

  histories.forEach(history => {
    const date = dayjs(history.createdAt);

    // Use startOf('day') to compare calendar days instead of 24-hour periods
    const todayStart = now.startOf('day');
    const dateStart = date.startOf('day');
    const diffDays = todayStart.diff(dateStart, 'day');
    const diffWeeks = todayStart.diff(dateStart, 'week');
    const diffMonths = todayStart.diff(dateStart, 'month');

    if (diffDays === 0) {
      groups[0].histories.push(history);
    } else if (diffDays === 1) {
      groups[1].histories.push(history);
    } else if (diffDays <= 7) {
      groups[2].histories.push(history);
    } else if (diffWeeks === 1) {
      groups[3].histories.push(history);
    } else if (diffMonths === 0) {
      groups[4].histories.push(history);
    } else {
      groups[5].histories.push(history);
    }
  });

  // Only return groups that have histories
  return groups.filter(group => group.histories.length > 0);
});

// Methods
async function loadHistory() {
  // Load all history without filtering by type - we'll filter on frontend
  await historyStore.fetchHistory({
    monitorId: selectedMonitorId.value,
  });
}

function viewResults(history: SearchHistory) {
  currentHistory.value = history;
  delayResults.value = history.results;
  showResults.value = true;
}

function confirmBulkDelete() {
  deleteDialogOpen.value = true;
}

function closeDeleteDialog() {
  if (!deleteLoading.value) {
    deleteDialogOpen.value = false;
  }
}

async function handleDeleteConfirmed() {
  deleteLoading.value = true;
  try {
    await historyStore.bulkDelete();
    deleteDialogOpen.value = false;
    await loadHistory();
  } catch (error) {
    console.error('Failed to delete search history entries:', error);
  } finally {
    deleteLoading.value = false;
  }
}

// Formatting helpers
function formatRelativeTime(isoString: string): string {
  return dayjs(isoString).fromNow();
}

function formatCompactDate(isoString: string): string {
  return dayjs(isoString).format('MMM D');
}

// Delay statistics helpers
function getMaxDelay(history: SearchHistory): number {
  if (!history.results || history.results.length === 0) return 0;
  const delays = history.results.map(r => r.delayMinutes);
  return Math.max(...delays);
}

function getMaxDelayColorClass(history: SearchHistory): string {
  const maxDelay = getMaxDelay(history);
  return getDelayBadgeClass(maxDelay);
}

function getDelayBadgeClass(delayMinutes: number): string {
  const base = 'px-3 py-1.5 rounded-lg font-bold text-m';
  if (delayMinutes >= 60) {
    return `${base} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300`;
  } else if (delayMinutes >= 40) {
    return `${base} bg-warning-300 dark:bg-warning-700/30 text-warning-700 dark:text-warning-300`;
  } else if (delayMinutes >= 20) {
    return `${base} bg-info-100 dark:bg-info-700/30 text-info-700 dark:text-info-300`;
  }
  return `${base} bg-neutral-100 dark:bg-surface-700 text-neutral-700 dark:text-neutral-300`;
}

// Lifecycle
onMounted(async () => {
  await monitorStore.fetchMonitors();
  await loadHistory();
});

// Delay showing the loading state to avoid flicker on fast responses
watch(
  () => historyStore.loading,
  (isLoading) => {
    if (isLoading) {
      if (loadingTimer) clearTimeout(loadingTimer);
      loadingTimer = setTimeout(() => {
        showLoading.value = true;
      }, 150);
    } else {
      if (loadingTimer) {
        clearTimeout(loadingTimer);
        loadingTimer = null;
      }
      showLoading.value = false;
    }
  }
);

onUnmounted(() => {
  if (loadingTimer) {
    clearTimeout(loadingTimer);
  }
});

// Watch for tab changes - just clear selections, no need to reload
watch(activeTab, () => {
  historyStore.clearSelections();
});
</script>
