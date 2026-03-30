<template>
  <header class="workspace-topbar">
    <div class="brand-block">
      <img class="brand-logo-image" :src="headerLogoUrl" alt="" />
      <div class="brand-copy">
        <div class="brand-title">鲲穹AI工具箱</div>
        <div class="brand-subtitle">KUNQIONG AI TOOLBOX</div>
      </div>
    </div>

    <div class="promo-banner">
      <div class="promo-copy">
        <div class="promo-title">{{ $t('workspaceTop.promoTitle') }}</div>
        <div class="promo-subtitle">{{ $t('workspaceTop.promoSubtitle') }}</div>
      </div>
      <div class="promo-badge">AI</div>
    </div>

    <div class="actions-block">
      <button class="login-btn" type="button" @click="handleLogin">
        {{ userStore.userState.isLoggedIn ? $t('login.loggedIn') : $t('header.login') }}
      </button>
      <button class="icon-btn" type="button" :aria-label="$t('header.settings')">⚙</button>
      <div class="window-actions">
        <button class="window-btn" type="button" :aria-label="$t('header.minimize')">−</button>
        <button class="window-btn window-btn--active" type="button" :aria-label="$t('header.maximize')">□</button>
        <button class="window-btn" type="button" :aria-label="$t('header.close')">×</button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useUserStore } from '../stores/userStore';

const userStore = useUserStore();
const headerLogoUrl = 'https://www.kunqiongai.com/logo.png';

const handleLogin = async () => {
  if (userStore.userState.isLoggedIn) {
    document.getElementById('editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  await userStore.startLoginFlow();
};
</script>

<style scoped>
.workspace-topbar {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0 14px 0 18px;
  background: #fff;
  border-bottom: 1px solid #f0d4bf;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 210px;
}

.brand-logo-image {
  width: 42px;
  height: 42px;
  object-fit: cover;
  object-position: left center;
  border-radius: 50%;
  background: #fff;
  flex-shrink: 0;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-title {
  font-size: 16px;
  line-height: 1;
  font-weight: 700;
  color: #1d2939;
}

.brand-subtitle {
  font-size: 11px;
  line-height: 1;
  color: #64748b;
  letter-spacing: 0.05em;
}

.promo-banner {
  flex: 0 1 350px;
  height: 44px;
  border-radius: 15px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: linear-gradient(90deg, #1f4fcf 0%, #2973ff 55%, #42a1ff 100%);
  box-shadow: 0 10px 24px rgba(41, 115, 255, 0.18);
  color: #fff;
}

.promo-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.promo-title {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.promo-subtitle {
  font-size: 11px;
  opacity: 0.92;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.promo-badge {
  width: 38px;
  height: 28px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.actions-block {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 300px;
}

.login-btn {
  min-width: 82px;
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 17px;
  background: linear-gradient(180deg, #ffab3d 0%, #ff8f17 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(255, 143, 23, 0.18);
}

.icon-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: #fff7ef;
  color: #8a96a8;
  cursor: pointer;
  font-size: 14px;
}

.window-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
}

.window-btn {
  width: 34px;
  height: 28px;
  border: none;
  background: transparent;
  color: #5c6473;
  font-size: 15px;
  cursor: pointer;
}

.window-btn--active {
  border: 1px solid #f5bf74;
  border-radius: 8px;
}

@media (max-width: 1100px) {
  .workspace-topbar {
    height: auto;
    flex-wrap: wrap;
    padding: 10px 14px;
  }

  .brand-block,
  .promo-banner,
  .actions-block {
    width: 100%;
  }

  .actions-block {
    justify-content: flex-start;
  }
}
</style>
