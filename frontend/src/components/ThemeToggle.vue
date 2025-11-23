<template>
  <button
    type="button"
    class="inline-flex items-center justify-center text-surface-700 dark:text-neutral-200 hover:text-primary-500 dark:hover:text-primary-400 focus:outline-none"
    @click="toggleTheme"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
  >
    <SunIcon v-if="isDark" class="h-5 w-5" />
    <MoonIcon v-else class="h-5 w-5" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MoonIcon, SunIcon } from '@heroicons/vue/24/outline';
import { useTheme } from '../composables/useTheme';

const { theme, toggleTheme } = useTheme();
const isDark = computed(() => theme.value === 'dark');
</script>
