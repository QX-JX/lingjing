import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Electron/Web 通用配置
  clearScreen: false,
  base: "./", // Electron 需要相对路径

  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
    watch: {
      // 忽略 Electron 和 Tauri 目录
      ignored: ["**/src-tauri/**", "**/electron/**", "**/release/**"],
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
