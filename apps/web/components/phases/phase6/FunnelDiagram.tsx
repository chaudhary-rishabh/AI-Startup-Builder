'use client'

import { Fragment } from 'react'

export interface FunnelStep {
  name: string
  users: number
  conversionRate: number
  dropOffRate: number
}

const pastel: Record<string, string> = {
  Acquisition: 'bg-blue-100',
  Activation: 'bg-green-100',
  Retention: 'bg-amber-100',
  Revenue: 'bg-purple-100',
}

interface FunnelDiagramProps {
  steps: FunnelStep[]
}

export function FunnelDiagram({ steps }: FunnelDiagramProps): JSX.Element {
  return (
    <div className="rounded-lg bg-bg p-6 shadow-sm">
      <div className="flex w-full flex-wrap items-end gap-1 md:flex-nowrap">
        {steps.map((step, index) => {
          const bg = pastel[step.name] ?? 'bg-divider'
          return (
            <Fragment key={step.name}>
              <div
                className={`flex min-h-[80px] min-w-[72px] flex-1 flex-col justify-center rounded-md px-2 py-3 text-center ${bg}`}
                style={{ flexGrow: Math.max(1, step.users) }}
              >
                <p className="text-sm font-medium text-heading">{step.name}</p>
                <p className="text-[13px] text-muted">{step.users.toLocaleString()} users</p>
                <p className="font-display text-lg text-heading">{Math.round(step.conversionRate)}%</p>
              </div>
              {index < steps.length - 1 ? (
                <div className="flex w-11 shrink-0 flex-col items-center justify-end pb-2 text-center">
                  <span className="text-[12px] leading-tight text-error">▽ {step.dropOffRate}% drop-off</span>
                </div>
              ) : null}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
