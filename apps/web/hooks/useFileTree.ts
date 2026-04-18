'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import { createFile, getProjectFiles, updateFileContent } from '@/api/files.api'
import type { EditorTab, FileTreeNode, ProjectFile, SSEBatchStartEvent } from '@/types'

export interface FileTreeBatchProgress {
  current: number
  total: number
  agentType: string
  isActive: boolean
  filesGenerated: number
  estimatedBatchFiles: number
}

export interface UseFileTreeReturn {
  tree: FileTreeNode[]
  expandedFolders: Set<string>
  toggleFolder(path: string): void
  openTabs: EditorTab[]
  activeTab: string | null
  openFile(path: string): void
  closeTab(path: string): void
  setActiveTab(path: string): void
  activeFileContent: string | null
  isLoadingContent: boolean
  streamingPaths: Set<string>
  addStreamingFile(path: string, language: string): void
  completeStreamingFile(path: string, size: number): void
  batchProgress: FileTreeBatchProgress | null
  setBatchProgress(event: SSEBatchStartEvent | null): void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveActiveFile(content: string): Promise<void>
  loadFiles(projectId: string): Promise<void>
  refreshFile(path: string): Promise<void>
  upsertLocalFile(file: ProjectFile): void
  removeLocalFileByPath(path: string): void
  setEditorBuffer(path: string, content: string): void
  markTabSaved(path: string): void
  files: ProjectFile[]
  replaceFiles(list: ProjectFile[]): void
}

function normalizePath(path: string): string {
  if (!path.startsWith('/')) return `/${path}`
  return path
}

function inferLanguageFromPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.tsx')) return 'tsx'
  if (lower.endsWith('.ts')) return 'typescript'
  if (lower.endsWith('.jsx')) return 'jsx'
  if (lower.endsWith('.js')) return 'javascript'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.css') || lower.endsWith('.scss')) return 'css'
  if (lower.endsWith('.html')) return 'html'
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml'
  if (lower.endsWith('.md')) return 'markdown'
  return 'plaintext'
}

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function buildTree(files: ProjectFile[], streamingPaths: Set<string>, streamingLang: Map<string, string>): FileTreeNode[] {
  const synthetic: ProjectFile[] = []
  for (const path of streamingPaths) {
    const norm = normalizePath(path)
    if (!files.some((f) => normalizePath(f.path) === norm)) {
      synthetic.push({
        id: `__stream__:${norm}`,
        projectId: '',
        path: norm,
        content: '',
        language: streamingLang.get(norm) ?? inferLanguageFromPath(norm),
        agentType: 'schema',
        isModified: false,
        createdAt: '',
        updatedAt: '',
      })
    }
  }
  const all = [...files, ...synthetic]

  const rootChildren: FileTreeNode[] = []

  const findOrCreateFolder = (parent: FileTreeNode[], name: string, fullPath: string): FileTreeNode => {
    let folder = parent.find((c) => c.type === 'folder' && c.path === fullPath)
    if (!folder) {
      folder = { type: 'folder', name, path: fullPath, children: [] }
      parent.push(folder)
    }
    return folder
  }

  for (const file of all) {
    const norm = normalizePath(file.path)
    const parts = norm.split('/').filter(Boolean)
    let level = rootChildren
    let prefix = ''
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]!
      prefix = `${prefix}/${part}`
      const isLast = i === parts.length - 1
      if (isLast) {
        const isStream = streamingPaths.has(norm)
        const node: FileTreeNode = {
          type: 'file',
          name: part,
          path: norm,
          language: file.language,
          agentType: file.agentType,
          isModified: file.isModified,
          isStreaming: isStream,
        }
        if (!level.some((c) => c.type === 'file' && c.path === norm)) {
          level.push(node)
        }
      } else {
        const folder = findOrCreateFolder(level, part, prefix)
        if (!folder.children) folder.children = []
        level = folder.children
      }
    }
  }

  const sortRecursive = (nodes: FileTreeNode[]): FileTreeNode[] =>
    sortNodes(
      nodes.map((n) => (n.type === 'folder' && n.children ? { ...n, children: sortRecursive(n.children) } : n)),
    )

  return sortRecursive(rootChildren)
}

function firstMeaningfulPath(tree: FileTreeNode[]): string | null {
  const preferred = ['/src/index.ts', '/src/index.tsx', '/src/main.ts', '/src/main.tsx', '/package.json']
  const collectFiles = (nodes: FileTreeNode[]): string[] => {
    const out: string[] = []
    for (const n of nodes) {
      if (n.type === 'file') out.push(n.path)
      else if (n.children) out.push(...collectFiles(n.children))
    }
    return out
  }
  const filePaths = collectFiles(tree)
  for (const p of preferred) {
    if (filePaths.includes(p)) return p
  }
  return filePaths.sort((a, b) => a.localeCompare(b))[0] ?? null
}

