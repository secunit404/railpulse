<template>
  <header class="px-4 py-4 sm:px-6 sm:py-6 border-b border-neutral-200 dark:border-white/10 relative">
    <div class="max-w-screen-2xl mx-auto flex items-center justify-between">
      <!-- Logo -->
      <h1
        @click="router.push('/dashboard')"
        class="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        RailPulse
      </h1>

      <!-- Desktop Navigation -->
      <div class="hidden md:flex items-center gap-3">
        <button
          @click="router.push('/dashboard')"
          :class="[
            'inline-flex items-center text-base font-medium border-b-2 border-transparent px-0 py-1 leading-tight',
            currentRoute === 'dashboard'
              ? 'border-primary-600 dark:border-primary-400 text-surface-900 dark:text-white font-semibold'
              : 'border-transparent text-surface-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-400'
          ]"
        >
          Dashboard
        </button>
        <button
          @click="router.push('/search-history')"
          :class="[
            'inline-flex items-center text-base font-medium border-b-2 border-transparent px-0 py-1 leading-tight',
            currentRoute === 'search-history'
              ? 'border-primary-600 dark:border-primary-400 text-surface-900 dark:text-white font-semibold'
              : 'border-transparent text-surface-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-400'
          ]"
        >
          Search history
        </button>
        <button
          @click="router.push('/profile')"
          :class="[
            'inline-flex items-center text-base font-medium border-b-2 border-transparent px-0 py-1 leading-tight',
            currentRoute === 'profile'
              ? 'border-primary-600 dark:border-primary-400 text-surface-900 dark:text-white font-semibold'
              : 'border-transparent text-surface-700 dark:text-neutral-200 hover:text-primary-600 dark:hover:text-primary-400'
          ]"
        >
          Profile
        </button>
        <ThemeToggle />
        <button
          @click="handleLogout"
          class="btn-secondary"
        >
          Logout
        </button>
      </div>

      <!-- Mobile: Theme Toggle + Hamburger -->
      <div class="flex md:hidden items-center gap-2">
        <ThemeToggle />
        <button
          @click="menuOpen = !menuOpen"
          class="inline-flex items-center justify-center rounded-xl border border-neutral-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800 p-2 shadow-sm hover:bg-neutral-50 dark:hover:bg-surface-700"
          aria-label="Toggle menu"
        >
          <svg
            v-if="!menuOpen"
            class="w-6 h-6 text-surface-700 dark:text-neutral-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg
            v-else
            class="w-6 h-6 text-surface-700 dark:text-neutral-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Backdrop -->
    <transition name="fade">
      <div
        v-if="menuOpen"
        class="fixed inset-0 z-50 md:hidden bg-black/30 backdrop-blur-sm"
        @click="menuOpen = false"
      />
    </transition>

    <!-- Mobile Slide-in Menu Drawer -->
    <transition name="slide">
      <div
        v-if="menuOpen"
        class="fixed top-0 right-0 h-full w-72 z-50 md:hidden bg-white dark:bg-surface-800 shadow-2xl rounded-l-2xl"
        @click.stop
      >
          <!-- Drawer Header -->
          <div class="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-surface-700">
            <h2 class="text-lg font-bold text-surface-900 dark:text-white">RailPulse</h2>
            <button
              @click="menuOpen = false"
              class="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-surface-700"
              aria-label="Close menu"
            >
              <svg class="w-5 h-5 text-surface-700 dark:text-neutral-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Menu Items -->
          <nav class="p-2">
            <button
              @click="navigateTo('/dashboard')"
              :class="[
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left',
                currentRoute === 'dashboard'
                  ? 'bg-primary-100 dark:bg-primary-500/30 text-primary-700 dark:text-primary-200 font-bold shadow-sm'
                  : 'text-surface-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-surface-700'
              ]"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
            </button>

            <button
              @click="navigateTo('/search-history')"
              :class="[
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left',
                currentRoute === 'search-history'
                  ? 'bg-primary-100 dark:bg-primary-500/30 text-primary-700 dark:text-primary-200 font-bold shadow-sm'
                  : 'text-surface-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-surface-700'
              ]"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search history</span>
            </button>

            <button
              @click="navigateTo('/profile')"
              :class="[
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left',
                currentRoute === 'profile'
                  ? 'bg-primary-100 dark:bg-primary-500/30 text-primary-700 dark:text-primary-200 font-bold shadow-sm'
                  : 'text-surface-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-surface-700'
              ]"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profile</span>
            </button>

            <!-- Divider -->
            <div class="my-2 border-t border-neutral-200 dark:border-surface-700"></div>

            <!-- Logout -->
            <button
              @click="handleLogout"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
              </svg>
              <span>Logout</span>
            </button>
          </nav>
      </div>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.store';
import ThemeToggle from './ThemeToggle.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const menuOpen = ref(false);

const currentRoute = computed(() => {
  const path = route.path;
  if (path.startsWith('/dashboard')) return 'dashboard';
  if (path.startsWith('/search-history')) return 'search-history';
  if (path.startsWith('/profile')) return 'profile';
  return '';
});

function navigateTo(path: string) {
  menuOpen.value = false;
  router.push(path);
}

function handleLogout() {
  menuOpen.value = false;
  authStore.logout().then(() => router.push('/login'));
}
</script>

<style scoped>
/* Fade transition for backdrop */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition for drawer */
.slide-enter-active {
  transition: transform 0.3s ease-out;
}

.slide-leave-active {
  transition: transform 0.25s ease-in;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
