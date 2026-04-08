import type { Meta, StoryObj } from '@storybook/react'

import { PlanBadge } from '../src/components/custom/PlanBadge'

const meta: Meta<typeof PlanBadge> = {
  title: 'Custom/PlanBadge',
  component: PlanBadge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    plan: {
      control: { type: 'select' },
      options: ['free', 'pro', 'enterprise'],
    },
  },
}

export default meta
type Story = StoryObj<typeof PlanBadge>

export const Free: Story       = { args: { plan: 'free' } }
export const Pro: Story        = { args: { plan: 'pro' } }
export const Enterprise: Story = { args: { plan: 'enterprise' } }

export const AllPlans: Story = {
  name: 'All Plans in a Row',
  render: () => (
    <div className="flex items-center gap-4 p-4">
      <PlanBadge plan="free" />
      <PlanBadge plan="pro" />
      <PlanBadge plan="enterprise" />
    </div>
  ),
}

export const InUserContext: Story = {
  name: 'In User Row Context',
  render: () => (
    <div className="space-y-2 rounded-card border border-divider bg-white p-4 w-72">
      {[
        { name: 'Sarah Connor',  plan: 'free'       as const },
        { name: 'John Doe',      plan: 'pro'        as const },
        { name: 'Acme Corp',     plan: 'enterprise' as const },
      ].map(({ name, plan }) => (
        <div key={name} className="flex items-center justify-between py-1">
          <span className="text-sm text-brand-dark">{name}</span>
          <PlanBadge plan={plan} />
        </div>
      ))}
    </div>
  ),
}
