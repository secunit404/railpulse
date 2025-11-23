<template>
  <TransitionRoot appear :show="visible" as="template">
    <Dialog as="div" @close="handleCancel" class="relative z-50">
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
        <div class="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-2xl transform rounded-2xl bg-white dark:bg-surface-800 text-left align-middle shadow-2xl border border-neutral-200 dark:border-surface-700 max-h-[90vh] overflow-y-auto my-4">
              <div class="p-4 sm:p-6">
                <DialogTitle as="h3" class="text-xl sm:text-2xl font-semibold leading-6 text-surface-900 dark:text-neutral-100 mb-4 sm:mb-6">
                  {{ isEdit ? 'Edit Monitor' : 'Create Monitor' }}
                </DialogTitle>

                <form @submit.prevent="handleSubmit" class="space-y-4 sm:space-y-6">
                <!-- Monitor Name -->
                <div>
                  <label class="label">Monitor Name <span class="text-danger-500">*</span></label>
                  <input
                    v-model="form.name"
                    type="text"
                    placeholder="e.g., Morning Commute"
                    class="input"
                    required
                  />
                </div>

                <!-- Origin Station -->
                <div>
                  <label class="label">Origin Station <span class="text-danger-500">*</span></label>
                  <Combobox v-model="form.stationSignature" @update:model-value="handleStationChange">
                    <div class="relative">
                      <div class="relative">
                        <ComboboxInput
                          class="input pr-10"
                          :display-value="(signature) => getStationName(signature as string)"
                          @change="originQuery = $event.target.value"
                          placeholder="Search origin station..."
                        />
                        <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-3">
                          <ChevronUpDownIcon class="h-5 w-5 text-neutral-400" />
                        </ComboboxButton>
                      </div>
                      <transition
                        leave-active-class="transition duration-100 ease-in"
                        leave-from-class="opacity-100"
                        leave-to-class="opacity-0"
                      >
                        <ComboboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-surface-700 py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                          <div v-if="filteredOriginStations.length === 0 && originQuery !== ''" class="relative cursor-default select-none py-2 px-4 text-neutral-500 dark:text-neutral-400">
                            No stations found.
                          </div>
                          <ComboboxOption
                            v-for="station in filteredOriginStations"
                            :key="station.signature"
                            :value="station.signature"
                            v-slot="{ active, selected }"
                            as="template"
                          >
                            <li :class="[
                              active ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-900 dark:text-primary-100' : 'text-surface-900 dark:text-neutral-100',
                              'relative cursor-pointer select-none py-2 pl-10 pr-4'
                            ]">
                              <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">
                                {{ station.advertisedName }}
                              </span>
                              <span v-if="selected" class="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                                <CheckIcon class="h-5 w-5" />
                              </span>
                            </li>
                          </ComboboxOption>
                        </ComboboxOptions>
                      </transition>
                    </div>
                  </Combobox>
                </div>

                <!-- Destination Station -->
                <div>
                  <label class="label">Destination Station <span class="text-danger-500">*</span></label>
                  <Combobox v-model="form.destSignature" @update:model-value="handleDestChange">
                    <div class="relative">
                      <div class="relative">
                        <ComboboxInput
                          class="input pr-10"
                          :display-value="(signature) => getStationName(signature as string)"
                          @change="destQuery = $event.target.value"
                          placeholder="Search destination station..."
                        />
                        <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-3">
                          <ChevronUpDownIcon class="h-5 w-5 text-neutral-400" />
                        </ComboboxButton>
                      </div>
                      <transition
                        leave-active-class="transition duration-100 ease-in"
                        leave-from-class="opacity-100"
                        leave-to-class="opacity-0"
                      >
                        <ComboboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-surface-700 py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                          <div v-if="filteredDestStations.length === 0 && destQuery !== ''" class="relative cursor-default select-none py-2 px-4 text-neutral-500 dark:text-neutral-400">
                            No stations found.
                          </div>
                          <ComboboxOption
                            v-for="station in filteredDestStations"
                            :key="station.signature"
                            :value="station.signature"
                            v-slot="{ active, selected }"
                            as="template"
                          >
                            <li :class="[
                              active ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-900 dark:text-primary-100' : 'text-surface-900 dark:text-neutral-100',
                              'relative cursor-pointer select-none py-2 pl-10 pr-4'
                            ]">
                              <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">
                                {{ station.advertisedName }}
                              </span>
                              <span v-if="selected" class="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                                <CheckIcon class="h-5 w-5" />
                              </span>
                            </li>
                          </ComboboxOption>
                        </ComboboxOptions>
                      </transition>
                    </div>
                  </Combobox>
                  <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    Required: Select the final destination to monitor a specific route (e.g., Göteborg C → Älvängen)
                  </p>
                </div>

                <!-- Run Mode -->
                <div>
                  <label class="label">Run Mode <span class="text-danger-500">*</span></label>
                  <div class="space-y-2">
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        v-model="form.runMode"
                        value="daily"
                        class="w-4 h-4 text-amber-500 focus:ring-amber-300"
                      />
                      <div>
                        <div class="font-medium text-surface-900 dark:text-neutral-100">Daily</div>
                        <div class="text-sm text-neutral-500 dark:text-neutral-400">Runs every day at the specified time</div>
                      </div>
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        v-model="form.runMode"
                        value="one-time"
                        class="w-4 h-4 text-amber-500 focus:ring-amber-300"
                      />
                      <div>
                        <div class="font-medium text-surface-900 dark:text-neutral-100">One-Time</div>
                        <div class="text-sm text-neutral-500 dark:text-neutral-400">Runs once on a specific date</div>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Schedule Date Range (only for one-time mode) -->
                <div v-if="form.runMode === 'one-time'" class="space-y-4">
                  <div>
                    <label class="label">Start Date <span class="text-danger-500">*</span></label>
                    <input
                      v-model="scheduleDateString"
                      type="date"
                      class="input"
                      required
                    />
                  </div>
                  <div>
                    <label class="label">End Date <span class="text-danger-500">*</span></label>
                    <input
                      v-model="scheduleEndDateString"
                      type="date"
                      class="input"
                      :min="scheduleDateString"
                      required
                    />
                  </div>
                  <p class="text-sm text-neutral-500 dark:text-neutral-400">
                    Select the date range to query when you manually run this monitor.
                  </p>
                </div>

                <!-- Schedule Time (only for daily mode) -->
                <div v-if="form.runMode === 'daily'">
                  <label class="label">Schedule Time <span class="text-danger-500">*</span></label>
                  <input
                    v-model="scheduleTimeString"
                    type="time"
                    class="input"
                    required
                  />
                  <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                    Time when the monitor runs automatically each day (timezone: server's DEFAULT_TIMEZONE).
                  </p>
                </div>

                <!-- Delay Threshold -->
                <div>
                  <label class="label">Delay Threshold: {{ form.delayThreshold }} minutes</label>
                  <input
                    v-model.number="form.delayThreshold"
                    type="range"
                    min="1"
                    max="120"
                    class="w-full h-2 bg-neutral-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div class="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    <span>1 min</span>
                    <span>120 min</span>
                  </div>
                </div>

                <!-- Discord Webhook -->
                <div>
                  <label class="label">Discord Webhook</label>
                  <input
                    v-model="form.discordWebhookUrl"
                    type="url"
                    placeholder="https://discord.com/api/webhooks/..."
                    class="input"
                  />
                </div>

                <!-- Actions -->
                <div class="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    @click="handleCancel"
                    class="btn-secondary w-full sm:w-auto justify-center order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="loading"
                    class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center order-1 sm:order-2"
                  >
                    <span v-if="loading" class="flex items-center gap-2">
                      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                    <span v-else>{{ isEdit ? 'Update Monitor' : 'Create Monitor' }}</span>
                  </button>
                </div>
              </form>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/vue';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/vue/20/solid';
import { useMonitorStore } from '../stores/monitor.store';
import { useStationStore } from '../stores/station.store';
import { useNotification } from '../composables/useNotification';
import type { Monitor } from '../../../shared/types';

const props = defineProps<{
  modelValue: boolean;
  monitor?: Monitor | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved'): void;
}>();

const monitorStore = useMonitorStore();
const stationStore = useStationStore();
const { notify } = useNotification();

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const activeMonitor = ref<Monitor | null>(null);

const isEdit = computed(() => !!activeMonitor.value);

const loading = ref(false);
const scheduleDateString = ref(getTodayDate());
const scheduleEndDateString = ref(getTodayDate());
const scheduleTimeString = ref('08:00');

// Search queries for filtering stations
const originQuery = ref('');
const destQuery = ref('');

const form = reactive({
  name: '',
  stationSignature: '',
  stationName: '',
  destSignature: '',
  destName: '',
  runMode: 'daily' as 'daily' | 'one-time',
  delayThreshold: 20,
  discordWebhookUrl: '',
});

// Filtered stations - instant filtering with limit for performance
const filteredOriginStations = computed(() => {
  if (originQuery.value === '') {
    return stationStore.stations.slice(0, 100); // Show first 100 when no query
  }
  const query = originQuery.value.toLowerCase();
  const results = [];
  for (const station of stationStore.stations) {
    if (station.advertisedName.toLowerCase().includes(query)) {
      results.push(station);
      if (results.length >= 100) break; // Limit to 100 results for performance
    }
  }
  return results;
});

const filteredDestStations = computed(() => {
  if (destQuery.value === '') {
    return stationStore.stations.slice(0, 100); // Show first 100 when no query
  }
  const query = destQuery.value.toLowerCase();
  const results = [];
  for (const station of stationStore.stations) {
    if (station.advertisedName.toLowerCase().includes(query)) {
      results.push(station);
      if (results.length >= 100) break; // Limit to 100 results for performance
    }
  }
  return results;
});

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getStationName(signature: string): string {
  if (!signature) return '';
  const station = stationStore.stations.find(s => s.signature === signature);
  return station?.advertisedName || '';
}

function resetForm() {
  form.name = '';
  form.stationSignature = '';
  form.stationName = '';
  form.destSignature = '';
  form.destName = '';
  form.runMode = 'daily';
  form.delayThreshold = 20;
  form.discordWebhookUrl = '';
  scheduleDateString.value = getTodayDate();
  scheduleEndDateString.value = getTodayDate();
  scheduleTimeString.value = '08:00';
  originQuery.value = '';
  destQuery.value = '';
}

function populateFromMonitor(monitor: Monitor) {
  form.name = monitor.name;
  form.stationSignature = monitor.stationSignature;
  form.stationName = monitor.stationName;
  form.destSignature = monitor.destSignature || '';
  form.destName = monitor.destName || '';
  form.runMode = monitor.runMode;
  form.delayThreshold = monitor.delayThreshold;
  form.discordWebhookUrl = monitor.discordWebhookUrl || '';
  scheduleDateString.value = monitor.scheduleDate || getTodayDate();
  scheduleEndDateString.value = monitor.scheduleEndDate || monitor.scheduleDate || getTodayDate();
  scheduleTimeString.value = monitor.scheduleTime || '08:00';
}

async function prepareForm() {
  if (!stationStore.loaded) {
    await stationStore.fetchStations();
  }

  if (activeMonitor.value) {
    populateFromMonitor(activeMonitor.value);
  } else {
    resetForm();
  }
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      activeMonitor.value = props.monitor ?? null;
      await prepareForm();
    }
  }
);

