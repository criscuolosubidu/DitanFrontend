import axios from 'axios'

// 后端 API 地址
const API_BASE_URL = import.meta.env.DEV
  ? '/api/v1/patient'  // 开发环境使用代理
  : 'https://www.universalfuture.online/api/v1/patient'  // 生产环境直接访问

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
    // 从sessionStorage中获取access_token（使用access_token而不是token）
    const accessToken = sessionStorage.getItem('access_token')

    // 如果存在access_token，添加到请求头
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    // 打印请求详细信息用于调试
    console.log('🚀 Patient API Request:', {
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
    console.error('❌ Patient API Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    console.log('✅ Patient API Response Success:', {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      data: response.data
    })
    return response
  },
  error => {
    console.error('❌ Patient API Error:', {
      url: error.config?.url,
      fullURL: error.config?.baseURL + error.config?.url,
      method: error.config?.method,
      message: error.message
    })

    if (error.response) {
      // 401未授权 - token过期或无效
      if (error.response.status === 401) {
        console.warn('⚠️ Token expired or invalid, clearing session')

        // 清除本地存储
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('isAuthenticated')
        sessionStorage.removeItem('userInfo')

        // 跳转到登录页
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }

      console.error('📊 Patient API Response Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      })
    } else if (error.request) {
      console.error('🌐 Patient API Network Error:', {
        code: error.code,
        message: error.message
      })
    } else {
      console.error('⚠️ Patient API Request Setup Error:', error.message)
    }
    return Promise.reject(error)
  }
)

/**
 * 根据手机号查询患者信息
 * @param {Object} queryData - 查询数据 { phone: '13800138000' }
 * @returns {Promise}
 */
export const queryPatientByPhone = (queryData) => {
  console.log('📞 查询患者请求数据:', queryData)
  // 使用GET方法，参数作为query parameters传递
  return apiClient.get('/query', { params: queryData })
}

export default apiClient

