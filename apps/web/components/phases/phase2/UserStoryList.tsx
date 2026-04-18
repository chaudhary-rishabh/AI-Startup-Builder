'use client'

import { Check, Loader2, XCircle } from 'lucide-react'

import { useInlineEdit } from '@/hooks/useInlineEdit'
import type { UserStory } from '@/types'

function SaveIndicator({ saveStatus }: { saveStatus: 'idle' | 'saving' | 'saved' | 'error' }): JSX.Element | null {
  if (saveStatus === 'idle') return null
  if (saveStatus === 'saving') return <Loader2 size={12} className="animate-spin text-warning" />
  if (saveStatus === 'saved') return <Check size={12} className="text-success" />
  return (
    <span className="inline-flex text-error" title="Save failed. Click to retry.">
      <XCircle size={12} />
    </span>
  )
}

interface UserStoryListProps {
  stories: UserStory[]
  isStreaming: boolean
  projectId: string
  streamedText?: string
}

function StoryCard({
  story,
  projectId,
  index,
}: {
  story: UserStory
  projectId: string
  index: number
}): JSX.Element {
  const roleEdit = useInlineEdit({
    projectId,
    phase: 2,
    field: `prd.userStories[${index}].role`,
    initialValue: story.role,
  })
  const wantEdit = useInlineEdit({
    projectId,
    phase: 2,
    field: `prd.userStories[${index}].want`,
    initialValue: story.want,
  })
  const soThatEdit = useInlineEdit({
    projectId,
    phase: 2,
    field: `prd.userStories[${index}].soThat`,
    initialValue: story.soThat,
  })

  return (
    <article className="mb-3 rounded-card bg-card p-4 shadow-sm">
      <p className="text-sm text-slate-700">
        As a{' '}
        <span {...roleEdit.contentEditableProps} className="font-medium text-brand">
          {roleEdit.value}
        </span>
        ,
      </p>
      <p className="mt-1 text-sm text-slate-700">
        I want{' '}
        <span {...wantEdit.contentEditableProps} className="font-medium text-heading">
          {wantEdit.value}
        </span>
      </p>
      <p className="mt-1 text-sm italic text-muted">
        so that{' '}
        <span {...soThatEdit.contentEditableProps} className="font-medium text-slate-700">
          {soThatEdit.value}
        </span>
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-full bg-output px-2 py-0.5 text-[10px] text-muted">
          Feature {story.featureId ?? 'Unlinked'}
        </span>
        <span className="inline-flex items-center gap-1">
          <SaveIndicator saveStatus={roleEdit.saveStatus} />
          <SaveIndicator saveStatus={wantEdit.saveStatus} />
          <SaveIndicator saveStatus={soThatEdit.saveStatus} />
        </span>
      </div>
    </article>
  )
}

export function UserStoryList({ stories, isStreaming, projectId, streamedText }: UserStoryListProps): JSX.Element {
  if (isStreaming) {
    return (
      <div className="rounded-card bg-card p-4 text-sm text-slate-700">
        {streamedText}
        <span className="ml-1 inline-block animate-pulse">|</span>
      </div>
    )
  }

  return (
    <section>
      {stories.map((story, index) => (
        <StoryCard key={story.id} story={story} projectId={projectId} index={index} />
      ))}
    </section>
  )
}
