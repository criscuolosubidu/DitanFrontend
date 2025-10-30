# JWT (JSON Web Token) 介绍与应用

## 📚 JWT 是什么？

**JWT（JSON Web Token）**是一种开放标准（RFC 7519），用于在各方之间安全地传输信息作为JSON对象。

### 核心特点

1. **无状态（Stateless）**：服务器不需要存储会话信息
2. **自包含（Self-contained）**：token中包含用户信息，不需要查数据库
3. **可验证（Verifiable）**：使用签名确保数据完整性
4. **跨域友好**：可在不同域名间传递

## 🔑 JWT 的组成部分

一个JWT由三部分组成，用点（.）分隔：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### 1. Header（头部）

```json
{
  "alg": "HS256",  // 签名算法
  "typ": "JWT"     // token类型
}
```

经过Base64编码后：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

### 2. Payload（载荷）

包含用户的声明信息：

```json
{
  "sub": "1234567890",           // 用户ID (subject)
  "username": "doctor_xu",       // 用户名
  "name": "张医生",              // 姓名
  "exp": 1516239022,              // 过期时间
  "iat": 1516239022               // 签发时间
}
```

经过Base64编码后：
```
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
```

### 3. Signature（签名）

用于验证token是否被篡改：

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

## 🔄 JWT 工作流程

### 1. 用户登录

```
用户 -> 发送用户名密码 -> 后端
后端 -> 验证成功 -> 生成JWT -> 返回给前端
```

### 2. 前端存储JWT

```javascript
// 将JWT存储在客户端
sessionStorage.setItem('token', 'eyJhbGci...')
```

### 3. 后续请求携带JWT

```javascript
// 每个请求都在Header中携带JWT
headers: {
  'Authorization': 'Bearer eyJhbGci...'
}
```

### 4. 后端验证JWT

```
前端 -> 发送请求携带JWT -> 后端
后端 -> 验证JWT签名 -> 提取用户信息 -> 处理请求
```

## 💡 JWT vs 传统Session

### 传统Session方式

```
1. 用户登录
2. 服务器创建session，生成sessionID
3. sessionID存储在服务器内存/数据库
4. 返回sessionID给浏览器（通常存cookie）
5. 每次请求都携带sessionID
6. 服务器根据sessionID查找session
```

**缺点**：
- 服务器需要存储session数据
- 水平扩展困难（需要session共享）
- 不适合微服务架构

### JWT方式

```
1. 用户登录
2. 服务器生成JWT（包含用户信息）
3. 返回JWT给前端
4. 前端存储JWT（localStorage/sessionStorage）
5. 每次请求携带JWT
6. 服务器验证JWT签名（无需查询数据库）
```

**优点**：
- 无状态，服务器不需要存储
- 易于水平扩展
- 适合微服务架构
- 跨域友好

## 🎯 在您的项目中的应用

### 当前状态

您的项目已经在Login.vue中有token处理逻辑：

```javascript
// 如果有 token，也存储起来
if (userInfo.token) {
  sessionStorage.setItem('token', userInfo.token)
}
```

但还没有在请求中使用token。

### 改进方案

#### 1. 修改 auth.js - 添加JWT拦截器

```javascript
import axios from 'axios'

const API_BASE_URL = import.meta.env.DEV
  ? '/api/v1/doctor'
  : 'https://www.universalfuture.online/api/v1/doctor'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加JWT token
apiClient.interceptors.request.use(
  config => {
    // 从sessionStorage中获取token
    const token = sessionStorage.getItem('token')
    
    // 如果存在token，添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers
    })
    
    return config
  },
  error => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理token过期
apiClient.interceptors.response.use(
  response => {
    return response
  },
  error => {
    // 如果返回401（未授权），说明token过期或无效
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
    
    return Promise.reject(error)
  }
)
```

#### 2. 修改 Login.vue - 存储JWT

```javascript
const handleLogin = async () => {
  try {
    const response = await loginDoctor(formData.value)
    
    if (isSuccess) {
      // 获取token（JWT）
      const token = response.data.data?.token || response.data.token
      
      // 存储token
      if (token) {
        sessionStorage.setItem('token', token)
        
        // 解析JWT获取用户信息（可选）
        const userInfo = parseJWT(token)
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo))
      }
      
      // 存储登录状态
      sessionStorage.setItem('isAuthenticated', 'true')
      
      router.push('/')
    }
  } catch (error) {
    // 错误处理
  }
}

// 可选：解析JWT的函数
function parseJWT(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join('')
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}
```

