<script setup>
import { ref, nextTick, watch } from 'vue'
import { marked } from 'marked'
import { streamAI, buildContextPrompt } from '../services/ai'

const props = defineProps({
  node: Object,
  mode: {
    type: String,
    default: 'knowledge'
  }
})

const emit = defineEmits(['close'])

const messages = ref([])
const input = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)
const streamingContent = ref('')

const modePlaceholders = {
  knowledge: '有什么不懂的可以问我...',
  homework: '把题目发给我分析...',
  suggestion: '想要学习建议...'
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const renderMarkdown = (content) => {
  return marked(content, { breaks: true })
}

const suggestedQuestions = [
  { label: '该知识点的重点是什么？', prompt: '请总结这个知识点的重点和难点' },
  { label: '我该如何学习？', prompt: '请给我一些学习这个知识点的建议和方法' },
  { label: '出几道题试试', prompt: '请出3-5道关于这个知识点的练习题，并给出答案' }
]

const askQuestion = (question) => {
  input.value = question.prompt
  sendMessage()
}

const sendMessage = async () => {
  const userInput = input.value.trim()
  if (!userInput || isLoading.value) return

  messages.value.push({ role: 'user', content: userInput })
  input.value = ''
  isLoading.value = true
  streamingContent.value = ''
  scrollToBottom()

  try {
    const context = buildContextPrompt(props.node)
    
    messages.value.push({ role: 'assistant', content: '' })
    const lastIndex = messages.value.length - 1

    await streamAI(
      messages.value.slice(0, -1),
      props.mode,
      context,
      (chunk) => {
        streamingContent.value += chunk
        messages.value[lastIndex].content = streamingContent.value
        scrollToBottom()
      }
    )
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

watch(() => props.node, () => {
  messages.value = []
})
</script>

<template>
  <div class="ai-chat">
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="welcome-section">
        <div class="welcome-message">
          <div class="welcome-icon">🤖</div>
          <div class="welcome-text">
            <p>我是数学AI助手，有什么问题都可以问我</p>
          </div>
        </div>
        
        <div class="suggested-questions">
          <p class="suggested-title">试试这样问：</p>
          <div class="suggested-list">
            <button 
              v-for="(q, i) in suggestedQuestions" 
              :key="i"
              class="suggested-btn"
              @click="askQuestion(q)"
            >
              {{ q.label }}
            </button>
          </div>
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
        <div class="message-content">
          <span v-html="renderMarkdown(msg.content)"></span>
          <span v-if="isLoading && index === messages.length - 1" class="cursor">▌</span>
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
        <span v-if="isLoading" class="btn-loading">发送中</span>
        <span v-else>发送</span>
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
  margin-bottom: 12px;
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

.welcome-section {
  padding-bottom: 8px;
}

.suggested-questions {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
}

.suggested-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.suggested-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggested-btn {
  padding: 8px 12px;
  background: #f0f5ff;
  border: 1px solid #d0dfff;
  border-radius: 16px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
}

.suggested-btn:hover {
  background: #e0ebff;
  border-color: #667eea;
  color: #667eea;
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
}

.message-content :deep(p) {
  margin: 0 0 8px 0;
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.message-content :deep(ul), .message-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-content :deep(li) {
  margin: 4px 0;
}

.message-content :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.message-content :deep(pre) {
  background: #f0f0f0;
  padding: 10px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-content :deep(strong) {
  font-weight: 600;
}

.message-content :deep(h1), .message-content :deep(h2), .message-content :deep(h3) {
  margin: 12px 0 8px 0;
  font-weight: 600;
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

.cursor {
  animation: blink 1s infinite;
  color: #667eea;
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
