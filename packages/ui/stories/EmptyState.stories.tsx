import type { Meta, StoryObj } from '@storybook/react'

import { EmptyState } from '../src/components/custom/EmptyState'

const meta: Meta<typeof EmptyState> = {
  title: 'Custom/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    title:       { control: 'text' },
    description: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const WithAction: Story = {
  name: 'With Action Button',
  args: {
    title:       'No projects yet',
    description: "Start by describing your idea and we'll guide you through the full build process.",
    action:      { label: 'Create your first project', onClick: () => alert('Create clicked') },
  },
}

export const WithoutAction: Story = {
  name: 'Without Action Button',
  args: {
    title:       'No results found',
    description: "Try adjusting your filters or search term to find what you're looking for.",
  },
}

export const SearchEmpty: Story = {
  name: 'Empty Search',
  args: {
    title:       "No matching projects",
    description: 'We couldn\'t find any projects matching "blockchain AI agent". Try a different keyword.',
  },
}

export const PhaseEmpty: Story = {
  name: 'Phase Output Missing',
  args: {
    title:       'Phase 3 output not generated yet',
    description: 'Complete Phase 2 first to unlock the Design canvas.',
  },
}
