import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProgressStore = defineStore('progress', () => {
  const completedNodes = ref(new Set())
  const nodeProgress = ref({})
  const totalNodes = ref(86)

  const loadProgress = () => {
    try {
      const saved = localStorage.getItem('math-progress')
      if (saved) {
        const data = JSON.parse(saved)
        completedNodes.value = new Set(data.completed || [])
        nodeProgress.value = data.nodeProgress || {}
      }
    } catch (e) {
      console.error('Failed to load progress:', e)
    }
  }

  const saveProgress = () => {
    try {
      localStorage.setItem('math-progress', JSON.stringify({
        completed: Array.from(completedNodes.value),
        nodeProgress: nodeProgress.value
      }))
    } catch (e) {
      console.error('Failed to save progress:', e)
    }
  }

  const markCompleted = (nodeId) => {
    completedNodes.value.add(nodeId)
    nodeProgress.value[nodeId] = {
      completed: true,
      completedAt: new Date().toISOString()
    }
    saveProgress()
  }

  const unmarkCompleted = (nodeId) => {
    completedNodes.value.delete(nodeId)
    delete nodeProgress.value[nodeId]
    saveProgress()
  }

  const isCompleted = (nodeId) => {
    return completedNodes.value.has(nodeId)
  }

  const progressPercent = computed(() => {
    if (totalNodes.value === 0) return 0
    return Math.round((completedNodes.value.size / totalNodes.value) * 100)
  })

  const getCompletedCount = computed(() => completedNodes.value.size)

  const resetProgress = () => {
    completedNodes.value = new Set()
    nodeProgress.value = {}
    saveProgress()
  }

  const exportProgress = () => {
    return JSON.stringify({
      completed: Array.from(completedNodes.value),
      nodeProgress: nodeProgress.value,
      exportedAt: new Date().toISOString()
    }, null, 2)
  }

  const importProgress = (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      completedNodes.value = new Set(data.completed || [])
      nodeProgress.value = data.nodeProgress || {}
      saveProgress()
      return true
    } catch (e) {
      console.error('Failed to import progress:', e)
      return false
    }
  }

  return {
    completedNodes,
    nodeProgress,
    totalNodes,
    loadProgress,
    saveProgress,
    markCompleted,
    unmarkCompleted,
    isCompleted,
    progressPercent,
    getCompletedCount,
    resetProgress,
    exportProgress,
    importProgress
  }
})
