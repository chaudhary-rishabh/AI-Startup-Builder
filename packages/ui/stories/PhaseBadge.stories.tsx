import type { Meta, StoryObj } from '@storybook/react'

import { PhaseBadge } from '../src/components/custom/PhaseBadge'

const meta: Meta<typeof PhaseBadge> = {
  title: 'Custom/PhaseBadge',
  component: PhaseBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    phase: {
      control: { type: 'select' },
      options: [1, 2, 3, 4, 5, 6],
    },
    size: {
      control: { type: 'radio' },
      options: ['sm', 'md'],
    },
  },
}

export default meta
type Story = StoryObj<typeof PhaseBadge>

export const Default: Story = {
  args: { phase: 1, size: 'md' },
}

export const AllPhases: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {([1, 2, 3, 4, 5, 6] as const).map((phase) => (
        <PhaseBadge key={phase} phase={phase} size="md" />
      ))}
    </div>
  ),
}

export const SmallSize: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4">
      {([1, 2, 3, 4, 5, 6] as const).map((phase) => (
        <PhaseBadge key={phase} phase={phase} size="sm" />
      ))}
    </div>
  ),
}
