import type { Meta, StoryObj } from '@storybook/react'

import { TokenUsageBar } from '../src/components/custom/TokenUsageBar'

const meta: Meta<typeof TokenUsageBar> = {
  title: 'Custom/TokenUsageBar',
  component: TokenUsageBar,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    used:  { control: { type: 'range', min: 0, max: 1_000_000, step: 10_000 } },
    limit: { control: { type: 'range', min: 50_000, max: 1_000_000, step: 50_000 } },
  },
}

export default meta
type Story = StoryObj<typeof TokenUsageBar>

export const Interactive: Story = {
  args: { used: 125_000, limit: 500_000 },
}

export const Low: Story = {
  name: 'Low Usage (< 80%) — Green',
  args: { used: 25_000, limit: 500_000 },
}

export const Warning: Story = {
  name: 'Warning (80–95%) — Amber',
  args: { used: 420_000, limit: 500_000 },
}

export const Critical: Story = {
  name: 'Critical (> 95%) — Red',
  args: { used: 490_000, limit: 500_000 },
}

export const AllThresholds: Story = {
  name: 'All Three Threshold States',
  render: () => (
    <div className="space-y-6 w-80 p-4">
      <div>
        <p className="text-xs text-brand-light mb-2">Low (25k / 500k)</p>
        <TokenUsageBar used={25_000} limit={500_000} />
      </div>
      <div>
        <p className="text-xs text-brand-light mb-2">Warning (420k / 500k)</p>
        <TokenUsageBar used={420_000} limit={500_000} />
      </div>
      <div>
        <p className="text-xs text-brand-light mb-2">Critical (490k / 500k)</p>
        <TokenUsageBar used={490_000} limit={500_000} />
      </div>
    </div>
  ),
}
