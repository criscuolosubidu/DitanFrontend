# JWT 使用指南

## 已实现的功能

### ✅ 1. 自动添加JWT到请求头

所有API请求会自动携带JWT token：

```javascript
// 在 auth.js 和 patient.js 中
apiClient.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token')
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})
```

### ✅ 2. 自动处理token过期

当收到401错误时，自动清除登录状态并跳转登录页：

```javascript
if (error.response?.status === 401) {
  // 清除本地存储
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('isAuthenticated')
  sessionStorage.removeItem('userInfo')
  
  // 跳转到登录页
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}
```

### ✅ 3. JWT工具函数

创建了 `src/utils/jwt.js`，提供以下工具函数：

- `parseJWT(token)` - 解析JWT token
- `isTokenExpired(token)` - 检查token是否过期
- `isTokenValid(token)` - 检查token是否有效
- `getUserFromToken(token)` - 从token中提取用户信息
- `getTokenExpiration(token)` - 获取token剩余有效时间
- `clearToken()` - 清除所有token相关存储

## 后端需要的配合

### 1. 登录接口返回JWT

后端登录接口应该返回JWT：

```javascript
// 后端响应格式
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8",
    "user": {
      "username": "doctor_xu",
      "name": "张医生"
    }
  }
}
```

### 2. 后端验证JWT

后端需要验证请求中的JWT：

```javascript
// 后端中间件示例（伪代码）
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  
  const token = authHeader.split(' ')[1]
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY)
    req.user = decoded  // 将用户信息添加到req
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

### 3. JWT Payload建议格式

```javascript
{
  "sub": "user_id",           // 用户ID
  "username": "doctor_xu",     // 用户名
  "name": "张医生",           // 姓名
  "role": "doctor",           // 角色
  "iat": 1516239022,          // 签发时间
  "exp": 1516325422           // 过期时间（建议1-2小时）
}
```

## 使用方法

### 前端使用示例

#### 登录后存储token

```javascript
// Login.vue
const handleLogin = async () => {
  const response = await loginDoctor(formData.value)
  
  // 获取JWT token
  const token = response.data.data?.token
  
  // 存储token
  if (token) {
    sessionStorage.setItem('token', token)
    sessionStorage.setItem('isAuthenticated', 'true')
  }
}
```

#### 使用JWT工具函数

```javascript
import { parseJWT, isTokenValid, getUserFromToken } from '@/utils/jwt'

// 解析token
const payload = parseJWT(token)
console.log('Token payload:', payload)

// 检查token是否有效
if (isTokenValid(token)) {
  console.log('Token is valid')
} else {
  console.log('Token is invalid or expired')
}

// 获取用户信息
const user = getUserFromToken(token)
console.log('User:', user)
```

#### 清除token（退出登录）

```javascript
import { clearToken } from '@/utils/jwt'

const handleLogout = () => {
  clearToken()
  router.push('/login')
}
```

## 安全性考虑

### ✅ 已实现的安全措施

1. **使用sessionStorage而非localStorage**
   - sessionStorage在标签页关闭时清除
   - 降低XSS攻击风险

2. **HTTPS传输**
   - 项目使用HTTPS（universalfuture.online）
   - 防止token被窃取

3. **Bearer Token格式**
   - 使用标准`Bearer`格式
   - 后端可以通过统一方式处理

### ⚠️ 需要注意的

1. **Token过期时间**
   - 建议设置为1-2小时
   - 避免过长导致安全风险

2. **Token刷新机制（可选）**
   - 可以实现自动刷新token
   - 使用refresh token获取新token

3. **敏感信息**
   - 不要在JWT中存储密码等敏感信息
   - JWT只是编码，不是加密

## 测试方法

### 1. 查看请求头

打开浏览器开发者工具 → Network标签 → 查看请求

应该看到：
```
Authorization: Bearer eyJhbGci...
```

### 2. 测试token过期

```javascript
// 在控制台手动测试
const token = sessionStorage.getItem('token')
console.log('Token:', token)

// 解析token
import { parseJWT, isTokenExpired } from '@/utils/jwt'
const payload = parseJWT(token)
console.log('Token payload:', payload)
console.log('Is expired:', isTokenExpired(token))
```

### 3. 测试401处理

当后端返回401时：
1. 控制台会显示警告信息
2. 自动清除本地存储
3. 自动跳转到登录页

## 常见问题

### Q1: 如何自定义token过期时间？

A: Token过期时间由后端控制，前端无法修改。建议：
- 短期token：1小时
- 配合refresh token：7-30天

### Q2: Token太大了怎么办？

A: JWT payload应该只包含必要信息：
- 用户ID
- 用户名
- 角色
- 过期时间

不要在payload中存储大量数据。

### Q3: 如何实现自动刷新token？

A: 可以实现token刷新机制：

```javascript
// 在响应拦截器中
if (error.response?.status === 401) {
  const refreshToken = sessionStorage.getItem('refreshToken')
  
  if (refreshToken) {
    // 使用refresh token获取新token
    const newToken = await refreshAccessToken(refreshToken)
    sessionStorage.setItem('token', newToken)
    
    // 重试原请求
    return apiClient(config)
  } else {
    // 没有refresh token，跳转登录
    clearToken()
    window.location.href = '/login'
  }
}
```

## 总结

✅ 项目已经完全支持JWT认证

- 自动在请求头添加JWT
- 自动处理401错误
- 提供完整的JWT工具函数

✅ 只需后端配合返回JWT

- 登录时返回JWT token
- 验证请求中的JWT
- 401表示token无效或过期

📚 更多信息

- 查看 `docs/JWT介绍与应用.md` 了解JWT原理
- 查看 `src/utils/jwt.js` 查看工具函数
- 查看 `src/api/auth.js` 查看实现细节


