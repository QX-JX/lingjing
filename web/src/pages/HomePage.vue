<template>
  <div class="home-page">
    <CommonHeader />

    <section class="workspace-section" id="editor">
      <div class="editor-container">
        <VoiceEditor />
      </div>
    </section>

    <CommonFooter />
  </div>
</template>

<script setup lang="ts">
import CommonFooter from '../components/CommonFooter.vue';
import CommonHeader from '../components/CommonHeader.vue';
import VoiceEditor from '../components/VoiceEditor.vue';
</script>

<style scoped>
.home-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  --page-header-height: 88px;
  --workspace-bottom-overlap: 16px;
}

.workspace-section {
  flex: 0 0 auto;
  height: calc(100vh - var(--page-header-height) + var(--workspace-bottom-overlap));
  display: flex;
  position: relative;
  z-index: 2;
  background: linear-gradient(90deg, #fdf4ee 0%, #fdf6f2 50%, #fff8e9 100%);
  margin-bottom: calc(var(--workspace-bottom-overlap) * -1);
}

.editor-container {
  flex: 1;
  min-height: 0;
  height: 100%;
}
</style>
