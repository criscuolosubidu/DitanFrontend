import axios from 'axios'

/**
 * AI诊断接口
 * @param {string} recordId - 就诊记录ID（从查询患者接口获取）
 * @param {string} asrText - ASR转写的文本内容
 * @returns {Promise}
 */
export const getAIDiagnosis = (recordId, asrText) => {
  // 从sessionStorage获取access_token
  const accessToken = sessionStorage.getItem('access_token')

  if (!accessToken) {
    return Promise.reject(new Error('缺少访问令牌，请重新登录'))
  }

  // 构建请求URL（开发环境使用代理）
  const baseURL = import.meta.env.DEV
    ? '/api/v1/medical-record'  // 开发环境使用代理
    : 'https://www.universalfuture.online/api/v1/medical-record'  // 生产环境直接访问

  const url = `${baseURL}/${recordId}/ai-diagnosis`

  console.log('🤖 发送AI诊断请求:', {
    url,
    recordId,
    asrTextLength: asrText.length,
    environment: import.meta.env.DEV ? 'development' : 'production'
  })

  // 发送POST请求
  return axios.post(
    url,
    {
      asr_text: asrText
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 200000 // 200秒超时（AI诊断耗时较长，Apifox实测需要150s+）
    }
  )
}

