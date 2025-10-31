import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8000,
    host: true,
    // 配置代理解决CORS问题
    proxy: {
      '/api': {
        target: 'https://www.universalfuture.online',
        changeOrigin: true, // 更改请求头中的origin
        //secure: false, // 暂时禁用SSL验证（证书过期问题）
        // 可选：重写路径
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
    // 说明：
    // - /api/v1/doctor/* -> https://www.universalfuture.online/api/v1/doctor/*
    // - /api/v1/patient/* -> https://www.universalfuture.online/api/v1/patient/*
    // - /api/v1/medical-record/* -> https://www.universalfuture.online/api/v1/medical-record/*
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})

