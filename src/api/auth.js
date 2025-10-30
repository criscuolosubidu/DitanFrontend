import axios from 'axios'

// 后端 API 地址
// 在开发环境使用代理，生产环境使用直接地址
const API_BASE_URL = import.meta.env.DEV
  ? '/api/v1/doctor'  // 开发环境使用代理
  : 'https://www.universalfuture.online/api/v1/doctor'  // 生产环境直接访问

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 从sessionStorage中获取JWT token
    const token = sessionStorage.getItem('token')

    // 如果存在token，添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 打印请求详细信息用于调试
    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers,
      data: config.data,
      timeout: config.timeout
    })

    return config
  },
  error => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    // 打印响应信息以便调试
    console.log('✅ API Response Success:', {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    })
    return response
  },
  error => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      fullURL: error.config?.baseURL + error.config?.url,
      method: error.config?.method,
      message: error.message
    })

    // 提供更友好的错误信息
    if (error.response) {
      // 401未授权 - token过期或无效
      if (error.response.status === 401) {
        console.warn('⚠️ Token expired or invalid, clearing session')

        // 清除本地存储
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('isAuthenticated')
        sessionStorage.removeItem('userInfo')

        // 跳转到登录页
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }

      // 服务器返回了响应但状态码不是 2xx
      console.error('📊 Response Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data,
        fullURL: error.config.baseURL + error.config.url
      })
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('🌐 Network Error (No Response):', {
        request: error.request,
        code: error.code,
        message: error.message
      })
    } else {
      // 发送请求时出现错误
      console.error('⚠️ Request Setup Error:', error.message)
    }
    return Promise.reject(error)
  }
)

/**
 * 注册接口
 * @param {Object} userData - 用户注册信息
 * @returns {Promise}
 */
export const registerDoctor = (userData) => {
  return apiClient.post('/register', userData)
}

/**
 * 登录接口
 * @param {Object} credentials - 登录凭证（用户名、密码等）
 * @returns {Promise}
 */
export const loginDoctor = (credentials) => {
  return apiClient.post('/login', credentials)
}

export default apiClient

