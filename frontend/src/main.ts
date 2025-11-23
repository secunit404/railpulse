import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './styles/main.css';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth.store';
import { createSocket, connectSocket } from './plugins/socket';
import { setUnauthorizedHandler } from './plugins/axios';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Wire axios -> auth handling without creating circular dependencies
setUnauthorizedHandler(() => {
  const authStore = useAuthStore();
  authStore.user = null;
  // Only redirect to login if the current route actually requires auth
  if (router.currentRoute.value.meta.requiresAuth) {
    router.push('/login');
  }
});

// Initialize socket
createSocket();

// Try to fetch current user on app start
const authStore = useAuthStore();
authStore.fetchUser().then(() => {
  // Connect socket after successful auth
  connectSocket();
}).catch(() => {
  // User not authenticated, that's okay
});

app.mount('#app');
