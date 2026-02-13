<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as d3 from 'd3'
import { useProgressStore } from '../stores/progress'

const props = defineProps({
  searchQuery: String,
  filterLevel: String,
  filterCategory: String,
  selectedNode: Object
})

const emit = defineEmits(['nodeSelect'])

const progressStore = useProgressStore()
const svgRef = ref(null)
const containerRef = ref(null)
const knowledgeData = ref({ nodes: [], links: [] })
const simulation = ref(null)

const width = ref(800)
const height = ref(600)

const levelColors = {
  junior: '#4A90D9',
  senior: '#52C41A'
}

const categoryColors = {
  algebra: '#1890ff',
  geometry: '#722ed1',
  statistics: '#13c2c2',
  functions: '#eb2f96',
  sequences: '#fa8c16',
  calculus: '#f5222d'
}

const filteredNodes = computed(() => {
  let nodes = knowledgeData.value.nodes
  
  if (props.filterLevel !== 'all') {
    nodes = nodes.filter(n => n.level === props.filterLevel)
  }
  
  if (props.filterCategory !== 'all') {
    nodes = nodes.filter(n => n.category === props.filterCategory)
  }
  
  if (props.searchQuery) {
    const query = props.searchQuery.toLowerCase()
    nodes = nodes.filter(n => 
      n.name.toLowerCase().includes(query) ||
      (n.description && n.description.toLowerCase().includes(query))
    )
  }
  
  return nodes
})

const filteredNodeIds = computed(() => new Set(filteredNodes.value.map(n => n.id)))

const filteredLinks = computed(() => {
  return knowledgeData.value.links.filter(l => 
    filteredNodeIds.value.has(l.source.id || l.source) &&
    filteredNodeIds.value.has(l.target.id || l.target)
  )
})

const loadKnowledgeData = async () => {
  try {
    const response = await fetch('/data/knowledge.json')
    const data = await response.json()
    knowledgeData.value = data
    window.__knowledgeNodes = data.nodes
  } catch (e) {
    console.error('Failed to load knowledge data:', e)
  }
}

const initGraph = () => {
  if (!svgRef.value || !containerRef.value) return

  const container = containerRef.value
  width.value = container.clientWidth
  height.value = container.clientHeight

  const svg = d3.select(svgRef.value)
    .attr('width', width.value)
    .attr('height', height.value)

  svg.selectAll('*').remove()

  const g = svg.append('g')

  const zoom = d3.zoom()
    .scaleExtent([0.5, 3])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
    })

  svg.call(zoom)

  const nodes = filteredNodes.value.map(n => ({ ...n }))
  const links = filteredLinks.value.map(l => ({ ...l }))

  simulation.value = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(50))
    .force('charge', d3.forceManyBody().strength(-80))
    .force('center', d3.forceCenter(width.value / 2, height.value / 2))
    .force('collision', d3.forceCollide().radius(45))

  const link = g.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'link')
    .attr('stroke-width', 1.5)

  const node = g.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded))
    .on('click', (event, d) => {
      event.stopPropagation()
      emit('nodeSelect', d)
    })

  node.append('circle')
    .attr('r', d => 20 + (d.importance || 1) * 4)
    .attr('fill', d => {
      const isCompleted = progressStore.isCompleted(d.id)
      return isCompleted ? 'white' : levelColors[d.level] || '#999'
    })
    .attr('stroke', d => levelColors[d.level] || '#999')
    .attr('stroke-width', 3)

  node.append('text')
    .attr('dy', d => 28 + (d.importance || 1) * 4)
    .attr('text-anchor', 'middle')
    .attr('fill', '#333')
    .attr('font-size', '16px')
    .attr('font-weight', '500')
    .text(d => d.name.length > 8 ? d.name.substring(0, 8) + '...' : d.name)

  simulation.value.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    node.attr('transform', d => `translate(${d.x},${d.y})`)
  })

  function dragStarted(event, d) {
    if (!event.active) simulation.value.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }

  function dragged(event, d) {
    d.fx = event.x
    d.fy = event.y
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.value.alphaTarget(0)
    d.fx = null
    d.fy = null
  }
}

const highlightConnected = (nodeId) => {
  const svg = d3.select(svgRef.value)
  
  svg.selectAll('.link')
    .classed('highlighted', d => 
      (d.source.id || d.source) === nodeId || 
      (d.target.id || d.target) === nodeId
    )
  
  svg.selectAll('.node')
    .classed('selected', d => d.id === nodeId)
}

const clearHighlight = () => {
  const svg = d3.select(svgRef.value)
  svg.selectAll('.link').classed('highlighted', false)
  svg.selectAll('.node').classed('selected', false)
}

watch([() => props.filterLevel, () => props.filterCategory, () => props.searchQuery, knowledgeData], () => {
  if (simulation.value) {
    simulation.value.stop()
  }
  initGraph()
}, { deep: true })

watch(() => props.selectedNode, (newVal) => {
  if (newVal) {
    highlightConnected(newVal.id)
  } else {
    clearHighlight()
  }
})

onMounted(async () => {
  await loadKnowledgeData()
  initGraph()
  
  window.addEventListener('resize', () => {
    if (containerRef.value) {
      width.value = containerRef.value.clientWidth
      height.value = containerRef.value.clientHeight
      initGraph()
    }
  })
})

onUnmounted(() => {
  if (simulation.value) {
    simulation.value.stop()
  }
})
</script>

<template>
  <div ref="containerRef" class="graph-container-inner">
    <svg ref="svgRef" id="knowledge-graph"></svg>
    
    <div class="legend">
      <div class="legend-item">
        <span class="legend-dot junior"></span>
        <span>初中知识点</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot senior"></span>
        <span>高中知识点</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot completed"></span>
        <span>已学习</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.graph-container-inner {
  width: 100%;
  height: 100%;
  position: relative;
}

#knowledge-graph {
  width: 100%;
  height: 100%;
  background: var(--bg-main);
}
</style>
