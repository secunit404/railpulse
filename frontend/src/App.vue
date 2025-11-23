<template>
  <div
    id="app"
    class="min-h-screen flex flex-col bg-linear-to-br from-neutral-50 via-neutral-100 to-neutral-200 dark:from-surface-900 dark:via-surface-900 dark:to-surface-800"
  >
    <RouterView v-slot="{ Component }">
      <component :is="Component" class="flex-1" />
    </RouterView>
    <SiteFooter />
    <NotificationContainer />
  </div>
</template>

<script setup lang="ts">
import NotificationContainer from './components/NotificationContainer.vue';
import SiteFooter from './components/SiteFooter.vue';
</script>

<style>
body {
  margin: 0;
  padding: 0;
}
</style>
