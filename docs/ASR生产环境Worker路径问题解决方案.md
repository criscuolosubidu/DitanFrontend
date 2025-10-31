# ASR 生产环境 Worker 路径问题解决方案

## 一、问题背景

### 1.1 问题描述

在使用 Vue3 + Vite 构建的 ASR（自动语音识别）项目中，遇到了以下问题：

- **开发环境（`npm run dev`）**：ASR 功能正常工作，WebSocket 连接成功，音频数据正常发送和接收
- **生产环境（`npm run preview` 或部署到服务器）**：
  - WebSocket 连接成功（握手成功）
  - 但音频数据无法发送
  - 约 15 秒后自动断开连接
  - 错误信息：`engine error|37005:Client idle timeout`

### 1.2 错误现象

#### 控制台错误信息

1. **Worker 加载错误**（关键错误）：
   ```
   SecurityError: Failed to construct 'Worker': 
   Script at 'http://processor.worker.js/' cannot be accessed from origin 'http://localhost:4173'
   ```

2. **ASR 引擎超时错误**：
   ```
   {
     action: 'error',
     code: '10700',
     data: '',
     desc: 'engine error|37005:Client idle timeout',
     sid: 'rta2c94031e@dx2f5f1c5f86e5000100'
   }
   ```

3. **其他警告**：
   - `[Deprecation] The ScriptProcessorNode is deprecated. Use AudioWorkletNode instead.`
   - `Uncaught SyntaxError: Unexpected token '<'`（在 `processor.worker.js`）

#### 时序分析

1. ✅ WebSocket 连接建立成功
2. ✅ 握手成功（`握手成功`）
3. ✅ 录音启动成功（`录音启动成功`）
4. ❌ Worker 加载失败（`SecurityError`）
5. ❌ 音频数据处理失败（Worker 无法工作）
6. ❌ 15 秒后超时断开（因为没有任何音频数据发送）

## 二、问题根本原因分析

### 2.1 技术架构

项目中使用了以下技术栈：

- **Vue3** + **Vite** 作为前端框架和构建工具
- **RecorderManager**（来自 `index.umd.js`）用于音频录制
- **Web Worker**（`processor.worker.js`）用于音频数据处理
- **WebSocket** 连接到科大讯飞 RTASR 服务

### 2.2 核心问题：Worker 路径配置错误

#### 问题代码

```javascript
// 错误的配置（生产环境会失败）
recorder = new RecorderManager('/dist')
```

#### 问题分析

1. **RecorderManager 路径说明**：
   - 根据 README 文档，`RecorderManager` 构造函数接受的 `processorPath` 参数是 `processor.worker.js` 和 `processor.worklet.js` 的**目录路径**
   - 如果文件的访问地址是 `/a/b/c/processor.worker.js`，则 `processorPath` 应该为 `/a/b/c`
   - 如果文件在根目录 `/processor.worker.js`，则 `processorPath` 应该为 `/`

2. **Vite 的文件处理机制**：
   - `public/` 目录下的文件在构建时会被**原样复制**到 `dist/` 根目录
   - 开发环境和生产环境，`public/` 文件都可以通过**根路径** `/` 访问
   - 例如：`public/processor.worker.js` → 可通过 `/processor.worker.js` 访问

3. **路径错误的具体表现**：
   - 使用 `/dist` 作为路径时，RecorderManager 可能会尝试加载 `/dist/processor.worker.js`
   - 但在生产环境中，实际文件在根目录 `/processor.worker.js`
   - 更糟糕的是，路径处理逻辑可能将 `/dist` 解析为域名，导致尝试访问 `http://processor.worker.js/`
   - 浏览器安全策略阻止了这种跨域访问，导致 Worker 构造失败

4. **错误链条**：
   ```
   错误的 processorPath ('/dist')
   ↓
   RecorderManager 尝试构造 Worker
   ↓
   路径解析错误 (可能解析为 'http://processor.worker.js/')
   ↓
   SecurityError: Worker 脚本无法从当前 origin 访问
   ↓
   Worker 加载失败
   ↓
   音频数据处理无法进行
   ↓
   没有音频数据发送到 WebSocket
   ↓
   15 秒后触发 Client idle timeout
   ```

### 2.3 环境差异

#### 开发环境（`npm run dev`）

