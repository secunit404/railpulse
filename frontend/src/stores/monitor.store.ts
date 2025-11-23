import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../plugins/axios';
import { getSocket } from '../plugins/socket';
import { useNotification } from '../composables/useNotification';
import type { Monitor, CreateMonitorDto, UpdateMonitorDto } from '../../../shared/types';

export const useMonitorStore = defineStore('monitor', () => {
  const monitors = ref<Monitor[]>([]);
  const loading = ref(false);
  const { notify } = useNotification();

  async function fetchMonitors() {
    loading.value = true;
    try {
      const response = await api.get<{ monitors: Monitor[] }>('/api/monitors');
      monitors.value = response.data.monitors;
    } finally {
      loading.value = false;
    }
  }

  async function createMonitor(data: CreateMonitorDto) {
    const response = await api.post<{ success: boolean; monitor: Monitor }>('/api/monitors', data);
    monitors.value.push(response.data.monitor);
    notify({
      title: 'Success',
      message: 'Monitor created successfully',
      type: 'success',
    });
    return response.data.monitor;
  }

  async function updateMonitor(id: number, data: UpdateMonitorDto) {
    const response = await api.put<{ success: boolean; monitor: Monitor }>(
      `/api/monitors/${id}`,
      data
    );
    const index = monitors.value.findIndex((m) => m.id === id);
    if (index !== -1) {
      monitors.value[index] = response.data.monitor;
    }
    notify({
      title: 'Success',
      message: 'Monitor updated successfully',
      type: 'success',
    });
    return response.data.monitor;
  }

  async function deleteMonitor(id: number) {
    try {
      await api.delete(`/api/monitors/${id}`);
      monitors.value = monitors.value.filter((m) => m.id !== id);
      notify({
        title: 'Success',
        message: 'Monitor deleted successfully',
        type: 'success',
      });
    } catch (error: any) {
      notify({
        title: 'Error',
        message: 'Failed to delete monitor',
        type: 'error',
      });
      throw error;
    }
  }

  async function runNow(id: number) {
    const monitor = monitors.value.find((m) => m.id === id);
    if (!monitor) return;

    try {
      const response = await api.post<{ success: boolean; delays: any[]; count: number }>(
        `/api/monitors/${id}/run`
      );

      notify({
        title: 'Monitor Executed',
        message: `Found ${response.data.count} delay(s)`,
        type: response.data.count > 0 ? 'warning' : 'success',
      });

      return response.data;
    } catch (error) {
      notify({
        title: 'Execution Failed',
        message: 'Failed to execute monitor',
        type: 'error',
      });
      throw error;
    }
  }

  function setupSocketListeners() {
    const socket = getSocket();
    if (!socket) return;

    socket.on('monitor:started', (data: any) => {
      const monitor = monitors.value.find((m) => m.id === data.monitorId);
      if (monitor) {
        monitor.lastRunStatus = 'running';
        monitor.lastRunAt = data.timestamp;
      }
    });

    socket.on('monitor:completed', (data: any) => {
      const monitor = monitors.value.find((m) => m.id === data.monitorId);
      if (monitor) {
        monitor.lastRunStatus = 'success';
        monitor.lastRunAt = data.timestamp;
        monitor.lastRunResultCount = data.resultCount;
      }

      notify({
        title: `Monitor Completed: ${data.monitorName}`,
        message: `Found ${data.resultCount} delay(s). Max delay: ${data.maxDelay} minutes`,
        type: data.resultCount > 0 ? 'warning' : 'success',
      });
    });

    socket.on('monitor:failed', (data: any) => {
      const monitor = monitors.value.find((m) => m.id === data.monitorId);
      if (monitor) {
        monitor.lastRunStatus = 'failed';
        monitor.lastRunAt = data.timestamp;
        monitor.lastRunResultCount = 0;
      }

      notify({
        title: `Monitor Failed: ${data.monitorName}`,
        message: data.error,
        type: 'error',
      });
    });
  }

  return {
    monitors,
    loading,
    fetchMonitors,
    createMonitor,
    updateMonitor,
    deleteMonitor,
    runNow,
    setupSocketListeners,
  };
});
