<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2>医生登录</h2>
        <p>请输入您的登录信息</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            type="text"
            v-model="formData.username"
            placeholder="请输入用户名"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            type="password"
            v-model="formData.password"
            placeholder="请输入密码"
            required
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          <span v-if="!isLoading">登录</span>
          <span v-else>登录中...</span>
        </button>

        <div class="form-footer">
          <p>
            还没有账号？
            <router-link to="/register" class="link">立即注册</router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginDoctor } from '../api/auth'

export default {
  name: 'Login',
  setup() {
    const router = useRouter()
    const formData = ref({
      username: '',
      password: ''
    })
    const errorMessage = ref('')
    const isLoading = ref(false)

    const handleLogin = async () => {
      errorMessage.value = ''
      isLoading.value = true

      try {
        console.log('Login attempt with:', { username: formData.value.username })
        const response = await loginDoctor(formData.value)
        console.log('Login response:', response.data)
        
        // 检查响应中的 success 字段或其他成功标识
        const isSuccess = response.data && (
          response.data.success === true || 
          response.data.code === 200 ||
          response.status === 200 ||
          (response.data.data && Object.keys(response.data.data).length > 0)
        )
        
        if (isSuccess) {
          // 登录成功
          console.log('Login successful')
          
          // 使用 sessionStorage 存储登录状态
          sessionStorage.setItem('isAuthenticated', 'true')
          
          // 从响应中提取数据
          const responseData = response.data
          const userData = responseData.data || responseData
          
          // 存储 access_token 和 doctor_id（用于后续AI诊断等功能）
          if (userData.access_token) {
            sessionStorage.setItem('access_token', userData.access_token)
            console.log('✅ 已保存 access_token')
          }
          
          if (userData.doctor && userData.doctor.doctor_id) {
            sessionStorage.setItem('doctor_id', userData.doctor.doctor_id)
            console.log('✅ 已保存 doctor_id:', userData.doctor.doctor_id)
          }
          
          // 存储完整的用户信息
          sessionStorage.setItem('userInfo', JSON.stringify(userData))
          
          // 为了兼容现有的token查找逻辑，也存储access_token到token键
          if (userData.access_token) {
            sessionStorage.setItem('token', userData.access_token)
          }
          
          // 跳转到首页
          router.push('/')
        } else {
          // 登录失败（success 为 false 或不存在）
          console.warn('Login failed - response indicates failure')
          errorMessage.value = response.data?.message || '登录失败，用户名或密码错误'
        }
      } catch (error) {
        console.error('Login failed:', error)
        
        // 提供更详细的错误信息
        if (error.response) {
          // 服务器有响应但状态码不是 2xx
          const status = error.response.status
          const data = error.response.data
          
          if (status === 404) {
            errorMessage.value = '接口不存在（404），请检查后端服务是否正常运行'
          } else if (status === 401) {
            errorMessage.value = data?.message || '用户名或密码错误'
          } else if (status === 500) {
            errorMessage.value = '服务器错误，请稍后再试'
          } else if (status === 400) {
            errorMessage.value = data?.message || '请求参数错误'
          } else if (data && data.message) {
            errorMessage.value = data.message
          } else {
            errorMessage.value = `请求失败 (${status})`
          }
        } else if (error.request) {
          errorMessage.value = '无法连接到服务器，请检查网络或确保后端服务已启动'
        } else {
          errorMessage.value = error.message || '登录失败，请检查用户名和密码'
        }
      } finally {
        isLoading.value = false
      }
    }

    return {
      formData,
      errorMessage,
      isLoading,
      handleLogin
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-box {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 28px;
}

.login-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: #ffeaea;
  border-radius: 6px;
}

.submit-btn {
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
}

.form-footer p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}
</style>

