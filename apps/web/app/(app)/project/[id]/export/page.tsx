'use client'

import { useQuery } from '@tanstack/react-query'
import { Download, FileCode2, FileText, Monitor } from 'lucide-react'
import { use, useState } from 'react'
import { toast } from 'sonner'

import { createExportJob, downloadExport, getExportJob } from '@/api/export.api'
import { getProjectFiles } from '@/api/files.api'
import { useProject } from '@/hooks/useProject'

type ExportFormat = 'docx' | 'zip' | 'json' | 'html'

interface CardDef {
  format: ExportFormat
  title: string
  subtitle: string
  badge: string
  icon: typeof FileText
  color: string
  disabled?: boolean
  disabledReason?: string
}

async function pollJob(projectId: string, jobId: string): Promise<Awaited<ReturnType<typeof getExportJob>>> {
  for (let i = 0; i < 30; i += 1) {
    const job = await getExportJob(projectId, jobId)
    if (job.status === 'complete' && job.downloadUrl) return job
    if (job.status === 'failed') throw new Error('Export failed')
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('Timed out waiting for export')
}

export default function ExportPage({ params }: { params: Promise<{ id: string }> }): JSX.Element {
  const { id: projectId } = use(params)
  const { data: project } = useProject(projectId)
  const filesQuery = useQuery({
    queryKey: ['project-files', projectId, 'export'],
    queryFn: () => getProjectFiles(projectId),
  })
  const [busy, setBusy] = useState<ExportFormat | null>(null)

  const files = filesQuery.data ?? []
  const hasPhase4 = files.length > 0
  const hasPhase2 = Boolean(project?.phase2Output?.prd?.features?.length)
  const hasPhase3 = Boolean(project?.phase2Output?.uiux?.wireframes?.length)

  const cards: CardDef[] = [
    {
      format: 'docx',
      title: 'PRD & Planning Document',
      subtitle: 'All Phase 2 outputs: features, user stories, system design',
      badge: 'DOCX',
      icon: FileText,
      color: 'text-blue-600',
      disabled: !hasPhase2,
      disabledReason: 'Complete Phase 2 first',
    },
    {
      format: 'zip',
      title: 'Generated Code',
      subtitle: 'All Phase 4 files: schema, API, backend, frontend',
      badge: 'ZIP',
      icon: FileCode2,
      color: 'text-[#0D9488]',
      disabled: !hasPhase4,
      disabledReason: 'Complete Phase 4 first',
    },
    {
      format: 'html',
      title: 'UI Prototype',
      subtitle: 'All Phase 3 HTML screens in a self-contained zip',
      badge: 'HTML + ZIP',
      icon: Monitor,
      color: 'text-purple-600',
      disabled: !hasPhase3,
      disabledReason: 'Complete Phase 3 first',
    },
    {
      format: 'json',
      title: 'Complete Project Data',
      subtitle: 'All outputs from all phases as structured JSON',
      badge: 'JSON',
      icon: Download,
      color: 'text-amber-600',
    },
  ]

  const runExport = async (format: ExportFormat, includePhases?: number[]): Promise<void> => {
    setBusy(format)
    try {
      const job =
        includePhases && includePhases.length
          ? await createExportJob({ projectId, format, includePhases })
          : await createExportJob({ projectId, format })
      const done = await pollJob(projectId, job.jobId)
      if (done.downloadUrl) {
        downloadExport(done.downloadUrl, `${project?.name ?? projectId}-${format}`)
        toast.success(`${format.toUpperCase()} downloaded`)
      }
    } catch {
      toast.error('Export failed')
    } finally {
      setBusy(null)
    }
  }

  if (!project) {
    return <div className="p-8">Loading…</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-2xl text-heading">Export Project</h1>
      <p className="mt-2 text-sm text-muted">Download all outputs from {project.name}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon
          const loading = busy === card.format
          const wrap = (
            <div
              className={`flex flex-col rounded-card border border-divider bg-card p-6 shadow-sm ${
                card.disabled ? 'opacity-50' : ''
              }`}
            >
              <Icon className={`h-8 w-8 ${card.color}`} />
              <h2 className="mt-4 font-display text-lg text-heading">{card.title}</h2>
              <p className="mt-1 text-sm text-muted">{card.subtitle}</p>
              <span className="mt-3 inline-flex w-fit rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-muted">{card.badge}</span>
              <button
                type="button"
                disabled={Boolean(card.disabled) || loading}
                onClick={() => void runExport(card.format, card.format === 'json' ? [1, 2, 3, 4, 5, 6] : undefined)}
                className="mt-6 h-10 w-full rounded-md border border-brand text-sm font-medium text-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Preparing…' : 'Download →'}
              </button>
            </div>
          )
          if (card.disabled && card.disabledReason) {
            return (
              <div key={card.format} title={card.disabledReason}>
                {wrap}
              </div>
            )
          }
          return <div key={card.format}>{wrap}</div>
        })}
      </div>
    </div>
  )
}
