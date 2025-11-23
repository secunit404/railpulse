<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 space-y-2 flex flex-col-reverse">
      <TransitionGroup
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'min-w-80 max-w-md rounded-lg shadow-lg p-4 border',
            notificationClasses[notification.type]
          ]"
        >
          <div class="flex items-start">
            <div class="shrink-0">
              <component :is="notificationIcons[notification.type]" class="h-5 w-5" />
            </div>
            <div class="ml-3 flex-1">
              <p class="text-sm font-medium">{{ notification.title }}</p>
              <p class="mt-1 text-sm opacity-90">{{ notification.message }}</p>
            </div>
            <button
              @click="removeNotification(notification.id)"
              class="ml-4 shrink-0 rounded-md hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { useNotification } from '../composables/useNotification';

const { notifications, removeNotification } = useNotification();

const notificationClasses = {
  success: 'bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-700 text-success-800 dark:text-success-100',
  error: 'bg-danger-50 dark:bg-danger-900 border-danger-200 dark:border-danger-700 text-danger-800 dark:text-danger-100',
  warning: 'bg-warning-50 dark:bg-warning-900 border-warning-200 dark:border-warning-700 text-warning-800 dark:text-warning-100',
  info: 'bg-info-50 dark:bg-info-900 border-info-200 dark:border-info-700 text-info-800 dark:text-info-100',
};

const notificationIcons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};
</script>
