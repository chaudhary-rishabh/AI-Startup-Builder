import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'

import { Button } from '../src/components/shadcn/button'
import { ConfirmDialog } from '../src/components/custom/ConfirmDialog'

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Custom/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof ConfirmDialog>

// ── Controlled wrapper so we can open the dialog from a button click
function DialogDemo({
  title = 'Confirm action',
  description = 'Are you sure you want to continue? This action cannot be undone.',
  confirmLabel = 'Confirm',
  variant = 'default' as 'default' | 'destructive',
  loading = false,
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={() => setOpen(true)}>
        {variant === 'destructive' ? 'Delete project' : 'Open dialog'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        onConfirm={() => setOpen(false)}
        variant={variant}
        loading={loading}
      />
    </>
  )
}

export const Default: Story = {
  name: 'Default (brown confirm button)',
  render: () => (
    <DialogDemo
      title="Archive project"
      description="This will archive the project. You can restore it from the archive later."
      confirmLabel="Archive"
    />
  ),
}

export const Destructive: Story = {
  name: 'Destructive (red confirm button)',
  render: () => (
    <DialogDemo
      title="Delete project permanently"
      description="This action is irreversible. All project data, files, and AI outputs will be permanently deleted."
      confirmLabel="Delete forever"
      variant="destructive"
    />
  ),
}

export const Loading: Story = {
  name: 'Loading State (spinner, buttons disabled)',
  render: () => (
    <ConfirmDialog
      open={true}
      onOpenChange={() => {}}
      title="Deleting project…"
      description="Please wait while we delete your project and clean up associated resources."
      confirmLabel="Delete"
      onConfirm={() => Promise.resolve()}
      variant="destructive"
      loading={true}
    />
  ),
}
