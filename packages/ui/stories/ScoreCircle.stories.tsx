import type { Meta, StoryObj } from '@storybook/react'

import { ScoreCircle } from '../src/components/custom/ScoreCircle'

const meta: Meta<typeof ScoreCircle> = {
  title: 'Custom/ScoreCircle',
  component: ScoreCircle,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    score: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    size: { control: { type: 'number', min: 48, max: 200, step: 8 } },
  },
}

export default meta
type Story = StoryObj<typeof ScoreCircle>

export const Interactive: Story = {
  args: { score: 72, size: 96 },
}

export const ThresholdBands: Story = {
  name: 'Score Threshold Bands (0 / 40 / 70 / 100)',
  render: () => (
    <div className="flex items-end gap-8 p-6">
      {[
        { score: 0,   label: 'Red (<40)',   size: 80 },
        { score: 40,  label: 'Amber (40)',  size: 80 },
        { score: 70,  label: 'Green (70)',  size: 80 },
        { score: 100, label: 'Perfect',     size: 80 },
      ].map(({ score, label, size }) => (
        <div key={score} className="flex flex-col items-center gap-2">
          <ScoreCircle score={score} size={size} />
          <span className="text-xs text-brand-light">{label}</span>
        </div>
      ))}
    </div>
  ),
}

export const ScoreZero: Story   = { args: { score: 0,   size: 96 } }
export const ScoreForty: Story  = { args: { score: 40,  size: 96 } }
export const ScoreSeventy: Story = { args: { score: 70,  size: 96 } }
export const ScorePerfect: Story = { args: { score: 100, size: 96 } }

export const LargeSize: Story = { args: { score: 82, size: 160 } }
