<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useChatModels } from './composables/useChatModels'

const {
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
} = useChatModels()

const THEME_KEY = 'asetbot-theme'
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
const storedTheme = localStorage.getItem(THEME_KEY)
const isDark = ref(storedTheme ? storedTheme === 'dark' : prefersDark)

const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.classList.toggle('light', !dark)
}

onMounted(() => {
  applyTheme(isDark.value)
})

watch(isDark, (val) => {
  localStorage.setItem(THEME_KEY, val ? 'dark' : 'light')
  applyTheme(val)
})

const toggleTheme = () => {
  isDark.value = !isDark.value
}
</script>

<template>
  <div :class="['flex min-h-screen', isDark ? 'bg-slate-900 text-slate-100' : 'light bg-slate-50 text-slate-900']">
    <aside class="hidden lg:flex w-80 xl:w-96 border-r border-slate-800 bg-slate-950/60 backdrop-blur flex-col">
      <div class="px-6 py-5 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <img src="/img/logo.png" alt="Konsensus Bot Logo" class="h-10 w-10 rounded-xl object-cover shadow-md shadow-primary/20" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight">Konsensus Bot</h1>
            <p class="text-sm text-slate-400 mt-1">Bandingkan jawaban dari berbagai model AI secara bersamaan.</p>
          </div>
        </div>
      </div>
      <div class="flex-1 overflow-hidden flex flex-col">
        <div class="px-6 pt-4">
          <div class="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-full p-1 text-sm font-medium">
            <button
              type="button"
              @click="setActiveTab('gratis')"
              :class="[
                'flex-1 rounded-full px-4 py-2 transition',
                activeTab === 'gratis' ? 'bg-primary text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              ]"
            >
              Gratis
            </button>
            <button
              type="button"
              @click="setActiveTab('bayar')"
              :class="[
                'flex-1 rounded-full px-4 py-2 transition',
                activeTab === 'bayar' ? 'bg-primary text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              ]"
            >
              Berbayar
            </button>
          </div>
          <p class="text-xs text-slate-500 mt-3">Tersedia {{ visibleModels.length }} model dalam kategori ini.</p>
        </div>

        <div class="px-6 pb-4 mt-2">
          <div class="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            <div
              v-for="model in visibleModels"
              :key="model.id"
              role="button"
              tabindex="0"
              @click="toggleModel(model.id)"
              @keydown.enter.prevent="toggleModel(model.id)"
              @keydown.space.prevent="toggleModel(model.id)"
              :class="[
                'border rounded-2xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                'px-4 py-3 bg-slate-900/60 hover:border-primary/40 hover:bg-slate-900/80',
                selectedModels.has(model.id)
                  ? 'border-primary/70 bg-primary/10 ring-1 ring-primary/60 shadow-lg shadow-primary/20'
                  : 'border-slate-800/80'
              ]"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold leading-tight text-slate-100 text-justify">{{ formatModelName(model.name) }}</p>
                </div>
                <div
                  v-if="selectedModels.has(model.id)"
                  class="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-xs font-semibold text-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.414l-6.25 6.25a1 1 0 01-1.414 0l-3.125-3.125a1 1 0 111.414-1.414l2.418 2.417 5.543-5.542a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  Dipilih
                </div>
              </div>
            </div>
            <p v-if="visibleModels.length === 0" class="text-sm text-slate-500">Tidak ada model pada kategori ini.</p>
          </div>
        </div>

        <div :class="['mt-4 border-t transition-colors duration-300', isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/80']">
          <div class="px-6 py-4 flex items-center justify-between">
            <h2 :class="['text-sm font-semibold uppercase tracking-[0.2em]', isDark ? 'text-slate-400' : 'text-slate-500']">History</h2>
            <button
              type="button"
              :class="['text-xs transition', isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700']"
              @click="clearHistory"
              :disabled="history.length === 0"
            >
              Clear
            </button>
          </div>
          <div class="px-6 pb-6 space-y-2 max-h-60 overflow-y-auto">
            <p v-if="history.length === 0" class="text-xs text-slate-500">Belum ada riwayat percakapan.</p>
            <button
              v-for="entry in history"
              :key="entry.id"
              type="button"
              :class="['w-full text-left rounded-xl px-4 py-3 transition', isDark ? 'bg-slate-900/60 border border-slate-800 hover:border-primary/60 hover:bg-slate-900' : 'bg-white border border-slate-200 hover:border-primary/40 hover:bg-slate-100']"
              @click="loadHistoryEntry(entry)"
            >
              <span class="block text-sm font-semibold text-slate-100 truncate text-justify">{{ entry.query }}</span>
              <span class="block text-xs text-slate-500 mt-1">{{ entry.timestamp }} • {{ entry.modelNames.length }} model</span>
            </button>
          </div>
        </div>

        <div :class="['border-t transition-colors duration-300', isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-white/80']">
          <div class="px-6 py-4 flex items-center justify-between">
            <h2 :class="['text-sm font-semibold uppercase tracking-[0.2em]', isDark ? 'text-slate-400' : 'text-slate-500']">Chat Tersimpan (Beta)</h2>
            <span :class="['text-[10px] uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-slate-500']">{{ archives.length }}</span>
          </div>
          <div class="px-6 pb-6 space-y-2 max-h-48 overflow-y-auto">
            <p v-if="archives.length === 0" :class="['text-xs', isDark ? 'text-slate-500' : 'text-slate-500']">Belum ada arsip tersimpan.</p>
            <div
              v-for="archive in archives"
              :key="archive.id"
              :class="['flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition', isDark ? 'border-slate-800 bg-slate-900/60 hover:border-primary/40' : 'border-slate-200 bg-white hover:border-primary/40 shadow-sm']"
            >
              <button
                type="button"
                class="flex-1 text-left"
                @click="loadChatArchive(archive.id)"
              >
                <p :class="['text-sm font-semibold truncate transition-colors duration-300', isDark ? 'text-slate-100' : 'text-slate-700']">{{ archive.title }}</p>
                <p class="text-[11px] text-slate-500 mt-1">{{ new Date(archive.updatedAt).toLocaleString('id-ID') }}</p>
              </button>
              <button
                type="button"
                :class="['rounded-full border border-transparent p-1 text-xs transition', isDark ? 'text-slate-500 hover:border-red-500/40 hover:text-red-300' : 'text-slate-500 hover:border-red-400/40 hover:text-red-500']"
                @click.stop="deleteArchive(archive.id)"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-.867 12.142A2 2 0 0116.138 20H7.862a2 2 0 01-1.995-1.858L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <div class="flex-1 flex flex-col">
      <header class="border-b border-slate-800 bg-slate-900/70 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight">Panel Percakapan</h2>
          <p class="text-sm text-slate-400">Pilih model favorit Anda kemudian kirim prompt melalui kolom di bawah.</p>
        </div>
        <div class="flex items-center gap-3 text-sm" :class="isDark ? 'text-slate-400' : 'text-slate-600'">
          <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700">
            <span class="h-2 w-2 rounded-full bg-primary"></span>
            {{ selectedCount }} dipilih
          </span>
          <span class="text-xs hidden sm:inline">dari {{ totalModels }} model</span>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800/80' : 'border-slate-300 text-slate-700 hover:bg-slate-100'"
            @click="toggleTheme"
          >
            <svg
              v-if="isDark"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            <svg
              v-else
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            {{ isDark ? 'Mode Gelap' : 'Mode Terang' }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition"
            @click="startNewChat"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Chat Baru
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-hidden flex flex-col">
        <div class="flex-1 overflow-hidden flex flex-col lg:flex-row">
          <section class="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
            <div v-if="responses.length === 0" class="h-full flex items-center justify-center text-slate-500 text-sm">
              Mulailah dengan memilih model dan mengirim prompt.
            </div>
            <div v-else class="h-full">
              <article class="max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-900/40 p-6 flex flex-col min-h-[320px]">
                <template v-if="activeResponse">
                  <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 class="text-xl font-semibold leading-tight">{{ formatModelName(activeResponse.model.name) }}</h3>
                      <p class="text-xs text-slate-500 mt-1">Model ID: {{ activeResponse.model.id }}</p>
                      <p class="text-xs text-slate-500 mt-1">Waktu respons: {{ formatDuration(activeResponse.durationMs) }}</p>
                    </div>
                    <span
                      :class="[
                        'inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border',
                        activeResponse.model.status === 'gratis'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      ]"
                    >
                      {{ activeResponse.model.status === 'gratis' ? 'Gratis' : 'Berbayar' }}
                    </span>
                  </div>

                  <div class="mt-6 flex-1">
                    <details
                      v-if="activeResponse.thinking"
                      class="rounded-2xl border border-slate-800/60 bg-slate-900/40 px-4 py-3 text-xs text-slate-300"
                      :open="false"
                    >
                      <summary class="cursor-pointer text-slate-200 font-semibold">Proses Thinking</summary>
                      <pre class="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-400">{{ activeResponse.thinking }}</pre>
                    </details>
                    <div v-if="activeResponse.loading" class="flex h-full items-center justify-center text-slate-400 text-sm">
                      Memuat jawaban...
                    </div>
                    <div v-else-if="activeResponse.error" class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {{ activeResponse.error }}
                    </div>
                    <div v-else class="rounded-2xl border border-slate-800/80 bg-slate-950/60 max-h-[65vh] overflow-y-auto px-5 py-4">
                      <div class="prose prose-invert prose-sm max-w-none" v-html="renderMarkdown(activeResponse.response)"></div>
                    </div>
                  </div>
                </template>
                <div v-else class="flex flex-1 items-center justify-center text-slate-500 text-sm">
                  Pilih salah satu jawaban model di sisi kanan.
                </div>
              </article>
            </div>
          </section>

          <aside class="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/60">
            <div class="px-5 py-4 border-b border-slate-800">
              <h2 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Jawaban Model</h2>
              <p class="text-xs text-slate-500 mt-1">Pilih model untuk melihat jawabannya.</p>
            </div>
            <div class="h-full max-h-[420px] lg:max-h-none overflow-y-auto px-5 py-4 space-y-3">
              <p v-if="responses.length === 0" class="text-xs text-slate-500">Belum ada jawaban yang tersedia.</p>
              <div
                v-for="response in responses"
                :key="response.id"
                :class="[
                  'flex items-start gap-3 rounded-2xl border px-4 py-3 transition backdrop-blur cursor-pointer group',
                  activeResponseId === response.id
                    ? 'border-primary/70 bg-primary/10 text-slate-100 shadow-lg shadow-primary/20'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-primary/40 hover:text-slate-100'
                ]"
                @click="setActiveResponse(response.id)"
              >
                <div
                  :class="[
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition',
                    response.loading
                      ? 'border-slate-700 text-slate-500'
                      : response.error
                        ? 'border-red-500/60 text-red-300'
                        : 'border-emerald-500/60 text-emerald-300'
                  ]"
                >
                  <svg
                    v-if="response.loading"
                    class="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle class="opacity-25" cx="12" cy="12" r="10" />
                    <path class="opacity-75" d="M12 2a10 10 0 0110 10" />
                  </svg>
                  <svg
                    v-else-if="response.error"
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <svg
                    v-else
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div class="flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-semibold leading-tight">{{ formatModelName(response.model.name) }}</p>
                    <span class="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">{{ response.model.status }}</span>
                  </div>
                  <p v-if="response.loading" class="text-xs text-slate-500 mt-2">Sedang memuat jawaban...</p>
                  <p v-else-if="response.error" class="text-xs text-red-300 mt-2">{{ response.error }}</p>
                  <p v-else-if="response.thinking" class="text-[11px] italic text-slate-400 mt-2 truncate">Thinking: {{ response.thinking.slice(0, 120) }}<span v-if="response.thinking.length > 120">…</span></p>
                  <p v-else class="text-[11px] text-slate-500 mt-2">Waktu respons: {{ formatDuration(response.durationMs) }}</p>
                </div>
                <button
                  type="button"
                  class="ml-auto -mr-1 mt-1 hidden rounded-full border border-transparent p-1 text-xs text-slate-500 transition hover:border-red-500/40 hover:text-red-300 group-hover:flex"
                  @click.stop="removeResponse(response.id)"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-.867 12.142A2 2 0 0116.138 20H7.862a2 2 0 01-1.995-1.858L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          </aside>
        </div>

        <section class="border-t border-slate-800 bg-slate-900/70 px-4 py-4 sm:px-6">
          <div class="max-w-3xl mx-auto">
            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-lg shadow-slate-900/40 p-3">
              <label for="prompt" class="sr-only">Prompt</label>
              <textarea
                id="prompt"
                v-model="query"
                rows="2"
                placeholder="Ketik pesan Anda di sini..."
                class="w-full resize-none rounded-xl border border-transparent bg-transparent px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary/40 focus:outline-none focus:ring-0"
              ></textarea>
              <div class="mt-2 flex items-center justify-between">
                <p class="text-xs text-slate-500">Pilih minimal satu model sebelum mengirim.</p>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="text-xs text-slate-400 hover:text-slate-200 transition"
                    @click="clearSelections"
                    :disabled="selectedCount === 0"
                  >
                    Reset pilihan
                  </button>
                  <button
                    type="button"
                    @click="submitQuery"
                    :disabled="selectedCount === 0 || !query.trim() || isSubmitting"
                    class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-primary/30 transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    <svg
                      v-if="isSubmitting"
                      class="h-4 w-4 animate-spin text-slate-900"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span>{{ isSubmitting ? 'Mengirim...' : 'Kirim prompt' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
:deep(pre) {
  background-color: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 0.75rem;
  padding: 1rem;
  margin: 0.75rem 0;
  overflow-x: auto;
}

:deep(code) {
  font-family: 'Fira Code', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.875rem;
}
</style>
