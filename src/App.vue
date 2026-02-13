<script setup>
import { ref, computed, onMounted } from 'vue'
import KnowledgeGraph from './components/KnowledgeGraph.vue'
import NodeDetail from './components/NodeDetail.vue'
import { useProgressStore } from './stores/progress'

const progressStore = useProgressStore()

const selectedNode = ref(null)
const searchQuery = ref('')
const filterLevel = ref('all')
const filterCategory = ref('all')
const showFilters = ref(false)
const showList = ref(false)
const knowledgeNodes = ref([])

const isPanelOpen = computed(() => selectedNode.value !== null)

const handleNodeSelect = (node) => {
  selectedNode.value = node
}

const handleClosePanel = () => {
  selectedNode.value = null
}

const handleSearch = (query) => {
  searchQuery.value = query
}

const handleFilterLevel = (level) => {
  filterLevel.value = level
}

const handleFilterCategory = (category) => {
  filterCategory.value = category
}

const progressPercent = computed(() => {
  return progressStore.progressPercent
})

const groupedNodes = computed(() => {
  const groups = {
    junior: { algebra: [], geometry: [], functions: [], statistics: [] },
    senior: { algebra: [], geometry: [], functions: [], sequences: [], statistics: [], calculus: [] }
  }
  
  knowledgeNodes.value.forEach(node => {
    const level = node.level
    const category = node.category
    if (groups[level] && groups[level][category]) {
      groups[level][category].push(node)
    }
  })
  
  return groups
})

const toggleList = () => {
  showList.value = !showList.value
}

const loadKnowledgeData = async () => {
  try {
    const response = await fetch('/data/knowledge.json')
    const data = await response.json()
    knowledgeNodes.value = data.nodes
  } catch (e) {
    console.error('Failed to load knowledge data:', e)
  }
}

onMounted(() => {
  progressStore.loadProgress()
  loadKnowledgeData()
})
</script>

<template>
  <div class="app-container">
    <header class="toolbar">
      <div class="search-box">
        <input 
          type="text" 
          placeholder="搜索知识点..." 
          :value="searchQuery"
          @input="handleSearch($event.target.value)"
        />
      </div>
      
      <div class="filter-group">
        <button 
          class="filter-btn" 
          :class="{ active: filterLevel === 'all' }"
          @click="handleFilterLevel('all')"
        >全部</button>
        <button 
          class="filter-btn" 
          :class="{ active: filterLevel === 'junior' }"
          @click="handleFilterLevel('junior')"
        >初中</button>
        <button 
          class="filter-btn senior" 
          :class="{ active: filterLevel === 'senior' }"
          @click="handleFilterLevel('senior')"
        >高中</button>
      </div>

      <div class="filter-group">
        <select v-model="filterCategory" class="category-select">
          <option value="all">所有模块</option>
          <option value="algebra">代数</option>
          <option value="geometry">几何</option>
          <option value="statistics">统计概率</option>
          <option value="functions">函数</option>
          <option value="sequences">数列</option>
          <option value="calculus">微积分</option>
        </select>
      </div>

      <button class="list-toggle-btn" @click="toggleList">
        {{ showList ? '收起列表' : '知识点列表' }}
      </button>

      <div class="progress-info">
        <span>学习进度</span>
        <span class="progress-percent">{{ progressPercent }}%</span>
      </div>
    </header>

    <div class="knowledge-list-panel" v-show="showList">
      <div class="list-section">
        <div class="list-group">
          <h3 class="group-title junior">初中知识点</h3>
          <div v-for="(nodes, category) in groupedNodes.junior" :key="category" class="category-block">
            <template v-if="nodes.length">
              <div class="category-header" @click="$refs[`junior-${category}`][0]?.classList.toggle('expanded')">
                <span class="category-name">{{ {algebra: '代数', geometry: '几何', functions: '函数', statistics: '统计概率'}[category] }}</span>
                <span class="category-count">{{ nodes.length }}</span>
              </div>
              <div class="category-items" :ref="el => { if(el) el.classList.add('expanded')}">
                <span 
                  v-for="node in nodes" 
                  :key="node.id"
                  class="knowledge-item"
                  :class="{ completed: progressStore.isCompleted(node.id) }"
                  @click="handleNodeSelect(node)"
                >
                  {{ node.name }}
                </span>
              </div>
            </template>
          </div>
        </div>

        <div class="list-group">
          <h3 class="group-title senior">高中知识点</h3>
          <div v-for="(nodes, category) in groupedNodes.senior" :key="category" class="category-block">
            <template v-if="nodes.length">
              <div class="category-header">
                <span class="category-name">{{ {algebra: '代数', geometry: '几何', functions: '函数', sequences: '数列', statistics: '统计概率', calculus: '微积分'}[category] }}</span>
                <span class="category-count">{{ nodes.length }}</span>
              </div>
              <div class="category-items expanded">
                <span 
                  v-for="node in nodes" 
                  :key="node.id"
                  class="knowledge-item"
                  :class="{ completed: progressStore.isCompleted(node.id) }"
                  @click="handleNodeSelect(node)"
                >
                  {{ node.name }}
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <main class="main-content">
      <div class="graph-container">
        <KnowledgeGraph 
          :search-query="searchQuery"
          :filter-level="filterLevel"
          :filter-category="filterCategory"
          @node-select="handleNodeSelect"
          :selected-node="selectedNode"
        />
      </div>

      <NodeDetail 
        v-if="selectedNode"
        :node="selectedNode"
        @close="handleClosePanel"
        :class="{ open: isPanelOpen }"
      />

      <div 
        class="mobile-backdrop" 
        :class="{ show: isPanelOpen }"
        @click="handleClosePanel"
      ></div>
    </main>
  </div>
</template>

<style scoped>
.category-select {
  min-width: 100px;
}

.progress-percent {
  font-weight: 600;
  color: var(--primary-junior);
}

.list-toggle-btn {
  padding: 6px 14px;
  background: var(--bg-main);
  border-radius: var(--radius);
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.list-toggle-btn:hover {
  background: #e6f0fa;
  color: var(--primary-junior);
}

.knowledge-list-panel {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  max-height: 300px;
  overflow-y: auto;
}

.list-section {
  display: flex;
  gap: 24px;
  padding: 12px 20px;
}

.list-group {
  flex: 1;
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.group-title.junior {
  color: var(--primary-junior);
}

.group-title.senior {
  color: var(--primary-senior);
}

.category-block {
  margin-bottom: 8px;
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-main);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.category-header:hover {
  background: #e6f0fa;
}

.category-count {
  font-size: 12px;
  color: var(--text-light);
  background: var(--bg-card);
  padding: 2px 6px;
  border-radius: 10px;
}

.category-items {
  display: none;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0 8px 10px;
}

.category-items.expanded {
  display: flex;
}

.knowledge-item {
  padding: 4px 10px;
  background: var(--bg-main);
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.knowledge-item:hover {
  background: #e6f0fa;
  border-color: var(--primary-junior);
}

.knowledge-item.completed {
  background: #e6f9e6;
  color: var(--primary-senior);
}

.knowledge-item.completed:hover {
  border-color: var(--primary-senior);
}

@media (max-width: 768px) {
  .list-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .knowledge-list-panel {
    max-height: 200px;
  }
}
</style>
