# Apifox Mock 配置方案

## 问题说明

当登录接口使用 Apifox Mock 时，Mock 服务可能返回默认的成功响应，导致无论输入什么都能登录成功。

## 解决方案

### 方案一：在 Apifox 中配置登录验证逻辑（推荐用于开发测试）

#### 步骤 1：打开登录接口

1. 打开 Apifox
2. 找到 `诊室后端` -> `POST 医生登录` 接口
3. 点击该接口进入详情页

#### 步骤 2：配置 Mock 响应

**切换到"Mock"标签页**，配置以下内容：

##### 场景 1：使用正则表达式匹配（简单）

创建两个 Mock 规则：

**规则 1：登录成功**
- 名称：登录成功
- 状态码：200
- 响应体：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "id": 1,
    "username": "test",
    "name": "测试医生"
  }
}
```

**规则 2：登录失败**
- 名称：登录失败
- 条件（优先级更高）：`username=^(?!test$).*` （用户名不等于 test）
- 状态码：401
- 响应体：
```json
{
  "code": 401,
  "message": "用户名或密码错误"
}
```

##### 场景 2：使用 Apifox 脚本（推荐）

在 Mock 中编写自定义脚本：

```javascript
// 定义有效的用户名和密码
const validUsers = [
  { username: 'test', password: '123456', name: '测试医生' },
  { username: 'admin', password: 'admin123', name: '管理员' }
];

// 获取请求数据
const body = JSON.parse(pm.request.body.raw);

// 查找匹配的用户
const user = validUsers.find(u => u.username === body.username && u.password === body.password);

if (user) {
  // 登录成功
  pm.response.status = 200;
  pm.response.json({
    code: 200,
    message: '登录成功',
    data: {
      id: 1,
      username: user.username,
      name: user.name
    }
  });
} else {
  // 登录失败
  pm.response.status = 401;
  pm.response.json({
    code: 401,
    message: '用户名或密码错误'
  });
}
```

### 方案二：连接真实后端（推荐用于生产）

如果您有真实的后端服务：

1. **修改 API 地址**
   
   编辑 `src/api/auth.js`，修改 API_BASE_URL：
   ```javascript
   const API_BASE_URL = '你的真实后端地址/api/v1/doctor'
   ```

2. **在 Apifox 中切换环境**
   
   - 关闭登录接口的 Mock 功能
   - 或者将环境切换到"正式环境"
   - 或者使用"云端 Mock"或"自托管"模式

### 方案三：临时测试方案（快速验证）

如果您只是想验证前端登录验证功能是否正常，可以临时修改 `src/api/auth.js` 添加一个硬编码的验证逻辑：

```javascript
export const loginDoctor = (credentials) => {
  // 临时的前端验证逻辑（仅用于测试）
  return new Promise((resolve, reject) => {
    // 模拟网络延迟
    setTimeout(() => {
      if (credentials.username === 'test' && credentials.password === '123456') {
        resolve({
          data: {
            code: 200,
            message: '登录成功',
            data: {
              id: 1,
              username: 'test',
              name: '测试医生'
            }
          }
        });
      } else if (credentials.username === 'admin' && credentials.password === 'admin123') {
        resolve({
          data: {
            code: 200,
            message: '登录成功',
            data: {
              id: 1,
              username: 'admin',
              name: '管理员'
            }
          }
        });
      } else {
        reject({
          response: {
            status: 401,
            data: {
              message: '用户名或密码错误'
            }
          }
        });
      }
    }, 500); // 模拟 500ms 网络延迟
  });
}
```

**注意：这只是临时测试方案，最终需要连接真实后端或配置正确的 Mock。**

## 操作步骤总结

### 在 Apifox 中配置登录接口 Mock：

1. **打开 Apifox**
2. **找到项目** `6768102-6480118-default`
3. **进入登录接口**：`POST 医生登录`
4. **切换到 "Mock" 标签页**
5. **选择配置方式：**
   - 使用简单的 Mock 规则
   - 或使用自定义脚本（推荐）
6. **保存配置**
7. **确保 Mock 服务正在运行**
   - 检查端口 4523 是否被占用
   - 查看 Mock 服务状态指示器

### 测试登录：

**有效账号（测试用）：**
- 用户名：`test`，密码：`123456`
- 用户名：`admin`，密码：`admin123`

**无效账号（应该被拒绝）：**
- 用户名：`wrong`，密码：`wrong`

## 常见问题

### Q1: 如何启动 Mock 服务？

在 Apifox 中：
1. 找到你的项目
2. 查看 Mock 服务状态
3. 如果有"启动"按钮，点击启动
4. 默认 Mock 服务运行在 `http://127.0.0.1:4523`

### Q2: 如何查看 Mock 服务是否运行？

```bash
# 在终端中测试
curl http://127.0.0.1:4523/

# 或在浏览器中访问
http://127.0.0.1:4523/
```

### Q3: Mock 服务端口冲突怎么办？

如果 4523 端口被占用：
1. 在 Apifox 中修改 Mock 服务端口
2. 同时修改前端代码中的 API_BASE_URL

### Q4: 是否需要每次都启动 Mock？

是的，如果你要使用 Apifox Mock 服务，需要在每次使用前启动它。

## 推荐配置（开发阶段）

**建议您选择"方案二：使用 Apifox 脚本"**，因为：
1. 支持多个账号测试
2. 可以模拟真实的登录验证逻辑
3. 配置简单，易于维护
4. 接近真实后端行为

配置好后，登录功能就会真正发挥作用，只有输入正确的用户名和密码才能登录成功。

