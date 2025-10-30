# 临时 Mock 方案使用说明

## 快速解决方案

如果您暂时不想配置 Apifox Mock，可以使用前端临时 Mock 方案快速测试登录功能。

## 使用步骤

### 1. 修改 API 导入

**文件：`src/views/Login.vue`**

```javascript
// 将这行：
import { loginDoctor } from '../api/auth'

// 改为：
import { loginDoctor } from '../api/auth-mock'
```

**文件：`src/views/Register.vue`**

```javascript
// 将这行：
import { registerDoctor } from '../api/auth'

// 改为：
import { registerDoctor } from '../api/auth-mock'
```

### 2. 测试账号

**有效账号（可以登录）：**
- 用户名：`test`，密码：`123456`
- 用户名：`admin`，密码：`admin123`
- 用户名：`doctor`，密码：`doctor123`

**无效账号（会被拒绝）：**
- 用户名：`wrong`，密码：`wrong123`
- 任何其他组合

## 工作原理

这个临时方案：
1. ✅ **验证用户名和密码** - 只有预设的账号能登录
2. ✅ **模拟网络延迟** - 500ms 延迟，更真实
3. ✅ **返回正确格式** - 响应格式符合后端规范
4. ✅ **错误处理** - 401 错误时显示正确的错误信息

## 注册功能

注册时会检查用户名是否已存在：
- 如果用户名是 `test`、`admin` 或 `doctor`，会提示"用户名已存在"
- 其他用户名可以成功注册

## 切换回 Apifox

当您配置好 Apifox Mock 后，改回原来的导入：

```javascript
// 改回：
import { loginDoctor } from '../api/auth'
import { registerDoctor } from '../api/auth'
```

## 切换到真实后端

当您有真实后端时，确保使用 `auth.js`（不使用 `auth-mock.js`），并修改 `API_BASE_URL` 为真实地址。

