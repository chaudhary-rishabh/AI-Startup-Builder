'use client'

import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  File,
  FileCode,
  FileCode2,
  FileJson,
  FileText,
  FileType,
  FileWarning,
  Folder,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { createFile, deleteFile } from '@/api/files.api'
import type { FileTreeBatchProgress } from '@/hooks/useFileTree'
import type { FileTreeNode, GenerationPlan, ProjectFile } from '@/types'

import { BatchProgressBar } from './BatchProgressBar'
import { SkeletonPlanCard } from './SkeletonPlanCard'

function fileIcon(path: string): { Icon: typeof File; className: string } {
  const lower = path.toLowerCase()
  if (lower.endsWith('.ts') || lower.endsWith('.tsx'))
    return { Icon: FileCode2, className: 'text-[#0D9488]' }
  if (lower.endsWith('.js') || lower.endsWith('.jsx'))
    return { Icon: FileCode2, className: 'text-amber-600' }
  if (lower.endsWith('.json')) return { Icon: FileJson, className: 'text-amber-600' }
  if (lower.endsWith('.css') || lower.endsWith('.scss')) return { Icon: FileType, className: 'text-purple-500' }
  if (lower.endsWith('.html')) return { Icon: FileCode, className: 'text-orange-500' }
  if (lower.endsWith('.md')) return { Icon: FileText, className: 'text-slate-400' }
  if (lower.includes('.env')) return { Icon: FileWarning, className: 'text-red-500' }
  return { Icon: File, className: 'text-slate-500' }
}

interface FileTreeProps {
  projectId: string
  tree: FileTreeNode[]
  expandedFolders: Set<string>
  streamingPaths: Set<string>
  batchProgress: FileTreeBatchProgress | null
  plan: GenerationPlan | null
  isPlanVisible: boolean
  activeTab: string | null
  onFileClick: (path: string) => void
  onFolderToggle: (path: string) => void
  onFilesChanged: (list: ProjectFile[]) => void
  files: ProjectFile[]
}

