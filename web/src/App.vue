<template>
  <div class="app-shell">
    <main class="main-content">
      <RouterView />
    </main>

    <LoginModal
      v-model:show="userStore.userState.loading"
      @cancel="userStore.cancelLogin"
      @login-success="handleLoginSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { useUserStore } from './stores/userStore';
import LoginModal from './components/LoginModal.vue';

const userStore = useUserStore();

onMounted(() => {
  document.body.classList.add('page-home');
  userStore.tryHandleCallbackFromCurrentUrl();
  userStore.resumePendingLoginIfNeeded();
  userStore.checkLoginStatus();
});

const handleLoginSuccess = () => {
  console.log('login success');
};
</script>

<style>
* {
  box-sizing: border-box;
}

:root {
  color-scheme: light;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-width: 320px;
  font-family: "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
  color: #122033;
  background: #f5f5f5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}

a {
  color: inherit;
}

#app,
.app-shell {
  min-height: 100vh;
}

.app-shell {
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1 0 auto;
  min-height: 100vh;
}
</style>