- Vite 开发服务器可能会特殊处理某些路径
- 开发环境的文件服务机制可能允许 `/dist/processor.worker.js` 这种路径工作
- 因此开发环境看似正常，但隐藏了潜在的路径问题

#### 生产环境（`npm run preview` 或部署）

- 构建后的文件严格按照实际目录结构提供
- 浏览器安全策略严格执行
- 路径错误会立即暴露

## 三、解决方案

### 3.1 方案一：使用正确的根路径（推荐）

#### 代码修改

```javascript
// src/views/Home.vue
onMounted(() => {
  // 初始化录音器
  // 在 Vite 中，public/ 目录下的文件在开发和生产环境都位于根路径 '/'
  // processor.worker.js 和 processor.worklet.js 应该可以通过 /processor.worker.js 访问
  if (typeof RecorderManager === 'undefined') {
    console.error('❌ RecorderManager未加载，请检查index.html中的script标签')
    alert('录音管理器未加载，请刷新页面重试')
    return
  }
  
  // 根据环境动态确定 processorPath
  let processorPath = ''
  
  console.log('🎤 初始化RecorderManager')
  console.log('📍 当前页面路径:', window.location.pathname)
  console.log('📍 当前origin:', window.location.origin)
  console.log('🔍 环境:', import.meta.env.MODE, '生产环境:', import.meta.env.PROD)
  
  // 尝试多种路径策略，找到可用的路径
  const pathOptions = [
    { path: '', desc: '空字符串（当前目录）' },
    { path: '.', desc: '当前目录（相对路径）' },
    { path: '/', desc: '根目录（绝对路径）' }
  ]
  
  let recorderInitialized = false
  let lastError = null
  
  for (const option of pathOptions) {
    try {
      console.log(`🔄 尝试路径: "${option.path}" (${option.desc})`)
      recorder = new RecorderManager(option.path)
      console.log(`✅ 使用路径 "${option.path}" 初始化成功`)
      console.log(`📂 processorPath: "${option.path}"`)
      recorderInitialized = true
      break
    } catch (error) {
      console.warn(`⚠️ 路径 "${option.path}" 失败:`, error.message)
      lastError = error
      // 继续尝试下一个路径
    }
  }
  
  if (!recorderInitialized) {
    console.error('❌ 所有路径策略都失败了')
    console.error('最后一个错误:', lastError)
    alert(`录音器初始化失败，请检查worker文件是否可访问。\n错误: ${lastError?.message || '未知错误'}`)
  }
  
  // ... 其他初始化代码
})
```

#### 关键点

1. **路径选择顺序**：
   - 优先尝试空字符串 `''`（最可能成功）
   - 其次尝试相对路径 `'.'`
   - 最后尝试绝对路径 `'/'`

2. **错误处理**：
   - 如果所有路径都失败，记录详细错误信息
   - 向用户显示友好的错误提示

3. **调试信息**：
   - 输出详细的日志，便于排查问题
   - 记录当前环境信息

### 3.2 方案二：动态检测并验证路径

如果需要更精确的控制，可以动态检测并验证路径：

```javascript
// 动态检测有效的 processorPath
const detectProcessorPath = () => {
  const baseUrl = window.location.origin
  const testPath = '/processor.worker.js'
  
  // 尝试加载 worker 文件验证路径
  return fetch(baseUrl + testPath, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        return ''  // 文件在根目录，使用空字符串
      }
      throw new Error('Worker file not found')
    })
    .catch(() => {
      // 如果根目录失败，尝试其他路径
      return '.'
    })
}

// 使用
detectProcessorPath().then(path => {
  recorder = new RecorderManager(path)
})
```

### 3.3 增强的错误处理和日志

为了更好地区分不同阶段的问题，添加了详细的日志：