export function useFileTree(projectId: string): UseFileTreeReturn {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(['/src']))
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([])
  const [activeTab, setActiveTabState] = useState<string | null>(null)
  const [activeFileContent, setActiveFileContent] = useState<string | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [streamingPathsState, setStreamingPathsState] = useState<Set<string>>(() => new Set())
  const [streamingLang, setStreamingLang] = useState<Map<string, string>>(() => new Map())
  const [batchProgress, setBatchProgressState] = useState<FileTreeBatchProgress | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const pendingPersistRef = useRef<Map<string, string>>(new Map())
  const flushPromiseRef = useRef<Promise<void> | null>(null)
  const streamingLangRef = useRef<Map<string, string>>(new Map())

  const filesRef = useRef(files)
  filesRef.current = files

  const lastProjectIdRef = useRef<string | null>(null)

  const streamingPathsRef = useRef(streamingPathsState)
  streamingPathsRef.current = streamingPathsState

  const tree = useMemo(
    () => buildTree(files, streamingPathsState, streamingLang),
    [files, streamingPathsState, streamingLang],
  )

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const flushPersistQueue = useCallback(async () => {
    const queue = new Map(pendingPersistRef.current)
    pendingPersistRef.current.clear()
    if (!queue.size) return
    const latest = await getProjectFiles(projectId)
    const creates: Promise<ProjectFile>[] = []
    for (const [path, language] of queue) {
      const norm = normalizePath(path)
      if (latest.some((f) => normalizePath(f.path) === norm)) continue
      creates.push(
        createFile(projectId, {
          path: norm,
          content: '',
          language: language || inferLanguageFromPath(norm),
        }),
      )
    }
    if (creates.length) await Promise.all(creates)
    const refreshed = await getProjectFiles(projectId)
    setFiles(refreshed)
  }, [projectId])

  const schedulePersist = useCallback(
    (path: string, language: string): Promise<void> => {
      pendingPersistRef.current.set(normalizePath(path), language)
      if (!flushPromiseRef.current) {
        flushPromiseRef.current = (async () => {
          await Promise.resolve()
          try {
            await flushPersistQueue()
          } finally {
            flushPromiseRef.current = null
          }
        })()
      }
      return flushPromiseRef.current
    },
    [flushPersistQueue],
  )

  const loadFiles = useCallback(async (pid: string) => {
    const switchedProject = lastProjectIdRef.current !== null && lastProjectIdRef.current !== pid
    lastProjectIdRef.current = pid
    if (switchedProject) {
      setOpenTabs([])
      setActiveTabState(null)
      setActiveFileContent(null)
      setStreamingPathsState(new Set())
      setStreamingLang(new Map())
      streamingLangRef.current = new Map()
    }
    const list = await getProjectFiles(pid)
    setFiles(list)
    const built = buildTree(list, new Set(), new Map())
    const first = firstMeaningfulPath(built)
    setOpenTabs((tabs) => {
      if (tabs.length > 0) return tabs
      if (!first) return tabs
      const f = list.find((x) => normalizePath(x.path) === first)
      return [
        {
          path: first,
          language: f?.language ?? inferLanguageFromPath(first),
          isModified: Boolean(f?.isModified),
          isDirty: false,
        },
      ]
    })
    if (first) {
      const f = list.find((x) => normalizePath(x.path) === first)
      setActiveTabState(first)
      setActiveFileContent(f?.content ?? '')
    }
  }, [])

  const refreshFile = useCallback(
    async (path: string) => {
      const list = await getProjectFiles(projectId)
      setFiles(list)
      const norm = normalizePath(path)
      const file = list.find((f) => normalizePath(f.path) === norm)
      setActiveTabState((active) => {
        if (active === norm && file) {
          setActiveFileContent(file.content)
        }
        return active
      })
    },
    [projectId],
  )

  const fileByPath = useCallback((path: string): ProjectFile | undefined => {
    const norm = normalizePath(path)
    return filesRef.current.find((f) => normalizePath(f.path) === norm)
  }, [])

  const openFile = useCallback(
    async (path: string) => {
      const norm = normalizePath(path)
      if (streamingPathsRef.current.has(norm)) return
      setActiveTabState(norm)
      setOpenTabs((tabs) => {
        const exists = tabs.find((t) => t.path === norm)
        if (exists) return tabs
        const f = filesRef.current.find((x) => normalizePath(x.path) === norm)
        return [
          ...tabs,
          {
            path: norm,
            language: f?.language ?? inferLanguageFromPath(norm),
            isModified: Boolean(f?.isModified),
            isDirty: false,
          },
        ]
      })
      const f = filesRef.current.find((x) => normalizePath(x.path) === norm)
      if (f) {
        setActiveFileContent(f.content)
        return
      }
      setIsLoadingContent(true)
      try {
        const list = await getProjectFiles(projectId)
        setFiles(list)
        const hit = list.find((x) => normalizePath(x.path) === norm)
        setActiveFileContent(hit?.content ?? '')
      } finally {
        setIsLoadingContent(false)
      }
    },
    [projectId],
  )

  const closeTab = useCallback((path: string) => {
    const norm = normalizePath(path)
    setOpenTabs((tabs) => {
      const idx = tabs.findIndex((t) => t.path === norm)
      if (idx < 0) return tabs
      const next = tabs.filter((t) => t.path !== norm)
      setActiveTabState((active) => {
        if (active !== norm) return active
        const prev = next[idx - 1] ?? next[idx] ?? null
        const np = prev?.path ?? null
        if (np) {
          const hit = filesRef.current.find((x) => normalizePath(x.path) === np)
          setActiveFileContent(hit?.content ?? '')
        } else {
          setActiveFileContent(null)
        }
        return np
      })
      return next
    })
  }, [])

  const setActiveTab = useCallback((path: string) => {
    const norm = normalizePath(path)
    setActiveTabState(norm)
    const f = filesRef.current.find((x) => normalizePath(x.path) === norm)
    setActiveFileContent(f?.content ?? '')
  }, [])

  const addStreamingFile = useCallback((path: string, language: string) => {
    const norm = normalizePath(path)
    streamingLangRef.current.set(norm, language)
    setStreamingLang((prev) => {
      const next = new Map(prev)
      next.set(norm, language)
      return next
    })
    setStreamingPathsState((prev) => {
      const next = new Set(prev)
      next.add(norm)
      return next
    })
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      const segments = norm.split('/').filter(Boolean)
      let acc = ''
      for (let i = 0; i < segments.length - 1; i += 1) {
        acc += `/${segments[i]}`
        next.add(acc)
      }
      return next
    })
  }, [])

  const completeStreamingFile = useCallback(
    (path: string, _size: number) => {
      const norm = normalizePath(path)
      const lang = streamingLangRef.current.get(norm) ?? inferLanguageFromPath(norm)
      streamingLangRef.current.delete(norm)
      setStreamingLang((prev) => {
        const next = new Map(prev)
        next.delete(norm)
        return next
      })
      setStreamingPathsState((prev) => {
        const next = new Set(prev)
        next.delete(norm)
        return next
      })
      void schedulePersist(norm, lang)
        .catch(() => undefined)
        .then(() => refreshFile(norm))
      setBatchProgressState((bp) =>
        bp && bp.isActive
          ? { ...bp, filesGenerated: Math.min(bp.filesGenerated + 1, bp.estimatedBatchFiles) }
          : bp,
      )
    },
    [refreshFile, schedulePersist],
  )

  const setBatchProgress = useCallback((event: SSEBatchStartEvent | null) => {
    if (!event) {
      setBatchProgressState(null)
      return
    }
    setBatchProgressState({
      current: event.batchNumber,
      total: event.totalBatches,
      agentType: event.agentType,
      isActive: true,
      filesGenerated: 0,
      estimatedBatchFiles: event.fileCount,
    })
  }, [])

  const saveActiveFile = useCallback(
    async (content: string) => {
      const tab = activeTab
      if (!tab) return
      const f = fileByPath(tab)
      if (!f) return
      setSaveStatus('saving')
      try {
        await updateFileContent(projectId, f.id, content)
        setFiles((prev) =>
          prev.map((x) => (x.id === f.id ? { ...x, content, isModified: true, updatedAt: new Date().toISOString() } : x)),
        )
        setOpenTabs((tabs) => tabs.map((t) => (t.path === tab ? { ...t, isDirty: false, isModified: true } : t)))
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1200)
      } catch {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    },
    [activeTab, fileByPath, projectId],
  )

  const upsertLocalFile = useCallback((file: ProjectFile) => {
    setFiles((prev) => {
      const map = new Map(prev.map((x) => [normalizePath(x.path), x]))
      map.set(normalizePath(file.path), file)
      return [...map.values()].sort((a, b) => a.path.localeCompare(b.path))
    })
  }, [])

  const removeLocalFileByPath = useCallback((path: string) => {
    const norm = normalizePath(path)
    setFiles((prev) => prev.filter((f) => normalizePath(f.path) !== norm))
  }, [])

  const setEditorBuffer = useCallback((path: string, content: string) => {
    const norm = normalizePath(path)
    setActiveFileContent(content)
    setOpenTabs((tabs) =>
      tabs.map((t) => {
        if (t.path !== norm) return t
        const f = filesRef.current.find((x) => normalizePath(x.path) === norm)
        const dirty = f ? content !== f.content : content.length > 0
        return { ...t, isDirty: dirty }
      }),
    )
  }, [])

  const markTabSaved = useCallback((path: string) => {
    const norm = normalizePath(path)
    setOpenTabs((tabs) => tabs.map((t) => (t.path === norm ? { ...t, isDirty: false } : t)))
  }, [])

  const replaceFiles = useCallback((list: ProjectFile[]) => {
    setFiles([...list].sort((a, b) => a.path.localeCompare(b.path)))
  }, [])

  return {
    tree,
    expandedFolders,
    toggleFolder,
    openTabs,
    activeTab,
    openFile,
    closeTab,
    setActiveTab,
    activeFileContent,
    isLoadingContent,
    streamingPaths: streamingPathsState,
    addStreamingFile,
    completeStreamingFile,
    batchProgress,
    setBatchProgress,
    saveStatus,
    saveActiveFile,
    loadFiles,
    refreshFile,
    upsertLocalFile,
    removeLocalFileByPath,
    setEditorBuffer,
    markTabSaved,
    files,
    replaceFiles,
  }
}
