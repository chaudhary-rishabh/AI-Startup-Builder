'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getProfile, updateProfile, uploadAvatar, type UserProfile } from '@/api/user.api'
import { Button } from '@/components/ui/button'
const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
]

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['FOUNDER', 'DESIGNER', 'DEVELOPER', 'OTHER']),
  bio: z.string().optional(),
  company: z.string().optional(),
  website: z.string().max(500).optional(),
  timezone: z.string().min(1),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfileForm(): JSX.Element {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const profileQuery = useQuery({
    queryKey: ['user-profile'],
    queryFn: getProfile,
  })

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      role: 'FOUNDER',
      bio: '',
      company: '',
      website: '',
      timezone: 'America/New_York',
    },
  })

  useEffect(() => {
    const p = profileQuery.data
    if (!p) return
    form.reset({
      name: p.name,
      role: (p.role as ProfileFormValues['role']) ?? 'FOUNDER',
      bio: p.bio ?? '',
      company: p.company ?? '',
      website: p.website ?? '',
      timezone: p.timezone,
    })
    setAvatarUrl(p.avatarUrl)
  }, [profileQuery.data, form])

  const saveMut = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateProfile({
        name: values.name,
        role: values.role,
        bio: values.bio || null,
        company: values.company || null,
        website: values.website || null,
        timezone: values.timezone,
      }),
    onSuccess: async (data: UserProfile) => {
      await queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      setAvatarUrl(data.avatarUrl)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 3000)
    },
  })

  const initials = (profileQuery.data?.name ?? form.watch('name') ?? 'U').slice(0, 1).toUpperCase()

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading profile…
      </div>
    )
  }

  return (
    <section>
      <h1 className="font-display text-2xl text-heading">Profile</h1>
      <p className="mt-1 text-sm text-muted">Update how you appear across the product.</p>

      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-2xl font-semibold text-white">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : initials}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void (async () => {
          const f = e.target.files?.[0]
          if (!f) return
          const res = await uploadAvatar(f)
          setAvatarUrl(res.avatarUrl)
          e.target.value = ''
        })()} />
        <Button
          type="button"
          className="border border-divider bg-card text-sm text-heading hover:bg-divider"
          onClick={() => fileRef.current?.click()}
        >
          Change Photo
        </Button>
      </div>

      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit((values) => {
          saveMut.mutate(values)
        })}
      >
        <div>
          <label className="text-xs font-medium text-muted">Name</label>
          <input
            {...form.register('name')}
            className="mt-1 h-11 w-full rounded-md border border-divider bg-bg px-3 text-sm"
          />
          {form.formState.errors.name ? (
            <p className="mt-1 text-xs text-error">{form.formState.errors.name.message}</p>
          ) : null}
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Role</label>
          <select {...form.register('role')} className="mt-1 h-11 w-full rounded-md border border-divider bg-bg px-3 text-sm">
            <option value="FOUNDER">Founder</option>
            <option value="DESIGNER">Designer</option>
            <option value="DEVELOPER">Developer</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Bio</label>
          <textarea {...form.register('bio')} rows={4} className="mt-1 w-full rounded-md border border-divider bg-bg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Company</label>
          <input {...form.register('company')} className="mt-1 h-11 w-full rounded-md border border-divider bg-bg px-3 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Website</label>
          <input {...form.register('website')} className="mt-1 h-11 w-full rounded-md border border-divider bg-bg px-3 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Timezone</label>
          <select {...form.register('timezone')} className="mt-1 h-11 w-full rounded-md border border-divider bg-bg px-3 text-sm">
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saveMut.isPending} className="h-11 min-w-[140px] bg-brand font-semibold text-white disabled:opacity-60">
            {saveMut.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
          {savedFlash ? (
            <span className="flex items-center gap-1 text-sm text-success">
              <Check className="h-4 w-4" />
              Saved!
            </span>
          ) : null}
        </div>
      </form>
    </section>
  )
}
