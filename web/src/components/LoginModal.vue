<template>
  <div v-if="show" class="login-overlay">
    <div class="login-modal">
      <div class="spinner"></div>
      <h3 class="modal-title">{{ $t('login.waiting') }}</h3>
      <p class="modal-desc">{{ $t('login.completeInBrowser') }}</p>
      
      <button class="cancel-btn" type="button" @click="handleCancel">
        <span class="close-icon">×</span>
        {{ $t('login.cancelLogin') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n()

const props = defineProps<{
  show?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'cancel'): void;
  (e: 'login-success'): void;
}>();

const handleCancel = () => {
  emit('cancel');
  emit('update:show', false);
};
</script>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-out;
}

.login-modal {
  background: white;
  width: 320px;
  padding: 32px 24px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
  text-align: center;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #fce7f3;
  border-top-color: #ec4899;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.modal-desc {
  font-size: 13px;
  color: #666;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.cancel-btn {
  width: 100%;
  appearance: none;
  border: 0;
  background: #f5f5f7;
  color: #666;
  font-size: 14px;
  font-weight: 600;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: #ebebeb;
  color: #333;
}

.close-icon {
  font-size: 18px;
  line-height: 1;
  font-weight: 400;
  margin-top: -2px;
  border: 1px solid currentColor;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
