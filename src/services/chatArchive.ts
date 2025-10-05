export interface ArchivedResponse {
  modelId: string
  modelName: string
  status: 'gratis' | 'bayar'
  content: string
  error: string
  durationMs: number | null
  thinking: string
}

export interface ArchivedMessage {
  id: number
  timestamp: string
  query: string
  modelIds: string[]
  modelNames: string[]
  responses: ArchivedResponse[]
}

export interface ChatArchive {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ArchivedMessage[]
}

const archives: ChatArchive[] = []

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const listChatArchives = (): ChatArchive[] => archives.map(clone)

export const getChatArchive = (id: string): ChatArchive | null => {
  const archive = archives.find(item => item.id === id)
  return archive ? clone(archive) : null
}

export const addChatArchive = (archive: ChatArchive): void => {
  archives.unshift(clone(archive))
}

export const deleteChatArchive = (id: string): void => {
  const index = archives.findIndex(item => item.id === id)
  if (index !== -1) {
    archives.splice(index, 1)
  }
}

export const clearChatArchives = (): void => {
  archives.length = 0
}

export const saveChatHistory = async (chatId: string, messages: ArchivedMessage[]): Promise<void> => {
  const archive = archives.find(item => item.id === chatId)

  if (!archive) {
    const now = new Date().toISOString()
    const newArchive: ChatArchive = {
      id: chatId,
      title: messages[0]?.query || `Percakapan ${now}`,
      createdAt: now,
      updatedAt: now,
      messages: clone(messages)
    }
    archives.unshift(newArchive)
    return
  }

  archive.messages = clone(messages)
  archive.updatedAt = new Date().toISOString()
}
