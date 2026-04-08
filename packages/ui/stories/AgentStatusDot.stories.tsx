import type { Meta, StoryObj } from '@storybook/react'

import { AgentStatusDot } from '../src/components/custom/AgentStatusDot'

const meta: Meta<typeof AgentStatusDot> = {
  title: 'Custom/AgentStatusDot',
  component: AgentStatusDot,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['idle', 'running', 'done', 'error'],
    },
  },
}

export default meta
type Story = StoryObj<typeof AgentStatusDot>

export const Interactive: Story = { args: { status: 'running' } }

export const AllStatuses: Story = {
  name: 'All Statuses (running animates)',
  render: () => (
    <div className="flex items-center gap-8 p-6">
      {(['idle', 'running', 'done', 'error'] as const).map((status) => (
        <div key={status} className="flex flex-col items-center gap-2">
          <AgentStatusDot status={status} />
          <span className="text-xs text-brand-light capitalize">{status}</span>
        </div>
      ))}
    </div>
  ),
}

export const InContext: Story = {
  name: 'In Agent Row Context',
  render: () => (
    <div className="space-y-3 rounded-card border border-divider bg-white p-4 w-80">
      {[
        { name: 'Idea Analyzer',       status: 'done'    as const },
        { name: 'Market Research',     status: 'running' as const },
        { name: 'Validation Scorer',   status: 'idle'    as const },
      ].map(({ name, status }) => (
        <div key={name} className="flex items-center justify-between">
          <span className="text-sm text-brand-dark">{name}</span>
          <div className="flex items-center gap-1.5">
            <AgentStatusDot status={status} />
            <span className="text-xs text-brand-light capitalize">{status}</span>
          </div>
        </div>
      ))}
    </div>
  ),
}
