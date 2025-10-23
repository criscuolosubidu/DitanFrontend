# 科大讯飞 RTASR 实时转写集成说明与常见问题（100110）

本文档基于本仓库 `example/rtasr` 示例，总结了如何在浏览器端集成科大讯飞实时语音转写（RTASR）服务，并详细说明了签名参数的生成逻辑、音频发送管线，以及经常遇到的 `appid` 非法（错误码 100110）问题的原因与解决办法。

## 一、整体架构与数据流

- **页面与入口**：`example/rtasr/index.html` 提供按钮、状态指示与结果区域，并引入依赖与示例逻辑。
- **录音与编码**：通过 `RecorderManager`（来自本库构建产物 `dist`）采集麦克风音频，按照 RTASR 要求（16k 采样率、帧大小 1280 字节）分片。
- **鉴权与连接**：前端在 `example/rtasr/index.js` 中计算 RTASR WebSocket 连接所需的 `appid / ts / signa`，拼接到 `wss://rtasr.xfyun.cn/v1/ws` 的查询参数中，建立 WebSocket 连接。
- **发送音频帧**：WebSocket 打开后，从 `RecorderManager` 的 `onFrameRecorded` 回调里持续发送音频帧，最后发送 `{ "end": true }` 结束标记。
- **接收与渲染结果**：在 `onmessage` 中解析 RTASR 返回的 JSON，区分实时结果与最终结果，更新页面显示。

## 二、关键文件与代码位置

- `example/rtasr/index.html`
  - 定义 UI 与引入脚本，其中包含示例 `APPID` 与 `API_KEY` 变量：

```176:185:example/rtasr/index.html
  <script>
    var APPID = "fb75c27e";
    var API_KEY = "59e8d4e6948955ee263b9b07839c454c";
  </script>
  <script src="../hmac-sha256.js"></script>
  <script src="../HmacSHA1.js"></script>
  <script src="../md5.js"></script>
  <script src="../enc-base64-min.js"></script>
  <script src="../../dist/index.umd.js"></script>
  <script src="./index.js"></script>
```

- `example/rtasr/index.js`
  - 生成 WebSocket URL（签名）：

```20:31:example/rtasr/index.js
  function getWebSocketUrl() {
    // 请求地址根据语种不同变化
    var url = "wss://rtasr.xfyun.cn/v1/ws";
    var appId = 'fb75c27e';
    var secretKey = '59e8d4e6948955ee263b9b07839c454c';
    var ts = Math.floor(new Date().getTime() / 1000);
    var signa = hex_md5(appId + ts);
    var signatureSha = CryptoJSNew.HmacSHA1(signa, secretKey);
    var signature = CryptoJS.enc.Base64.stringify(signatureSha);
    signature = encodeURIComponent(signature);
    return `${url}?appid=${appId}&ts=${ts}&signa=${signature}`;
  }
```

  - 建立连接、发送音频、接收/渲染结果：

```94:115:example/rtasr/index.js
  function connectWebSocket() {
    const websocketUrl = getWebSocketUrl();
    if ("WebSocket" in window) {
      iatWS = new WebSocket(websocketUrl);
    } else if ("MozWebSocket" in window) {
      iatWS = new MozWebSocket(websocketUrl);
    } else {
      alert("浏览器不支持WebSocket");
      return;
    }
    changeBtnStatus("CONNECTING");
    iatWS.onopen = (e) => {
      // 开始录音
      recorder.start({
        sampleRate: 16000,
        frameSize: 1280,
      });
    };
    iatWS.onmessage = (e) => {
      renderResult(e.data);
    };
```

```126:134:example/rtasr/index.js
  recorder.onFrameRecorded = ({ isLastFrame, frameBuffer }) => {
    if (iatWS.readyState === iatWS.OPEN) {
      iatWS.send(new Int8Array(frameBuffer));
      if (isLastFrame) {
        iatWS.send('{"end": true}');
        changeBtnStatus("CLOSING");
      }
    }
  };
```

```61:91:example/rtasr/index.js
  function renderResult(resultData) {
    let jsonData = JSON.parse(resultData);
    if (jsonData.action == "started") {
      // 握手成功
      console.log("握手成功");
    } else if (jsonData.action == "result") {
      const data = JSON.parse(jsonData.data)
      console.log(data)
      // 转写结果
      let resultTextTemp = ""
      data.cn.st.rt.forEach((j) => {
        j.ws.forEach((k) => {
          k.cw.forEach((l) => {
            resultTextTemp += l.w;
          });
        });
      });
      if (data.cn.st.type == 0) {
        // 【最终】识别结果：
        resultText += resultTextTemp;
        resultTextTemp = ""
      }

      // 显示实时转写结果
      document.getElementById("realtime-result").innerText = resultTextTemp;
      // 显示最终转写结果
      document.getElementById("result").innerText = resultText;
    } else if (jsonData.action == "error") {
      // 连接发生错误
      console.log("出错了:", jsonData);
    }
  }
```

## 三、签名与鉴权细节（重点）