#### 3. 修改 router/index.js - Token验证守卫

```javascript
router.beforeEach((to, from, next) => {
  const token = sessionStorage.getItem('token')
  const isAuthenticated = token && isTokenValid(token)
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    // 需要登录但未登录，重定向到登录页
    next('/login')
  } else if ((to.path === '/login' || to.path === '/register') && isAuthenticated) {
    // 已登录访问登录/注册页，重定向到首页
    next('/')
  } else {
    next()
  }
})

// 可选：验证token是否过期
function isTokenValid(token) {
  try {
    const payload = parseJWT(token)
    const now = Math.floor(Date.now() / 1000)
    
    // 检查token是否过期
    if (payload.exp && payload.exp < now) {
      return false
    }
    
    return true
  } catch (e) {
    return false
  }
}
```

## 🔐 JWT 安全最佳实践

### 1. 使用HTTPS

JWT只在Header中，容易被窃取，**必须使用HTTPS**。

### 2. Token过期时间

```javascript
// 设置合理的过期时间
const payload = {
  sub: userId,
  username: username,
  exp: Math.floor(Date.now() / 1000) + 3600  // 1小时后过期
}
```

### 3. 刷新Token机制

使用两个token：
- **Access Token**：短期有效（15-30分钟），用于API请求
- **Refresh Token**：长期有效（7天），用于刷新Access Token

```javascript
// 当Access Token过期时
if (error.response?.status === 401) {
  const refreshToken = sessionStorage.getItem('refreshToken')
  
  // 使用Refresh Token获取新的Access Token
  const newAccessToken = await refreshAccessToken(refreshToken)
  
  // 存储新token
  sessionStorage.setItem('token', newAccessToken)
  
  // 重试原请求
  return apiClient(config)
}
```

### 4. XSS防护

```javascript
// ✅ 使用sessionStorage而不是localStorage
sessionStorage.setItem('token', token)

// ❌ 避免使用localStorage（容易受到XSS攻击）
localStorage.setItem('token', token)
```

### 5. CSRF防护

如果使用cookie存储，需要CSRF token。但您的项目使用Header方式，相对安全。

## 📊 JWT 优缺点总结

### ✅ 优点

1. **无状态**：服务器不需要存储session
2. **可扩展**：易于水平扩展
3. **跨域友好**：可以在不同域名间传递
4. **自包含**：包含用户信息，减少数据库查询
5. **标准**：基于RFC 7519标准

### ⚠️ 缺点

1. **Token不可撤销**：一旦发出，在过期前都有效
   - 解决：使用refresh token或维护token黑名单
2. **体积较大**：比sessionID大很多
3. **性能问题**：包含信息多，会增大请求头
4. **安全性**：如果泄漏，任何人都可以使用
   - 解决：HTTPS + 短期过期时间

## 🚀 在您的项目中实施

### 阶段1：基础集成（推荐先做这个）

1. ✅ 修改auth.js添加JWT到请求头
2. ✅ 修改响应拦截器处理401错误
3. ✅ 后端验证JWT并返回用户信息

### 阶段2：增强功能（可选）

1. 添加token自动刷新
2. 添加token过期检测
3. 添加token刷新逻辑

### 后端需要做的

您的后端需要在登录接口返回JWT：

```javascript
// 后端登录接口响应
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT
    "user": {
      "username": "doctor_xu",
      "name": "张医生"
    }
  }
}
```

后端验证JWT中间件：

```javascript
// 伪代码示例
function verifyJWT(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

## 📝 总结

### JWT适合您的项目吗？

**✅ 非常适合**，因为：

1. 您的项目使用sessionStorage存储token（已经做了）
2. 前端需要保持登录状态
3. 需要向API传递用户身份
4. 适合单页面应用（SPA）

### 实施建议

1. **立即实施**：修改auth.js添加JWT到请求头（代码已经准备就绪）
2. **后端配合**：让后端在登录时返回JWT，并验证请求中的JWT
3. **完善体验**：添加401错误处理和自动跳转登录页

### 下一步

我可以帮您：
1. 修改auth.js添加JWT拦截器
2. 更新Login.vue优化token处理
3. 添加token验证路由守卫
4. 创建完整的JWT使用示例

您想从哪个开始？


