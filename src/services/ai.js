const ZHIPU_API_KEY = import.meta.env.VITE_ZHIPU_API_KEY || ''
const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

const SYSTEM_PROMPTS = {
  knowledge: `你是一位专业的数学辅导老师，专门帮助学生理解数学知识点。你的职责是：
1. 用通俗易懂的语言解释数学概念
2. 举例说明，帮助学生理解
3. 回答要准确、简洁、有条理
4. 适当使用类比和图示说明（文字描述）

当学生询问当前知识点时，请结合提供的知识点内容进行回答。`,

  homework: `你是一位专业的数学辅导老师，专门帮助学生解决数学题目。你的职责是：
1. 先引导学生思考，而不是直接给出答案
2. 逐步分析解题思路
3. 讲解关键步骤和考点
4. 最后给出完整解答和总结

请按照"审题分析→思路引导→解答过程→知识点总结"的顺序来帮助学生。`,

  suggestion: `你是一位专业的数学学习顾问。你的职责是：
1. 根据学生的学习进度和掌握情况
2. 分析学生的薄弱环节
3. 提供个性化的学习建议和推荐
4. 鼓励学生，保持积极的学习态度

请给出具体、可执行的学习建议。`
}

export async function callAI(messages, type = 'knowledge', knowledgeContext = null) {
  if (!ZHIPU_API_KEY) {
    throw new Error('API Key 未配置')
  }

  let systemPrompt = SYSTEM_PROMPTS[type]
  
  if (knowledgeContext) {
    systemPrompt += `\n\n========== 当前学习内容 ==========\n${knowledgeContext}\n=====================================\n\n请根据以上知识点内容回答用户的问题。如果用户的问题与当前知识点无关，也可以正常回答。`
  }

  const payload = {
    model: 'glm-4-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    temperature: 0.7,
    max_tokens: 1024
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'API 调用失败')
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (error) {
    console.error('AI API Error:', error)
    throw error
  }
}

export async function streamAI(messages, type = 'knowledge', knowledgeContext = null, onChunk) {
  if (!ZHIPU_API_KEY) {
    throw new Error('API Key 未配置')
  }

  let systemPrompt = SYSTEM_PROMPTS[type]
  
  if (knowledgeContext) {
    systemPrompt += `\n\n========== 当前学习内容 ==========\n${knowledgeContext}\n=====================================\n\n请根据以上知识点内容回答用户的问题。如果用户的问题与当前知识点无关，也可以正常回答。`
  }

  const payload = {
    model: 'glm-4-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    temperature: 0.7,
    max_tokens: 1024,
    stream: true
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZHIPU_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'API 调用失败')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let result = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ''
            if (content) {
              result += content
              onChunk?.(content)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    return result
  } catch (error) {
    console.error('AI API Error:', error)
    throw error
  }
}

export function buildContextPrompt(node) {
  if (!node) return ''
  
  let context = `【当前知识点】${node.name}\n`
  
  const levelMap = { primary: '小学', junior: '初中', senior: '高中' }
  const categoryMap = {
    algebra: '代数',
    geometry: '几何',
    statistics: '统计概率',
    functions: '函数',
    sequences: '数列',
    calculus: '微积分'
  }
  
  context += `【学段】${levelMap[node.level] || ''}\n`
  context += `【分类】${categoryMap[node.category] || ''}\n\n`
  
  if (node.description) {
    context += `【简介】${node.description}\n\n`
  }
  if (node.content) {
    context += `【详细内容】\n${node.content}\n\n`
  }
  
  const allNodes = window.__knowledgeNodes || []
  const prerequisites = (node.prerequisites || [])
    .map(id => allNodes.find(n => n.id === id))
    .filter(Boolean)
  const nextTopics = (node.nextTopics || [])
    .map(id => allNodes.find(n => n.id === id))
    .filter(Boolean)
  
  if (prerequisites.length > 0) {
    context += `【前置知识点】${prerequisites.map(n => n.name).join('、')}\n`
  }
  if (nextTopics.length > 0) {
    context += `【后续知识点】${nextTopics.map(n => n.name).join('、')}\n`
  }
  
  return context
}
