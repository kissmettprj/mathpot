<script setup>
import { ref, computed, watch } from 'vue'
import { useProgressStore } from '../stores/progress'
import AIChat from './AIChat.vue'

const props = defineProps({
  node: Object
})

const emit = defineEmits(['close', 'selectNode'])

const progressStore = useProgressStore()
const questions = ref([])
const showAnswers = ref({})
const isCompleted = ref(false)
const activeTab = ref('content')
const aiMode = ref('knowledge')

const levelText = computed(() => {
  const map = { junior: '初中', senior: '高中', primary: '小学' }
  return map[props.node?.level] || ''
})

const categoryText = computed(() => {
  const categoryMap = {
    algebra: '代数',
    geometry: '几何',
    statistics: '统计概率',
    functions: '函数',
    sequences: '数列',
    calculus: '微积分'
  }
  return categoryMap[props.node?.category] || '其他'
})

const relatedTopics = computed(() => {
  if (!props.node) return { prerequisites: [], next: [] }
  
  const allNodes = window.__knowledgeNodes || []
  
  const prerequisites = (props.node.prerequisites || [])
    .map(id => allNodes.find(n => n.id === id))
    .filter(Boolean)
  
  const next = (props.node.nextTopics || [])
    .map(id => allNodes.find(n => n.id === id))
    .filter(Boolean)
  
  return { prerequisites, next }
})

const loadQuestions = async () => {
  if (!props.node) return
  
  try {
    const response = await fetch('/data/questions.json')
    const allQuestions = await response.json()
    questions.value = allQuestions.filter(q => q.knowledgeId === props.node.id)
  } catch (e) {
    console.error('Failed to load questions:', e)
    questions.value = []
  }
}

const toggleAnswer = (questionId) => {
  showAnswers.value[questionId] = !showAnswers.value[questionId]
}

const toggleProgress = () => {
  if (isCompleted.value) {
    progressStore.unmarkCompleted(props.node.id)
  } else {
    progressStore.markCompleted(props.node.id)
  }
  isCompleted.value = !isCompleted.value
}

watch(() => props.node, async (newNode) => {
  if (newNode) {
    isCompleted.value = progressStore.isCompleted(newNode.id)
    showAnswers.value = {}
    await loadQuestions()
  }
}, { immediate: true })
</script>

<template>
  <aside class="side-panel open">
    <div class="panel-header">
      <h2>知识点详情</h2>
      <button class="close-btn" @click="emit('close')">&times;</button>
    </div>
    
    <div class="tab-nav" v-if="node">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'content' }"
        @click="activeTab = 'content'"
      >内容</button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'ai' }"
        @click="activeTab = 'ai'"
      >🤖 AI 助手</button>
    </div>

    <div class="panel-content" v-if="node && activeTab === 'content'">
      <div class="knowledge-meta">
        <span class="knowledge-tag" :class="node.level">
          {{ levelText }}
        </span>
        <span class="knowledge-tag" :class="node.category">
          {{ categoryText }}
        </span>
      </div>
      
      <h3 class="knowledge-title">{{ node.name }}</h3>
      
      <div class="knowledge-description" v-if="node.content">
        <div v-html="node.content"></div>
      </div>
      <div class="knowledge-description" v-else-if="node.description">
        {{ node.description }}
      </div>
      
      <div class="related-topics" v-if="relatedTopics.prerequisites.length">
        <h3>前置知识点</h3>
        <div class="topic-list">
          <span 
            v-for="topic in relatedTopics.prerequisites" 
            :key="topic.id"
            class="topic-item"
            @click="emit('selectNode', topic)"
          >
            {{ topic.name }}
          </span>
        </div>
      </div>
      
      <div class="related-topics" v-if="relatedTopics.next.length">
        <h3>后续知识点</h3>
        <div class="topic-list">
          <span 
            v-for="topic in relatedTopics.next" 
            :key="topic.id"
            class="topic-item"
            @click="emit('selectNode', topic)"
          >
            {{ topic.name }}
          </span>
        </div>
      </div>
      
      <button 
        class="progress-btn" 
        :class="{ completed: isCompleted }"
        @click="toggleProgress"
      >
        {{ isCompleted ? '✓ 已学习' : '○ 标记为已学习' }}
      </button>
      
      <div class="question-section" v-if="questions.length">
        <h3>典型题目</h3>
        
        <div 
          v-for="(question, index) in questions" 
          :key="question.id"
          class="question-card"
        >
          <div class="question-header">
            <span class="question-type">
              {{ question.type === 'choice' ? '选择题' : question.type === 'fill' ? '填空题' : '计算题' }}
            </span>
            <span 
              class="difficulty" 
              :class="question.difficulty"
            >
              {{ question.difficulty === 'easy' ? '简单' : question.difficulty === 'medium' ? '中等' : '困难' }}
            </span>
          </div>
          
          <div class="question-text">
            {{ index + 1 }}. {{ question.question }}
          </div>
          
          <div class="question-options" v-if="question.type === 'choice' && question.options">
            <div v-for="(option, i) in question.options" :key="i">
              {{ ['A', 'B', 'C', 'D'][i] }}. {{ option }}
            </div>
          </div>
          
          <button 
            class="show-answer-btn"
            @click="toggleAnswer(question.id)"
          >
            {{ showAnswers[question.id] ? '隐藏答案' : '查看答案' }}
          </button>
          
          <div class="answer-section" v-if="showAnswers[question.id]">
            <div class="answer-label">
              答案：{{ question.answer }}
            </div>
            <div class="answer-text">
              {{ question.analysis }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="question-section" v-else>
        <h3>典型题目</h3>
        <p style="color: var(--text-light); font-size: 14px;">暂无相关题目</p>
      </div>
    </div>

    <div class="ai-section" v-if="node && activeTab === 'ai'">
      <div class="ai-mode-select">
        <button 
          class="mode-btn" 
          :class="{ active: aiMode === 'knowledge' }"
          @click="aiMode = 'knowledge'"
        >📖 问答</button>
        <button 
          class="mode-btn" 
          :class="{ active: aiMode === 'homework' }"
          @click="aiMode = 'homework'"
        >📝 题目</button>
        <button 
          class="mode-btn" 
          :class="{ active: aiMode === 'suggestion' }"
          @click="aiMode = 'suggestion'"
        >💡 建议</button>
      </div>
      <AIChat :node="node" :mode="aiMode" />
    </div>
  </aside>
</template>

<style scoped>
.knowledge-meta {
  margin-bottom: 12px;
}

.knowledge-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.tab-nav {
  display: flex;
  background: #f5f7fa;
  padding: 8px;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #e8e8e8;
}

.tab-btn.active {
  background: white;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.ai-section {
  display: flex;
  flex-direction: column;
  height: calc(100% - 52px);
}

.ai-mode-select {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: white;
  border-bottom: 1px solid #eee;
}

.mode-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background: white;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.mode-btn:hover {
  border-color: #667eea;
}

.mode-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.knowledge-description {
  line-height: 1.8;
  white-space: pre-wrap;
}

.knowledge-description :deep(p) {
  margin-bottom: 12px;
}

.knowledge-description :deep(ul), .knowledge-description :deep(ol) {
  margin-left: 20px;
  margin-bottom: 12px;
}

.knowledge-description :deep(li) {
  margin-bottom: 6px;
}

.knowledge-description :deep(strong) {
  color: var(--text-main);
  font-weight: 600;
}

.knowledge-description :deep(code) {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
