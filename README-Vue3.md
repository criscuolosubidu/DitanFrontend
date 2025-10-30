# 实时语音转写 (ASR) - Vue3版本

基于Vue3 + Vite构建的实时语音转写应用，使用科大讯飞实时语音转写API。

## 功能特性

- 🎤 实时语音录制
- 🔄 实时语音转写
- 📱 响应式设计
- ⚡ Vue3 + Vite 现代化开发体验
- 🎨 美观的UI界面
- 🔐 医生注册登录功能
- 🛡️ 路由守卫和权限控制

## 技术栈

- **前端框架**: Vue 3
- **构建工具**: Vite
- **路由管理**: Vue Router 4
- **HTTP客户端**: Axios
- **语音识别**: 科大讯飞实时语音转写API
- **录音功能**: RecorderManager (Web Audio API)

## 项目结构

```
├── src/
│   ├── api/             # API接口
│   │   ├── auth.js      # 认证接口（注册、登录）
│   │   └── auth-mock.js # Mock接口（开发测试用）
│   ├── views/           # 页面组件
│   │   ├── Login.vue    # 登录页
│   │   ├── Register.vue # 注册页
│   │   └── Home.vue     # 首页
│   ├── router/          # 路由配置
│   │   └── index.js     # 路由定义和守卫
│   ├── App.vue          # 主应用组件
│   └── main.js          # 应用入口
├── public/              # 静态资源
│   ├── hmac-sha256.js   # 加密库
│   ├── HmacSHA1.js      # HMAC-SHA1
│   ├── md5.js           # MD5加密
│   ├── enc-base64-min.js # Base64编码
│   ├── index.umd.js     # RecorderManager
│   ├── processor.worker.js # 音频处理Worker
│   └── processor.worklet.js # 音频处理Worklet
├── docs/                # 文档
│   ├── 使用说明_注册登录功能.md
│   └── ...
├── package.json         # 项目配置
├── vite.config.js      # Vite配置
└── index.html          # HTML入口
```

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

### 3. 构建生产版本

```bash
npm run build
```

### 4. 预览生产版本

```bash
npm run preview
```

## 使用说明

### 注册登录功能

1. **访问注册页面**: 首次使用需要注册账号
   - 访问 `http://localhost:5173/register`
   - 填写所有必填字段（用户名、密码、姓名、性别、手机号）
   - 可选填写科室、职位、个人简介
   - 点击"注册"按钮

2. **登录**: 注册成功后会自动跳转到登录页
   - 或访问 `http://localhost:5173/login`
   - 输入用户名和密码
   - 点击"登录"按钮

3. **访问首页**: 登录成功后自动跳转到首页
   - 首页地址: `http://localhost:5173/`
   - 未登录用户无法访问首页

### 语音转写功能

1. **配置API密钥**: 在 `src/views/Home.vue` 中修改以下配置：
   ```javascript
   const APPID = 'your_app_id'
   const API_KEY = 'your_api_key'
   ```

2. **开始录音**: 点击"开始录音"按钮
3. **实时转写**: 说话时会在"实时转写"区域显示识别结果
4. **最终结果**: 停止录音后，"转写结果"区域会显示完整的识别文本

## 浏览器要求

- 支持Web Audio API的现代浏览器
- 需要HTTPS或localhost环境（录音权限要求）
- 支持WebSocket连接

## 注意事项

- 录音功能需要在HTTPS或localhost环境下使用
- 需要有效的科大讯飞API密钥
- 确保浏览器允许麦克风权限

## API配置

### 注册登录API

API配置文件位于 `src/api/auth.js`：

- **注册接口**: `https://www.universalfuture.online/api/v1/doctor/register`
- **登录接口**: `https://www.universalfuture.online/api/v1/doctor/login`

如需修改API地址，请编辑 `src/api/auth.js` 中的 `API_BASE_URL` 常量。

### 科大讯飞API

语音转写功能需要配置科大讯飞API密钥，请在 `src/views/Home.vue` 中修改：

```javascript
const APPID = 'your_app_id'
const API_KEY = 'your_api_key'
```

## 从原项目迁移

本项目是从原有的纯JavaScript项目迁移而来，保持了所有原有功能：

- ✅ 实时语音录制
- ✅ 科大讯飞API集成
- ✅ WebSocket连接管理
- ✅ 音频数据处理
- ✅ 响应式UI设计
- ✅ 医生注册登录（新增）
- ✅ 路由守卫和权限控制（新增）

主要改进：
- 🚀 使用Vue3 Composition API
- 📦 模块化组件结构
- ⚡ Vite快速构建
- 🎨 更好的代码组织
- 🔧 现代化的开发工具链
- 🔐 完整的用户认证系统

## 更多文档

查看 `docs/使用说明_注册登录功能.md` 获取详细的注册登录功能说明。

