import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { localeSeoConfigs } from './src/config/localeSeo'
import { kunqiongAuthApiPlugin } from './vite-plugin-kunqiong-auth'

export default defineConfig({
  plugins: [kunqiongAuthApiPlugin(), vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'pinyin-pro': resolve(__dirname, '../tauri-app/node_modules/pinyin-pro/dist/index.mjs')
    }
  },
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/soft_desktop': {
        target: 'https://api-web.kunqiongai.com',
        changeOrigin: true
      },
      '/user': {
        target: 'https://api-web.kunqiongai.com',
        changeOrigin: true
      },
      '/logout': {
        target: 'https://api-web.kunqiongai.com',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    sourcemap: false,
    rollupOptions: {
      input: Object.fromEntries(
        localeSeoConfigs.map(config => [
          config.filename.replace('.html', ''),
          resolve(__dirname, config.filename)
        ])
      ),
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'utils': ['axios', 'vue-i18n']
        }
      }
    }
  }
})
