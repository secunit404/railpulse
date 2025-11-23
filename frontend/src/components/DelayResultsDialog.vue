<template>
  <TransitionRoot :show="show" as="template">
    <Dialog @close="$emit('close')" class="relative z-50">
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

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-2 sm:p-4">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-7xl transform overflow-hidden rounded-xl sm:rounded-2xl bg-white dark:bg-surface-800 shadow-xl">
              <!-- Dialog Header -->
              <div class="bg-white dark:bg-surface-800 px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 dark:border-surface-700">
                <div class="flex items-start sm:items-center justify-between gap-3">
                  <!-- Left: Title and metadata -->
                  <div class="flex flex-col sm:flex-row sm:items-baseline sm:gap-4 flex-1 min-w-0">
                    <DialogTitle class="text-xl sm:text-2xl font-bold text-surface-900 dark:text-neutral-100">
                      Delay Results
                    </DialogTitle>
                    <div class="flex items-center gap-3 text-xs sm:text-sm text-surface-900 dark:text-neutral-100">
                      <span v-if="timestamp">{{ formatRelativeTime(timestamp) }}</span>
                      <span v-if="results && results.length > 0" class="hidden sm:inline">•</span>
                      <span v-if="results && results.length > 0" class="sm:text-surface-900 dark:text-neutral-100">
                        showing {{ results.length }} delayed {{ results.length === 1 ? 'train' : 'trains' }}
                      </span>
                    </div>
                  </div>

                  <!-- Right: Sort button -->
                  <button
                    v-if="results && results.length > 0"
                    @click="toggleSort"
                    class="btn-secondary text-sm justify-center shrink-0 self-start"
                  >
                    <ChevronUpDownIcon class="h-4 w-4 shrink-0" />
                    <span class="hidden sm:inline">Sort by delay</span>
                    <span class="sm:hidden">Sort</span>
                  </button>
                </div>
              </div>

              <!-- Dialog Content -->
              <div class="p-3 sm:p-6 max-h-[70vh] overflow-y-auto">
                <div v-if="results && results.length > 0">

                  <!-- Results Cards -->
                  <div class="space-y-3">
                    <div
                      v-for="(result, index) in sortedResults"
                      :key="index"
                      class="bg-white dark:bg-surface-800 border rounded-lg overflow-hidden hover:shadow-lg"
                      :class="getBorderClass(result.delayMinutes)"
                    >
                      <!-- Card Header -->
                      <div class="p-3 sm:p-4 cursor-pointer" @click="toggleExpand(index)">
                        <div class="flex items-start justify-between gap-2 sm:gap-4">
                          <!-- Left: Train Info -->
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                              <span class="px-2 py-0.5 sm:py-1 rounded-md bg-primary-600 dark:bg-surface-700 text-neutral-100 text-xs font-bold uppercase shrink-0">
                                {{ result.trainCompany ? result.trainCompany + ' ' + result.trainNumber : result.trainNumber }}
                              </span>
                              <span
                                v-if="result.alternativeInfo?.includes('cancelled')"
                                class="px-2 py-0.5 sm:py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold uppercase shrink-0"
                              >
                                Cancelled
                              </span>
                            </div>
                            <div class="text-sm sm:text-base font-medium text-surface-900 dark:text-neutral-100 mb-2 sm:mb-3">
                              {{ result.journey }}
                            </div>

                            <!-- Time Grid -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <!-- Departure -->
                              <div class="space-y-1">
                                <div class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                                  Departure
                                </div>
                                <div class="flex items-center gap-2">
                                  <div class="flex flex-col">
                                    <span class="text-xs text-neutral-500 dark:text-neutral-400">Planned</span>
                                    <span class="text-sm font-mono text-surface-900 dark:text-neutral-100">
                                      {{ formatTime(result.departurePlanned) }}
                                    </span>
                                  </div>
                                  <ChevronRightIcon class="h-4 w-4 text-neutral-400 shrink-0" />
                                  <div class="flex flex-col">
                                    <span class="text-xs text-neutral-500 dark:text-neutral-400">Actual</span>
                                    <span class="text-sm font-mono font-semibold text-warning-600 dark:text-warning-400">
                                      {{ formatTime(result.departureActual) }}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <!-- Arrival -->
                              <div class="space-y-1">
                                <div class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                                  Arrival
                                </div>
                                <div class="flex items-center gap-2">
                                  <div class="flex flex-col">
                                    <span class="text-xs text-neutral-500 dark:text-neutral-400">Planned</span>
                                    <span class="text-sm font-mono text-surface-900 dark:text-neutral-100">
                                      {{ formatTime(result.arrivalPlanned) }}
                                    </span>
                                  </div>
                                  <ChevronRightIcon class="h-4 w-4 text-neutral-400 shrink-0" />
                                  <div class="flex flex-col">
                                    <span class="text-xs text-neutral-500 dark:text-neutral-400">Expected</span>
                                    <span class="text-sm font-mono font-semibold text-warning-600 dark:text-warning-400">
                                      {{ formatTime(result.arrivalActual) }}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <!-- Right: Delay Badge and Chevron -->
                          <div class="flex flex-col items-end gap-1 sm:gap-2 shrink-0">
                            <span :class="getDelayBadgeClass(result.delayMinutes)">
                              {{ result.delayMinutes }} min
                            </span>
                            <ChevronDownIcon
                              :class="['h-4 w-4 sm:h-5 sm:w-5 text-neutral-400 transition-transform', expandedRows.has(index) && 'rotate-180']"
                            />
                          </div>
                        </div>
                      </div>

                      <!-- Expanded Details -->
                      <div
                        v-if="expandedRows.has(index)"
                        class="border-t border-neutral-200 dark:border-surface-600 bg-neutral-50 dark:bg-surface-800 p-3 sm:p-4"
                      >
                        <div class="space-y-3">
                          <!-- Alternative Info -->
                          <div v-if="result.alternativeInfo" class="rounded-lg bg-white dark:bg-surface-900/50 border border-neutral-200 dark:border-surface-600 p-3">
                            <div class="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                              Alternative travel route
                            </div>
                            <div class="text-sm text-neutral-900 dark:text-neutral-100">
                              {{ result.alternativeInfo }}
                            </div>
                            <div class="text-xs text-neutral-500 dark:text-neutral-400 mt-2 italic">
                              Note: Actual and Expected times shown above are for the alternative train
                            </div>
                          </div>

                          <!-- Delay Reason -->
                          <div class="rounded-lg bg-white dark:bg-surface-900/50 border border-neutral-200 dark:border-surface-600 p-3">
                            <div class="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                              Delay Reason
                            </div>
                            <div class="text-sm text-surface-900 dark:text-neutral-100">
                              {{ result.delayReason }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-else class="text-center py-12">
                  <div class="text-neutral-400 mb-4">
                    <svg class="mx-auto h-16 w-16 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p class="text-lg text-neutral-600 dark:text-neutral-400">No delays found for this period</p>
                </div>
              </div>

              <!-- Dialog Footer -->
              <div class="bg-white dark:bg-surface-800 px-4 sm:px-6 py-3 sm:py-4 flex justify-end border-t border-neutral-200 dark:border-surface-700">
                <button @click="$emit('close')" class="btn-primary px-6 sm:px-8 py-2 w-full sm:w-auto justify-center">
                  Close
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue';
import {
  ChevronRightIcon,
  ChevronUpDownIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface DelayResult {
  trainNumber: string;
  trainCompany?: string;
  journey: string;
  departurePlanned: string;
  departureActual: string;
  arrivalPlanned: string;
  arrivalActual: string;
  delayMinutes: number;
  delayReason: string;
  alternativeInfo?: string;
  replacementBus?: {
    trainNumber: string;
    company?: string;
    description?: string;
    stopLocation?: string;
    directTo?: string;
    departureTime: string;
  };
}

interface Props {
  show: boolean;
  results: DelayResult[];
  timestamp?: string | null;
}

const props = defineProps<Props>();
defineEmits<{
  close: [];
}>();

const expandedRows = ref(new Set<number>());
const sortAscending = ref(false);

const sortedResults = computed(() => {
  if (!props.results) return [];
  const sorted = [...props.results].sort((a, b) => {
    return sortAscending.value
      ? a.delayMinutes - b.delayMinutes
      : b.delayMinutes - a.delayMinutes;
  });
  return sorted;
});

function toggleExpand(index: number) {
  if (expandedRows.value.has(index)) {
    expandedRows.value.delete(index);
  } else {
    expandedRows.value.add(index);
  }
}

function toggleSort() {
  sortAscending.value = !sortAscending.value;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(isoString: string): string {
  return dayjs(isoString).fromNow();
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

function getBorderClass(delayMinutes: number) {
  if (delayMinutes >= 60) {
    return 'border-red-100 dark:border-red-900 border-l-4';
  } else if (delayMinutes >= 40) {
    return 'border-warning-300 dark:border-warning-700 border-l-4';
  } else if (delayMinutes >= 20) {
    return 'border-info-700 dark:border-info-700 border-l-4';
  }
  return 'border-neutral-300 dark:border-neutral-500 border-l-4';
}
</script>
