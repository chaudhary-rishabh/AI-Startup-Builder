'use client'

import { useRouter } from 'next/navigation'

import { NewProjectModal } from '@/components/dashboard/NewProjectModal'

export default function NewProjectPage(): JSX.Element {
  const router = useRouter()
  return <NewProjectModal open={true} onClose={() => router.back()} />
}