RTASR 连接参数由三部分组成：
- **appid**：控制台应用的 AppID。
- **ts**：当前时间戳，单位秒（与服务器需大致同步）。
- **signa**：签名，生成规则为：
  1) `signa_source = md5(appid + ts)`
  2) `hmac = HMAC-SHA1(signa_source, secretKey)`
  3) `signa = Base64(hmac)`，最后对 Base64 结果进行 URL 编码

本项目在前端使用 `md5.js`、`HmacSHA1.js` 和 `enc-base64-min.js` 来完成上述步骤，并通过 `getWebSocketUrl()` 拼接到查询参数中。

注意：示例中 `appId` 与 `secretKey` 直接出现在前端，仅用于演示与联调。在生产环境应放在服务端计算签名，前端只拿到已签名的 URL 或临时令牌，以避免泄露密钥。

## 四、音频采集与发送

- `RecorderManager` 在 `iatWS.onopen` 后开始录音：`sampleRate: 16000`，`frameSize: 1280`。
- 在 `onFrameRecorded` 中：
  - 若连接为 OPEN，则发送 `frameBuffer`（`Int8Array`）。
  - 若是最后一帧，发送 `{"end": true}` 宣告结束。
- RTASR 服务端将持续返回结果：
  - `action == "result"` 时包含实时/最终转写，`type == 0` 表示最终结果。

## 五、错误码 100110（appid 非法/为空）问题排查与解决

你提到“appid 一直是空的不合法，报错 100110”。结合本项目与 RTASR 规则，总结如下：

- **常见原因**：
  - appid 未正确拼到 URL：请确认 URL 形如 `.../v1/ws?appid=YOUR_APPID&ts=...&signa=...`。
  - 变量名或作用域问题导致取值为空：例如未从正确的变量读取，或被覆盖。
  - 额外的 URL 编码/转义错误：`appid` 不应被额外编码为空字符串。
  - 使用了错误的字段（如用了 API Key 位置代替 AppID）。
  - 时间戳 `ts` 与服务端时间偏差极大，或签名不匹配，导致返回泛化错误（实际响应体会指明）。
  - 请求的域名或路径错误，导致服务端未按 RTASR 协议解析参数。

- **本项目如何避免**：
  - 在 `getWebSocketUrl()` 内部直接定义并使用：

```22:31:example/rtasr/index.js
    var appId = 'fb75c27e';
    var secretKey = '59e8d4e6948955ee263b9b07839c454c';
    var ts = Math.floor(new Date().getTime() / 1000);
    var signa = hex_md5(appId + ts);
    var signatureSha = CryptoJSNew.HmacSHA1(signa, secretKey);
    var signature = CryptoJS.enc.Base64.stringify(signatureSha);
    signature = encodeURIComponent(signature);
    return `${url}?appid=${appId}&ts=${ts}&signa=${signature}`;
```

  - 由于 `appid` 直接插入模板字符串，不会出现取不到值的情况；若你在外层用 `APPID` 全局变量，务必确保变量已定义且未被覆盖。

- **建议的修复步骤**：
  1. 在浏览器控制台打印实际连接 URL：
     ```js
     const u = getWebSocketUrl(); console.log(u);
     ```
     确认 `appid=...` 存在且非空。
  2. 若你自己项目的 URL 构造与本示例不同，先对齐为上述实现，排除签名拼接错误。
  3. 确保时间戳 `ts` 为秒级整数，且系统时间大致正确。
  4. 检查是否误把 API Key 当作 AppID 或 SecretKey；三者在讯飞控制台概念不同。
  5. 若仍报错，打印服务端 `onmessage` 的错误体：
     ```js
     iatWS.onmessage = (e)=>{ try{ console.log('recv', e.data); }catch(_){} }
     ```
     依据返回的 `action=="error"` 的 `code/msg` 精确定位。
  6. 生产时改为后端生成签名，避免前端因环境/时钟/依赖问题导致签名异常。

## 六、把示例改造成配置化的写法（可选优化）

为避免魔法字符串与环境差异，建议将 `appid/secretKey` 通过构建或后端接口注入：

```javascript
function buildRtasrUrl({ url, appId, secretKey, now = ()=>Date.now() }){
  const ts = Math.floor(now() / 1000);
  const signa = hex_md5(appId + ts);
  const hmac = CryptoJSNew.HmacSHA1(signa, secretKey);
  const signature = encodeURIComponent(CryptoJS.enc.Base64.stringify(hmac));
  return `${url}?appid=${appId}&ts=${ts}&signa=${signature}`;
}
```

这样便于在不同环境传入不同 `appid`，并可在单测中注入固定 `now()` 以验证签名。

## 七、安全与上线建议

- 不要在浏览器端硬编码 `secretKey`。该示例仅用于本地调试。
- 使用 HTTPS/WSS；确保时间同步（NTP）。
- 服务端提供签名或临时票据，前端只负责连接与音频发送。
- 对 `onerror/onclose` 做好重试与提示，避免用户困惑。

---

若你在自己的项目中仍遇到 `100110`，请分享你构造的完整 URL（脱敏 signa）与浏览器控制台日志，我可以逐项比对定位。
