import { ref, computed, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import Prism from 'prismjs'
import {
  listChatArchives,
  addChatArchive,
  getChatArchive,
  deleteChatArchive,
  saveChatHistory,
  type ChatArchive,
  type ArchivedResponse
} from '../services/chatArchive'

import 'prismjs/themes/prism.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'

marked.setOptions({ breaks: true })

interface Model {
  id: string
  name: string
  status: 'gratis' | 'bayar'
}

interface ResponseItem {
  id: string
  model: Model
  loading: boolean
  response: string
  error: string
  durationMs: number | null
  thinking: string
}

interface HistoryEntry {
  id: number
  timestamp: string
  query: string
  modelIds: string[]
  modelNames: string[]
  responses: ArchivedResponse[]
}

const generateChatId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_KEY = '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'
const HTTP_REFERER = 'http://localhost:5173'
const SITE_TITLE = 'Konsensus Bot'

const formatModelName = (name: string) =>
  name
    .replace(/\((?:free|gratis|bayar|paid)\)/gi, '')
    .replace(/\b(free|gratis|bayar|paid)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+:/g, ':')
    .trim()

const sortByName = (list: Model[]) =>
  [...list].sort((a, b) => formatModelName(a.name).localeCompare(formatModelName(b.name), 'en', { sensitivity: 'base' }))

const renderMarkdown = (text: string) => marked.parse(text ?? '')
export function useChatModels() {
  const models = ref<Model[]>([])
  const query = ref('')
  const selectedModels = ref<Set<string>>(new Set())
  const responses = ref<ResponseItem[]>([])
  const isSubmitting = ref(false)
  const activeTab = ref<'gratis' | 'bayar'>('gratis')
  const history = ref<HistoryEntry[]>([])
  const activeResponseId = ref<string | null>(null)
  const currentChatId = ref(generateChatId())
  const archives = ref<ChatArchive[]>(listChatArchives())

  const freeModels = computed(() => sortByName(models.value.filter(m => m.status === 'gratis')))
  const paidModels = computed(() => sortByName(models.value.filter(m => m.status === 'bayar')))
  const visibleModels = computed(() => (activeTab.value === 'gratis' ? freeModels.value : paidModels.value))
  const selectedCount = computed(() => selectedModels.value.size)
  const totalModels = computed(() => models.value.length)
  const activeResponse = computed(() => responses.value.find(item => item.id === activeResponseId.value) ?? null)

  const toggleModel = (id: string) => {
    const next = new Set(selectedModels.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    selectedModels.value = next
  }

  const setActiveTab = (tab: 'gratis' | 'bayar') => {
    activeTab.value = tab
  }

  const setActiveResponse = (id: string) => {
    activeResponseId.value = id
  }

  const removeResponse = (id: string) => {
    const remaining = responses.value.filter(item => item.id !== id)
    responses.value = remaining

    if (activeResponseId.value === id) {
      activeResponseId.value = remaining[0]?.id ?? null
    }
  }

  const clearSelections = () => {
    selectedModels.value = new Set()
  }

  const clearHistory = () => {
    history.value = []
  }

  const loadHistoryEntry = (entry: HistoryEntry) => {
    query.value = entry.query
    selectedModels.value = new Set(entry.modelIds)
    responses.value = entry.responses.map((resp, index) => ({
      id: `${resp.modelId}-${Date.now()}-${index}`,
      model: {
        id: resp.modelId,
        name: resp.modelName,
        status: resp.status
      },
      loading: false,
      response: resp.content,
      error: resp.error,
      durationMs: resp.durationMs,
      thinking: resp.thinking
    }))
    activeResponseId.value = responses.value[0]?.id ?? null
  }

  const refreshArchives = () => {
    archives.value = listChatArchives()
  }

  const archiveCurrentChat = () => {
    if (history.value.length === 0) return

    const firstMessage = history.value[0]
    const nowIso = new Date().toISOString()
    const archive: ChatArchive = {
      id: currentChatId.value,
      title: firstMessage.query || `Percakapan ${new Date(firstMessage.timestamp).toLocaleString('id-ID')}`,
      createdAt: firstMessage.timestamp,
      updatedAt: nowIso,
      messages: history.value.map(message => ({
        ...message,
        responses: message.responses.map(resp => ({ ...resp }))
      }))
    }

    addChatArchive(archive)
    refreshArchives()
  }

  const startNewChat = () => {
    archiveCurrentChat()
    currentChatId.value = generateChatId()
    query.value = ''
    selectedModels.value = new Set()
    responses.value = []
    history.value = []
    activeResponseId.value = null
    isSubmitting.value = false
  }

  const loadChatArchive = (id: string) => {
    const archive = getChatArchive(id)
    if (!archive) return

    currentChatId.value = archive.id
    history.value = archive.messages.map(message => ({
      ...message,
      responses: message.responses.map(resp => ({ ...resp }))
    }))

    const lastMessage = archive.messages[archive.messages.length - 1]
    if (lastMessage) {
      selectedModels.value = new Set(lastMessage.modelIds)
      responses.value = lastMessage.responses.map((resp, index) => ({
        id: `${resp.modelId}-${Date.now()}-${index}`,
        model: {
          id: resp.modelId,
          name: resp.modelName,
          status: resp.status
        },
        loading: false,
        response: resp.content,
        error: resp.error,
        durationMs: resp.durationMs,
        thinking: resp.thinking
      }))
      activeResponseId.value = responses.value[0]?.id ?? null
    } else {
      selectedModels.value = new Set()
      responses.value = []
      activeResponseId.value = null
    }

    query.value = ''
    isSubmitting.value = false
  }

  const deleteArchive = (id: string) => {
    deleteChatArchive(id)
    refreshArchives()
  }

  const normalizeMessagePart = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (!value) return ''
    if (Array.isArray(value)) {
      return value.map(part => normalizeMessagePart(part)).join('')
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>
      if (typeof record.text === 'string') return record.text
      if (Array.isArray(record.content)) return normalizeMessagePart(record.content)
    }
    return ''
  }

  const processResponseStream = async (res: Response, item: ResponseItem): Promise<number> => {
    const finish = () => performance.now()

    const applyMessage = (message: any) => {
      if (!message) return
      if (message.content !== undefined) {
        const text = normalizeMessagePart(message.content)
        if (text) item.response = text
      }
      if (message.thinking !== undefined) {
        const text = normalizeMessagePart(message.thinking)
        if (text) item.thinking = text
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      try {
        const data = text ? JSON.parse(text) : null
        item.error = data?.error?.message || text || 'Gagal memuat jawaban.'
      } catch {
        item.error = text || 'Gagal memuat jawaban.'
      }
      return finish()
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/event-stream') || !res.body) {
      const text = await res.text()
      try {
        const data = text ? JSON.parse(text) : null
        const choice = data?.choices?.[0]
        applyMessage(choice?.message)
      } catch {
        if (text) {
          item.response = text
        }
      }
      return finish()
    }

    const decoder = new TextDecoder('utf-8')
    const reader = res.body.getReader()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary).trim()
        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')

        if (!raw.startsWith('data:')) continue
        const payload = raw.replace(/^data:\s*/, '')
        if (payload === '[DONE]') {
          buffer = ''
          break
        }

        try {
          const json = JSON.parse(payload)
          if (json.error) {
            item.error = json.error?.message || 'Gagal memuat jawaban.'
            continue
          }
          const choice = json.choices?.[0]
          const delta = choice?.delta
          if (delta?.content !== undefined) {
            const text = normalizeMessagePart(delta.content)
            if (text) item.response += text
          }
          if (delta?.thinking !== undefined) {
            const text = normalizeMessagePart(delta.thinking)
            if (text) item.thinking += text
          }
          if (choice?.message) {
            applyMessage(choice.message)
          }
        } catch (error) {
          console.warn('Failed to parse stream chunk', error)
        }
      }
    }

    return finish()
  }

  const submitQuery = async () => {
    const trimmedQuery = query.value.trim()
    if (!trimmedQuery || selectedModels.value.size === 0 || isSubmitting.value) return

    isSubmitting.value = true
    responses.value = []
    activeResponseId.value = null

    const selected = Array.from(selectedModels.value)
      .map(id => models.value.find(m => m.id === id) || null)
      .filter((m): m is Model => Boolean(m))

    const handleModel = async (model: Model) => {
      const responseId = `${model.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const responseItem: ResponseItem = {
        id: responseId,
        model,
        loading: true,
        response: '',
        error: '',
        durationMs: null,
        thinking: ''
      }
      responses.value.push(responseItem)
      if (!activeResponseId.value) {
        activeResponseId.value = responseId
      }

      try {
        const startedAt = performance.now()
        const res = await fetch(OPENROUTER_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENROUTER_KEY}`,
            'HTTP-Referer': HTTP_REFERER,
            'X-Title': SITE_TITLE,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model.id,
            messages: [{ role: 'user', content: trimmedQuery }],
            stream: true,
            include_thinking: true
          })
        })
        const finishedAt = await processResponseStream(res, responseItem)
        responseItem.durationMs = Math.max(0, finishedAt - startedAt)
      } catch (err) {
        console.error('Failed to fetch model response', err)
        responseItem.error = 'Terjadi kesalahan jaringan.'
        responseItem.durationMs = null
      } finally {
        responseItem.loading = false
        await nextTick()
        Prism.highlightAll()
      }
    }

    await Promise.all(selected.map(model => handleModel(model)))

    const entry: HistoryEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      query: trimmedQuery,
      modelIds: selected.map(m => m.id),
      modelNames: selected.map(m => m.name),
      responses: responses.value.map(resp => ({
        modelId: resp.model.id,
        modelName: resp.model.name,
        status: resp.model.status,
        content: resp.response,
        error: resp.error,
        durationMs: resp.durationMs,
        thinking: resp.thinking
      }))
    }
    history.value = [...history.value, entry]
    await saveChatHistory(currentChatId.value, history.value)

    isSubmitting.value = false
  }

  onMounted(async () => {
    try {
      const res = await fetch('./extracted_status.json')
      models.value = await res.json()
    } catch (err) {
      console.error('Failed to load models', err)
    }
  })

  const formatDuration = (duration: number | null) => {
    if (duration == null) return '—'
    if (duration < 1000) return `${Math.round(duration)} ms`
    return `${(duration / 1000).toFixed(2)} s`
  }

  return {
    // state
    query,
    selectedModels,
    responses,
    isSubmitting,
    activeTab,
    history,
    activeResponse,
    activeResponseId,
    archives,
    currentChatId,
    // derived
    freeModels,
    paidModels,
    visibleModels,
    selectedCount,
    totalModels,
    // helpers
    toggleModel,
    setActiveTab,
    setActiveResponse,
    removeResponse,
    startNewChat,
    loadChatArchive,
    deleteArchive,
    clearSelections,
    submitQuery,
    clearHistory,
    loadHistoryEntry,
    renderMarkdown,
    formatModelName,
    formatDuration
  }
}
