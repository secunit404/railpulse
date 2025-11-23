<template>
  <footer class="border-none px-4 sm:px-8">
    <div class="max-w-screen-2xl mx-auto w-full flex flex-row items-center justify-between gap-2 py-3">
      <div
        class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]"
        :class="statusStyles.text"
      >
        <span class="h-2 w-2 rounded-full animate-pulse" :class="statusStyles.dot"></span>
        <span>{{ statusStyles.label }}</span>
      </div>
      <div class="flex items-center gap-2 text-sm font-semibold  text-neutral-700 dark:text-neutral-200">
        <span class="text-neutral-700 dark:text-neutral-400">© {{ year }} RailPulse</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useMonitorStore } from '../stores/monitor.store';
import { useAuthStore } from '../stores/auth.store';

const monitorStore = useMonitorStore();
const authStore = useAuthStore();
const year = new Date().getFullYear();

const statusStyles = computed(() => {
  const hasDaily = monitorStore.monitors.some(m => m.runMode === 'daily');
  const hasManual = monitorStore.monitors.some(m => m.runMode !== 'daily');

  if (!authStore.isAuthenticated) {
    return {
      label: 'Not signed in',
      dot: 'bg-neutral-500',
      text: 'text-neutral-700 dark:text-neutral-300',
    };
  }

  if (monitorStore.loading) {
    return {
      label: 'Checking monitors…',
      dot: 'bg-warning-400',
      text: 'text-warning-700 dark:text-warning-100',
    };
  }

  if (monitorStore.monitors.length > 0 && hasDaily) {
    return {
      label: hasManual ? 'Auto + manual monitors' : 'Monitors live',
      dot: 'bg-success-500',
      text: 'text-success-700 dark:text-success-100',
    };
  }

  if (monitorStore.monitors.length > 0 && !hasDaily && hasManual) {
    return {
      label: 'Manual monitors',
      dot: 'bg-warning-400',
      text: 'text-warning-700 dark:text-warning-100',
    };
  }

  return {
    label: 'No monitors configured',
    dot: 'bg-danger-500',
    text: 'text-danger-700 dark:text-danger-100',
  };
});

onMounted(async () => {
  if (authStore.isAuthenticated && monitorStore.monitors.length === 0 && !monitorStore.loading) {
    try {
      await monitorStore.fetchMonitors();
    } catch {
      // Ignore errors here; main views surface notifications.
    }
  }
});
</script>
