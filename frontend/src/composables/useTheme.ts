import { ref } from 'vue';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'tg-theme';
const theme = ref<ThemeMode>('light');
let initialized = false;

function setDocumentTheme(value: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', value === 'dark');
  root.style.colorScheme = value;
}

function persistTheme(value: ThemeMode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
  } catch {
    // Ignore storage errors (e.g., Safari private mode)
  }
}

function initializeTheme() {
  if (initialized || typeof window === 'undefined') return;

  const stored = window.localStorage?.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (stored === 'light' || stored === 'dark') {
    theme.value = stored;
  } else {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    theme.value = prefersDark ? 'dark' : 'light';
  }

  setDocumentTheme(theme.value);
  persistTheme(theme.value);
  initialized = true;
}

function setTheme(value: ThemeMode) {
  theme.value = value;
  setDocumentTheme(value);
  persistTheme(value);
}

export function useTheme() {
  if (!initialized) {
    initializeTheme();
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  }

  return {
    theme,
    toggleTheme,
  };
}
