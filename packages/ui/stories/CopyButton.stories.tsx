import type { Meta, StoryObj } from '@storybook/react'

import { CopyButton } from '../src/components/custom/CopyButton'

const meta: Meta<typeof CopyButton> = {
  title: 'Custom/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    text: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof CopyButton>

export const Default: Story = {
  args: { text: 'npm install @repo/ui' },
}

export const InCodeBlock: Story = {
  name: 'In Code Block Context',
  render: () => (
    <div className="relative flex items-center gap-2 rounded-card bg-brand-dark px-4 py-3 font-code text-sm text-white w-96">
      <span className="flex-1">pnpm turbo run build --dry</span>
      <CopyButton text="pnpm turbo run build --dry" className="text-white hover:text-white/80 hover:bg-white/10" />
    </div>
  ),
}

export const MultipleTokens: Story = {
  name: 'Multiple Copy Targets',
  render: () => {
    const snippets = [
      { label: 'API Key',    value: 'sk_live_1234567890abcdef' },
      { label: 'Project ID', value: 'proj_abc123xyz'          },
      { label: 'Endpoint',   value: 'https://api.example.com' },
    ]
    return (
      <div className="space-y-3 w-80">
        {snippets.map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-card border border-divider bg-white px-3 py-2"
          >
            <div>
              <p className="text-xs text-brand-light">{label}</p>
              <p className="text-sm font-code text-brand-dark">{value}</p>
            </div>
            <CopyButton text={value} />
          </div>
        ))}
      </div>
    )
  },
}
