/**
 * 临时 Mock 登录接口（用于测试）
 * 当 Apifox Mock 未正确配置时使用
 * 
 * 使用方法：
 * 1. 将 auth.js 中的 loginDoctor 导入改为 auth-mock.js
 * 2. 或直接修改 auth.js，将 loginDoctor 函数替换为以下内容
 */

// 模拟的用户数据（仅用于开发测试）
const mockUsers = [
  { username: 'test', password: '123456', name: '测试医生', id: 1 },
  { username: 'admin', password: 'admin123', name: '管理员', id: 2 },
  { username: 'doctor', password: 'doctor123', name: '张医生', id: 3 }
]

/**
 * 临时 Mock 登录接口
 */
export const loginDoctor = (credentials) => {
  // 模拟网络延迟
  const delay = () => new Promise(resolve => setTimeout(resolve, 500))

  return delay().then(() => {
    const user = mockUsers.find(
      u => u.username === credentials.username &&
        u.password === credentials.password
    )

    if (user) {
      // 登录成功
      return {
        data: {
          code: 200,
          message: '登录成功',
          data: {
            id: user.id,
            username: user.username,
            name: user.name
          }
        }
      }
    } else {
      // 登录失败
      const error = new Error('用户名或密码错误')
      error.response = {
        status: 401,
        data: {
          code: 401,
          message: '用户名或密码错误'
        }
      }
      throw error
    }
  })
}

/**
 * 临时 Mock 注册接口
 */
export const registerDoctor = (userData) => {
  // 模拟网络延迟
  const delay = () => new Promise(resolve => setTimeout(resolve, 500))

  return delay().then(() => {
    // 检查用户名是否已存在
    if (mockUsers.find(u => u.username === userData.username)) {
      const error = new Error('用户名已存在')
      error.response = {
        status: 400,
        data: {
          code: 400,
          message: '用户名已存在'
        }
      }
      throw error
    }

    // 注册成功
    return {
      data: {
        code: 200,
        message: '注册成功',
        data: {
          id: mockUsers.length + 1,
          username: userData.username
        }
      }
    }
  })
}

// 告诉用户这是 Mock 版本
console.warn('⚠️ 使用 Mock API（仅用于开发测试）')

