import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 方案1：预览模式临时硬编码token（用于调试ASR功能）
// 检测是否为预览模式（production build 且在本地预览）
const isPreviewMode = import.meta.env.PROD &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

if (isPreviewMode) {
  // 如果sessionStorage中没有认证信息，自动设置临时token
  const isAuthenticated = sessionStorage.getItem('isAuthenticated')
  if (!isAuthenticated || isAuthenticated !== 'true') {
    console.log('🔧 [预览模式] 自动设置临时token以绕过登录检查')

    // 设置认证状态
    sessionStorage.setItem('isAuthenticated', 'true')

    // 设置临时token（用于API调用，虽然可能会失败，但可以测试ASR WebSocket）
    const tempToken = 'preview-temp-token-' + Date.now()
    sessionStorage.setItem('access_token', tempToken)
    sessionStorage.setItem('token', tempToken)

    // 设置临时用户信息
    const tempUserInfo = {
      username: '预览模式用户',
      name: 'Preview User',
      doctor_id: 'preview-doctor-id'
    }
    sessionStorage.setItem('userInfo', JSON.stringify(tempUserInfo))
    sessionStorage.setItem('doctor_id', 'preview-doctor-id')

    console.log('✅ [预览模式] 临时认证信息已设置')
    console.warn('⚠️ [预览模式] 注意：API调用可能会失败（跨域），但可以测试ASR WebSocket功能')
  }
}

const app = createApp(App)
app.use(router)
app.mount('#app')

