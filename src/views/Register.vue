<template>
  <div class="register-container">
    <div class="register-box">
      <div class="register-header">
        <h2>医生注册</h2>
        <p>请填写您的注册信息</p>
      </div>

      <form @submit.prevent="handleRegister" class="register-form">
        <div class="form-group">
          <label for="username">用户名 <span class="required">*</span></label>
          <input
            id="username"
            type="text"
            v-model="formData.username"
            placeholder="请输入用户名（3-50位，只能包含字母、数字和下划线）"
            required
            minlength="3"
            maxlength="50"
            pattern="[a-zA-Z0-9_]+"
          />
          <span class="form-hint">3-50位，只能包含字母、数字和下划线</span>
        </div>

        <div class="form-group">
          <label for="password">密码 <span class="required">*</span></label>
          <input
            id="password"
            type="password"
            v-model="formData.password"
            placeholder="请输入密码（至少6位）"
            required
            minlength="6"
          />
          <span class="form-hint">至少6位</span>
        </div>

        <div class="form-group">
          <label for="name">医生姓名 <span class="required">*</span></label>
          <input
            id="name"
            type="text"
            v-model="formData.name"
            placeholder="请输入医生姓名（2-50位）"
            required
            minlength="2"
            maxlength="50"
          />
          <span class="form-hint">2-50位</span>
        </div>

        <div class="form-group">
          <label for="gender">性别 <span class="required">*</span></label>
          <select
            id="gender"
            v-model="formData.gender"
            required
          >
            <option value="">请选择性别</option>
            <option value="MALE">男</option>
            <option value="FEMALE">女</option>
            <option value="OTHER">其他</option>
          </select>
        </div>

        <div class="form-group">
          <label for="phone">手机号 <span class="required">*</span></label>
          <input
            id="phone"
            type="tel"
            v-model="formData.phone"
            placeholder="请输入11位手机号"
            required
            minlength="11"
            maxlength="11"
            pattern="[0-9]{11}"
          />
          <span class="form-hint">11位数字</span>
        </div>

        <div class="form-group">
          <label for="department">科室</label>
          <input
            id="department"
            type="text"
            v-model="formData.department"
            placeholder="请输入所属科室（最多100位）"
            maxlength="100"
          />
          <span class="form-hint">最多100位</span>
        </div>

        <div class="form-group">
          <label for="position">职位</label>
          <input
            id="position"
            type="text"
            v-model="formData.position"
            placeholder="请输入职位（最多100位）"
            maxlength="100"
          />
          <span class="form-hint">最多100位</span>
        </div>

        <div class="form-group">
          <label for="bio">个人简介</label>
          <textarea
            id="bio"
            v-model="formData.bio"
            placeholder="请输入个人简介"
            rows="3"
            maxlength="500"
          ></textarea>
          <span class="form-hint">个人简介（选填）</span>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          <span v-if="!isLoading">注册</span>
          <span v-else>注册中...</span>
        </button>

        <div class="form-footer">
          <p>
            已有账号？
            <router-link to="/login" class="link">立即登录</router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerDoctor } from '../api/auth'

export default {
  name: 'Register',
  setup() {
    const router = useRouter()
    const formData = ref({
      username: '',
      password: '',
      name: '',
      gender: '',
      phone: '',
      department: '',
      position: '',
      bio: ''
    })
    const errorMessage = ref('')
    const successMessage = ref('')
    const isLoading = ref(false)

    const handleRegister = async () => {
      errorMessage.value = ''
      successMessage.value = ''

      // 验证用户名格式
      const usernamePattern = /^[a-zA-Z0-9_]{3,50}$/
      if (!usernamePattern.test(formData.value.username)) {
        errorMessage.value = '用户名格式不正确（3-50位，只能包含字母、数字和下划线）'
        return
      }

      // 验证手机号格式
      const phonePattern = /^[0-9]{11}$/
      if (!phonePattern.test(formData.value.phone)) {
        errorMessage.value = '手机号格式不正确（需为11位数字）'
        return
      }

      isLoading.value = true

      try {
        // 准备提交的数据（排除确认密码字段）
        const submitData = {
          username: formData.value.username,
          password: formData.value.password,
          name: formData.value.name,
          gender: formData.value.gender,
          phone: formData.value.phone,
          department: formData.value.department,
          position: formData.value.position,
          bio: formData.value.bio
        }

        console.log('Register attempt with:', { username: submitData.username, name: submitData.name })
        const response = await registerDoctor(submitData)
        console.log('Register response:', response.data)
        
        // 检查响应 - 支持多种成功响应格式
        const isSuccess = response.data && (
          response.data.success === true || 
          response.data.code === 200 ||
          response.status === 200 ||
          (response.data.data && Object.keys(response.data.data).length > 0)
        )
        
        if (isSuccess) {
          // 注册成功
          console.log('Register successful')
          successMessage.value = response.data.message || '注册成功！正在跳转到登录页...'
          
          // 2秒后跳转到登录页
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else {
          // 注册失败但没有抛出错误（成功响应但 success 为 false）
          console.warn('Register failed - response indicates failure')
          errorMessage.value = response.data?.message || '注册失败，请检查输入信息'
        }
      } catch (error) {
        console.error('Register failed:', error)
        // 处理各种错误情况
        if (error.response && error.response.data) {
          const data = error.response.data
          errorMessage.value = data.message || data.error || '注册失败，请检查输入信息'
        } else if (error.request) {
          errorMessage.value = '无法连接到服务器，请检查网络连接'
        } else {
          errorMessage.value = error.message || '注册失败，请检查网络连接'
        }
      } finally {
        isLoading.value = false
      }
    }

    return {
      formData,
      errorMessage,
      successMessage,
      isLoading,
      handleRegister
    }
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-box {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h2 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 28px;
}

.register-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.register-form {
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

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-group select {
  cursor: pointer;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.required {
  color: #e74c3c;
  margin-left: 4px;
}

.form-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: #ffeaea;
  border-radius: 6px;
}

.success-message {
  color: #27ae60;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: #eafaf1;
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

