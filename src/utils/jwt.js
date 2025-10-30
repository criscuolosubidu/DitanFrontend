/**
 * JWT工具函数
 * 用于解析和验证JWT token
 */

/**
 * 解析JWT token（仅解码，不验证签名）
 * @param {string} token - JWT token
 * @returns {Object|null} 解析后的payload，失败返回null
 */
export function parseJWT(token) {
  try {
    // 分割token
    const parts = token.split('.')

    if (parts.length !== 3) {
      console.error('Invalid JWT format')
      return null
    }

    // 解码payload（第二部分）
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join('')
    )

    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to parse JWT:', error)
    return null
  }
}

/**
 * 检查JWT token是否过期
 * @param {string} token - JWT token
 * @returns {boolean} 是否过期
 */
export function isTokenExpired(token) {
  try {
    const payload = parseJWT(token)

    if (!payload) {
      return true
    }

    // 检查是否有过期时间
    if (!payload.exp) {
      console.warn('Token has no expiration time')
      return false
    }

    // 获取当前时间（秒）
    const now = Math.floor(Date.now() / 1000)

    // 检查是否过期
    return payload.exp < now
  } catch (error) {
    console.error('Failed to check token expiration:', error)
    return true
  }
}

/**
 * 获取token剩余有效期（秒）
 * @param {string} token - JWT token
 * @returns {number} 剩余秒数，0或负数表示已过期
 */
export function getTokenExpiration(token) {
  try {
    const payload = parseJWT(token)

    if (!payload || !payload.exp) {
      return 0
    }

    const now = Math.floor(Date.now() / 1000)
    return payload.exp - now
  } catch (error) {
    console.error('Failed to get token expiration:', error)
    return 0
  }
}

/**
 * 检查token是否有效
 * @param {string} token - JWT token
 * @returns {boolean} 是否有效
 */
export function isTokenValid(token) {
  if (!token) {
    return false
  }

  // 检查格式
  const parts = token.split('.')
  if (parts.length !== 3) {
    return false
  }

  // 检查是否过期
  return !isTokenExpired(token)
}

/**
 * 从JWT token中提取用户信息
 * @param {string} token - JWT token
 * @returns {Object|null} 用户信息
 */
export function getUserFromToken(token) {
  try {
    const payload = parseJWT(token)

    if (!payload) {
      return null
    }

    return {
      userId: payload.sub || payload.id || payload.userId,
      username: payload.username || payload.username,
      name: payload.name || payload.fullName,
      email: payload.email,
      roles: payload.roles || payload.authorities || []
    }
  } catch (error) {
    console.error('Failed to extract user from token:', error)
    return null
  }
}

/**
 * 格式化token过期时间
 * @param {string} token - JWT token
 * @returns {string} 格式化后的时间字符串
 */
export function getTokenExpirationTime(token) {
  try {
    const payload = parseJWT(token)

    if (!payload || !payload.exp) {
      return 'Unknown'
    }

    const expirationDate = new Date(payload.exp * 1000)
    return expirationDate.toLocaleString('zh-CN')
  } catch (error) {
    console.error('Failed to get token expiration time:', error)
    return 'Unknown'
  }
}

/**
 * 清除所有token相关的本地存储
 */
export function clearToken() {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('refreshToken')
  sessionStorage.removeItem('isAuthenticated')
  sessionStorage.removeItem('userInfo')
}


