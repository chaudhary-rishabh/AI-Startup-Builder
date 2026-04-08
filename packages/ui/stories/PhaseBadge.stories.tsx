import type { Meta, StoryObj } from '@storybook/react'

import { PhaseBadge } from '../src/components/custom/PhaseBadge'

const meta: Meta<typeof PhaseBadge> = {
  title: 'Custom/PhaseBadge',
  component: PhaseBadge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    phase: { control: { type: 'select' }, options: [1, 2, 3, 4, 5, 6] },
    size: { control: { type: 'radio' }, options: ['sm', 'md'] },
  },
}

export default meta
type Story = StoryObj<typeof PhaseBadge>

export const Default: Story = { args: { phase: 1, size: 'md' } }

export const AllPhasesMd: Story = {
  name: 'All Phases — Medium',
  render: () => (
    <div className="flex flex-wrap gap-3 p-4">
      {([1, 2, 3, 4, 5, 6] as const).map((phase) => (
        <PhaseBadge key={phase} phase={phase} size="md" />
      ))}
    </div>
  ),
}

export const AllPhasesSm: Story = {
  name: 'All Phases — Small',
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {([1, 2, 3, 4, 5, 6] as const).map((phase) => (
        <PhaseBadge key={phase} phase={phase} size="sm" />
      ))}
    </div>
  ),
}

export const Grid: Story = {
  name: 'Phase Grid (default)',
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-4">
      {([1, 2, 3, 4, 5, 6] as const).map((phase) => (
        <div key={phase} className="flex flex-col items-center gap-2">
          <PhaseBadge phase={phase} size="md" />
          <span className="text-xs text-brand-light">Phase {phase}</span>
        </div>
      ))}
    </div>
  ),
}