export function FileTree({
  projectId,
  tree,
  expandedFolders,
  streamingPaths,
  batchProgress,
  plan,
  isPlanVisible,
  activeTab,
  onFileClick,
  onFolderToggle,
  onFilesChanged,
  files,
}: FileTreeProps): JSX.Element {
  const [newPathInput, setNewPathInput] = useState('')
  const [showNewInput, setShowNewInput] = useState(false)
  const [renamePath, setRenamePath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; path: string } | null>(null)

  const fileIdByPath = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of files) {
      const p = f.path.startsWith('/') ? f.path : `/${f.path}`
      m.set(p, f.id)
    }
    return m
  }, [files])

  const handleRefresh = useCallback(async () => {
    const { getProjectFiles } = await import('@/api/files.api')
    const list = await getProjectFiles(projectId)
    onFilesChanged(list)
  }, [onFilesChanged, projectId])

  const submitNewFile = useCallback(async () => {
    const raw = newPathInput.trim()
    if (!raw) return
    const path = raw.startsWith('/') ? raw : `/${raw}`
    const created = await createFile(projectId, {
      path,
      content: '',
      language: path.endsWith('.json') ? 'json' : 'typescript',
    })
    onFilesChanged([...files.filter((f) => f.id !== created.id), created].sort((a, b) => a.path.localeCompare(b.path)))
    setNewPathInput('')
    setShowNewInput(false)
    onFileClick(path)
  }, [files, newPathInput, onFileClick, onFilesChanged, projectId])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    await deleteFile(projectId, deleteTarget.id)
    onFilesChanged(files.filter((f) => f.id !== deleteTarget.id))
    setDeleteTarget(null)
  }, [deleteTarget, files, onFilesChanged, projectId])

  const renderNodes = (nodes: FileTreeNode[], depth: number): JSX.Element[] => {
    return nodes.map((node, index) => {
      if (node.type === 'folder') {
        const expanded = expandedFolders.has(node.path)
        return (
          <div key={node.path}>
            <button
              type="button"
              className="flex h-8 w-full items-center gap-1.5 px-3 text-left text-xs text-slate-300 hover:bg-slate-800"
              style={{ paddingLeft: 12 + depth * 12 }}
              onClick={() => onFolderToggle(node.path)}
            >
              <ChevronRight
                size={12}
                className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
              <Folder size={14} className={expanded ? 'text-amber-600' : 'text-slate-500'} />
              <span>{node.name}</span>
            </button>
            {expanded && node.children ? <div>{renderNodes(node.children, depth + 1)}</div> : null}
          </div>
        )
      }

      const isActive = activeTab === node.path
      const isStreaming = Boolean(node.isStreaming || streamingPaths.has(node.path))
      const { Icon, className } = fileIcon(node.path)
      const row = (
        <motion.div
          key={node.path}
          layout
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.08, delay: index * 0.08 }}
          className={`flex h-8 w-full items-center gap-1.5 px-3 text-xs ${
            isActive ? 'bg-slate-700' : ''
          } ${isStreaming ? 'cursor-default' : 'cursor-pointer hover:bg-slate-800'}`}
          style={{ paddingLeft: 12 + depth * 12 }}
          onClick={() => {
            if (!isStreaming) onFileClick(node.path)
          }}
          data-testid={`file-row-${node.path.replace(/\//g, '-')}`}
        >
          <Icon size={12} className={`shrink-0 ${className}`} />
          <span className={`truncate ${isStreaming ? 'italic text-slate-400' : 'text-slate-300'}`}>{node.name}</span>
          {node.isModified ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D9488]" aria-label="modified" /> : null}
          {isStreaming ? (
            <>
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" aria-label="streaming" />
              <Loader2 size={10} className="ml-auto shrink-0 animate-spin text-[#0D9488]" />
            </>
          ) : null}
        </motion.div>
      )

      if (isStreaming) return row

      return (
        <DropdownMenu.Root key={node.path}>
          <DropdownMenu.Trigger asChild>{row}</DropdownMenu.Trigger>
          <DropdownMenu.Content className="z-50 min-w-[160px] rounded-md border border-slate-700 bg-slate-900 p-1 text-xs text-slate-200 shadow-lg">
            <DropdownMenu.Item className="cursor-pointer rounded px-2 py-1.5 hover:bg-slate-800" onSelect={() => onFileClick(node.path)}>
              Open
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="cursor-pointer rounded px-2 py-1.5 hover:bg-slate-800"
              onSelect={() => {
                setRenamePath(node.path)
                setRenameValue(node.path)
              }}
            >
              Rename
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="cursor-pointer rounded px-2 py-1.5 hover:bg-slate-800"
              onSelect={() => {
                const id = fileIdByPath.get(node.path)
                if (id) setDeleteTarget({ id, path: node.path })
              }}
            >
              Delete
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="cursor-pointer rounded px-2 py-1.5 hover:bg-slate-800"
              onSelect={() => void navigator.clipboard.writeText(node.path)}
            >
              Copy path
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )
    })
  }

  const empty = tree.length === 0

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col border-r border-slate-700 bg-[#0F172A]">
      <div className="flex h-10 items-center justify-between border-b border-slate-700 px-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">Explorer</span>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="New file"
            className="rounded p-1 text-slate-400 hover:bg-slate-800"
            onClick={() => setShowNewInput(true)}
          >
            <Plus size={14} />
          </button>
          <button type="button" aria-label="Refresh files" className="rounded p-1 text-slate-400 hover:bg-slate-800" onClick={() => void handleRefresh()}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <SkeletonPlanCard plan={plan} isVisible={isPlanVisible} />
      <BatchProgressBar progress={batchProgress} />

      <div className="flex-1 overflow-y-auto">
        {showNewInput ? (
          <div className="border-b border-slate-800 px-2 py-2">
            <input
              value={newPathInput}
              onChange={(e) => setNewPathInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitNewFile()
              }}
              placeholder="/src/utils/helpers.ts"
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] text-slate-200"
            />
          </div>
        ) : null}
        {renamePath ? (
          <div className="border-b border-slate-800 px-2 py-2">
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setRenamePath(null)
                }
              }}
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] text-slate-200"
            />
          </div>
        ) : null}
        <AnimatePresence>
          {empty ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-xs text-slate-500">No files yet</p>
              <p className="mt-1 text-[11px] text-slate-600">Click a generate button to start</p>
            </div>
          ) : (
            <div>{renderNodes(tree, 0)}</div>
          )}
        </AnimatePresence>
      </div>

      <Dialog.Root open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-200 shadow-xl">
            <Dialog.Title className="text-sm font-medium">Delete file?</Dialog.Title>
            <p className="mt-2 text-xs text-slate-400">{deleteTarget?.path}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close className="rounded px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">Cancel</Dialog.Close>
              <button type="button" className="rounded bg-red-600 px-3 py-1 text-xs text-white" onClick={() => void confirmDelete()}>
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
