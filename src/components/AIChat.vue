<script setup>
import { ref, nextTick, watch } from 'vue'
import { callAI, buildContextPrompt } from '../services/ai'

const props = defineProps({
  node: Object,
  mode: {
    type: String,
    default: 'knowledge' // knowledge, homework, suggestion
  }
})

const emit = defineEmits(['close'])

const messages = ref([])
const input = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)

const modeLabels = {
  knowledge: '知识点问答',
  homework: '题目解析',
  suggestion: '学习建议'
}

const modePlaceholders = {
  knowledge: '有什么不懂的知识点可以问我...',
  homework: '把题目发给我，我来帮你分析...',
  suggestion: '我想了解一下学习建议...'
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  const userInput = input.value.trim()
  if (!userInput || isLoading.value) return

  messages.value.push({ role: 'user', content: userInput })
  input.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    const context = buildContextPrompt(props.node)
    const response = await callAI(
      messages.value,
      props.mode,
      context
    )

    messages.value.push({ role: 'assistant', content: response })
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: `抱歉，遇到了问题：${error.message}，请稍后重试。`
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

const clearChat = () => {
  messages.value = []
}

watch(() => props.node, () => {
  messages.value = []
})
</script>

<template>
  <div class="ai-chat">
    <div class="chat-header">
      <span class="chat-title">AI 助手</span>
      <span class="chat-mode">{{ modeLabels[mode] }}</span>
      <button class="clear-btn" @click="clearChat" v-if="messages.length">清空对话</button>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="welcome-message">
        <div class="welcome-icon">🤖</div>
        <div class="welcome-text">
          <p>你好！我是数学AI助手</p>
          <p>我可以帮你：</p>
          <ul>
            <li>📖 解答知识点疑问</li>
            <li>📝 分析数学题目</li>
            <li>💡 提供学习建议</li>
          </ul>
        </div>
      </div>

      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message"
        :class="msg.role"
      >
        <div class="message-avatar">
          {{ msg.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="message-content" v-html="msg.content.replace(/\n/g, '<br>')"></div>
      </div>

      <div v-if="isLoading" class="message assistant">
        <div class="message-avatar">🤖</div>
        <div class="message-content loading">
          <span class="dot">.</span>
          <span class="dot">.</span>
          <span class="dot">.</span>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <input
        v-model="input"
        :placeholder="modePlaceholders[mode]"
        @keyup.enter="sendMessage"
        :disabled="isLoading"
      />
      <button @click="sendMessage" :disabled="isLoading || !input.trim()">
        {{ isLoading ? '...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.chat-title {
  font-weight: 600;
  font-size: 16px;
}

.chat-mode {
  font-size: 12px;
  background: rgba(255,255,255,0.2);
  padding: 2px 8px;
  border-radius: 10px;
}

.clear-btn {
  margin-left: auto;
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.clear-btn:hover {
  background: rgba(255,255,255,0.3);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8f9fa;
}

.welcome-message {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
}

.welcome-icon {
  font-size: 32px;
}

.welcome-text {
  font-size: 14px;
  color: #666;
}

.welcome-text p {
  margin-bottom: 8px;
}

.welcome-text ul {
  list-style: none;
  padding: 0;
}

.welcome-text li {
  margin-bottom: 4px;
}

.message {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  font-size: 24px;
  flex-shrink: 0;
}

.message-content {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message.user .message-content {
  background: #667eea;
  color: white;
}

.message.assistant .message-content {
  background: white;
  color: #333;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.message.loading .message-content {
  display: flex;
  gap: 4px;
}

.message.loading .dot {
  animation: blink 1.4s infinite;
}

.message.loading .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.message.loading .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 60%, 100% { opacity: 0; }
  30% { opacity: 1; }
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #eee;
}

.chat-input input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.chat-input input:focus {
  border-color: #667eea;
}

.chat-input button {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.chat-input button:hover:not(:disabled) {
  background: #5a6fd6;
}

.chat-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
