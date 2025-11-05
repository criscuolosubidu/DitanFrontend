<template>
  <div class="app">
    <!-- 左侧患者列表 -->
    <div class="patient-sidebar">
      <div class="sidebar-header">
        <h3>患者列表</h3>
        <div class="patient-count">{{ patientList.length }} 人</div>
      </div>
      
      <!-- 用户信息栏 -->
      <div class="user-info-bar">
        <div class="user-info">
          <div class="user-avatar">
            <span>👤</span>
          </div>
          <div class="user-name">{{ currentUser || '医生' }}</div>
        </div>
        <button class="logout-btn" @click="handleLogout" title="退出登录">
          <span>退出</span>
        </button>
      </div>
      
      <div class="patient-list">
        <div 
          v-for="(patient, index) in patientList" 
          :key="patient.id"
          class="patient-item"
          :class="{ active: selectedPatient?.id === patient.id }"
          @click="selectPatient(patient)"
        >
          <div class="patient-avatar">
            <span>{{ patient.name.charAt(0) }}</span>
          </div>
          <div class="patient-info">
            <div class="patient-name">{{ patient.name }}</div>
            <div class="patient-details">
              <span v-if="patient.cardNumber && patient.cardNumber.trim()" class="patient-card">{{ patient.cardNumber }}</span>
              <span v-if="formatGender(patient.gender)" class="patient-gender">{{ formatGender(patient.gender) }}</span>
            </div>
          </div>
          <div class="patient-actions">
            <button 
              class="delete-btn"
              @click.stop="deletePatient(patient.id)"
              title="删除患者"
            >
              ×
            </button>
          </div>
        </div>
        
        <div v-if="patientList.length === 0" class="empty-state">
          <div class="empty-icon">👥</div>
          <div class="empty-text">暂无患者信息</div>
          <div class="empty-hint">扫描二维码添加患者</div>
        </div>
      </div>
      
      <!-- 底部按钮区域 -->
      <div class="sidebar-footer-buttons">
        <!-- 扫描二维码按钮 -->
        <button 
          @click="startQRScan" 
          class="qr-button"
          :disabled="isScanning"
        >
          <span>📱</span>
          <span>{{ qrButtonText }}</span>
        </button>

        <!-- 输入手机号查询按钮 -->
        <button 
          @click="openPhoneInput" 
          class="phone-button"
          :disabled="isQuerying"
        >
          <span>📞</span>
          <span>{{ phoneButtonText }}</span>
        </button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <div class="tab-container">
        <!-- Tab导航栏 -->
        <div class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-button"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        
        <!-- Tab内容区域 -->
        <div class="tab-content">
          <!-- 预问诊数据Tab -->
          <div v-if="activeTab === 'pre-consultation'" class="tab-panel">
            <div class="pre-consultation-content">
              <!-- 如果没有选中患者 -->
              <div v-if="!selectedPatient" class="empty-state-message">
                <p>请先选择或添加患者</p>
              </div>
              
              <!-- 如果患者没有recordId -->
              <div v-else-if="!selectedPatient.recordId" class="empty-state-message">
                <p>该患者缺少就诊记录ID（record_id），无法获取预问诊数据</p>
              </div>
              
              <!-- 如果有选中患者且有recordId -->
              <div v-else>
                <!-- 加载状态 -->
                <div v-if="preConsultationLoading[selectedPatient.recordId]" class="loading-container">
                  <div class="spinner"></div>
                  <p>正在加载预问诊数据，请稍候...</p>
                </div>
                
                <!-- 错误状态 -->
                <div v-else-if="preConsultationError[selectedPatient.recordId]" class="error-container">
                  <div class="error-icon">❌</div>
                  <div class="error-message">{{ preConsultationError[selectedPatient.recordId] }}</div>
                </div>
                
                <!-- 数据展示 -->
                <div v-else-if="preConsultationData[selectedPatient.recordId]" class="pre-consultation-data">
                  <div class="pre-consultation-text">{{ preConsultationData[selectedPatient.recordId] }}</div>
                </div>
                
                <!-- 暂无数据 -->
                <div v-else class="empty-state-message">
                  <p>暂无预问诊数据</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 患者病历Tab -->
          <div v-if="activeTab === 'basic'" class="tab-panel">
            <div v-if="isAIRequesting" class="loading-container">
              <div class="spinner"></div>
              <p>AI正在分析中，请稍候...</p>
            </div>
            
            <div v-else-if="aiDiagnosisError" class="error-container">
              <div class="error-icon">❌</div>
              <div class="error-message">{{ aiDiagnosisError }}</div>
            </div>
            
            <div v-else>
              <div v-if="aiDiagnosisParsed?.formattedMedicalRecord" class="diagnosis-result">
                <h4>病历整理</h4>
                <div style="white-space:pre-wrap;">{{ aiDiagnosisParsed.formattedMedicalRecord }}</div>
              </div>
              <div v-else-if="aiDiagnosisResult" class="diagnosis-result">
                <div class="result-content">{{ aiDiagnosisResult }}</div>
              </div>
              <div v-else class="diagnosis-result">
                <div>暂无诊断信息，请先进行AI诊断。</div>
              </div>
            </div>
          </div>
          
          <!-- 中医诊断Tab -->
          <div v-if="activeTab === 'diagnosis'" class="tab-panel">
            <div v-if="isAIRequesting" class="loading-container">
              <div class="spinner"></div>
              <p>AI正在分析中，请稍候...</p>
            </div>
            
            <div v-else-if="aiDiagnosisError" class="error-container">
              <div class="error-icon">❌</div>
              <div class="error-message">{{ aiDiagnosisError }}</div>
            </div>
            
            <div v-else>
              <div v-if="aiDiagnosisParsed?.typeInference || aiDiagnosisParsed?.treatment">
                <div v-if="aiDiagnosisParsed?.typeInference" class="diagnosis-result">
                  <h4>辨证思路</h4>
                  <div>{{ aiDiagnosisParsed.typeInference }}</div>
                </div>
                <div v-if="aiDiagnosisParsed?.treatment" class="diagnosis-result" style="margin-top:16px;">
                  <h4>治疗原则</h4>
                  <div>{{ aiDiagnosisParsed.treatment }}</div>
                </div>
              </div>
              <div v-else class="diagnosis-result">
                <h4>辨证思路</h4>
                <div>暂无相关诊断信息（病历信息不足或未解析到）。</div>
              </div>
            </div>
          </div>
          
          <!-- 处方结果Tab -->
          <div v-if="activeTab === 'prescription'" class="tab-panel">
            <div v-if="isAIRequesting" class="loading-container">
              <div class="spinner"></div>
              <p>AI正在分析中，请稍候...</p>
            </div>
            
            <div v-else-if="aiDiagnosisError" class="error-container">
              <div class="error-icon">❌</div>
              <div class="error-message">{{ aiDiagnosisError }}</div>
            </div>
            
            <div v-else>
              <div class="diagnosis-result">
                <h4>处方建议</h4>
                <template v-if="aiDiagnosisParsed?.prescription && aiDiagnosisParsed.prescription.length">
                  <ul style="padding-left:18px;margin:6px 0;">
                    <li v-for="(item, idx) in aiDiagnosisParsed.prescription" :key="idx">{{ item }}</li>
                  </ul>
                </template>
                <template v-else>
                  <div>暂无处方建议。</div>
                </template>
              </div>
            </div>
          </div>
          
          <!-- 分析结果Tab -->
          <div v-if="activeTab === 'analysis'" class="tab-panel">
            <div v-if="isAIRequesting" class="loading-container">
              <div class="spinner"></div>
              <p>AI正在分析中，请稍候...</p>
            </div>
            
            <div v-else-if="aiDiagnosisError" class="error-container">
              <div class="error-icon">❌</div>
              <div class="error-message">{{ aiDiagnosisError }}</div>
            </div>
            
            <div v-else>
              <div class="diagnosis-result">
                <h4>生活方式/运动处方</h4>
                <template v-if="renderedExercisePrescription">
                  <div class="markdown-content" v-html="renderedExercisePrescription"></div>
                </template>
                <template v-else>
                  <div>暂无分析结果或运动建议。</div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 转写面板占位区域（未显示面板时显示按钮） -->
    <div v-if="!showModal" class="transcription-placeholder">
      <button 
        @click="toggleRecording" 
        class="record-button"
        :disabled="isConnecting || isAIRequesting"
      >
        <span>🎤</span>
        <span>{{ buttonText }}</span>
      </button>
    </div>

    <!-- 转写面板 -->
    <div v-if="showModal" class="transcription-panel">
      <div class="panel-header">
        <h3>实时语音转写</h3>
        <button class="close-button" @click="closeModal">×</button>
      </div>
      
      <div class="panel-body">
        <div class="text-areas">
          <div class="text-area">
            <div class="text-area-label">实时转写:</div>
            <div class="text-area-content">{{ realtimeResult }}</div>
          </div>
          <div class="text-area">
            <div class="text-area-label">转写结果:</div>
            <div class="text-area-content">{{ finalResult }}</div>
          </div>
        </div>
        <button 
          @click="handleAIDiagnosis" 
          class="ai-diagnosis-button"
          :disabled="!finalResult || isAIRequesting"
        >
          <span v-if="!isAIRequesting">🤖</span>
          <span v-else class="spinner-small"></span>
          <span>{{ isAIRequesting ? 'AI分析中...' : 'AI诊断' }}</span>
        </button>
      </div>
    </div>

    <!-- 二维码扫描面板 -->
    <div v-if="showQRModal" class="qr-scan-panel">
      <div class="qr-panel-header">
        <h3>扫描二维码</h3>
        <button class="close-button" @click="closeQRModal">×</button>
      </div>
      
      <div class="qr-panel-body">
        <div class="qr-scanner-container">
          <video 
            ref="qrVideo" 
            class="qr-video"
            autoplay
            playsinline
          ></video>
          <div class="qr-overlay">
            <div class="qr-frame"></div>
            <p class="qr-hint">将二维码对准扫描框</p>
          </div>
        </div>
        
        <div v-if="qrResult" class="qr-result">
          <h4>扫描结果:</h4>
          <div class="qr-result-content">{{ qrResult }}</div>
          
          <!-- 解析后的详细信息 -->
          <div v-if="parsedQRData" class="parsed-data">
            <h5>解析信息:</h5>
            <div class="data-grid">
              <div v-if="parsedQRData.cardNumber" class="data-item">
                <span class="data-label">卡号:</span>
                <span class="data-value">{{ parsedQRData.cardNumber }}</span>
              </div>
              <div v-if="parsedQRData.name" class="data-item">
                <span class="data-label">姓名:</span>
                <span class="data-value">{{ parsedQRData.name }}</span>
              </div>
              <div v-if="parsedQRData.phone" class="data-item">
                <span class="data-label">电话:</span>
                <span class="data-value">{{ parsedQRData.phone }}</span>
              </div>
              <div v-if="parsedQRData.gender" class="data-item">
                <span class="data-label">性别:</span>
                <span class="data-value">{{ parsedQRData.gender }}</span>
              </div>
              <div v-if="parsedQRData.birthDate" class="data-item">
                <span class="data-label">出生年月:</span>
                <span class="data-value">{{ parsedQRData.birthDate }}</span>
              </div>
              <div v-if="parsedQRData.healthIndex" class="data-item">
                <span class="data-label">体检指标:</span>
                <span class="data-value">{{ parsedQRData.healthIndex }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 手机号输入弹窗 -->
    <div v-if="showPhoneModal" class="phone-input-modal">
      <div class="phone-modal-overlay" @click="closePhoneModal"></div>
      <div class="phone-modal-content">
        <div class="phone-modal-header">
          <h3>输入手机号查询患者</h3>
          <button class="close-button" @click="closePhoneModal">×</button>
        </div>
        <div class="phone-modal-body">
          <div class="phone-input-group">
            <label for="phone-input">手机号</label>
            <input
              id="phone-input"
              v-model="phoneInput"
              type="tel"
              placeholder="请输入11位手机号"
              maxlength="11"
              class="phone-input"
            />
          </div>
          <div class="phone-modal-actions">
            <button class="cancel-btn" @click="closePhoneModal">取消</button>
            <button class="confirm-btn" @click="queryPatientByPhone" :disabled="!phoneInput || phoneInput.length !== 11">
              查询
            </button>
          </div>
          <div v-if="queryError" class="query-error">
            {{ queryError }}
          </div>
        </div>
      </div>
    </div>

    <!-- 成功提示 -->
    <div v-if="showSuccessToast" class="success-toast">
      <div class="toast-content">
        <div class="toast-icon">✅</div>
        <div class="toast-message">{{ successMessage }}</div>
      </div>
    </div>

    <!-- AI诊断结果底部栏（已隐藏，tab已移到上方主内容区域） -->
    <div v-if="false" class="ai-diagnosis-panel" :style="{ height: diagnosisPanelHeight + 'px' }">
      <div class="panel-resizer" @mousedown="startDiagnosisResize"></div>
      <div class="panel-header">
        <h3>AI诊断建议</h3>
        <div class="panel-controls">
          <button class="minimize-btn" @click="toggleDiagnosisPanel" :title="isDiagnosisPanelMinimized ? '展开' : '收起'">
            <span v-if="!isDiagnosisPanelMinimized">−</span>
            <span v-else>+</span>
          </button>
          <button class="close-button" @click="closeAIDiagnosisModal">×</button>
        </div>
      </div>
      
      <div v-if="isDiagnosisPanelMinimized" class="panel-minimized">
        <span>AI诊断结果已生成</span>
        <button @click="toggleDiagnosisPanel">展开查看</button>
      </div>
      
      <div v-else class="panel-body">
        <div v-if="isAIRequesting" class="loading-container">
          <div class="spinner"></div>
          <p>AI正在分析中，请稍候...</p>
        </div>
        
        <div v-else-if="aiDiagnosisError" class="error-container">
          <div class="error-icon">❌</div>
          <div class="error-message">{{ aiDiagnosisError }}</div>
        </div>
        
        <div v-else class="diagnosis-tabs">
          <!-- Tab按钮 -->
          <div class="tab-buttons">
            <button 
              v-for="tab in diagnosisTabs" 
              :key="tab.id"
              class="tab-button"
              :class="{ active: currentDiagnosisTab === tab.id }"
              @click="currentDiagnosisTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
          
          <!-- Tab内容 -->
          <div class="tab-content">
            <!-- 患者病历Tab -->
            <div v-if="currentDiagnosisTab === 'basic'" class="tab-panel">
              <div v-if="aiDiagnosisParsed?.formattedMedicalRecord" class="diagnosis-result">
                <h4>病历整理</h4>
                <div style="white-space:pre-wrap;">{{ aiDiagnosisParsed.formattedMedicalRecord }}</div>
              </div>
              <div v-else-if="aiDiagnosisResult" class="diagnosis-result">
                <div class="result-content">{{ aiDiagnosisResult }}</div>
              </div>
            </div>
            
            <!-- 中医诊断Tab -->
            <div v-if="currentDiagnosisTab === 'diagnosis'" class="tab-panel">
              <div v-if="aiDiagnosisParsed?.typeInference || aiDiagnosisParsed?.treatment">
                <div v-if="aiDiagnosisParsed?.typeInference" class="diagnosis-result">
                  <h4>辨证思路</h4>
                  <div>{{ aiDiagnosisParsed.typeInference }}</div>
                </div>
                <div v-if="aiDiagnosisParsed?.treatment" class="diagnosis-result" style="margin-top:16px;">
                  <h4>治疗原则</h4>
                  <div>{{ aiDiagnosisParsed.treatment }}</div>
                </div>
              </div>
              <div v-else class="diagnosis-result">
                <h4>辨证思路</h4>
                <div>暂无相关诊断信息（病历信息不足或未解析到）。</div>
              </div>
            </div>
            
            <!-- 处方结果Tab -->
            <div v-if="currentDiagnosisTab === 'prescription'" class="tab-panel">
              <div class="diagnosis-result">
                <h4>处方建议</h4>
                <template v-if="aiDiagnosisParsed?.prescription && aiDiagnosisParsed.prescription.length">
                  <ul style="padding-left:18px;margin:6px 0;">
                    <li v-for="(item, idx) in aiDiagnosisParsed.prescription" :key="idx">{{ item }}</li>
                  </ul>
                </template>
                <template v-else>
                  <div>暂无处方建议。</div>
                </template>
              </div>
            </div>
            
            <!-- 分析结果Tab -->
            <div v-if="currentDiagnosisTab === 'analysis'" class="tab-panel">
              <div class="diagnosis-result">
                <h4>生活方式/运动处方</h4>
                <template v-if="aiDiagnosisParsed?.exercisePrescription && aiDiagnosisParsed.exercisePrescription.length">
                  <ul style="padding-left:18px;margin:6px 0;">
                    <li v-for="(tip, idx) in aiDiagnosisParsed.exercisePrescription" :key="idx">{{ tip }}</li>
                  </ul>
                </template>
                <template v-else>
                  <div>暂无分析结果或运动建议。</div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 患者详情右侧边栏 -->
    <div v-if="showPatientDetail" class="patient-detail-sidebar" :class="{ 'with-ai-panel': showAIDiagnosisModal }" :style="{ '--ai-panel-height': aiPanelHeight + 'px' }">
      <div class="sidebar-header">
        <h3>患者详细信息</h3>
        <button class="close-button" @click="closePatientDetail">×</button>
      </div>
      
      <div class="sidebar-body" v-if="selectedPatient">
        <div class="patient-avatar-large">
          <span>{{ selectedPatient.name.charAt(0) }}</span>
        </div>
        
        <div class="patient-detail-grid">
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-item">
              <span class="detail-label">姓名:</span>
              <span class="detail-value">{{ selectedPatient.name || '未填写' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">就诊卡号:</span>
              <span class="detail-value">{{ selectedPatient.cardNumber || '未填写' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">性别:</span>
              <span class="detail-value">{{ selectedPatient.gender || '未填写' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">出生年月:</span>
              <span class="detail-value">{{ selectedPatient.birthDate || '未填写' }}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>联系方式</h4>
            <div class="detail-item">
              <span class="detail-label">电话号码:</span>
              <span class="detail-value">{{ selectedPatient.phone || '未填写' }}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>健康信息</h4>
            <div class="detail-item">
              <span class="detail-label">身高:</span>
              <span class="detail-value">{{ selectedPatient.height || '未填写' }}{{ selectedPatient.height ? ' cm' : '' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">体重:</span>
              <span class="detail-value">{{ selectedPatient.weight || '未填写' }}{{ selectedPatient.weight ? ' kg' : '' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">目标体重:</span>
              <span class="detail-value">{{ selectedPatient.target || '未填写' }}{{ selectedPatient.target ? ' kg' : '' }}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>系统信息</h4>
            <div class="detail-item">
              <span class="detail-label">就诊记录ID:</span>
              <span class="detail-value">{{ selectedPatient.recordId || '未填写' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">扫描时间:</span>
              <span class="detail-value">{{ selectedPatient.scanTime }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <button class="btn-secondary" @click="closePatientDetail">关闭</button>
        <button 
          v-if="hasSavedDiagnosis" 
          class="btn-info" 
          @click="showSavedDiagnosis"
        >
          📋 显示AI诊断建议
        </button>
        <button class="btn-primary" @click="startRecordingForPatient">开始录音</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import QrScanner from 'qr-scanner'
import { marked } from 'marked'
import { queryPatientByPhone as queryPatientAPI } from '../api/patient'
import { getAIDiagnosis } from '../api/ai-diagnosis'
import { getPreConsultationData } from '../api/pre-consultation'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    // 响应式数据
    const btnStatus = ref('UNDEFINED') // "UNDEFINED" "CONNECTING" "OPEN" "CLOSING" "CLOSED"
    const realtimeResult = ref('')
    const finalResult = ref('')
    const resultText = ref('')
    const resultTextTemp = ref('')
    const showModal = ref(false) // 控制弹窗显示
    
    // 二维码扫描相关
    const showQRModal = ref(false) // 控制二维码扫描弹窗显示
    const isScanning = ref(false) // 是否正在扫描
    const qrResult = ref('') // 扫描结果
    const parsedQRData = ref(null) // 解析后的结构化数据
    const qrVideo = ref(null) // 视频元素引用
    let qrScanner = null // QR扫描器实例
    
    // 手机号查询相关
    const showPhoneModal = ref(false) // 控制手机号输入弹窗显示
    const phoneInput = ref('') // 手机号输入值
    const isQuerying = ref(false) // 是否正在查询
    const queryError = ref('') // 查询错误信息
    
    // 患者列表相关
    const patientList = ref([]) // 患者列表
    const selectedPatient = ref(null) // 当前选中的患者
    
    // 成功提示相关
    const showSuccessToast = ref(false) // 控制成功提示显示
    const successMessage = ref('') // 成功提示内容
    
    // 患者详情右侧边栏相关
    const showPatientDetail = ref(false) // 控制患者详情右侧边栏显示
    
    // 预问诊数据相关
    const preConsultationData = ref({}) // 按record_id存储预问诊数据
    const preConsultationLoading = ref({}) // 按record_id存储加载状态
    const preConsultationError = ref({}) // 按record_id存储错误信息
    
    // 诊断建议保存相关
    const isSavingDiagnosis = ref(false) // 是否正在保存诊断建议
    const saveDiagnosisMessage = ref('') // 保存消息
    const saveDiagnosisMessageType = ref('') // 保存消息类型：success, error
    
    // AI诊断相关
    const showAIDiagnosisModal = ref(false) // 控制AI诊断弹窗显示
    const isAIRequesting = ref(false) // 是否正在请求AI诊断
    const aiDiagnosisResult = ref('') // AI诊断结果（原始字符串）
    const aiDiagnosisError = ref('') // AI诊断错误信息
    const aiDiagnosisParsed = ref(null) // 结构化后的诊断对象
    const isDiagnosisPanelMinimized = ref(false) // 诊断面板是否最小化
    const currentDiagnosisTab = ref('basic') // 当前选中的诊断Tab
    const diagnosisPanelHeight = ref(Math.round(window.innerHeight * 0.4)) // 底部栏高度（px）
    const isDiagnosisResizing = ref(false)
    let diagnosisResizeStartY = 0
    let diagnosisResizeStartHeight = 0
    const diagnosisTabs = [
      { id: 'basic', label: '患者病历' },
      { id: 'diagnosis', label: '中医诊断' },
      { id: 'prescription', label: '处方结果' },
      { id: 'analysis', label: '运动处方' }
    ]
    // 解析与归一化AI诊断结果
    const parseAIDiagnosis = (data) => {
      try {
        const src = typeof data === 'string' ? (() => {
          try { return JSON.parse(data) } catch { return { raw: data } }
        })() : data

        let obj
        if (src && typeof src === 'object' && 'data' in src) {
          const inner = src.data
          if (typeof inner === 'string') {
            try { obj = JSON.parse(inner) } catch { obj = src }
          } else if (typeof inner === 'object') {
            obj = inner
          } else {
            obj = src
          }
        } else {
          obj = src
        }
        if (!obj || typeof obj !== 'object') {
          return {
            formattedMedicalRecord: undefined,
            typeInference: undefined,
            treatment: undefined,
            prescription: [],
            exercisePrescription: []
          }
        }

        const formattedMedicalRecord = obj.formatted_medical_record || obj.formattedMedicalRecord || obj.medical_record || obj.record || undefined
        const typeInference = obj.type_inference || obj.typeInference || obj.inference || undefined
        const treatment = obj.treatment || obj.treatment_principle || undefined

        // 处方：字符串或数组，尽量拆分为条目
        const rawPrescription = obj.prescription || obj.formula || obj.rx || undefined
        let prescription = []
        if (Array.isArray(rawPrescription)) {
          prescription = rawPrescription.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
        } else if (typeof rawPrescription === 'string') {
          const lines = rawPrescription.split(/\n|；|;|。/).map(s => s.trim()).filter(Boolean)
          if (lines.length) prescription = lines
        }

        const rawExercise = obj.exercise_prescription || obj.exercise || obj.lifestyle || undefined
        let exercisePrescription = []
        if (Array.isArray(rawExercise)) {
          exercisePrescription = rawExercise.map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
        } else if (typeof rawExercise === 'string') {
          exercisePrescription = rawExercise.split(/\n|；|;|。/).map(s => s.trim()).filter(Boolean)
        }

        return {
          formattedMedicalRecord,
          typeInference,
          treatment,
          prescription,
          exercisePrescription
        }
      } catch (e) {
        console.error('解析AI诊断结果失败:', e)
        return null
      }
    }
    
    // 用户信息相关
    const currentUser = ref('') // 当前用户名
    
    // Tab切换相关
    const activeTab = ref('pre-consultation') // 当前选中的tab
    const tabs = [
      { id: 'pre-consultation', label: '预问诊数据' },
      { id: 'basic', label: '患者病历' },
      { id: 'diagnosis', label: '中医诊断' },
      { id: 'prescription', label: '处方结果' },
      { id: 'analysis', label: '运动处方' }
    ]
    
    // 渲染运动处方为Markdown的计算属性
    const renderedExercisePrescription = computed(() => {
      if (!aiDiagnosisParsed.value?.exercisePrescription || !aiDiagnosisParsed.value.exercisePrescription.length) {
        return ''
      }
      
      // 将数组合并为字符串，用换行符连接
      const markdownText = aiDiagnosisParsed.value.exercisePrescription.join('\n')
      
      try {
        // 使用 marked 渲染 Markdown
        return marked(markdownText)
      } catch (error) {
        console.error('Markdown渲染失败:', error)
        return markdownText // 如果渲染失败，返回原始文本
      }
    })
    
    // 科大讯飞API配置
    const APPID = 'fb75c27e'
    const API_KEY = '59e8d4e6948955ee263b9b07839c454c'
    
    // WebSocket和录音器实例
    let iatWS = null
    let recorder = null
    let countdownInterval = null

    // 计算属性
    const buttonText = computed(() => {
      switch (btnStatus.value) {
        case 'CONNECTING':
          return '建立连接中'
        case 'OPEN':
          return '录音中'
        case 'CLOSING':
          return '关闭连接中'
        default:
          return '开始录音'
      }
    })

    const statusText = computed(() => {
      switch (btnStatus.value) {
        case 'CONNECTING':
          return '连接中'
        case 'OPEN':
          return '已连接'
        case 'CLOSING':
          return '关闭中'
        default:
          return '未连接'
      }
    })

    const statusDotClass = computed(() => {
      switch (btnStatus.value) {
        case 'CONNECTING':
        case 'CLOSING':
          return 'connecting'
        case 'OPEN':
          return 'connected'
        default:
          return 'disconnected'
      }
    })

    const isConnecting = computed(() => {
      return btnStatus.value === 'CONNECTING'
    })

    // 二维码扫描相关计算属性
    const qrButtonText = computed(() => {
      return isScanning.value ? '扫描中...' : '扫描二维码'
    })
    
    // 手机号查询相关计算属性
    const phoneButtonText = computed(() => {
      return isQuerying.value ? '查询中...' : '输入手机号'
    })

    // 方法
    const changeBtnStatus = (status) => {
      btnStatus.value = status
      
      if (status === 'CONNECTING') {
        finalResult.value = ''
        realtimeResult.value = ''
        resultText.value = ''
        resultTextTemp.value = ''
      }
    }

    const getWebSocketUrl = () => {
      const url = 'wss://rtasr.xfyun.cn/v1/ws'
      const ts = Math.floor(new Date().getTime() / 1000)
      const signa = hex_md5(APPID + ts)
      const signatureSha = CryptoJSNew.HmacSHA1(signa, API_KEY)
      const signature = CryptoJS.enc.Base64.stringify(signatureSha)
      const encodedSignature = encodeURIComponent(signature)
      return `${url}?appid=${APPID}&ts=${ts}&signa=${encodedSignature}`
    }

    const renderResult = (resultData) => {
      try {
        const jsonData = JSON.parse(resultData)
        
        if (jsonData.action === 'started') {
          console.log('握手成功')
        } else if (jsonData.action === 'result') {
          const data = JSON.parse(jsonData.data)
          console.log('转写数据:', data)
          
          // 转写结果
          let tempText = ''
          if (data.cn && data.cn.st && data.cn.st.rt) {
            data.cn.st.rt.forEach((j) => {
              if (j.ws) {
                j.ws.forEach((k) => {
                  if (k.cw) {
                    k.cw.forEach((l) => {
                      tempText += l.w
                    })
                  }
                })
              }
            })
          }
          
          console.log('提取的文本:', tempText, '类型:', data.cn?.st?.type, '类型typeof:', typeof data.cn?.st?.type)
          
          if (data.cn?.st?.type == 0 || data.cn?.st?.type === '0') {
            // 【最终】识别结果
            resultText.value += tempText
            resultTextTemp.value = ''
            console.log('最终结果更新:', resultText.value)
          } else {
            // 临时结果
            resultTextTemp.value = tempText
            console.log('临时结果更新:', resultTextTemp.value)
          }

          // 更新显示
          realtimeResult.value = resultTextTemp.value
          finalResult.value = resultText.value
          
          console.log('显示更新 - 实时:', realtimeResult.value, '最终:', finalResult.value)
        } else if (jsonData.action === 'error') {
          console.log('出错了:', jsonData)
        }
      } catch (error) {
        console.error('解析结果数据失败:', error)
      }
    }

    const connectWebSocket = () => {
      const websocketUrl = getWebSocketUrl()
      console.log('🔌 开始连接WebSocket:', websocketUrl)
      
      if ('WebSocket' in window) {
        iatWS = new WebSocket(websocketUrl)
      } else if ('MozWebSocket' in window) {
        iatWS = new MozWebSocket(websocketUrl)
      } else {
        alert('浏览器不支持WebSocket')
        return
      }

      changeBtnStatus('CONNECTING')

      iatWS.onopen = (e) => {
        console.log('✅ WebSocket连接成功')
        // 检查recorder是否已初始化
        if (!recorder) {
          console.error('❌ RecorderManager未初始化')
          alert('录音器未初始化，请刷新页面重试')
          return
        }
        
        try {
          // 开始录音
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

      iatWS.onmessage = (e) => {
        renderResult(e.data)
      }

      iatWS.onerror = (e) => {
        console.error('❌ WebSocket错误:', e)
        if (recorder) {
          recorder.stop()
        }
        changeBtnStatus('CLOSED')
      }

      iatWS.onclose = (e) => {
        console.log('🔌 WebSocket连接关闭，代码:', e.code, '原因:', e.reason)
        if (recorder) {
          recorder.stop()
        }
        changeBtnStatus('CLOSED')
      }
    }

    const toggleRecording = () => {
      if (btnStatus.value === 'UNDEFINED' || btnStatus.value === 'CLOSED') {
        // 显示弹窗并开始录音
        showModal.value = true
        connectWebSocket()
      } else if (btnStatus.value === 'CONNECTING' || btnStatus.value === 'OPEN') {
        // 结束录音
        recorder.stop()
      }
    }

    const closeModal = () => {
      showModal.value = false
      // 如果正在录音，停止录音
      if (btnStatus.value === 'CONNECTING' || btnStatus.value === 'OPEN') {
        recorder.stop()
      }
    }

    // AI诊断方法
    const handleAIDiagnosis = async () => {
      if (!finalResult.value) {
        alert('请先完成录音转写')
        return
      }
      
      // 检查是否选中了患者
      if (!selectedPatient.value) {
        alert('请先选择或添加患者')
        return
      }
      
      // 检查是否有record_id
      if (!selectedPatient.value.recordId) {
        alert('❌ 缺少就诊记录ID（record_id），请通过手机号或二维码重新查询患者')
        return
      }
      
      // 先停止录音并关闭WebSocket
      if (btnStatus.value === 'CONNECTING' || btnStatus.value === 'OPEN') {
        console.log('🛑 停止录音并关闭WebSocket')
        if (recorder) {
          recorder.stop()
        }
        if (iatWS) {
          iatWS.close()
        }
        changeBtnStatus('CLOSED')
      }
      
      // 关闭转写弹窗
      showModal.value = false
      
      // 从 sessionStorage 获取access_token
      const accessToken = sessionStorage.getItem('access_token')
      
      console.log('🤖 开始AI诊断')
      console.log('转写内容:', finalResult.value)
      console.log('access_token:', accessToken)
      console.log('record_id:', selectedPatient.value.recordId)
      
      if (!accessToken) {
        alert('❌ 缺少认证信息，请重新登录')
        router.push('/login')
        return
      }
      
      // 不再显示底部面板，tab已移到上方主内容区域
      // showAIDiagnosisModal.value = true
      // 点击AI诊断后，自动切换到"患者病历"tab
      activeTab.value = 'basic'
      isAIRequesting.value = true
      aiDiagnosisResult.value = ''
      aiDiagnosisError.value = ''
      aiDiagnosisParsed.value = null
      
      try {
        // 调用AI诊断API，使用record_id而不是doctor_id
        console.log('📤 发送AI诊断请求...')
        console.log('使用record_id:', selectedPatient.value.recordId)
        const response = await getAIDiagnosis(selectedPatient.value.recordId, finalResult.value)
        
        console.log('📥 AI诊断响应:', response.data)
        
        // 解析响应数据
        const diagnosisData = response.data
        if (diagnosisData) {
          // 如果响应有diagnosis字段，使用它；否则使用整个data
          const diagnosisText = diagnosisData.diagnosis || diagnosisData.data || JSON.stringify(diagnosisData, null, 2)
          aiDiagnosisResult.value = typeof diagnosisText === 'string' ? diagnosisText : JSON.stringify(diagnosisText, null, 2)
          // 尝试结构化解析（兼容 data 为字符串的情况）
          aiDiagnosisParsed.value = parseAIDiagnosis(diagnosisData.diagnosis || diagnosisData.data || diagnosisData)
        } else {
          aiDiagnosisError.value = '未收到有效的诊断结果'
        }
      } catch (error) {
        console.error('❌ AI诊断失败:', error)
        
        if (error.response) {
          // 服务器返回了错误
          const status = error.response.status
          const data = error.response.data
          
          if (status === 401) {
            aiDiagnosisError.value = '认证失败，请重新登录'
          } else if (status === 400) {
            aiDiagnosisError.value = data?.message || '请求参数错误'
          } else if (status === 500) {
            aiDiagnosisError.value = '服务器错误，请稍后再试'
          } else {
            aiDiagnosisError.value = data?.message || `请求失败 (${status})`
          }
        } else if (error.request) {
          aiDiagnosisError.value = '无法连接到服务器，请检查网络'
        } else {
          aiDiagnosisError.value = error.message || '请求失败'
        }
      } finally {
        isAIRequesting.value = false
        // 已经在点击时切换到"患者病历"tab，这里不需要再次切换
      }
    }

    // 切换诊断面板最小化状态
    const toggleDiagnosisPanel = () => {
      isDiagnosisPanelMinimized.value = !isDiagnosisPanelMinimized.value
    }
    
    // 拖拽调整底部栏高度
    const startDiagnosisResize = (e) => {
      isDiagnosisResizing.value = true
      diagnosisResizeStartY = e.clientY
      diagnosisResizeStartHeight = diagnosisPanelHeight.value
      window.addEventListener('mousemove', onDiagnosisResizing)
      window.addEventListener('mouseup', stopDiagnosisResize)
      e.preventDefault()
    }
    const onDiagnosisResizing = (e) => {
      if (!isDiagnosisResizing.value) return
      const delta = diagnosisResizeStartY - e.clientY // 往上拖动增高
      let next = diagnosisResizeStartHeight + delta
      const minH = Math.round(window.innerHeight * 0.2)
      const maxH = Math.round(window.innerHeight * 0.8)
      if (next < minH) next = minH
      if (next > maxH) next = maxH
      diagnosisPanelHeight.value = next
    }
    const stopDiagnosisResize = () => {
      if (!isDiagnosisResizing.value) return
      isDiagnosisResizing.value = false
      window.removeEventListener('mousemove', onDiagnosisResizing)
      window.removeEventListener('mouseup', stopDiagnosisResize)
    }
    
    // 关闭AI诊断弹窗
    const closeAIDiagnosisModal = () => {
      showAIDiagnosisModal.value = false
      aiDiagnosisResult.value = ''
      aiDiagnosisError.value = ''
      aiDiagnosisParsed.value = null
      isDiagnosisPanelMinimized.value = false
      currentDiagnosisTab.value = 'basic'
      diagnosisPanelHeight.value = Math.round(window.innerHeight * 0.4)
    }

    // 二维码扫描相关方法
    const startQRScan = async () => {
      try {
        showQRModal.value = true
        isScanning.value = true
        qrResult.value = ''
        
        // 等待DOM更新
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (qrVideo.value) {
          qrScanner = new QrScanner(
            qrVideo.value,
            (result) => {
              qrResult.value = result.data
              console.log('扫描到二维码:', result.data)
              
              // 解析二维码数据
              parsedQRData.value = parseQRData(result.data)
              console.log('=== 二维码扫描调试信息 ===')
              console.log('原始扫描数据:', result.data)
              console.log('解析后的数据:', parsedQRData.value)
              console.log('字段检查:')
              console.log('- 就诊卡号:', parsedQRData.value?.cardNumber)
              console.log('- 姓名:', parsedQRData.value?.name)
              console.log('- 性别:', parsedQRData.value?.gender)
              console.log('- 身高:', parsedQRData.value?.height)
              console.log('- 体重:', parsedQRData.value?.weight)
              console.log('- 目标:', parsedQRData.value?.target)
              console.log('========================')
              
              // 如果解析成功，添加到患者列表并停止扫描
              if (parsedQRData.value && parsedQRData.value.name) {
                // 先添加到患者列表（即使没有record_id）
                addPatient(parsedQRData.value)
                
                // 保存刚添加的患者引用，用于后续更新
                const addedPatient = selectedPatient.value
                
                // 如果二维码中有手机号，自动用手机号查询获取record_id
                if (parsedQRData.value.phone) {
                  console.log('📱 检测到手机号，自动查询患者信息以获取record_id:', parsedQRData.value.phone)
                  // 自动查询患者信息，传入刚添加的患者引用
                  queryPatientByPhoneFromQR(parsedQRData.value.phone, addedPatient)
                }
                
                // 停止扫描器
                if (qrScanner) {
                  qrScanner.stop()
                  qrScanner.destroy()
                  qrScanner = null
                }
                
                // 关闭扫描面板
                setTimeout(() => {
                  closeQRModal()
                  // 显示成功提示
                  showSuccessMessage(`成功添加患者: ${parsedQRData.value.name}`)
                }, 1000) // 延迟1秒显示结果，然后关闭
              }
              
              // 可以在这里添加扫描成功后的处理逻辑
            },
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
            }
          )
          
          await qrScanner.start()
        }
      } catch (error) {
        console.error('启动二维码扫描失败:', error)
        alert('无法启动摄像头，请检查权限设置')
        closeQRModal()
      }
    }

    const closeQRModal = () => {
      showQRModal.value = false
      isScanning.value = false
      
      if (qrScanner) {
        qrScanner.stop()
        qrScanner.destroy()
        qrScanner = null
      }
    }

    // 手机号查询相关方法
    const openPhoneInput = () => {
      showPhoneModal.value = true
      phoneInput.value = ''
      queryError.value = ''
    }

    const closePhoneModal = () => {
      showPhoneModal.value = false
      phoneInput.value = ''
      queryError.value = ''
    }

    const queryPatientByPhone = async () => {
      // 验证手机号格式
      if (!phoneInput.value) {
        queryError.value = '请输入手机号'
        return
      }

      if (phoneInput.value.length !== 11) {
        queryError.value = '手机号必须是11位数字'
        return
      }

      const phonePattern = /^[0-9]{11}$/
      if (!phonePattern.test(phoneInput.value)) {
        queryError.value = '手机号只能包含数字'
        return
      }

      isQuerying.value = true
      queryError.value = ''

      try {
        console.log('查询患者，手机号:', phoneInput.value)
        const response = await queryPatientAPI({ phone: phoneInput.value })
        console.log('查询结果:', response.data)
        
        // 检查响应是否成功
        const isSuccess = response.data && (
          response.data.success === true || 
          response.data.code === 200 ||
          response.status === 200 ||
          (response.data.data && Object.keys(response.data.data).length > 0)
        )
        
        if (isSuccess) {
          const data = response.data.data || response.data
          
          // 从返回的数据结构中提取患者信息
          const patientInfo = data.patient || data
          
          // 从medical_records数组中提取record_id（注意：是一个数组）
          let recordId = null
          if (data.medical_records && Array.isArray(data.medical_records) && data.medical_records.length > 0) {
            recordId = data.medical_records[0].record_id
            console.log('✅ 从medical_records中提取record_id:', recordId)
          }
          
          // 确保数据格式正确，特别注意提取record_id
          const patient = {
            cardNumber: patientInfo.cardNumber || patientInfo.card || '',
            name: patientInfo.name || '',
            phone: patientInfo.phone || phoneInput.value,
            gender: patientInfo.sex || patientInfo.gender || '',
            birthDate: patientInfo.birthday || patientInfo.birthDate || '',
            height: patientInfo.height || '',
            weight: patientInfo.weight || '',
            target: patientInfo.target || '',
            healthIndex: patientInfo.healthIndex || patientInfo.health || '',
            // 提取record_id（就诊记录ID）
            recordId: recordId || patientInfo.record_id || patientInfo.recordId || patientInfo.id
          }
          
          console.log('📋 提取的患者信息:', patient)
          if (patient.recordId) {
            console.log('✅ 已获取record_id:', patient.recordId)
          } else {
            console.warn('⚠️ 未找到record_id字段')
          }
          
          // 添加到患者列表
          addPatient(patient)
          
          // 关闭弹窗并显示成功提示
          closePhoneModal()
          showSuccessMessage(`成功查询并添加患者: ${patient.name}`)
        } else {
          queryError.value = response.data?.message || '未找到该患者信息'
        }
      } catch (error) {
        console.error('查询患者失败:', error)
        
        // 处理各种错误情况
        if (error.response) {
          const status = error.response.status
          const data = error.response.data
          
          if (status === 404) {
            queryError.value = '未找到该患者信息'
          } else if (status === 400) {
            queryError.value = data?.message || '请求参数错误'
          } else if (status === 500) {
            queryError.value = '服务器错误，请稍后再试'
          } else if (data && data.message) {
            queryError.value = data.message
          } else {
            queryError.value = `查询失败 (${status})`
          }
        } else if (error.request) {
          queryError.value = '无法连接到服务器，请检查网络或确保后端服务已启动'
        } else {
          queryError.value = error.message || '查询失败，请检查输入信息'
        }
      } finally {
        isQuerying.value = false
      }
    }

    // 从二维码扫描后自动查询患者信息（用于获取record_id）
    const queryPatientByPhoneFromQR = async (phone, patientToUpdate = null) => {
      if (!phone || phone.length !== 11) {
        console.warn('⚠️ 无效的手机号，无法查询:', phone)
        return
      }

      try {
        console.log('📱 自动查询患者信息，手机号:', phone)
        const response = await queryPatientAPI({ phone })
        console.log('📱 自动查询结果:', response.data)
        
        // 检查响应是否成功
        const isSuccess = response.data && (
          response.data.success === true || 
          response.data.code === 200 ||
          response.status === 200 ||
          (response.data.data && Object.keys(response.data.data).length > 0)
        )
        
        if (isSuccess) {
          const data = response.data.data || response.data
          
          // 从返回的数据结构中提取患者信息
          const patientInfo = data.patient || data
          
          // 从medical_records数组中提取record_id（注意：是一个数组）
          let recordId = null
          if (data.medical_records && Array.isArray(data.medical_records) && data.medical_records.length > 0) {
            recordId = data.medical_records[0].record_id
            console.log('✅ 从medical_records中提取record_id:', recordId)
          }
          
          // 确定要更新的患者：优先使用传入的患者引用，否则使用当前选中的患者
          const targetPatient = patientToUpdate || (selectedPatient.value && selectedPatient.value.phone === phone ? selectedPatient.value : null)
          
          if (targetPatient) {
            // 更新患者信息（特别是record_id）
            if (recordId) {
              targetPatient.recordId = recordId
              console.log('✅ 已更新患者的record_id:', recordId)
              
              // 如果获取到record_id，自动获取预问诊数据
              fetchPreConsultationData(recordId)
            } else {
              console.warn('⚠️ 未找到record_id字段')
            }
            
            // 同时更新患者列表中的患者信息
            const patientInList = patientList.value.find(p => p.phone === phone || (p.id && targetPatient.id && p.id === targetPatient.id))
            if (patientInList) {
              if (recordId) {
                patientInList.recordId = recordId
              }
              // 更新其他信息
              Object.assign(patientInList, {
                cardNumber: patientInfo.cardNumber || patientInfo.card || patientInList.cardNumber || '',
                name: patientInfo.name || patientInList.name || '',
                gender: patientInfo.sex || patientInfo.gender || patientInList.gender || '',
                birthDate: patientInfo.birthday || patientInfo.birthDate || patientInList.birthDate || '',
                height: patientInfo.height || patientInList.height || '',
                weight: patientInfo.weight || patientInList.weight || '',
                target: patientInfo.target || patientInList.target || '',
                healthIndex: patientInfo.healthIndex || patientInfo.health || patientInList.healthIndex || ''
              })
            }
          } else {
            console.warn('⚠️ 未找到要更新的患者')
          }
        } else {
          console.warn('⚠️ 查询患者信息失败，响应不成功')
        }
      } catch (error) {
        console.error('❌ 自动查询患者信息失败:', error)
        // 静默失败，不显示错误提示给用户
      }
    }

    // 解析二维码数据的方法
    const parseQRData = (rawData) => {
      console.log('开始解析二维码数据:', rawData)
      
      try {
        // 尝试解析JSON格式的数据
        const jsonData = JSON.parse(rawData)
        console.log('JSON解析成功:', jsonData)
        
        // 检查是否包含我们需要的字段
        if (jsonData.cardNumber || jsonData.name || jsonData.phone || jsonData.就诊卡号 || jsonData.卡号) {
          const result = {
            cardNumber: jsonData.cardNumber || jsonData.就诊卡号 || jsonData.card || jsonData.卡号 || '',
            name: jsonData.name || jsonData.姓名 || '',
            phone: jsonData.phone || jsonData.电话 || jsonData.phoneNumber || '',
            gender: jsonData.gender || jsonData.性别 || jsonData.sex || '',
            birthDate: jsonData.birthDate || jsonData.birthday || jsonData.出生年月 || jsonData.出生日期 || '',
            healthIndex: jsonData.healthIndex || jsonData.health || jsonData.体检指标 || jsonData.体格指标 || jsonData.身高体重目标 || '',
            // 分别解析身高、体重、目标
            height: jsonData.height || jsonData.身高 || jsonData.heightCm || '',
            weight: jsonData.weight || jsonData.体重 || jsonData.weightKg || '',
            target: jsonData.target || jsonData.目标 || jsonData.targetWeight || ''
          }
          console.log('JSON解析结果:', result)
          return result
        }
      } catch (error) {
        console.log('不是JSON格式，尝试其他解析方式')
      }

      // 如果不是JSON格式，尝试解析其他格式
      // 例如：卡号|姓名|电话|性别|出生年月|身高|体重|目标
      if (rawData.includes('|')) {
        const parts = rawData.split('|')
        console.log('分隔符解析，部分数量:', parts.length, '内容:', parts)
        
        if (parts.length >= 8) {
          const result = {
            cardNumber: parts[0] || '',
            name: parts[1] || '',
            phone: parts[2] || '',
            gender: parts[3] || '',
            birthDate: parts[4] || '',
            healthIndex: parts[5] || '',
            height: parts[5] || '',
            weight: parts[6] || '',
            target: parts[7] || ''
          }
          console.log('分隔符解析结果(8个字段):', result)
          return result
        } else if (parts.length >= 6) {
          const result = {
            cardNumber: parts[0] || '',
            name: parts[1] || '',
            phone: parts[2] || '',
            gender: parts[3] || '',
            birthDate: parts[4] || '',
            healthIndex: parts[5] || '',
            height: '',
            weight: '',
            target: ''
          }
          console.log('分隔符解析结果(6个字段):', result)
          return result
        }
      }

      // 尝试解析其他分隔符格式
      if (rawData.includes(',')) {
        const parts = rawData.split(',')
        console.log('逗号分隔符解析，部分数量:', parts.length, '内容:', parts)
        
        if (parts.length >= 8) {
          const result = {
            cardNumber: parts[0] || '',
            name: parts[1] || '',
            phone: parts[2] || '',
            gender: parts[3] || '',
            birthDate: parts[4] || '',
            healthIndex: parts[5] || '',
            height: parts[5] || '',
            weight: parts[6] || '',
            target: parts[7] || ''
          }
          console.log('逗号分隔符解析结果(8个字段):', result)
          return result
        } else if (parts.length >= 6) {
          const result = {
            cardNumber: parts[0] || '',
            name: parts[1] || '',
            phone: parts[2] || '',
            gender: parts[3] || '',
            birthDate: parts[4] || '',
            healthIndex: parts[5] || '',
            height: '',
            weight: '',
            target: ''
          }
          console.log('逗号分隔符解析结果(6个字段):', result)
          return result
        }
      }

      // 如果都不匹配，返回原始数据
      console.log('无法解析二维码数据')
      return null
    }

    // 患者管理相关方法
    const addPatient = (patientData) => {
      // 检查是否已存在相同卡号的患者
      const existingPatient = patientList.value.find(p => p.cardNumber === patientData.cardNumber)
      
      if (existingPatient) {
        // 如果存在，更新患者信息
        Object.assign(existingPatient, patientData)
        selectedPatient.value = existingPatient
        console.log('更新患者信息:', existingPatient)
        // 如果患者有recordId，自动获取预问诊数据
        if (existingPatient.recordId) {
          fetchPreConsultationData(existingPatient.recordId)
        }
      } else {
        // 如果不存在，添加新患者
        const newPatient = {
          id: Date.now() + Math.random(), // 生成唯一ID
          ...patientData,
          scanTime: new Date().toLocaleString() // 添加扫描时间
        }
        patientList.value.unshift(newPatient) // 添加到列表开头
        selectedPatient.value = newPatient
        console.log('添加新患者:', newPatient)
        // 如果患者有recordId，自动获取预问诊数据
        if (newPatient.recordId) {
          fetchPreConsultationData(newPatient.recordId)
        }
      }
    }

    // 格式化性别：将英文转换为中文，并去除空白字符
    const formatGender = (gender) => {
      if (!gender) return ''
      // 去除前后空格
      const trimmed = gender.trim().toUpperCase()
      if (trimmed === 'MALE' || trimmed === 'M') {
        return '男'
      } else if (trimmed === 'FEMALE' || trimmed === 'F') {
        return '女'
      }
      // 如果已经是中文或未知格式，去除空格后返回
      return gender.trim()
    }

    const selectPatient = (patient) => {
      selectedPatient.value = patient
      showPatientDetail.value = true
      console.log('选中患者:', patient)
      // 如果患者有recordId，自动获取预问诊数据
      if (patient.recordId) {
        fetchPreConsultationData(patient.recordId)
      }
    }

    // 获取预问诊数据
    const fetchPreConsultationData = async (recordId) => {
      if (!recordId) {
        console.warn('⚠️ 缺少recordId，无法获取预问诊数据')
        return
      }

      // 如果已经加载过该患者的数据，不再重复加载
      if (preConsultationData.value[recordId]) {
        console.log('✅ 预问诊数据已存在，跳过加载:', recordId)
        return
      }

      // 设置加载状态
      preConsultationLoading.value[recordId] = true
      preConsultationError.value[recordId] = ''

      try {
        console.log('📋 开始获取预问诊数据，recordId:', recordId)
        const response = await getPreConsultationData(recordId)
        
        console.log('✅ 预问诊数据获取成功 - 完整response:', response)
        console.log('✅ response.data:', response.data)
        console.log('✅ response.data.data:', response.data?.data)
        
        // 打印 pre_diagnosis 对象的完整内容和所有键
        const preDiagnosis = response.data?.data?.pre_diagnosis
        console.log('✅ pre_diagnosis 对象:', preDiagnosis)
        console.log('✅ pre_diagnosis 的所有键:', preDiagnosis ? Object.keys(preDiagnosis) : 'null')
        
        // 根据test.md，diagnosis_result 在 sanzhen_result 对象内
        // 路径: response.data.data.pre_diagnosis.sanzhen_result.diagnosis_result
        let sanzhenResult = preDiagnosis?.sanzhen_result
        console.log('✅ sanzhen_result 原始值:', sanzhenResult)
        console.log('✅ sanzhen_result 类型:', typeof sanzhenResult)
        
        // 如果 sanzhen_result 是字符串（JSON字符串），尝试解析
        if (typeof sanzhenResult === 'string') {
          try {
            sanzhenResult = JSON.parse(sanzhenResult)
            console.log('✅ 解析后的 sanzhen_result:', sanzhenResult)
          } catch (e) {
            console.warn('⚠️ 无法解析 sanzhen_result 为JSON:', e)
          }
        }
        
        console.log('✅ sanzhen_result 对象:', sanzhenResult)
        console.log('✅ sanzhen_result 的所有键:', sanzhenResult && typeof sanzhenResult === 'object' ? Object.keys(sanzhenResult) : 'null')
        
        // 尝试多种可能的路径
        let diagnosisResult = null
        
        // 路径1: response.data.data.pre_diagnosis.sanzhen_result.diagnosis_result (根据test.md的结构)
        if (sanzhenResult && typeof sanzhenResult === 'object' && sanzhenResult.diagnosis_result !== undefined && sanzhenResult.diagnosis_result !== null) {
          diagnosisResult = sanzhenResult.diagnosis_result
          console.log('📋 使用路径1 (response.data.data.pre_diagnosis.sanzhen_result.diagnosis_result)')
        }
        // 路径2: response.data.data.pre_diagnosis.diagnosis_result (如果直接存在)
        else if (preDiagnosis?.diagnosis_result !== undefined && preDiagnosis?.diagnosis_result !== null) {
          diagnosisResult = preDiagnosis.diagnosis_result
          console.log('📋 使用路径2 (response.data.data.pre_diagnosis.diagnosis_result)')
        }
        // 路径3: response.data.pre_diagnosis.diagnosis_result (如果API直接返回data字段的内容)
        else if (response.data?.pre_diagnosis?.diagnosis_result !== undefined && response.data?.pre_diagnosis?.diagnosis_result !== null) {
          diagnosisResult = response.data.pre_diagnosis.diagnosis_result
          console.log('📋 使用路径3 (response.data.pre_diagnosis.diagnosis_result)')
        }
        else {
          console.warn('⚠️ 无法找到 diagnosis_result 字段')
          console.warn('⚠️ pre_diagnosis 的所有字段:', preDiagnosis ? Object.keys(preDiagnosis) : 'null')
          console.warn('⚠️ sanzhen_result 的所有字段:', sanzhenResult && typeof sanzhenResult === 'object' ? Object.keys(sanzhenResult) : 'null')
        }
        
        console.log('📋 最终提取的 diagnosis_result:', diagnosisResult)
        console.log('📋 diagnosis_result 类型:', typeof diagnosisResult)
        
        // 处理 diagnosis_result：如果是对象，转换为字符串；如果是字符串，直接使用
        let diagnosisResultText = ''
        if (diagnosisResult) {
          if (typeof diagnosisResult === 'string') {
            diagnosisResultText = diagnosisResult
          } else if (typeof diagnosisResult === 'object') {
            // 如果是对象，尝试转换为格式化的字符串
            diagnosisResultText = JSON.stringify(diagnosisResult, null, 2)
          } else {
            diagnosisResultText = String(diagnosisResult)
          }
        }
        
        console.log('📋 处理后的 diagnosis_result 文本:', diagnosisResultText)
        
        // 存储预问诊数据（只存储 diagnosis_result 字段的文本内容）
        preConsultationData.value[recordId] = diagnosisResultText
      } catch (error) {
        console.error('❌ 获取预问诊数据失败:', error)
        
        // 存储错误信息
        if (error.response) {
          const status = error.response.status
          const data = error.response.data
          
          if (status === 401) {
            preConsultationError.value[recordId] = '认证失败，请重新登录'
          } else if (status === 404) {
            preConsultationError.value[recordId] = '未找到预问诊数据'
          } else if (status === 500) {
            preConsultationError.value[recordId] = '服务器错误，请稍后再试'
          } else {
            preConsultationError.value[recordId] = data?.message || `请求失败 (${status})`
          }
        } else if (error.request) {
          preConsultationError.value[recordId] = '无法连接到服务器，请检查网络'
        } else {
          preConsultationError.value[recordId] = error.message || '获取预问诊数据失败'
        }
      } finally {
        // 清除加载状态
        preConsultationLoading.value[recordId] = false
      }
    }

    const deletePatient = (patientId) => {
      if (confirm('确定要删除这个患者吗？')) {
        const index = patientList.value.findIndex(p => p.id === patientId)
        if (index > -1) {
          patientList.value.splice(index, 1)
          // 如果删除的是当前选中的患者，清空选中状态
          if (selectedPatient.value?.id === patientId) {
            selectedPatient.value = null
          }
          console.log('删除患者:', patientId)
        }
      }
    }

    // 显示成功提示
    const showSuccessMessage = (message) => {
      successMessage.value = message
      showSuccessToast.value = true
      
      // 3秒后自动隐藏
      setTimeout(() => {
        showSuccessToast.value = false
      }, 3000)
    }

    // 关闭患者详情右侧边栏
    const closePatientDetail = () => {
      showPatientDetail.value = false
    }

    // 计算AI诊断面板高度，用于右侧边栏兼容
    const aiPanelHeight = computed(() => {
      if (showAIDiagnosisModal.value && !isDiagnosisPanelMinimized.value) {
        return diagnosisPanelHeight.value
      }
      return 0
    })

    // 检查当前患者是否有保存的诊断建议
    const hasSavedDiagnosis = computed(() => {
      if (!selectedPatient.value?.recordId) return false
      const savedDiagnoses = getSavedDiagnoses()
      return savedDiagnoses.hasOwnProperty(selectedPatient.value.recordId)
    })

    // 为选中患者开始录音
    const startRecordingForPatient = () => {
      closePatientDetail()
      // 开始录音
      toggleRecording()
    }

    // 诊断建议保存相关方法
    const getSavedDiagnoses = () => {
      try {
        const saved = localStorage.getItem('savedDiagnoses')
        return saved ? JSON.parse(saved) : {}
      } catch (error) {
        console.error('获取保存的诊断建议失败:', error)
        return {}
      }
    }

    const saveDiagnosisToStorage = (recordId, diagnosisData) => {
      try {
        const savedDiagnoses = getSavedDiagnoses()
        savedDiagnoses[recordId] = {
          ...diagnosisData,
          patientName: selectedPatient.value?.name || '未知患者',
          savedAt: new Date().toISOString(),
          recordId: recordId
        }
        localStorage.setItem('savedDiagnoses', JSON.stringify(savedDiagnoses))
        return true
      } catch (error) {
        console.error('保存诊断建议失败:', error)
        return false
      }
    }

    const getSavedDiagnosisByRecordId = (recordId) => {
      try {
        const savedDiagnoses = getSavedDiagnoses()
        return savedDiagnoses[recordId] || null
      } catch (error) {
        console.error('获取保存的诊断建议失败:', error)
        return null
      }
    }

    // 保存诊断建议
    const saveDiagnosisSuggestion = async () => {
      if (!selectedPatient.value?.recordId) {
        showSaveMessage('请先选择患者', 'error')
        return
      }

      if (!aiDiagnosisResult.value && !aiDiagnosisParsed.value) {
        showSaveMessage('没有可保存的诊断建议', 'error')
        return
      }

      isSavingDiagnosis.value = true
      saveDiagnosisMessage.value = ''

      try {
        const diagnosisData = {
          result: aiDiagnosisResult.value,
          parsed: aiDiagnosisParsed.value,
          finalResult: finalResult.value, // 保存转写结果
          timestamp: new Date().toISOString()
        }

        const success = saveDiagnosisToStorage(selectedPatient.value.recordId, diagnosisData)
        
        if (success) {
          showSaveMessage('诊断建议保存成功！', 'success')
          // 3秒后清除消息
          setTimeout(() => {
            saveDiagnosisMessage.value = ''
          }, 3000)
        } else {
          showSaveMessage('保存失败，请重试', 'error')
        }
      } catch (error) {
        console.error('保存诊断建议时出错:', error)
        showSaveMessage('保存失败，请重试', 'error')
      } finally {
        isSavingDiagnosis.value = false
      }
    }

    // 显示保存消息
    const showSaveMessage = (message, type) => {
      saveDiagnosisMessage.value = message
      saveDiagnosisMessageType.value = type
    }

    // 显示已保存的诊断建议
    const showSavedDiagnosis = () => {
      if (!selectedPatient.value?.recordId) return

      const savedDiagnosis = getSavedDiagnosisByRecordId(selectedPatient.value.recordId)
      if (!savedDiagnosis) {
        showSaveMessage('未找到保存的诊断建议', 'error')
        return
      }

      // 恢复诊断数据
      aiDiagnosisResult.value = savedDiagnosis.result || ''
      aiDiagnosisParsed.value = savedDiagnosis.parsed || null
      finalResult.value = savedDiagnosis.finalResult || ''
      
      // 显示AI诊断面板
      showAIDiagnosisModal.value = true
      isDiagnosisPanelMinimized.value = false
      
      // 关闭患者详情边栏
      closePatientDetail()
      
      showSaveMessage(`已加载 ${savedDiagnosis.patientName} 的诊断建议`, 'success')
      setTimeout(() => {
        saveDiagnosisMessage.value = ''
      }, 3000)
    }

    // 退出登录
    const handleLogout = () => {
      if (confirm('确定要退出登录吗？')) {
        // 清除登录状态
        sessionStorage.removeItem('isAuthenticated')
        sessionStorage.removeItem('userInfo')
        // 跳转到登录页
        router.push('/login')
      }
    }

    // 生命周期
    onMounted(() => {
      // 获取用户信息
      const userInfo = sessionStorage.getItem('userInfo')
      if (userInfo) {
        try {
          const user = JSON.parse(userInfo)
          currentUser.value = user.username || user.name || ''
        } catch (e) {
          console.error('解析用户信息失败:', e)
        }
      }
      
      // 初始化录音器
      // 在Vite中，public/目录下的文件在开发和生产环境都位于根路径
      // processor.worker.js 和 processor.worklet.js 应该可以通过根路径访问
      if (typeof RecorderManager === 'undefined') {
        console.error('❌ RecorderManager未加载，请检查index.html中的script标签')
        alert('录音管理器未加载，请刷新页面重试')
        return
      }
      
      // 根据环境动态确定processorPath
      // processor.worker.js 在根目录 /processor.worker.js
      // 根据README，如果访问地址 /a/b/c/processor.worker.js，则processorPath为 /a/b/c
      // 因此如果文件在 /processor.worker.js，processorPath应该是 '/'
      // 但从错误信息看，可能RecorderManager在构造Worker时路径处理有问题
      // 尝试多种路径策略
      
      console.log('🎤 初始化RecorderManager')
      console.log('📍 当前页面路径:', window.location.pathname)
      console.log('📍 当前origin:', window.location.origin)
      console.log('🔍 环境:', import.meta.env.MODE, '生产环境:', import.meta.env.PROD)
      console.log('📦 RecorderManager版本/类型:', typeof RecorderManager)
      
      // 尝试多种路径策略
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
        console.error('错误详情:', lastError?.message)
        console.error('错误堆栈:', lastError?.stack)
        alert(`录音器初始化失败，请检查worker文件是否可访问。\n错误: ${lastError?.message || '未知错误'}`)
      }
      
      // 添加测试数据（开发时使用）
      if (process.env.NODE_ENV === 'development') {
        console.log('测试二维码数据格式:')
        console.log('JSON格式:', JSON.stringify({
          cardNumber: '1234567890',
          name: '张三',
          phone: '13800138000',
          gender: '男',
          birthDate: '1990-01-01',
          height: '175',
          weight: '70',
          target: '65'
        }))
        console.log('分隔符格式:', '1234567890|张三|13800138000|男|1990-01-01|175|70|65')
        console.log('中文字段JSON格式:', JSON.stringify({
          就诊卡号: '1234567890',
          姓名: '张三',
          电话: '13800138000',
          性别: '男',
          出生年月: '1990-01-01',
          身高: '175',
          体重: '70',
          目标: '65'
        }))
      }
      
      recorder.onStart = () => {
        console.log('✅ 录音开始')
        changeBtnStatus('OPEN')
      }

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
          console.warn('⚠️ WebSocket未打开，无法发送音频数据。状态:', iatWS ? iatWS.readyState : '未初始化')
        }
      }

      recorder.onStop = () => {
        console.log('🛑 录音停止')
        clearInterval(countdownInterval)
      }
    })

    onUnmounted(() => {
      if (iatWS) {
        iatWS.close()
      }
      if (recorder) {
        recorder.stop()
      }
      if (qrScanner) {
        qrScanner.stop()
        qrScanner.destroy()
      }
      clearInterval(countdownInterval)
    })

    return {
      btnStatus,
      realtimeResult,
      finalResult,
      buttonText,
      statusText,
      statusDotClass,
      isConnecting,
      showModal,
      toggleRecording,
      closeModal,
      handleAIDiagnosis,
      // 二维码扫描相关
      showQRModal,
      isScanning,
      qrResult,
      parsedQRData,
      qrVideo,
      qrButtonText,
      startQRScan,
      closeQRModal,
      // 手机号查询相关
      showPhoneModal,
      phoneInput,
      isQuerying,
      queryError,
      phoneButtonText,
      openPhoneInput,
      closePhoneModal,
      queryPatientByPhone,
      // 患者列表相关
      patientList,
      selectedPatient,
      selectPatient,
      deletePatient,
      formatGender,
      // 成功提示相关
      showSuccessToast,
      successMessage,
      // 患者详情右侧边栏相关
      showPatientDetail,
      closePatientDetail,
      startRecordingForPatient,
      aiPanelHeight,
      hasSavedDiagnosis,
      // 诊断建议保存相关
      isSavingDiagnosis,
      saveDiagnosisMessage,
      saveDiagnosisMessageType,
      saveDiagnosisSuggestion,
      showSavedDiagnosis,
      // AI诊断相关
      showAIDiagnosisModal,
      isAIRequesting,
      aiDiagnosisResult,
      aiDiagnosisError,
      aiDiagnosisParsed,
      closeAIDiagnosisModal,
      parseAIDiagnosis,
      toggleDiagnosisPanel,
      startDiagnosisResize,
      isDiagnosisPanelMinimized,
      currentDiagnosisTab,
      diagnosisPanelHeight,
      diagnosisTabs,
      // 用户信息相关
      currentUser,
      handleLogout,
      // Tab切换相关
      activeTab,
      tabs,
      renderedExercisePrescription,
      // 预问诊数据相关
      preConsultationData,
      preConsultationLoading,
      preConsultationError,
      fetchPreConsultationData
    }
  }
}
</script>

<style scoped>
.app {
  background-color: #ffffff;
  color: #333333;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: row;
  padding: 0;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 800px;
  width: 100%;
  padding: 20px;
}

.record-button {
  background: white;
  border: 2px solid #2563EB;
  border-radius: 6px;
  color: #2563EB;
  font-size: 1rem;
  font-weight: 600;
  padding: 12px 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
  transition: all 0.2s ease;
  margin-bottom: 1rem;
  width: 200px;
  min-width: 200px;
}

.record-button:hover:not(:disabled) {
  background: #2563EB;
  color: white;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

.record-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #e0e0e0 !important; /* 禁用时背景变灰 */
  border-color: #b0b0b0 !important; /* 禁用时边框变灰 */
  color: #888888 !important; /* 禁用时文字变灰 */
}

/* 输入手机号按钮样式 */
.phone-button {
  background: white;
  border: 2px solid #2563EB;
  border-radius: 6px;
  color: #2563EB;
  font-size: 1rem;
  font-weight: 600;
  padding: 12px 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
  transition: all 0.2s ease;
  margin-bottom: 1rem;
  width: 200px;
  min-width: 200px;
}

.phone-button:hover:not(:disabled) {
  background: #2563EB;
  color: white;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

.phone-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* AI诊断按钮样式 */
.ai-diagnosis-button {
  background: white;
  border: 2px solid #2563EB;
  border-radius: 6px;
  color: #2563EB;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 10px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
  transition: all 0.2s ease;
  margin-top: 20px;
  width: 180px;
  min-width: 180px;
}

.ai-diagnosis-button:hover:not(:disabled) {
  background: #2563EB;
  color: white;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

.ai-diagnosis-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spinner-small {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2rem;
  font-size: 0.9rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.status-dot.disconnected {
  background-color: #6B7280;
  border: 2px solid #4B5563;
}

.status-dot.connecting {
  background-color: #F59E0B;
  border: 2px solid #D97706;
}

.status-dot.connected {
  background-color: #059669;
  border: 2px solid #047857;
}

.text-areas {
  display: flex;
  gap: 20px;
  width: 100%;
  max-width: 600px;
}

.text-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.text-area-label {
  color: #333333;
  font-size: 0.9rem;
  margin-bottom: 8px;
  font-weight: 500;
}

.text-area-content {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  height: 150px; /* 固定高度，确保两个框高度一致 */
  min-height: 120px;
  max-height: 150px; /* 最大高度限制 */
  color: #333;
  font-size: 0.9rem;
  line-height: 1.5;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-y: auto; /* 内容超出时显示垂直滚动条 */
  overflow-x: hidden; /* 隐藏水平滚动条 */
}

@media (max-width: 768px) {
  .text-areas {
    flex-direction: column;
  }
  
  .text-area-content {
    height: 120px; /* 移动端固定高度 */
    max-height: 120px;
  }
}

/* 转写面板占位区域样式（未显示面板时显示按钮） */
.transcription-placeholder {
  position: fixed;
  bottom: 0;
  left: 300px; /* 从左侧边栏右边开始，不覆盖侧边栏 */
  right: 0;
  height: 35vh; /* 占据屏幕下方35%的高度 */
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50; /* 低于转写面板的z-index */
}

/* 转写面板样式 */
.transcription-panel {
  position: fixed;
  bottom: 0;
  left: 300px; /* 从左侧边栏右边开始，不覆盖侧边栏 */
  right: 0;
  height: 35vh; /* 占据屏幕下方35%的高度 */
  background: white;
  border-top: 3px solid #2563EB;
  box-shadow: 0 -2px 8px rgba(37, 99, 235, 0.1);
  z-index: 100;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 3px solid #1E40AF;
  background: #2563EB;
  color: white;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.panel-body {
  padding: 20px;
  height: calc(100% - 60px); /* 减去header的高度 */
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.panel-body .text-areas {
  max-width: none;
  width: 100%;
}

.panel-body .text-area-content {
  min-height: 80px;
  max-height: 120px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .panel-body .text-areas {
    flex-direction: column;
  }
  
  .panel-body .text-area-content {
    min-height: 60px;
    max-height: 80px;
  }
}

/* 二维码扫描按钮样式 */
.qr-button {
  background: white;
  border: 2px solid #2563EB;
  border-radius: 6px;
  color: #2563EB;
  font-size: 1rem;
  font-weight: 600;
  padding: 12px 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
  transition: all 0.2s ease;
  margin-bottom: 1rem;
  width: 200px;
  min-width: 200px;
}

.qr-button:hover:not(:disabled) {
  background: #2563EB;
  color: white;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

.qr-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 二维码扫描面板样式 */
.qr-scan-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 200;
  display: flex;
  flex-direction: column;
}

.qr-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #2563EB;
  color: white;
  border-bottom: 3px solid #1E40AF;
}

.qr-panel-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.qr-panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.qr-scanner-container {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.qr-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

.qr-frame {
  width: 250px;
  height: 250px;
  border: 3px solid #4CAF50;
  border-radius: 6px;
  position: relative;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}

.qr-frame::before,
.qr-frame::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid #4CAF50;
}

.qr-frame::before {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
}

.qr-frame::after {
  bottom: -3px;
  right: -3px;
  border-left: none;
  border-top: none;
}

.qr-hint {
  color: white;
  font-size: 1rem;
  margin-top: 20px;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 6px;
}

.qr-result {
  margin-top: 20px;
  background: white;
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-result h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 1.1rem;
}

.qr-result-content {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 15px;
  color: #333;
  font-size: 0.9rem;
  line-height: 1.5;
  word-break: break-all;
  border: 1px solid #e0e0e0;
  margin-bottom: 15px;
}

.parsed-data {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 15px;
  border: 1px solid #e0e0e0;
}

.parsed-data h5 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.data-label {
  font-weight: 500;
  color: #666;
  font-size: 0.9rem;
}

.data-value {
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .qr-frame {
    width: 200px;
    height: 200px;
  }
  
  .qr-hint {
    font-size: 0.9rem;
    padding: 8px 16px;
  }
  
  .qr-result {
    padding: 15px;
  }
}

/* 患者列表样式 */
.patient-sidebar {
  width: 300px;
  background: #f8f9fa;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  background: #2563EB;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 3px solid #1E40AF;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.patient-count {
  background: white;
  color: #2563EB;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid #1E40AF;
}

.user-info-bar {
  padding: 12px 15px;
  background: #F8FAFC;
  border-bottom: 2px solid #E2E8F0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2563EB;
  border: 2px solid #1E40AF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  background: white;
  color: #DC2626;
  border: 2px solid #DC2626;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.logout-btn:hover {
  background: #DC2626;
  color: white;
}

.patient-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.patient-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 6px;
  border: 2px solid #E2E8F0;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.patient-item:hover {
  border-color: #2563EB;
  background: #F8FAFC;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
}

.patient-item.active {
  border-color: #2563EB;
  background: #EFF6FF;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);
}

.patient-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #2563EB;
  border: 2px solid #1E40AF;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  margin-right: 12px;
  flex-shrink: 0;
}

.patient-info {
  flex: 1;
  min-width: 0;
}

.patient-name {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patient-details {
  display: flex;
  gap: 8px;
  font-size: 0.8rem;
  color: #666;
}

.patient-card {
  background: #F1F5F9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  border: 1px solid #E2E8F0;
  color: #475569;
}

.patient-gender {
  background: #F1F5F9;
  padding: 2px 6px;
  border-radius: 4px;
  color: #475569;
  border: 1px solid #E2E8F0;
}

.patient-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.patient-item:hover .patient-actions {
  opacity: 1;
}

.delete-btn {
  background: white;
  color: #DC2626;
  border: 2px solid #DC2626;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: #DC2626;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* 侧边栏底部按钮区域 */
.sidebar-footer-buttons {
  padding: 15px;
  border-top: 2px solid #E2E8F0;
  background: #F8FAFC;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.sidebar-footer-buttons .qr-button,
.sidebar-footer-buttons .phone-button {
  width: 100%;
  margin-bottom: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 35vh); /* 高度到转写面板占位区域为止 */
  overflow: hidden;
}

/* Tab容器样式 */
.tab-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* Tab导航栏样式 */
.tab-nav {
  display: flex;
  border-bottom: 2px solid #E2E8F0;
  background: #F8FAFC;
  padding: 0;
  flex-shrink: 0;
}

.tab-button {
  width: 150px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: #666;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.tab-button:hover {
  background: #F1F5F9;
  color: #2563EB;
}

.tab-button.active {
  color: #2563EB;
  border-bottom-color: #2563EB;
  background: white;
  font-weight: 600;
}

/* Tab内容区域样式 */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px 0 20px; /* 移除底部padding，让内容区域底部紧贴下边框上边缘 */
  background: white;
}

.tab-panel {
  height: 100%;
}

.pre-consultation-content {
  height: 100%;
}

/* 预问诊数据展示样式 */
.empty-state-message {
  text-align: center;
  padding: 40px 20px;
  color: #666;
  font-size: 0.95rem;
}

.pre-consultation-data {
  width: 100%;
  height: 100%;
}

.pre-consultation-text {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 1rem;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: calc(100vh - 35vh - 200px); /* 确保内容至少占满可用空间 */
  overflow-y: auto;
  overflow-x: hidden;
}

/* 主内容区域中诊断相关的样式 */
.tab-content .save-diagnosis-section {
  margin-top: 20px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.tab-content .save-diagnosis-button {
  background: white;
  border: 2px solid #059669;
  border-radius: 6px;
  color: #059669;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 12px 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(5, 150, 105, 0.1);
  transition: all 0.2s ease;
  width: 100%;
}

.tab-content .save-diagnosis-button:hover:not(:disabled) {
  background: #059669;
  color: white;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2);
}

.tab-content .save-diagnosis-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.tab-content .save-message {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
  font-weight: 500;
}

.tab-content .save-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.tab-content .save-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* 成功提示样式 */
.success-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  animation: slideInRight 0.3s ease-out;
}

.toast-content {
  background: #059669;
  color: white;
  padding: 16px 20px;
  border-radius: 6px;
  border: 2px solid #047857;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 300px;
}

.toast-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.toast-message {
  font-size: 0.95rem;
  font-weight: 500;
  flex: 1;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 手机号输入弹窗样式 */
.phone-input-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.phone-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.phone-modal-content {
  position: relative;
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.phone-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 3px solid #1E40AF;
  background: #2563EB;
  color: white;
  border-radius: 6px 6px 0 0;
}

.phone-modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.phone-modal-body {
  padding: 24px;
}

.phone-input-group {
  margin-bottom: 24px;
}

.phone-input-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 0.95rem;
}

.phone-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.phone-input:focus {
  outline: none;
  border-color: #667eea;
}

.phone-modal-actions {
  display: flex;
  gap: 12px;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.confirm-btn {
  background: white;
  color: #2563EB;
  border: 2px solid #2563EB;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
}

.confirm-btn:hover:not(:disabled) {
  background: #2563EB;
  color: white;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.query-error {
  margin-top: 12px;
  padding: 12px;
  background: #ffeaea;
  color: #e74c3c;
  border-radius: 8px;
  font-size: 0.9rem;
  text-align: center;
}

/* 患者详情右侧边栏样式 */
.patient-detail-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: white;
  border-left: 1px solid #e0e0e0;
  box-shadow: -5px 0 20px rgba(0, 0, 0, 0.1);
  z-index: 200;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease-out;
  transition: height 0.3s ease;
}

.patient-detail-sidebar.with-ai-panel {
  height: calc(100vh - var(--ai-panel-height, 0px));
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.patient-detail-sidebar .sidebar-header {
  background: #2563EB;
  color: white;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  border-bottom: 3px solid #1E40AF;
}

.patient-detail-sidebar .sidebar-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.patient-detail-sidebar .sidebar-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.patient-detail-sidebar .patient-avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #2563EB;
  border: 3px solid #1E40AF;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 2rem;
  margin: 0 auto 24px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
}

.patient-detail-sidebar .patient-detail-grid {
  display: grid;
  gap: 20px;
}

.patient-detail-sidebar .detail-section {
  background: #F8FAFC;
  border-radius: 6px;
  padding: 16px;
  border: 2px solid #E2E8F0;
}

.patient-detail-sidebar .detail-section h4 {
  margin: 0 0 12px 0;
  color: #1E40AF;
  font-size: 1rem;
  font-weight: 700;
  padding-bottom: 8px;
  border-bottom: 3px solid #2563EB;
}

.patient-detail-sidebar .detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.patient-detail-sidebar .detail-item:last-child {
  border-bottom: none;
}

.patient-detail-sidebar .detail-label {
  font-weight: 500;
  color: #666;
  font-size: 0.9rem;
  min-width: 80px;
  flex-shrink: 0;
}

.patient-detail-sidebar .detail-value {
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: right;
  flex: 1;
  word-break: break-all;
  margin-left: 12px;
}

.patient-detail-sidebar .sidebar-footer {
  padding: 20px 24px;
  background: #f5f5f5;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 3px solid #000;
  flex-shrink: 0;
}

.patient-detail-sidebar .btn-secondary {
  background: white;
  color: #6B7280;
  border: 2px solid #9CA3AF;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.patient-detail-sidebar .btn-secondary:hover {
  background: #6B7280;
  color: white;
}

.patient-detail-sidebar .btn-primary {
  background: white;
  color: #2563EB;
  border: 2px solid #2563EB;
  border-radius: 6px;
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
}

  .patient-detail-sidebar .btn-primary:hover {
    background: #2563EB;
    color: white;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
  }

  .patient-detail-sidebar .btn-info {
    background: white;
    color: #059669;
    border: 2px solid #059669;
    border-radius: 6px;
    padding: 10px 20px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(5, 150, 105, 0.1);
  }

  .patient-detail-sidebar .btn-info:hover {
    background: #059669;
    color: white;
    box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2);
  }

/* 响应式设计 */
@media (max-width: 1200px) {
  .patient-detail-sidebar {
    width: 350px;
  }
}

@media (max-width: 768px) {
  .patient-detail-sidebar {
    width: 100%;
    right: 0;
    left: 0;
  }
  
  .patient-detail-sidebar .sidebar-body {
    padding: 16px;
  }
  
  .patient-detail-sidebar .patient-avatar-large {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
    margin-bottom: 16px;
  }
  
  .patient-detail-sidebar .detail-section {
    padding: 12px;
  }
  
  .patient-detail-sidebar .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .patient-detail-sidebar .detail-value {
    text-align: left;
    margin-left: 0;
  }
  
  .patient-detail-sidebar .sidebar-footer {
    padding: 16px;
    flex-direction: column;
  }
  
  .patient-detail-sidebar .btn-secondary,
  .patient-detail-sidebar .btn-primary {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .patient-detail-sidebar {
    width: 100%;
    height: 100vh;
  }
  
  .patient-detail-sidebar.with-ai-panel {
    height: calc(100vh - var(--ai-panel-height, 0px));
  }
}

/* AI诊断底部栏样式 */
.ai-diagnosis-panel {
  position: fixed;
  bottom: 0;
  left: 300px; /* 从左侧边栏右边开始，不覆盖侧边栏 */
  right: 0;
  background: white;
  border-top: 3px solid #667eea;
  box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  animation: slideUp 0.3s ease-out;
  display: flex;
  flex-direction: column;
}

.ai-diagnosis-panel .panel-resizer {
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
  z-index: 2;
}

.ai-diagnosis-panel .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 3px solid #1E40AF;
  background: #2563EB;
  color: white;
}

.ai-diagnosis-panel .panel-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.ai-diagnosis-panel .panel-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-diagnosis-panel .minimize-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 6px;
  transition: background-color 0.3s ease;
  min-width: 40px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-diagnosis-panel .minimize-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.ai-diagnosis-panel .panel-minimized {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
}

.ai-diagnosis-panel .panel-minimized button {
  background: white;
  color: #2563EB;
  border: 2px solid #2563EB;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-diagnosis-panel .panel-minimized button:hover {
  background: #2563EB;
  color: white;
}

.ai-diagnosis-panel .panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  /* 覆盖通用 .panel-body 的居中设置，保证内容拉伸占满宽度 */
  align-items: stretch;
}

.ai-diagnosis-panel .diagnosis-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ai-diagnosis-panel .tab-buttons {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 16px;
}

.ai-diagnosis-panel .tab-button {
  background: none;
  border: none;
  padding: 12px 20px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  top: 2px;
}

.ai-diagnosis-panel .tab-button.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.ai-diagnosis-panel .tab-button:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

/* 保存诊断建议按钮样式 */
.ai-diagnosis-panel .save-diagnosis-section {
  margin-bottom: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.ai-diagnosis-panel .save-diagnosis-button {
  background: white;
  border: 2px solid #059669;
  border-radius: 6px;
  color: #059669;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 12px 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(5, 150, 105, 0.1);
  transition: all 0.2s ease;
  width: 100%;
}

.ai-diagnosis-panel .save-diagnosis-button:hover:not(:disabled) {
  background: #059669;
  color: white;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2);
}

.ai-diagnosis-panel .save-diagnosis-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.ai-diagnosis-panel .save-message {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  text-align: center;
  font-weight: 500;
}

.ai-diagnosis-panel .save-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.ai-diagnosis-panel .save-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.ai-diagnosis-panel .tab-content {
  flex: 1;
  overflow-y: auto;
  padding-top: 12px; /* 统一顶部间距，四个Tab保持一致 */
  /* 防止被全局容器样式压缩宽度或被居中 */
  max-width: none;
  margin: 0;
  display: block;
}

.ai-diagnosis-panel .tab-panel {
  padding: 8px 0;
  width: 100%; /* 面板占满父容器宽度 */
  max-width: none;
  display: block;
}

.ai-diagnosis-panel .tab-panel h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container p {
  color: #666;
  font-size: 0.95rem;
  margin: 0;
}

.diagnosis-result {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  width: 100%; /* 统一宽度避免在部分Tab中居中变窄 */
  max-width: none;
  margin: 0; /* 避免被通用卡片样式设置成 margin: 0 auto */
  box-sizing: border-box;
}

.result-content {
  color: #333;
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Markdown 渲染内容样式 */
.markdown-content {
  color: #333;
  font-size: 0.95rem;
  line-height: 1.8;
  word-wrap: break-word;
  padding-left: 16px; /* 增加左侧padding，让内容往右移动，避免在平板上超出内容区域 */
  padding-right: 16px; /* 保持右侧对称 */
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  font-weight: 600;
  color: #2c3e50;
}

.markdown-content h1 {
  font-size: 1.5em;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 0.5em;
}

.markdown-content h2 {
  font-size: 1.3em;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.3em;
}

.markdown-content h3 {
  font-size: 1.1em;
}

.markdown-content p {
  margin: 0.8em 0;
}

.markdown-content ul,
.markdown-content ol {
  margin: 0.8em 0;
  padding-left: 2.5em; /* 增加列表左侧padding，确保圆点和数据不会超出内容区域 */
}

.markdown-content li {
  margin: 0.4em 0;
}

.markdown-content strong {
  font-weight: 600;
  color: #2c3e50;
}

.markdown-content em {
  font-style: italic;
}

.markdown-content code {
  background-color: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  background-color: #f4f4f4;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-content pre code {
  background-color: transparent;
  padding: 0;
}

.markdown-content blockquote {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  margin: 1em 0;
  color: #666;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.error-message {
  color: #e74c3c;
  font-size: 0.95rem;
  text-align: center;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .app {
    flex-direction: column;
  }
  
  .patient-sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .patient-list {
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 10px;
  }
  
  .patient-item {
    min-width: 200px;
    margin-right: 8px;
    margin-bottom: 0;
  }
  
  .main-content {
    flex: 1;
    height: calc(100vh - 200px - 35vh); /* 移动端调整高度 */
  }
  
  .tab-button {
    width: auto;
    min-width: 120px;
    padding: 10px 16px;
    font-size: 0.9rem;
  }
  
  .tab-content {
    padding: 15px;
  }
  
  .transcription-placeholder {
    left: 0; /* 移动端侧边栏为全宽，占位区域也全宽显示 */
  }
  
  .transcription-panel {
    left: 0; /* 移动端侧边栏为全宽，转写面板也全宽显示 */
  }
  
  .ai-diagnosis-panel {
    left: 0; /* 移动端侧边栏为全宽，AI诊断面板也全宽显示 */
  }
}
</style>

