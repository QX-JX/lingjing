<template>
  <header class="lj-voice-header">
    <div class="lj-voice-header__row">
      <!-- Logo区域 -->
      <div class="lj-voice-header__left">
        <div class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="url(#gradient1)"/>
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="url(#gradient2)"/>
              <circle cx="12" cy="12" r="2" fill="#fff"/>
              <defs>
                <linearGradient id="gradient1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#f97316"/>
                  <stop offset="1" stop-color="#ea580c"/>
                </linearGradient>
                <linearGradient id="gradient2" x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#fb923c"/>
                  <stop offset="1" stop-color="#f97316"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="logo-text">
            <h1 class="app-name">{{ $t('app.name') }}</h1>
            <p class="app-subtitle">{{ $t('app.subtitle') }}</p>
          </div>
        </div>
      </div>

      <!-- 中间区域 - 可以放置广告或导航 -->
      <div class="lj-voice-header__center">
        <!-- 广告位预留 -->
      </div>

      <!-- 右侧操作区 - 仅保留语言和设置 -->
      <div class="lj-voice-header__right">
        <!-- 语言切换 -->
        <div class="lang-selector">
          <select v-model="currentLocale" @change="handleLocaleChange">
            <option v-for="loc in availableLocales" :key="loc.code" :value="loc.code">
              {{ loc.name }}
            </option>
          </select>
        </div>

        <!-- 设置按钮 -->
        <button class="settings-btn" @click="showSettings = true" :title="$t('header.settings')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 设置对话框 -->
    <div v-if="showSettings" class="lj-voice-modal-overlay" @click.self="showSettings = false">
      <div class="lj-voice-settings-modal">
        <div class="lj-voice-modal-head">
          <h3>{{ $t('settings.title') }}</h3>
          <button class="lj-voice-close-btn" @click="showSettings = false">&times;</button>
        </div>
        <div class="lj-voice-modal-body">
          <button class="lj-voice-setting-item" @click="openOfficialWebsite">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            <span>{{ $t('settings.officialWebsite') }}</span>
          </button>
          <button class="lj-voice-setting-item" @click="openFeedback">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span>{{ $t('settings.feedback') }}</span>
          </button>
          <div class="lj-voice-setting-item lj-voice-lang-setting">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 17h6"/>
            </svg>
            <span>{{ $t('settings.language') }}</span>
            <select v-model="currentLocale" @change="handleLocaleChange">
              <option v-for="loc in availableLocales" :key="loc.code" :value="loc.code">
                {{ loc.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale, availableLocales } from '../locales';

const { t, locale } = useI18n();

const showSettings = ref(false);

const currentLocale = computed({
  get: () => locale.value,
  set: (val) => setLocale(val)
});

const handleLocaleChange = () => {
  setLocale(currentLocale.value);
};

const openOfficialWebsite = () => {
  window.open('https://www.kunqiongai.com/', '_blank');
  showSettings.value = false;
};

const openFeedback = () => {
  window.open('https://www.kunqiongai.com/feedback', '_blank');
  showSettings.value = false;
};
</script>

<style scoped>
.lj-voice-header {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 100;
}

.lj-voice-header__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 24px;
  height: 64px;
}

.lj-voice-header__left {
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
}

.logo-icon svg {
  width: 100%;
  height: 100%;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  line-height: 1.2;
}

.app-subtitle {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
  line-height: 1.2;
}

.lj-voice-header__center {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 24px;
}

.lj-voice-header__right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.lang-selector select {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
  outline: none;
}

.lang-selector select:hover {
  border-color: #f97316;
}

.settings-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.settings-btn:hover {
  background: #e5e7eb;
}

.settings-btn svg {
  width: 18px;
  height: 18px;
  color: #6b7280;
}

/* 模态框样式 */
.lj-voice-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.lj-voice-settings-modal {
  background: #fff;
  border-radius: 12px;
  width: 90%;
  max-width: 360px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.lj-voice-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.lj-voice-modal-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.lj-voice-close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 20px;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lj-voice-close-btn:hover {
  background: #f3f4f6;
  color: #666;
}

.lj-voice-modal-body {
  padding: 12px;
}

.lj-voice-setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
  color: #333;
}

.lj-voice-setting-item:hover {
  background: #f3f4f6;
}

.lj-voice-setting-item svg {
  width: 18px;
  height: 18px;
  color: #6b7280;
  flex-shrink: 0;
}

.lj-voice-lang-setting {
  justify-content: space-between;
}

.lj-voice-lang-setting select {
  padding: 4px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
}

@media (max-width: 768px) {
  .lj-voice-header__row {
    padding: 10px 16px;
    height: 56px;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
  }

  .app-name {
    font-size: 16px;
  }

  .app-subtitle {
    display: none;
  }

  .lj-voice-header__center {
    display: none;
  }

  .lang-selector {
    display: none;
  }
}
</style>