```javascript
// WebSocket 连接
const connectWebSocket = () => {
  const websocketUrl = getWebSocketUrl()
  console.log('🔌 开始连接WebSocket:', websocketUrl)
  
  // ... 连接代码
  
  iatWS.onopen = (e) => {
    console.log('✅ WebSocket连接成功')
    if (!recorder) {
      console.error('❌ RecorderManager未初始化')
      alert('录音器未初始化，请刷新页面重试')
      return
    }
    
    try {
      console.log('🎤 开始启动录音...')
      recorder.start({
        sampleRate: 16000,
        frameSize: 1280,
      })
      console.log('✅ 录音启动成功')
    } catch (error) {
      console.error('❌ 启动录音失败:', error)
      alert('启动录音失败，请检查麦克风权限和worker文件是否加载成功')
      iatWS.close()
    }
  }
  
  // ... 其他事件处理
}

// 音频发送
recorder.onFrameRecorded = ({ isLastFrame, frameBuffer }) => {
  if (iatWS && iatWS.readyState === iatWS.OPEN) {
    try {
      iatWS.send(new Int8Array(frameBuffer))
      // 每100帧打印一次日志（避免日志过多）
      if (Math.random() < 0.01) {
        console.log('📤 发送音频帧，大小:', frameBuffer.byteLength, 'bytes')
      }
      if (isLastFrame) {
        console.log('📤 发送最后一帧，准备结束')
        iatWS.send('{"end": true}')
        changeBtnStatus('CLOSING')
      }
    } catch (error) {
      console.error('❌ 发送音频数据失败:', error)
      recorder.stop()
    }
  } else {
    console.warn('⚠️ WebSocket未打开，无法发送音频数据。状态:', 
      iatWS ? iatWS.readyState : '未初始化')
  }
}
```

## 四、验证和测试方法

### 4.1 验证 Worker 文件可访问性

在浏览器中直接访问以下 URL，确认文件存在：

1. **开发环境**：
   - `http://localhost:8000/processor.worker.js`
   - `http://localhost:8000/processor.worklet.js`

2. **预览环境**：
   - `http://localhost:4173/processor.worker.js`
   - `http://localhost:4173/processor.worklet.js`

3. **生产环境**：
   - `https://your-domain.com/processor.worker.js`
   - `https://your-domain.com/processor.worklet.js`

如果返回 404，说明文件路径有问题。

### 4.2 控制台日志检查

打开浏览器开发者工具，检查以下日志：

1. **初始化阶段**：
   ```
   🎤 初始化RecorderManager
   📍 当前页面路径: /index.html
   📍 当前origin: http://localhost:4173
   📂 processorPath: (空字符串)
   ✅ 使用路径 "" 初始化成功
   ```

2. **WebSocket 连接阶段**：
   ```
   🔌 开始连接WebSocket: wss://rtasr.xfyun.cn/v1/ws?...
   ✅ WebSocket连接成功
   ✅ 录音启动成功
   ```

3. **音频发送阶段**：
   ```
   ✅ 录音开始
   📤 发送音频帧，大小: 1280 bytes
   ```

### 4.3 错误检查清单

如果遇到问题，按以下清单检查：

- [ ] `processor.worker.js` 文件是否存在于 `public/` 目录
- [ ] 构建后文件是否在 `dist/` 根目录
- [ ] 浏览器中能否直接访问 worker 文件
- [ ] RecorderManager 是否成功初始化（无 SecurityError）
- [ ] WebSocket 连接是否成功
- [ ] 录音是否成功启动（检查 `recorder.onStart` 是否触发）
- [ ] 音频帧是否正常发送（检查 `recorder.onFrameRecorded` 是否触发）
- [ ] 控制台是否有相关错误信息

## 五、文件结构说明

### 5.1 项目目录结构

```
ASR-js/
├── public/
│   ├── processor.worker.js    # Worker 脚本（音频处理）
│   ├── processor.worklet.js   # Worklet 脚本（音频处理）
│   ├── index.umd.js           # RecorderManager
│   └── ...                     # 其他依赖文件
├── src/
│   └── views/
│       └── Home.vue            # 主页面（包含 ASR 逻辑）
├── dist/                        # 构建输出目录
│   ├── processor.worker.js    # 从 public/ 复制
│   ├── processor.worklet.js  # 从 public/ 复制
│   └── ...                     # 其他构建文件
└── vite.config.js               # Vite 配置
```

### 5.2 Vite 配置

```javascript
// vite.config.js
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
    // publicDir 默认为 'public'
    // public 目录下的文件会被复制到 outDir 根目录
  }
})
```

## 六、常见问题和解决方案

### 6.1 问题：Worker 文件 404

**现象**：浏览器控制台显示 `Failed to load resource: the server responded with a status of 404`

