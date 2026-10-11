import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 构建产物直接输出到 Flask 的静态目录 ../assets，
// emptyOutDir: false 以保留 Tone.js、midi 等非构建资源。
export default defineConfig({
  plugins: [vue()],
  base: '/',
  build: {
    outDir: fileURLToPath(new URL('../assets', import.meta.url)),
    emptyOutDir: false,
    assetsDir: 'assets',
    // 组件源码原样复制自 WinUIonWeb，其中存在非 scoped 的 :deep()，
    // lightningcss 会将其判为无效伪类，这里不做 CSS 压缩。
    cssMinify: false,
    sourcemap: false
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
