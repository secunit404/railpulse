import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../plugins/axios';
import type { Station } from '../../../shared/types';

export const useStationStore = defineStore('station', () => {
  const stations = ref<Station[]>([]);
  const loaded = ref(false);

  async function fetchStations() {
    if (loaded.value) return;

    const response = await api.get<{ stations: Station[] }>('/api/stations');
    if (!Array.isArray(response.data.stations) || response.data.stations.length === 0) {
      throw new Error('No stations are available');
    }
    stations.value = response.data.stations;
    loaded.value = true;
  }

  return {
    stations,
    loaded,
    fetchStations,
  };
});
