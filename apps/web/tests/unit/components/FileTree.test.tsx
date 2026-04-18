import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FileTree } from '@/components/phases/phase4/FileTree'
import type { FileTreeNode, ProjectFile } from '@/types'

const sampleTree: FileTreeNode[] = [
  {
    type: 'folder',
    name: 'src',
    path: '/src',
    children: [
      { type: 'file', name: 'user.ts', path: '/src/user.ts', language: 'typescript', isModified: false, isStreaming: false },
      { type: 'file', name: 'config.json', path: '/src/config.json', language: 'json', isModified: false, isStreaming: false },
      { type: 'file', name: '.env.local', path: '/src/.env.local', language: 'plaintext', isModified: true, isStreaming: false },
      { type: 'file', name: 'draft.ts', path: '/src/draft.ts', language: 'typescript', isStreaming: true },
    ],
  },
]

const files: ProjectFile[] = [
  {
    id: 'f1',
    projectId: 'p1',
    path: '/src/user.ts',
    content: '',
    language: 'typescript',
    agentType: 'schema',
    isModified: false,
    createdAt: '',
    updatedAt: '',
  },
]

describe('FileTree', () => {
  it('renders folder and files', () => {
    render(
      <FileTree
        projectId="p1"
        tree={sampleTree}
        expandedFolders={new Set(['/src'])}
        streamingPaths={new Set(['/src/draft.ts'])}
        batchProgress={null}
        plan={null}
        isPlanVisible={false}
        activeTab="/src/user.ts"
        onFileClick={vi.fn()}
        onFolderToggle={vi.fn()}
        onFilesChanged={vi.fn()}
        files={files}
      />,
    )
    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('user.ts')).toBeInTheDocument()
  })

  it('folder click toggles chevron via onFolderToggle', async () => {
    const user = userEvent.setup()
    const onFolderToggle = vi.fn()
    render(
      <FileTree
        projectId="p1"
        tree={sampleTree}
        expandedFolders={new Set(['/src'])}
        streamingPaths={new Set()}
        batchProgress={null}
        plan={null}
        isPlanVisible={false}
        activeTab={null}
        onFileClick={vi.fn()}
        onFolderToggle={onFolderToggle}
        onFilesChanged={vi.fn()}
        files={files}
      />,
    )
    await user.click(screen.getByText('src'))
    expect(onFolderToggle).toHaveBeenCalledWith('/src')
  })

  it('file click calls onFileClick', async () => {
    const user = userEvent.setup()
    const onFileClick = vi.fn()
    render(
      <FileTree
        projectId="p1"
        tree={sampleTree}
        expandedFolders={new Set(['/src'])}
        streamingPaths={new Set()}
        batchProgress={null}
        plan={null}
        isPlanVisible={false}
        activeTab={null}
        onFileClick={onFileClick}
        onFolderToggle={vi.fn()}
        onFilesChanged={vi.fn()}
        files={files}
      />,
    )
    await user.click(screen.getByText('user.ts'))
    expect(onFileClick).toHaveBeenCalledWith('/src/user.ts')
  })

  it('shows SkeletonPlanCard when isPlanVisible and plan loaded', () => {
    render(
      <FileTree
        projectId="p1"
        tree={[]}
        expandedFolders={new Set()}
        streamingPaths={new Set()}
        batchProgress={null}
        plan={{
          totalFiles: 5,
          totalBatches: 2,
          estimatedMs: 4000,
          fileList: [],
          agentBreakdown: [],
        }}
        isPlanVisible
        activeTab={null}
        onFileClick={vi.fn()}
        onFolderToggle={vi.fn()}
        onFilesChanged={vi.fn()}
        files={[]}
      />,
    )
    expect(screen.getByTestId('generation-plan-card')).toBeInTheDocument()
  })

  it('hides SkeletonPlanCard when isPlanVisible is false', () => {
    render(
      <FileTree
        projectId="p1"
        tree={sampleTree}
        expandedFolders={new Set(['/src'])}
        streamingPaths={new Set()}
        batchProgress={null}
        plan={{ totalFiles: 1, totalBatches: 1, estimatedMs: 1000, fileList: [], agentBreakdown: [] }}
        isPlanVisible={false}
        activeTab={null}
        onFileClick={vi.fn()}
        onFolderToggle={vi.fn()}
        onFilesChanged={vi.fn()}
        files={files}
      />,
    )
    expect(screen.queryByTestId('generation-plan-card')).not.toBeInTheDocument()
  })

  it('shows BatchProgressBar when batchProgress active', () => {
    render(
      <FileTree
        projectId="p1"
        tree={sampleTree}
        expandedFolders={new Set(['/src'])}
        streamingPaths={new Set()}
        batchProgress={{
          current: 1,
          total: 2,
          agentType: 'schema_gen',
          isActive: true,
          filesGenerated: 0,
          estimatedBatchFiles: 2,
        }}
        plan={null}
        isPlanVisible={false}
        activeTab={null}
        onFileClick={vi.fn()}
        onFolderToggle={vi.fn()}
        onFilesChanged={vi.fn()}
        files={files}
      />,
    )
    expect(screen.getByTestId('batch-progress-bar')).toBeInTheDocument()
  })

  it('shows empty state when tree empty', () => {
    render(
      <FileTree
        projectId="p1"
        tree={[]}
        expandedFolders={new Set()}
        streamingPaths={new Set()}
        batchProgress={null}
        plan={null}
        isPlanVisible={false}
        activeTab={null}
        onFileClick={vi.fn()}
        onFolderToggle={vi.fn()}
        onFilesChanged={vi.fn()}
        files={[]}
      />,
    )
    expect(screen.getByText('No files yet')).toBeInTheDocument()
  })
})
