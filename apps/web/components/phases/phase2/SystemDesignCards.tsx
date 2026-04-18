'use client'

import { Cloud, Database, ExternalLink, Monitor, Server, ShieldCheck } from 'lucide-react'

import type { ApiEndpoint, TechStackCard } from '@/types'

interface SystemDesignCardsProps {
  techStack: TechStackCard[]
  apiEndpoints: ApiEndpoint[]
  isStreaming: boolean
  streamedText?: string
}

function StackIcon({ category }: { category: TechStackCard['category'] }): JSX.Element {
  if (category === 'frontend') return <Monitor size={16} aria-label="frontend icon" />
  if (category === 'backend') return <Server size={16} />
  if (category === 'database') return <Database size={16} aria-label="database icon" />
  if (category === 'auth') return <ShieldCheck size={16} />
  return <Cloud size={16} />
}

function methodClasses(method: ApiEndpoint['method']): string {
  if (method === 'GET') return 'border border-success/20 bg-success/10 text-success'
  if (method === 'POST') return 'border border-info/20 bg-info/10 text-info'
  if (method === 'DELETE') return 'border border-error/20 bg-error/10 text-error'
  return 'border border-warning/20 bg-warning/10 text-warning'
}

export function SystemDesignCards({
  techStack,
  apiEndpoints,
  isStreaming,
  streamedText,
}: SystemDesignCardsProps): JSX.Element {
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {techStack.map((stack) => (
          <article key={`${stack.category}-${stack.name}`} className="rounded-card bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-muted">
              <StackIcon category={stack.category} />
              <span className="text-[10px] uppercase tracking-[0.08em]">{stack.category}</span>
            </div>
            <p className="text-base font-semibold text-heading">{stack.name}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{stack.reasoning}</p>
            {stack.docsUrl ? (
              <a
                href={stack.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-info"
              >
                Docs ↗ <ExternalLink size={12} />
              </a>
            ) : null}
          </article>
        ))}
      </div>

      <div className="mt-6">
        <header className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-heading">API Endpoints</h3>
          <span className="rounded-full bg-output px-2 py-0.5 text-[11px] text-muted">{apiEndpoints.length}</span>
        </header>
        <div className="overflow-hidden rounded-md border border-divider">
          <table className="w-full text-left">
            <thead className="bg-divider text-[11px] uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="w-[20%] px-3 py-2">Method</th>
                <th className="w-[40%] px-3 py-2">Route</th>
                <th className="w-[40%] px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {apiEndpoints.map((endpoint, index) => (
                <tr key={`${endpoint.method}-${endpoint.route}`} className={index % 2 ? 'bg-card' : 'bg-bg'}>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${methodClasses(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-heading">{endpoint.route}</td>
                  <td className="px-3 py-2 text-xs text-muted">{endpoint.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
