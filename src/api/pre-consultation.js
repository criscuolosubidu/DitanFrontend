import axios from 'axios'

/**
 * 获取预问诊数据接口
 * @param {string} recordId - 就诊记录ID（从患者信息中获取）
 * @returns {Promise}
 */
export const getPreConsultationData = (recordId) => {
  // 从sessionStorage获取access_token
  const accessToken = sessionStorage.getItem('access_token')

  if (!accessToken) {
    return Promise.reject(new Error('缺少访问令牌，请重新登录'))
  }

  // 构建请求URL（开发环境使用代理）
  const baseURL = import.meta.env.DEV
    ? '/api/v1/medical-record'  // 开发环境使用代理
    : 'https://www.universalfuture.online/api/v1/medical-record'  // 生产环境直接访问

  const url = `${baseURL}/${recordId}`

  console.log('📋 发送预问诊数据请求:', {
    url,
    recordId,
    environment: import.meta.env.DEV ? 'development' : 'production'
  })

  // 发送GET请求
  return axios.get(
    url,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 10000 // 10秒超时
    }
  )
}

