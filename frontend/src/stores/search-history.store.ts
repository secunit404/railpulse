import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../plugins/axios';
import { useNotification } from '../composables/useNotification';
import type { SearchHistory, SearchHistoryListResponse } from '../../../shared/types';

export const useSearchHistoryStore = defineStore('searchHistory', () => {
  const histories = ref<SearchHistory[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const selectedIds = ref<Set<number>>(new Set());
  const { notify } = useNotification();

  // Computed
  const autoHistories = computed(() =>
    histories.value.filter(h => h.searchType === 'auto')
  );

  const manualHistories = computed(() =>
    histories.value.filter(h => h.searchType === 'manual')
  );

  const hasSelections = computed(() => selectedIds.value.size > 0);

  const selectedCount = computed(() => selectedIds.value.size);

  // Actions
  async function fetchHistory(params?: {
    searchType?: 'auto' | 'manual';
    monitorId?: number;
    limit?: number;
    offset?: number;
  }) {
    loading.value = true;

    try {
      const queryParams = new URLSearchParams();
      if (params?.searchType) queryParams.append('searchType', params.searchType);
      if (params?.monitorId !== undefined) queryParams.append('monitorId', params.monitorId.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await api.get<SearchHistoryListResponse>(
        `/api/search-history?${queryParams.toString()}`
      );

      histories.value = response.data.entries;
      total.value = response.data.total;
    } catch (error: any) {
      notify({
        title: 'Error',
        message: 'Failed to load search history',
        type: 'error',
      });
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function getHistoryById(id: number): Promise<SearchHistory | null> {
    try {
      const response = await api.get<SearchHistory>(`/api/search-history/${id}`);
      return response.data;
    } catch (error: any) {
      notify({
        title: 'Error',
        message: 'Failed to load search history entry',
        type: 'error',
      });
      return null;
    }
  }

  async function deleteHistory(id: number) {
    try {
      await api.delete(`/api/search-history/${id}`);
      histories.value = histories.value.filter(h => h.id !== id);
      selectedIds.value.delete(id);
      total.value--;

      notify({
        title: 'Success',
        message: 'Search history entry deleted',
        type: 'success',
      });
    } catch (error: any) {
      notify({
        title: 'Error',
        message: 'Failed to delete search history entry',
        type: 'error',
      });
      throw error;
    }
  }

  async function bulkDelete(ids?: number[]) {
    const idsToDelete = ids || Array.from(selectedIds.value);
    if (idsToDelete.length === 0) return;

    try {
      const response = await api.post<{ success: boolean; count: number }>(
        '/api/search-history/bulk-delete',
        { ids: idsToDelete }
      );

      histories.value = histories.value.filter(h => !idsToDelete.includes(h.id));
      total.value -= response.data.count;
      clearSelections();

      notify({
        title: 'Success',
        message: `Deleted ${response.data.count} search history ${response.data.count === 1 ? 'entry' : 'entries'}`,
        type: 'success',
      });
    } catch (error: any) {
      notify({
        title: 'Error',
        message: 'Failed to delete search history entries',
        type: 'error',
      });
      throw error;
    }
  }

  async function deleteMonitorHistory(monitorId: number) {
    try {
      const response = await api.delete<{ success: boolean; count: number }>(
        `/api/search-history/monitor/${monitorId}`
      );

      histories.value = histories.value.filter(h => h.monitorId !== monitorId);
      total.value -= response.data.count;

      notify({
        title: 'Success',
        message: `Deleted ${response.data.count} search history ${response.data.count === 1 ? 'entry' : 'entries'}`,
        type: 'success',
      });
    } catch (error: any) {
      notify({
        title: 'Error',
        message: 'Failed to delete monitor search history',
        type: 'error',
      });
      throw error;
    }
  }

  // Selection management
  function toggleSelection(id: number) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id);
    } else {
      selectedIds.value.add(id);
    }
  }

  function selectAll(searchType?: 'auto' | 'manual') {
    const itemsToSelect = searchType
      ? histories.value.filter(h => h.searchType === searchType)
      : histories.value;

    itemsToSelect.forEach(h => selectedIds.value.add(h.id));
  }

  function clearSelections() {
    selectedIds.value.clear();
  }

  function isSelected(id: number): boolean {
    return selectedIds.value.has(id);
  }

  return {
    histories,
    loading,
    total,
    selectedIds,
    autoHistories,
    manualHistories,
    hasSelections,
    selectedCount,
    fetchHistory,
    getHistoryById,
    deleteHistory,
    bulkDelete,
    deleteMonitorHistory,
    toggleSelection,
    selectAll,
    clearSelections,
    isSelected,
  };
});