**解决方案**：
1. 检查 `public/processor.worker.js` 是否存在
2. 运行 `npm run build` 重新构建
3. 确认 `dist/processor.worker.js` 是否存在
4. 检查服务器配置，确保静态文件服务正确

### 6.2 问题：CORS 错误

**现象**：`SecurityError: Failed to construct 'Worker'` 且错误信息包含 CORS

**解决方案**：
1. 确保 worker 文件与主应用在同一 origin
2. 检查服务器 CORS 配置
3. 避免使用 CDN 或其他域名的 worker 文件

### 6.3 问题：路径仍然解析错误

**现象**：尝试了所有路径策略，仍然失败

**解决方案**：
1. 检查 `RecorderManager` 的源码（`index.umd.js`），了解它如何处理路径
2. 使用浏览器开发者工具的 Network 标签，查看实际请求的 URL
3. 尝试使用完整的 URL：`window.location.origin + '/processor.worker.js'`
4. 考虑修改 `RecorderManager` 源码，直接传递完整 URL

### 6.4 问题：开发环境正常，生产环境失败

**现象**：`npm run dev` 正常，`npm run preview` 失败

**解决方案**：
1. 检查 Vite 构建配置
2. 确认 `public/` 文件是否正确复制到 `dist/`
3. 检查 base URL 配置（`vite.config.js` 中的 `base`）
4. 使用相对路径而非绝对路径

### 6.5 问题：AudioWorklet 相关警告

**现象**：`[Deprecation] The ScriptProcessorNode is deprecated. Use AudioWorkletNode instead.`

**解决方案**：
- 这是浏览器 API 弃用警告，不影响功能
- 如果未来需要，可以升级 `RecorderManager` 使用 `AudioWorkletNode`
- 当前使用 `ScriptProcessorNode` 仍然可以正常工作

## 七、最佳实践

### 7.1 路径配置建议

1. **优先使用相对路径或空字符串**，避免硬编码绝对路径
2. **在初始化时验证路径有效性**，提供友好的错误提示
3. **使用环境变量**区分不同环境的配置

### 7.2 错误处理建议

1. **分阶段错误处理**：
   - Worker 加载失败
   - WebSocket 连接失败
   - 录音权限拒绝
   - 音频发送失败

2. **详细的日志记录**：
   - 使用 emoji 标记不同类型的日志
   - 记录关键操作的时间戳
   - 保存错误堆栈信息

3. **用户友好的提示**：
   - 提供具体的错误原因
   - 给出解决建议
   - 避免技术术语

### 7.3 测试建议

1. **在不同环境下测试**：
   - 开发环境（`npm run dev`）
   - 预览环境（`npm run preview`）
   - 生产环境（部署到服务器）

2. **不同浏览器测试**：
   - Chrome/Edge（推荐，兼容性最好）
   - Firefox
   - Safari（注意兼容性）

3. **网络环境测试**：
   - 本地网络
   - 生产服务器网络
   - 检查防火墙和代理设置

## 八、总结

### 8.1 问题核心

ASR 生产环境失败的根本原因是 **Worker 文件路径配置错误**，导致：
1. Worker 无法加载
2. 音频数据处理失败
3. 没有数据发送到 WebSocket
4. 触发超时断开

### 8.2 解决方案要点

1. **使用正确的路径**：根据实际文件位置选择路径（空字符串、`.` 或 `/`）
2. **自动尝试多种路径**：如果一种路径失败，自动尝试其他路径
3. **详细的错误日志**：帮助快速定位问题
4. **完善的错误处理**：给用户友好的错误提示

### 8.3 预防措施

1. **开发和生产环境使用相同的路径策略**
2. **在构建时验证 worker 文件存在**
3. **添加自动化测试，覆盖不同环境**
4. **文档化路径配置规则**

## 九、参考资料

- [Vite 官方文档 - 静态资源处理](https://vitejs.dev/guide/assets.html#the-public-directory)
- [Web Worker API - MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Worker)
- [科大讯飞 RTASR 文档](https://www.xfyun.cn/doc/asr/rtasr/API.html)
- [RecorderManager README](./README.md)

---

**文档版本**：1.0  
**最后更新**：2024年  
**维护者**：项目开发团队

