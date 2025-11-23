import { ref } from 'vue';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const notifications = ref<Notification[]>([]);
let nextId = 1;

export function useNotification() {
  const notify = ({ title, message, type }: Omit<Notification, 'id'>) => {
    const id = nextId++;
    notifications.value.push({ id, title, message, type });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: number) => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  return {
    notifications,
    notify,
    removeNotification,
  };
}