watch(
  () => props.monitor,
  (monitor) => {
    if (!visible.value) return;
    activeMonitor.value = monitor ?? null;
    if (activeMonitor.value) {
      populateFromMonitor(activeMonitor.value);
    } else {
      resetForm();
    }
  }
);

function handleStationChange() {
  const station = stationStore.stations.find(s => s.signature === form.stationSignature);
  if (station) {
    form.stationName = station.advertisedName;
  }
}

function handleDestChange() {
  const station = stationStore.stations.find(s => s.signature === form.destSignature);
  if (station) {
    form.destName = station.advertisedName;
  } else {
    form.destName = '';
  }
}

function handleCancel() {
  activeMonitor.value = props.monitor ?? null;
  visible.value = false;
}

async function handleSubmit() {
  if (!form.destSignature || !form.destName) {
    notify({
      title: 'Destination Required',
      message: 'Select a destination station to create this monitor.',
      type: 'warning',
    });
    return;
  }

  if (form.runMode === 'one-time' && !scheduleDateString.value) {
    notify({
      title: 'Start Date Required',
      message: 'Please select a start date for one-time mode.',
      type: 'warning',
    });
    return;
  }

  if (form.runMode === 'one-time' && !scheduleEndDateString.value) {
    notify({
      title: 'End Date Required',
      message: 'Please select an end date for one-time mode.',
      type: 'warning',
    });
    return;
  }

  const data = {
    ...form,
    scheduleTime: form.runMode === 'daily' ? scheduleTimeString.value : undefined,
    scheduleDate: form.runMode === 'one-time' ? scheduleDateString.value : undefined,
    scheduleEndDate: form.runMode === 'one-time' ? scheduleEndDateString.value : undefined,
    discordWebhookUrl: form.discordWebhookUrl || undefined,
    destSignature: form.destSignature,
    destName: form.destName,
  };

  loading.value = true;
  try {
    if (isEdit.value && props.monitor) {
      await monitorStore.updateMonitor(props.monitor.id, data);
    } else {
      await monitorStore.createMonitor(data);
    }
    emit('saved');
    visible.value = false;
  } catch (error) {
    notify({
      title: 'Error',
      message: 'Failed to save monitor',
      type: 'error',
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* Tailwind handles all styling now */
</style>
